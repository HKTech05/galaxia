import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, requireRole, customerAuthMiddleware, CustomerAuthRequest } from "../middleware/auth";

const router = Router();

// User's own bookings
router.get("/me/bookings", customerAuthMiddleware, async (req: CustomerAuthRequest, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                stayBookings: {
                    include: { property: true, subProperty: true },
                    orderBy: { checkInDate: "desc" }
                },
                ddBookings: {
                    include: { screen: true, package: true },
                    orderBy: { bookingDate: "desc" }
                }
            }
        });

        if (!user) {
            return res.json({ stayBookings: [], ddBookings: [] });
        }

        const stayBookings = user.stayBookings.map(b => {
            let standardizedName = b.property?.name || "Staycation Property";
            if (b.subProperty) {
                standardizedName = `${b.subProperty.name} (${standardizedName})`;
            }
            return {
                ...b,
                property: b.property ? { ...b.property, name: standardizedName } : b.property
            };
        });

        const ddBookings = user.ddBookings.map(b => {
            let standardizedName = b.screen?.name || "Digital Diaries";
            standardizedName = `${standardizedName} (Digital Diaries)`;
            return {
                ...b,
                screen: b.screen ? { ...b.screen, name: standardizedName } : b.screen
            };
        });

        return res.json({
            stayBookings,
            ddBookings
        });
    } catch (error) {
        console.error("Fetch me bookings error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/users/me — Get current user profile
router.get("/me", customerAuthMiddleware, async (req: CustomerAuthRequest, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.json(user);
    } catch (error) {
        console.error("Fetch me profile error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// All routes below require owner/developer
router.use(authMiddleware);
router.use(requireRole("owner", "developer", "manager"));

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
