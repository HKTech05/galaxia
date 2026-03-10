import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// All routes require owner/developer
router.use(authMiddleware);
router.use(requireRole("owner", "developer"));

// GET /api/users — List all registered guest users
router.get("/", async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { stayBookings: true, ddBookings: true } },
            },
        });

        const formatted = users.map(u => ({
            id: `U-${u.id}`,
            dbId: u.id,
            name: u.fullName,
            email: u.email || "—",
            phone: u.phone || "—",
            totalBookings: u._count.stayBookings + u._count.ddBookings,
            status: u.isVerified ? "Active" : "Inactive",
            joined: u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        }));

        return res.json(formatted);
    } catch (error: any) {
        console.error("Users list error:", error?.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/users/:id/status — Toggle user verified status
router.patch("/:id/status", async (req, res) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const { isVerified } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: { isVerified: !!isVerified },
            select: { id: true, fullName: true, isVerified: true },
        });

        return res.json(user);
    } catch (error: any) {
        console.error("User status error:", error?.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
