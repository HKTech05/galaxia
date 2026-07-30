import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { decrypt } from "../lib/encryption";

const router = Router();

// GET /api/coupons — List all coupons
router.get("/", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (_req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            include: {
                admin: {
                    select: { displayName: true, username: true }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(coupons);
    } catch (error) {
        console.error("List coupons error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/coupons — Create coupon
// Allows same code if old coupon is exhausted or expired; old coupon stays visible
router.post("/", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (req: AuthRequest, res) => {
    try {
        const { code, discountType, discountValue, maxUses, expiryDate, expiryHours } = req.body;

        if (!code || !discountType || !discountValue || !maxUses) {
            return res.status(400).json({ error: "Code, discount type, value, and max uses are required" });
        }
        if (!expiryDate && !expiryHours) {
            return res.status(400).json({ error: "Either expiry date or expiry hours is required" });
        }

        // Check if there's an active, non-exhausted, non-expired coupon with same code
        const activeCoupons = await prisma.coupon.findMany({
            where: {
                code: code.toUpperCase(),
                isActive: true,
            },
        });
        // Filter in JS: only block if any has remaining uses and is not expired
        const now = new Date();
        const hasActiveUsable = activeCoupons.some(c => {
            if (c.currentUses >= c.maxUses) return false;
            if (c.expiryHours) {
                const expiresAt = new Date(c.createdAt.getTime() + c.expiryHours * 3600000);
                return expiresAt > now;
            }
            return c.expiryDate >= now;
        });
        if (hasActiveUsable) {
            return res.status(409).json({ error: "An active coupon with this code already exists" });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                maxUses: parseInt(maxUses),
                expiryDate: expiryDate ? new Date(expiryDate) : new Date('2099-12-31'),
                expiryHours: expiryHours ? parseInt(expiryHours) : null,
                createdBy: req.admin!.id,
            },
        });

        return res.status(201).json(coupon);
    } catch (error) {
        console.error("Create coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/coupons/:id
router.delete("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        await prisma.coupon.delete({ where: { id: parseInt(req.params.id as string) } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/coupons/:id/usage — View usage history with user details
router.get("/:id/usage", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (req, res) => {
    try {
        const usages = await prisma.couponUsage.findMany({
            where: { couponId: parseInt(req.params.id as string) },
            orderBy: { usedAt: "desc" },
        });

        // Enrich each usage with user details from the booking
        const enriched = await Promise.all(usages.map(async (u) => {
            let customerEmail: string | null = null;
            let customerPhone: string | null = null;

            try {
                if (u.bookingRef.startsWith("DD-")) {
                    const booking = await prisma.ddBooking.findFirst({
                        where: { bookingRef: u.bookingRef },
                        include: { user: true },
                    });
                    if (booking?.user) {
                        customerEmail = booking.user.email || null;
                        customerPhone = booking.user.phone || null;
                    } else if (booking) {
                        // Fallback: decrypt from booking fields
                        customerPhone = booking.customerPhone ? decrypt(booking.customerPhone) : null;
                        customerEmail = booking.customerEmail ? decrypt(booking.customerEmail) : null;
                    }
                } else if (u.bookingRef.startsWith("ST-")) {
                    const booking = await prisma.staycationBooking.findFirst({
                        where: { bookingRef: u.bookingRef },
                        include: { user: true },
                    });
                    if (booking?.user) {
                        customerEmail = booking.user.email || null;
                        customerPhone = booking.user.phone || null;
                    } else if (booking) {
                        customerPhone = booking.customerPhone ? decrypt(booking.customerPhone) : null;
                        customerEmail = booking.customerEmail ? decrypt(booking.customerEmail) : null;
                    }
                }
            } catch (err) {
                // Silently ignore lookup errors
            }

            return {
                ...u,
                customerEmail,
                customerPhone,
            };
        }));

        return res.json(enriched);
    } catch (error) {
        console.error("Coupon usage error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/coupons/validate — Validate coupon at checkout
// Finds the latest active, non-exhausted, non-expired coupon with the given code
router.post("/validate", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Coupon code required" });

        // Find all active coupons with this code, newest first
        const coupons = await prisma.coupon.findMany({
            where: {
                code: code.toUpperCase(),
                isActive: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const now = new Date();

        // Pick the first one that still has uses remaining and is not expired
        const coupon = coupons.find(c => {
            if (c.currentUses >= c.maxUses) return false;
            // Hours-based expiry takes priority
            if (c.expiryHours) {
                const expiresAt = new Date(c.createdAt.getTime() + c.expiryHours * 3600000);
                return expiresAt > now;
            }
            return c.expiryDate >= now;
        });

        if (!coupon) {
            // Check why it failed for a better error message
            const any = await prisma.coupon.findFirst({ where: { code: code.toUpperCase() } });
            if (!any) return res.status(404).json({ error: "Coupon not found" });
            if (!any.isActive) return res.status(400).json({ error: "Coupon is inactive" });
            if (any.currentUses >= any.maxUses) return res.status(400).json({ error: "Coupon exhausted" });
            // Check expiry
            if (any.expiryHours) {
                const expiresAt = new Date(any.createdAt.getTime() + any.expiryHours * 3600000);
                if (expiresAt <= now) return res.status(400).json({ error: "Coupon expired" });
            } else if (new Date(any.expiryDate) < now) {
                return res.status(400).json({ error: "Coupon expired" });
            }
            return res.status(400).json({ error: "Coupon not available" });
        }

        return res.json({
            valid: true,
            couponId: coupon.id,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
        });
    } catch (error) {
        console.error("Validate coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
