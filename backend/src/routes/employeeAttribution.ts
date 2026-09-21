import { Router } from "express";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// Standard attribution options for grouping
export const STAYCATION_EMPLOYEES = [
    "Sana (Bookings manager)",
    "Pooja (Bookings manager)",
    "Whatsapp",
    "Instagram",
    "Website (via online browsing)",
];

export const DD_EMPLOYEES = [
    "Arzu (Bookings manager)",
    "Sonal (Bookings manager)",
    "Whatsapp",
    "Instagram",
    "Website (via online browsing)",
];

// GET /api/admin/employee-attribution — Owner only sales attribution analytics
router.get("/", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const { date, startDate, endDate, period, type, source } = req.query as Record<string, string | undefined>;

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);

        let filterStart: Date | null = null;
        let filterEnd: Date | null = null;

        if (date) {
            // Specific single date: [date 00:00:00, date 23:59:59.999] in IST
            filterStart = new Date(`${date}T00:00:00.000+05:30`);
            filterEnd = new Date(`${date}T23:59:59.999+05:30`);
        } else if (startDate && endDate) {
            // Specific date range
            filterStart = new Date(`${startDate}T00:00:00.000+05:30`);
            filterEnd = new Date(`${endDate}T23:59:59.999+05:30`);
        } else if (period) {
            // Duration presets
            const year = istNow.getUTCFullYear();
            const month = istNow.getUTCMonth(); // 0-indexed
            const day = istNow.getUTCDate();

            if (period === "today") {
                const todayStr = istNow.toISOString().slice(0, 10);
                filterStart = new Date(`${todayStr}T00:00:00.000+05:30`);
                filterEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
            } else if (period === "yesterday") {
                const yDate = new Date(istNow.getTime() - 24 * 60 * 60 * 1000);
                const yStr = yDate.toISOString().slice(0, 10);
                filterStart = new Date(`${yStr}T00:00:00.000+05:30`);
                filterEnd = new Date(`${yStr}T23:59:59.999+05:30`);
            } else if (period === "this_week") {
                // Last 7 days
                const wDate = new Date(istNow.getTime() - 6 * 24 * 60 * 60 * 1000);
                const wStr = wDate.toISOString().slice(0, 10);
                const todayStr = istNow.toISOString().slice(0, 10);
                filterStart = new Date(`${wStr}T00:00:00.000+05:30`);
                filterEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
            } else if (period === "this_month") {
                const mStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
                const todayStr = istNow.toISOString().slice(0, 10);
                filterStart = new Date(`${mStart}T00:00:00.000+05:30`);
                filterEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
            } else if (period === "last_month") {
                const prevMYear = month === 0 ? year - 1 : year;
                const prevMMonth = month === 0 ? 11 : month - 1;
                const lastDayOfPrevM = new Date(Date.UTC(prevMYear, prevMMonth + 1, 0)).getUTCDate();
                const mStart = `${prevMYear}-${String(prevMMonth + 1).padStart(2, "0")}-01`;
                const mEnd = `${prevMYear}-${String(prevMMonth + 1).padStart(2, "0")}-${String(lastDayOfPrevM).padStart(2, "0")}`;
                filterStart = new Date(`${mStart}T00:00:00.000+05:30`);
                filterEnd = new Date(`${mEnd}T23:59:59.999+05:30`);
            } else if (period === "this_year") {
                const yStart = `${year}-01-01`;
                const todayStr = istNow.toISOString().slice(0, 10);
                filterStart = new Date(`${yStart}T00:00:00.000+05:30`);
                filterEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
            } else if (period === "all") {
                filterStart = null;
                filterEnd = null;
            }
        } else {
            // Default: this month
            const year = istNow.getUTCFullYear();
            const month = istNow.getUTCMonth();
            const mStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
            const todayStr = istNow.toISOString().slice(0, 10);
            filterStart = new Date(`${mStart}T00:00:00.000+05:30`);
            filterEnd = new Date(`${todayStr}T23:59:59.999+05:30`);
        }

        // Build Prisma where clauses
        const stayWhere: any = {
            status: { notIn: ["cancelled", "no_show"] },
        };
        const ddWhere: any = {
            status: { notIn: ["cancelled"] },
            isMaintenance: false,
        };

        if (filterStart && filterEnd) {
            stayWhere.bookedAt = { gte: filterStart, lte: filterEnd };
            ddWhere.bookedAt = { gte: filterStart, lte: filterEnd };
        } else if (filterStart) {
            stayWhere.bookedAt = { gte: filterStart };
            ddWhere.bookedAt = { gte: filterStart };
        }

        if (source && source !== "all") {
            stayWhere.bookedVia = source;
            ddWhere.bookedVia = source;
        }

        // Fetch Staycation bookings unless type === 'digital_diaries'
        const fetchStay = type !== "digital_diaries";
        const fetchDd = type !== "staycation";

        const [stayBookings, ddBookings] = await Promise.all([
            fetchStay
                ? prisma.staycationBooking.findMany({
                    where: stayWhere,
                    include: { property: { select: { name: true, slug: true } }, subProperty: { select: { name: true, slug: true } } },
                    orderBy: { bookedAt: "desc" },
                })
                : Promise.resolve([]),
            fetchDd
                ? prisma.ddBooking.findMany({
                    where: ddWhere,
                    include: { screen: { select: { name: true, slug: true } }, package: { select: { name: true, slug: true } } },
                    orderBy: { bookedAt: "desc" },
                })
                : Promise.resolve([]),
        ]);

        // Map and unify records
        interface UnifiedBooking {
            id: string;
            bookingRef: string;
            type: "staycation" | "digital_diaries";
            customerName: string;
            customerPhone: string;
            customerEmail: string;
            propertyOrScreen: string;
            unitOrPackage: string;
            bookingDate: string; // Event/Stay check-in date
            bookedAt: string;    // Creation timestamp
            totalAmount: number;
            advanceAmount: number;
            status: string;
            bookedVia: string;
        }

        const unified: UnifiedBooking[] = [];

        for (const b of stayBookings) {
            const rawPhone = b.customerPhone || "";
            const rawEmail = b.customerEmail || "";
            unified.push({
                id: `stay-${b.id}`,
                bookingRef: b.bookingRef,
                type: "staycation",
                customerName: b.customerName,
                customerPhone: decrypt(rawPhone),
                customerEmail: decrypt(rawEmail),
                propertyOrScreen: b.property?.name || "Staycation",
                unitOrPackage: b.subProperty?.name || b.assignedUnit || "Standard",
                bookingDate: b.checkInDate ? b.checkInDate.toISOString().slice(0, 10) : "",
                bookedAt: b.bookedAt.toISOString(),
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.advanceAmount || 0,
                status: b.status,
                bookedVia: b.bookedVia || (b.source === "website" ? "Website (via online browsing)" : (b.source || "Unspecified")),
            });
        }

        for (const b of ddBookings) {
            const rawPhone = b.customerPhone || "";
            const rawEmail = b.customerEmail || "";
            unified.push({
                id: `dd-${b.id}`,
                bookingRef: b.bookingRef,
                type: "digital_diaries",
                customerName: b.customerName,
                customerPhone: decrypt(rawPhone),
                customerEmail: decrypt(rawEmail),
                propertyOrScreen: b.screen?.name || "Digital Diaries",
                unitOrPackage: b.package?.name || "Standard Package",
                bookingDate: b.bookingDate ? b.bookingDate.toISOString().slice(0, 10) : "",
                bookedAt: b.bookedAt.toISOString(),
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.amountPaid || 0,
                status: b.status,
                bookedVia: b.bookedVia || (b.source === "website" ? "Website (via online browsing)" : (b.source || "Unspecified")),
            });
        }

        // Sort unified bookings by bookedAt descending
        unified.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

        // Calculate KPIs
        const totalRevenue = unified.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalAdvance = unified.reduce((sum, b) => sum + b.advanceAmount, 0);
        const totalBookings = unified.length;
        const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

        // Group by BookedVia (Attribution)
        const employeeMap: Record<string, { name: string; count: number; revenue: number; stayCount: number; ddCount: number }> = {};

        for (const b of unified) {
            const key = b.bookedVia || "Unspecified";
            if (!employeeMap[key]) {
                employeeMap[key] = { name: key, count: 0, revenue: 0, stayCount: 0, ddCount: 0 };
            }
            employeeMap[key].count += 1;
            employeeMap[key].revenue += b.totalAmount;
            if (b.type === "staycation") {
                employeeMap[key].stayCount += 1;
            } else {
                employeeMap[key].ddCount += 1;
            }
        }

        const byEmployee = Object.values(employeeMap)
            .map((emp) => ({
                ...emp,
                percentage: totalRevenue > 0 ? Math.round((emp.revenue / totalRevenue) * 100) : 0,
                countPercentage: totalBookings > 0 ? Math.round((emp.count / totalBookings) * 100) : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // Daily / Weekly Timeline Trends for charts
        const dailyTrendMap: Record<string, { date: string; revenue: number; count: number; [key: string]: any }> = {};

        for (const b of unified) {
            const dayKey = b.bookedAt.slice(0, 10);
            if (!dailyTrendMap[dayKey]) {
                dailyTrendMap[dayKey] = { date: dayKey, revenue: 0, count: 0 };
            }
            dailyTrendMap[dayKey].revenue += b.totalAmount;
            dailyTrendMap[dayKey].count += 1;
            const empKey = b.bookedVia || "Unspecified";
            dailyTrendMap[dayKey][empKey] = (dailyTrendMap[dayKey][empKey] || 0) + b.totalAmount;
        }

        const dailyTrends = Object.values(dailyTrendMap).sort((a, b) => a.date.localeCompare(b.date));

        // Booking module split
        const staycationStats = {
            count: unified.filter((b) => b.type === "staycation").length,
            revenue: unified.filter((b) => b.type === "staycation").reduce((sum, b) => sum + b.totalAmount, 0),
        };
        const digitalDiariesStats = {
            count: unified.filter((b) => b.type === "digital_diaries").length,
            revenue: unified.filter((b) => b.type === "digital_diaries").reduce((sum, b) => sum + b.totalAmount, 0),
        };

        return res.json({
            success: true,
            filter: {
                date: date || null,
                startDate: filterStart ? filterStart.toISOString() : null,
                endDate: filterEnd ? filterEnd.toISOString() : null,
                period: period || "this_month",
                type: type || "all",
                source: source || "all",
            },
            stats: {
                totalRevenue,
                totalAdvance,
                totalBookings,
                avgBookingValue,
                topEmployee: byEmployee.length > 0 ? byEmployee[0] : null,
                staycationStats,
                digitalDiariesStats,
            },
            byEmployee,
            dailyTrends,
            bookings: unified,
        });
    } catch (error: any) {
        console.error("Employee attribution error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});

export default router;
