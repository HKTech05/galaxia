import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/admin/dashboard — Dashboard KPIs and chart data
router.get("/", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const { period } = req.query; // 'month', '3months', '6months', 'year'
        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Default: last month

        if (period === "3months") startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        else if (period === "6months") startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        else if (period === "year") startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        // Total revenue
        const stayRevenue = await prisma.staycationBooking.aggregate({
            _sum: { totalAmount: true },
            where: {
                bookedAt: { gte: startDate },
                status: { notIn: ["cancelled", "no_show"] },
            },
        });
        const ddRevenue = await prisma.ddBooking.aggregate({
            _sum: { totalAmount: true },
            where: {
                bookedAt: { gte: startDate },
                status: { notIn: ["cancelled", "no_show"] },
            },
        });

        // Booking counts
        const totalStayBookings = await prisma.staycationBooking.count({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
        });
        const totalDdBookings = await prisma.ddBooking.count({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
        });

        // Total nights booked
        const stayBookingsForNights = await prisma.staycationBooking.findMany({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show"] } },
            select: { numNights: true },
        });
        const totalNightsBooked = stayBookingsForNights.reduce((sum: number, b: { numNights: number }) => sum + b.numNights, 0);

        // Today's check-ins
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

// GET /api/admin/dashboard/property-status — Live property check-in status
router.get("/property-status", authMiddleware, async (_req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const properties = await prisma.property.findMany({
            where: { isActive: true },
            include: { subProperties: { where: { isActive: true } } },
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

        return res.json({ properties, activeBookings });
    } catch (error) {
        console.error("Property status error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
