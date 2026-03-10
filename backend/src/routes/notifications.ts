import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { adminId: req.admin!.id },
                    { adminId: null }, // Broadcast notifications
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return res.json(notifications);
    } catch (error) {
        console.error("Notifications error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authMiddleware, async (_req, res) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: parseInt(_req.params.id as string) },
            data: { isRead: true },
        });
        return res.json(notification);
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
