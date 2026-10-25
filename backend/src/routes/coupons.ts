import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { decrypt } from "../lib/encryption";

const router = Router();

// GET /api/coupons/public — List available public coupons for booking flows
// Accessible to customers without auth
router.get("/public", async (req, res) => {
    try {
        const now = new Date();
        const type = (req.query.type as string || req.query.category as string || "").toLowerCase().trim();

        const whereClause: any = {
            isActive: true,
            isPublic: true,
        };

        if (type === "staycation") {
            whereClause.applicableTo = { in: ["all", "staycation"] };
        } else if (type === "digital") {
            whereClause.applicableTo = { in: ["all", "digital"] };
        }

        const coupons = await prisma.coupon.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        // Filter out exhausted and expired coupons
        const available = coupons.filter(c => {
            if (c.currentUses >= c.maxUses) return false;
            if (c.expiryHours) {
                const expiresAt = new Date(c.createdAt.getTime() + c.expiryHours * 3600000);
                return expiresAt > now;
            }
            const exp = new Date(c.expiryDate);
            exp.setHours(23, 59, 59, 999);
            return exp >= now;
        }).map(c => {
            let expiresAtISO: string | null = null;
            if (c.expiryHours) {
                expiresAtISO = new Date(c.createdAt.getTime() + c.expiryHours * 3600000).toISOString();
            } else if (c.expiryDate) {
                const d = new Date(c.expiryDate);
                d.setHours(23, 59, 59, 999);
                expiresAtISO = d.toISOString();
            }
            return {
                id: c.id,
                code: c.code,
                discountType: c.discountType,
                discountValue: Number(c.discountValue),
                applicableTo: c.applicableTo,
                expiryDate: c.expiryDate,
                expiryHours: c.expiryHours,
                expiresAt: expiresAtISO,
            };
        });

        return res.json(available);
    } catch (error) {
        console.error("List public coupons error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/coupons — List all coupons (Admin)
router.get("/", authMiddleware, requireRole("owner", "developer", "staycation_call_manager", "test_viewer"), async (_req, res) => {
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

// POST /api/coupons — Create coupon (Admin)
// Allows same code if old coupon is exhausted or expired; old coupon stays visible
router.post("/", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (req: AuthRequest, res) => {
    try {
        const { code, discountType, discountValue, maxUses, expiryDate, expiryHours, isPublic, applicableTo } = req.body;

        if (!code || !discountType || !discountValue || !maxUses) {
            return res.status(400).json({ error: "Code, discount type, value, and max uses are required" });
        }
        if (!expiryDate && !expiryHours) {
            return res.status(400).json({ error: "Either expiry date or expiry hours is required" });
        }

        // Check if there's an active, non-exhausted, non-expired coupon with same code
        const activeCoupons = await prisma.coupon.findMany({
            where: {
                code: code.toUpperCase().trim(),
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
            const exp = new Date(c.expiryDate);
            exp.setHours(23, 59, 59, 999);
            return exp >= now;
        });
        if (hasActiveUsable) {
            return res.status(409).json({ error: "An active coupon with this code already exists" });
        }

        // Determine isPublic boolean
        let isPublicBool = true;
        if (isPublic === false || isPublic === "false" || isPublic === "private") {
            isPublicBool = false;
        }

        // Determine applicableTo scope
        let appTo = (applicableTo || "all").toString().toLowerCase().trim();
        if (!["all", "staycation", "digital"].includes(appTo)) {
            appTo = "all";
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase().trim(),
                discountType,
                discountValue: parseFloat(discountValue),
                maxUses: parseInt(maxUses),
                expiryDate: expiryDate ? new Date(expiryDate) : new Date('2099-12-31'),
                expiryHours: expiryHours ? parseInt(expiryHours) : null,
                isPublic: isPublicBool,
                applicableTo: appTo,
                createdBy: req.admin!.id,
            },
            include: {
                admin: {
                    select: { displayName: true, username: true }
                }
            }
        });

        return res.status(201).json(coupon);
    } catch (error) {
        console.error("Create coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/coupons/:id — Update coupon (visibility, applicableTo, isActive)
router.patch("/:id", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (req: AuthRequest, res) => {
    try {
        const couponId = parseInt(req.params.id as string);
        const { isPublic, applicableTo, isActive } = req.body;
        const updateData: any = {};

        if (isPublic !== undefined) {
            updateData.isPublic = isPublic === true || isPublic === "true" || isPublic === "public";
        }
        if (applicableTo !== undefined) {
            const appTo = String(applicableTo).toLowerCase().trim();
            if (["all", "staycation", "digital"].includes(appTo)) {
                updateData.applicableTo = appTo;
            }
        }
        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }

        const updated = await prisma.coupon.update({
            where: { id: couponId },
            data: updateData,
            include: {
                admin: {
                    select: { displayName: true, username: true }
                }
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error("Update coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/coupons/:id/visibility — Dedicated alias for visibility updates
router.patch("/:id/visibility", authMiddleware, requireRole("owner", "developer", "staycation_call_manager"), async (req: AuthRequest, res) => {
    try {
        const couponId = parseInt(req.params.id as string);
        const { isPublic, visibility } = req.body;
        let isPublicVal: boolean;
        if (visibility !== undefined) {
            isPublicVal = visibility === "public";
        } else {
            isPublicVal = isPublic === true || isPublic === "true" || isPublic === "public";
        }

        const updated = await prisma.coupon.update({
            where: { id: couponId },
            data: { isPublic: isPublicVal },
            include: {
                admin: {
                    select: { displayName: true, username: true }
                }
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error("Update coupon visibility error:", error);
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
router.get("/:id/usage", authMiddleware, requireRole("owner", "developer", "staycation_call_manager", "test_viewer"), async (req, res) => {
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

// POST /api/coupons/validate — Validate coupon at checkout (supports both public & private coupons)
// Finds the latest active, non-exhausted, non-expired coupon with the given code
router.post("/validate", async (req, res) => {
    try {
        const { code, type } = req.body;
        if (!code) return res.status(400).json({ error: "Coupon code required" });

        const searchCode = code.toString().trim().toUpperCase();

        // Find all active coupons with this code, newest first (both public and private coupons can be applied)
        const coupons = await prisma.coupon.findMany({
            where: {
                code: searchCode,
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
            const exp = new Date(c.expiryDate);
            exp.setHours(23, 59, 59, 999);
            return exp >= now;
        });

        if (!coupon) {
            // Check why it failed for a better error message
            const any = await prisma.coupon.findFirst({ where: { code: searchCode } });
            if (!any) return res.status(404).json({ error: "Coupon not found" });
            if (!any.isActive) return res.status(400).json({ error: "Coupon is inactive" });
            if (any.currentUses >= any.maxUses) return res.status(400).json({ error: "Coupon limit reached / exhausted" });
            // Check expiry
            if (any.expiryHours) {
                const expiresAt = new Date(any.createdAt.getTime() + any.expiryHours * 3600000);
                if (expiresAt <= now) return res.status(400).json({ error: "Coupon has expired" });
            } else {
                const exp = new Date(any.expiryDate);
                exp.setHours(23, 59, 59, 999);
                if (exp < now) return res.status(400).json({ error: "Coupon has expired" });
            }
            return res.status(400).json({ error: "Coupon not available" });
        }

        // If type / category is provided, check property scope
        if (type) {
            const reqType = type.toString().toLowerCase().trim();
            if (coupon.applicableTo !== "all" && coupon.applicableTo !== reqType) {
                const scopeName = coupon.applicableTo === "staycation" ? "staycation" : "Digital Diaries";
                return res.status(400).json({
                    error: `This coupon is only valid for ${scopeName} bookings`
                });
            }
        }

        return res.json({
            valid: true,
            couponId: coupon.id,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
            applicableTo: coupon.applicableTo,
            isPublic: coupon.isPublic,
        });
    } catch (error) {
        console.error("Validate coupon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
