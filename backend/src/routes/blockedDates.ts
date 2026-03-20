import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// GET /api/blocked-dates?propertyId=&subPropertyId=&screenId=
// Returns all blocked dates, optionally filtered by property/sub/screen
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { propertyId, subPropertyId, screenId } = req.query;
        const where: any = {};
        if (propertyId) where.propertyId = parseInt(propertyId as string);
        if (subPropertyId) where.subPropertyId = parseInt(subPropertyId as string);
        if (screenId) where.screenId = parseInt(screenId as string);

        const blocked = await prisma.blockedDate.findMany({
            where,
            include: {
                property: { select: { id: true, name: true, slug: true } },
                subProperty: { select: { id: true, name: true, slug: true } },
                screen: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { blockedDate: "asc" },
        });

        return res.json(blocked);
    } catch (error) {
        console.error("Get blocked dates error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/blocked-dates
// Body: { propertyId?, subPropertyId?, screenId?, dates: string[], reason: string }
// dates should be ISO date strings like "2026-03-25"
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { propertyId, subPropertyId, screenId, dates, reason } = req.body;

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({ error: "dates array is required" });
        }
        if (!reason) {
            return res.status(400).json({ error: "reason is required" });
        }
        if (!propertyId && !screenId) {
            return res.status(400).json({ error: "propertyId or screenId is required" });
        }

        const created = await prisma.blockedDate.createMany({
            data: dates.map((d: string) => ({
                propertyId: propertyId ? parseInt(propertyId) : null,
                subPropertyId: subPropertyId ? parseInt(subPropertyId) : null,
                screenId: screenId ? parseInt(screenId) : null,
                blockedDate: new Date(d),
                reason,
                blockedBy: (req as any).adminId || null,
            })),
            skipDuplicates: true,
        });

        return res.status(201).json({ count: created.count });
    } catch (error) {
        console.error("Create blocked dates error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/blocked-dates/:id
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        await prisma.blockedDate.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete blocked date error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
