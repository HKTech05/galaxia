import { Router } from "express";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/admin/dashboard — Dashboard KPIs and chart data
router.get("/", authMiddleware, requireRole("owner", "developer", "manager"), async (req, res) => {
    try {
        const { period } = req.query; // 'month', '3months', '6months', 'year'
        const now = new Date();
        // Default to the first day of the CURRENT month for a "live" feel
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1); 

        if (period === "3months") startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        else if (period === "6months") startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        else if (period === "year") startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);

        // Revenue based on realized stay (check-in date) for Staycation
        const stayRevenue = await prisma.staycationBooking.aggregate({
            _sum: { totalAmount: true },
            where: {
                checkInDate: { gte: startDate },
                status: { in: ["confirmed", "checked_in", "checked_out"] },
            },
        });
        
        // Revenue based on booking date for DD
        const ddRevenue = await prisma.ddBooking.aggregate({
            _sum: { totalAmount: true },
            where: {
                bookingDate: { gte: startDate },
                status: { in: ["confirmed", "checked_in", "paid"] }, 
            },
        });

        // Booking counts for the same period
        const totalStayBookings = await prisma.staycationBooking.count({
            where: { checkInDate: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
        });
        const totalDdBookings = await prisma.ddBooking.count({
            where: { bookingDate: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
        });

        // Total nights booked
        const stayBookingsForNights = await prisma.staycationBooking.findMany({
            where: { checkInDate: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
            select: { numNights: true },
        });
        const totalNightsBooked = stayBookingsForNights.reduce((sum: number, b) => sum + b.numNights, 0);

        const totalRevenue = (stayRevenue._sum.totalAmount || 0) + (ddRevenue._sum.totalAmount || 0);

        // Latest bookings with decrypted info
        const stayBookings = await prisma.staycationBooking.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { property: true },
        });
        const ddBookings = await prisma.ddBooking.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { screen: true },
        });

        const stayLive = stayBookings.map(b => ({
            id: b.bookingRef,
            guest: b.customerName,
            property: b.property.name,
            total: b.totalAmount,
            status: b.status,
            phone: b.customerPhone ? decrypt(b.customerPhone) : "—",
        }));

        const ddLive = ddBookings.map(b => ({
            id: b.bookingRef,
            guest: b.customerName,
            screen: b.screen.name,
            total: b.totalAmount,
            status: b.status,
            phone: b.customerPhone ? decrypt(b.customerPhone) : "—",
        }));

        return res.json({
            kpis: {
                totalReservations: totalStayBookings + totalDdBookings,
                totalRevenue,
                staycationRevenue: stayRevenue._sum.totalAmount || 0,
                ddRevenue: ddRevenue._sum.totalAmount || 0,
                totalNightsBooked,
                occupancyRate: 0, // Placeholder
            },
            recentStayBookings: stayLive,
            recentDdBookings: ddLive,
        });
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const todayCheckIns = await prisma.staycationBooking.findMany({
            where: {
                checkInDate: { gte: todayStart, lt: todayEnd },
                status: { notIn: ["cancelled", "no_show"] },
            },
            include: {
                property: { select: { name: true } },
                subProperty: { select: { name: true } },
                extraGuests: true,
            },
        });

        // Property-wise revenue
        const propertyRevenue = await prisma.staycationBooking.groupBy({
            by: ["propertyId"],
            _sum: { totalAmount: true },
            _count: { id: true },
            where: {
                bookedAt: { gte: startDate },
                status: { notIn: ["cancelled", "no_show"] },
            },
        });

        // DD booking source breakdown
        const ddWebsiteCount = await prisma.ddBooking.count({
            where: { bookedAt: { gte: startDate }, source: "website", status: { notIn: ["cancelled", "no_show"] } },
        });
        const ddWalkInCount = await prisma.ddBooking.count({
            where: { bookedAt: { gte: startDate }, source: "walk_in", status: { notIn: ["cancelled", "no_show"] } },
        });

        // Employee cash summary
        const employees = await prisma.employee.findMany({
            where: { isActive: true },
            include: { property: { select: { name: true } } },
        });
        const totalPendingCash = employees.reduce((sum: number, e: { cashCollected: number }) => sum + e.cashCollected, 0);

        return res.json({
            kpis: {
                totalRevenue: (stayRevenue._sum.totalAmount || 0) + (ddRevenue._sum.totalAmount || 0),
                staycationRevenue: stayRevenue._sum.totalAmount || 0,
                ddRevenue: ddRevenue._sum.totalAmount || 0,
                totalStayBookings,
                totalDdBookings,
                totalNightsBooked,
                totalPendingCash,
            },
            todayCheckIns,
            propertyRevenue,
            ddBookingSources: {
                website: ddWebsiteCount,
                walkIn: ddWalkInCount,
            },
            employees,
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/admin/dashboard/earnings — Earnings chart data
router.get("/earnings", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const { period } = req.query;
        const now = new Date();
        let months = 12;
        if (period === "1month") months = 1;
        else if (period === "3months") months = 3;
        else if (period === "6months") months = 6;

        const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

        const stayBookings = await prisma.staycationBooking.findMany({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const ddBookings = await prisma.ddBooking.findMany({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
            select: { totalAmount: true, bookedAt: true },
        });

        // Group by month
        const earningsMap: Record<string, { staycation: number; dd: number }> = {};
        for (const b of stayBookings) {
            const key = `${b.bookedAt.getFullYear()}-${String(b.bookedAt.getMonth() + 1).padStart(2, "0")}`;
            if (!earningsMap[key]) earningsMap[key] = { staycation: 0, dd: 0 };
            earningsMap[key].staycation += b.totalAmount;
        }
        for (const b of ddBookings) {
            const key = `${b.bookedAt.getFullYear()}-${String(b.bookedAt.getMonth() + 1).padStart(2, "0")}`;
            if (!earningsMap[key]) earningsMap[key] = { staycation: 0, dd: 0 };
            earningsMap[key].dd += b.totalAmount;
        }

        const earnings = Object.entries(earningsMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([period, data]) => ({
                period,
                staycation: data.staycation,
                dd: data.dd,
                total: data.staycation + data.dd,
            }));

        return res.json(earnings);
    } catch (error) {
        console.error("Earnings error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/property-status", authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();
        const todayStart = new Date(targetDate);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const properties = await prisma.property.findMany({
            where: { isActive: true },
            include: { subProperties: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } },
            orderBy: { displayOrder: 'asc' }
        });

        const activeBookings = await prisma.staycationBooking.findMany({
            where: {
                checkInDate: { lte: todayEnd },
                checkOutDate: { gte: todayStart },
                status: { in: ["confirmed", "checked_in"] },
            },
            include: {
                property: true,
                subProperty: true,
                extraGuests: true,
            },
        });

        // Decorate properties with check-in info for frontend
        const decoratedProperties = properties.map(p => {
            const propBookings = activeBookings.filter(b => b.propertyId === p.id && !b.subPropertyId);
            const isBooked = propBookings.length > 0;
            const booking = propBookings[0];

            return {
                ...p,
                villas: (p.subProperties || []).map(sp => {
                    const spBookings = activeBookings.filter(b => b.subPropertyId === sp.id);
                    const isSpBooked = spBookings.length > 0;
                    const spBooking = spBookings[0];

                    return {
                        ...sp,
                        checkedIn: isSpBooked,
                        guest: spBooking?.customerName || null,
                        guests: spBooking?.numGuests || 0,
                        phone: spBooking?.customerPhone ? decrypt(spBooking.customerPhone) : null,
                        checkInTime: spBooking?.checkInDate || null,
                        checkOutDate: spBooking?.checkOutDate ? new Date(spBooking.checkOutDate).toLocaleDateString('en-IN') : null,
                        balanceCollected: spBooking?.balanceCollected || false,
                        balanceMode: spBooking?.balanceMethod || "Online",
                        balanceTime: spBooking?.balanceCollectedAt ? new Date(spBooking.balanceCollectedAt).toLocaleString('en-IN') : null,
                        depositCollected: spBooking?.depositCollected || false,
                        depositMode: spBooking?.depositMethod || "UPI",
                        depositTime: spBooking?.depositCollectedAt ? new Date(spBooking.depositCollectedAt).toLocaleString('en-IN') : null,
                        extraGuests: spBooking?.extraGuests || [],
                    };
                }),
                checkedIn: isBooked,
                guest: booking?.customerName || null,
                guests: booking?.numGuests || 0,
                phone: booking?.customerPhone ? decrypt(booking.customerPhone) : null,
                checkInTime: booking?.checkInDate || null,
                checkOutDate: booking?.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-IN') : null,
                balanceCollected: booking?.balanceCollected || false,
                balanceMode: booking?.balanceMethod || "Online",
                balanceTime: booking?.balanceCollectedAt ? new Date(booking.balanceCollectedAt).toLocaleString('en-IN') : null,
                depositCollected: booking?.depositCollected || false,
                depositMode: booking?.depositMethod || "UPI",
                depositTime: booking?.depositCollectedAt ? new Date(booking.depositCollectedAt).toLocaleString('en-IN') : null,
                extraGuests: booking?.extraGuests || [],
            };
        });

        return res.json({ properties: decoratedProperties, activeBookings });
    } catch (error) {
        console.error("Property status error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
