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
            let standardizedName = (b.screen?.name || "Digital Diaries").replace(/\s*\([^)]*\)/g, '').trim();
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

// PATCH /api/users/me — Update own profile (name, phone)
router.patch("/me", customerAuthMiddleware, async (req: CustomerAuthRequest, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { fullName, phone } = req.body;
        const data: any = {};
        if (fullName !== undefined) data.fullName = fullName;
        if (phone !== undefined) data.phone = phone;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
        });
        return res.json(user);
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// All routes below require owner/developer
router.use(authMiddleware);
router.use(requireRole("owner", "developer", "manager"));

// GET /api/users — List all registered guest users with pagination & search
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 50;
        const search = (req.query.search as string || "").trim();
        const exportAll = req.query.export === "true";

        const where: any = {};
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
            ];
        }

        let users;
        let totalCount = 0;

        if (exportAll) {
            users = await prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: { select: { stayBookings: true, ddBookings: true } },
                },
            });
        } else {
            const skip = (page - 1) * limit;
            [users, totalCount] = await prisma.$transaction([
                prisma.user.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                    include: {
                        _count: { select: { stayBookings: true, ddBookings: true } },
                    },
                }),
                prisma.user.count({ where }),
            ]);
        }

        const formatted = users.map(u => ({
            id: `U-${u.id}`,
            dbId: u.id,
            name: u.fullName,
            email: u.email || "—",
            phone: u.phone || "—",
            totalBookings: u._count.stayBookings + u._count.ddBookings,
            status: (u.email && u.phone) ? "Verified" : "Unverified",
            joined: u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        }));

        if (exportAll) {
            return res.json(formatted);
        } else {
            return res.json({
                users: formatted,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                }
            });
        }
    } catch (error: any) {
        console.error("Users list error:", error?.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/users/:id/bookings — Admin: fetch a specific user's bookings
router.get("/:id/bookings", async (req, res) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                stayBookings: {
                    include: { property: true, subProperty: true },
                    orderBy: { checkInDate: "desc" },
                    take: 20
                },
                ddBookings: {
                    include: { screen: true, package: true },
                    orderBy: { bookingDate: "desc" },
                    take: 20
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const bookings = [
            ...user.stayBookings.map(b => {
                const ci = new Date(b.checkInDate);
                const co = new Date(b.checkOutDate);
                const nights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
                return {
                    id: b.bookingRef || `#S-${b.id}`,
                    type: "staycation" as const,
                    location: b.subProperty?.name ? `${b.subProperty.name} (${b.property?.name || ""})` : (b.property?.name || "Staycation"),
                    amount: b.totalAmount,
                    nights,
                    status: b.status,
                    date: b.checkInDate,
                };
            }),
            ...user.ddBookings.map(b => ({
                id: b.bookingRef || `#DD-${b.id}`,
                type: "celebration" as const,
                location: b.screen?.name ? `${b.screen.name} (Digital Diaries)` : "Digital Diaries",
                amount: b.totalAmount,
                nights: 0,
                status: b.status,
                date: b.bookingDate,
            }))
        ];
        return res.json(bookings);
    } catch (error: any) {
        console.error("User bookings error:", error?.message);
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
