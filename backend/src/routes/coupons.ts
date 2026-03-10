import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/coupons — List all coupons
router.get("/", authMiddleware, requireRole("owner", "developer"), async (_req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: "desc" },
        });
        return res.json(coupons);
    } catch (error) {
        console.error("List coupons error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/coupons — Create coupon
router.post("/", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const { code, discountType, discountValue, maxUses, expiryDate } = req.body;

        if (!code || !discountType || !discountValue || !maxUses || !expiryDate) {
            return res.status(400).json({ error: "All fields required" });
        }

        const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (existing) {
            return res.status(409).json({ error: "Coupon code already exists" });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                maxUses: parseInt(maxUses),
                expiryDate: new Date(expiryDate),
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

// GET /api/coupons/:id/usage — View usage history
router.get("/:id/usage", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const usage = await prisma.couponUsage.findMany({
            where: { couponId: parseInt(req.params.id as string) },
            orderBy: { usedAt: "desc" },
        });
        return res.json(usage);
    } catch (error) {
        console.error("Coupon usage error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/coupons/validate — Validate coupon at checkout
router.post("/validate", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Coupon code required" });

        const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        if (!coupon.isActive) return res.status(400).json({ error: "Coupon is inactive" });
        if (coupon.currentUses >= coupon.maxUses) return res.status(400).json({ error: "Coupon exhausted" });
        if (new Date(coupon.expiryDate) < new Date()) return res.status(400).json({ error: "Coupon expired" });

        return res.json({
            valid: true,
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
