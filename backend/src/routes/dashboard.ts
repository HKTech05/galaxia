import { Router } from "express";
import prisma from "../lib/prisma";
import { encrypt, decrypt } from "../lib/encryption";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/admin/dashboard — Dashboard KPIs and chart data
router.get("/", authMiddleware, requireRole("owner", "developer", "manager"), async (req, res) => {
    try {
        const { period } = req.query; // '1month', '3months', '6months', 'year'
        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1);

        if (period === "3months") startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        else if (period === "6months") startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        else if (period === "year") startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);

        // ── KPI aggregations ──
        const activeStayFilter = { bookedAt: { gte: startDate } };
        const activeDdFilter: any = { bookedAt: { gte: startDate }, isMaintenance: false };

        const stayRevenue = await prisma.staycationBooking.aggregate({
            _sum: { totalAmount: true },
            where: activeStayFilter,
        });
        const ddRevenue = await prisma.ddBooking.aggregate({
            _sum: { totalAmount: true },
            where: activeDdFilter,
        });
        const totalStayBookings = await prisma.staycationBooking.count({
            where: activeStayFilter,
        });
        const totalDdBookings = await prisma.ddBooking.count({
            where: activeDdFilter,
        });
        const stayBookingsForNights = await prisma.staycationBooking.findMany({
            where: activeStayFilter,
            select: { numNights: true },
        });
        const totalNightsBooked = stayBookingsForNights.reduce((sum: number, b) => sum + b.numNights, 0);

        // ── Villa-wise chart data ──
        const allStayBookings = await prisma.staycationBooking.findMany({
            where: { bookedAt: { gte: startDate } },
            include: { property: true, subProperty: true },
        });

        // Ambrose pie chart: { name, sales, nights, fill }
        const ambroseColors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];
        const ambroseVillas: Record<string, { sales: number; nights: number }> = {};
        const amstelVillas: Record<string, { sales: number; nights: number }> = {};
        const standaloneVillas: Record<string, { sales: number; nights: number }> = {};
        const standaloneColors: Record<string, string> = {
            "Hill View": "#10b981",
            "Mount View": "#3b82f6",
            "La Paraiso": "#f59e0b",
            "Euphoria": "#ec4899",
            "Heavenly Villa": "#8b5cf6",
        };

        for (const b of allStayBookings) {
            const propName = b.property?.name || "Unknown";
            if (propName === "Ambrose" && b.subProperty) {
                const villa = b.subProperty.name;
                if (!ambroseVillas[villa]) ambroseVillas[villa] = { sales: 0, nights: 0 };
                ambroseVillas[villa].sales += b.totalAmount;
                ambroseVillas[villa].nights += b.numNights;
            } else if (propName === "Amstel Nest" && b.subProperty) {
                const villa = b.subProperty.name;
                if (!amstelVillas[villa]) amstelVillas[villa] = { sales: 0, nights: 0 };
                amstelVillas[villa].sales += b.totalAmount;
                amstelVillas[villa].nights += b.numNights;
            } else if (!b.subProperty) {
                if (!standaloneVillas[propName]) standaloneVillas[propName] = { sales: 0, nights: 0 };
                standaloneVillas[propName].sales += b.totalAmount;
                standaloneVillas[propName].nights += b.numNights;
            }
        }

        const ambroseChart = Object.entries(ambroseVillas).map(([name, data], i) => ({
            name, sales: data.sales, nights: data.nights, fill: ambroseColors[i % ambroseColors.length],
        }));
        const amstelSales = Object.entries(amstelVillas).map(([villa, data]) => ({ villa, sales: data.sales }));
        const amstelNights = Object.entries(amstelVillas).map(([villa, data]) => ({ villa, nights: data.nights }));
        const standaloneChart = Object.entries(standaloneVillas).map(([name, data]) => ({
            name, sales: data.sales, nights: data.nights, fill: standaloneColors[name] || "#6b7280",
        }));

        // ── Earnings charts ──
        // Daily earnings for the last 30 days (1-month view)
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const stayDaily = await prisma.staycationBooking.findMany({
            where: { bookedAt: { gte: thirtyDaysAgo }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const ddDaily = await prisma.ddBooking.findMany({
            where: { bookedAt: { gte: thirtyDaysAgo }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const dailyMap: Record<string, { staycation: number; dd: number }> = {};
        for (let d = 0; d <= 30; d++) {
            const day = new Date(thirtyDaysAgo.getTime() + d * 86400000);
            const key = `${day.getDate()}/${day.getMonth() + 1}`;
            dailyMap[key] = { staycation: 0, dd: 0 };
        }
        for (const b of stayDaily) {
            const d = b.bookedAt;
            const key = `${d.getDate()}/${d.getMonth() + 1}`;
            if (dailyMap[key]) dailyMap[key].staycation += b.totalAmount;
        }
        for (const b of ddDaily) {
            const d = b.bookedAt;
            const key = `${d.getDate()}/${d.getMonth() + 1}`;
            if (dailyMap[key]) dailyMap[key].dd += b.totalAmount;
        }
        const earnings1Month = Object.entries(dailyMap).map(([period, data]) => ({
            period, staycation: data.staycation, dd: data.dd, total: data.staycation + data.dd,
        }));

        // Monthly earnings for the last 12 months
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        const stayMonthly = await prisma.staycationBooking.findMany({
            where: { bookedAt: { gte: yearAgo }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const ddMonthly = await prisma.ddBooking.findMany({
            where: { bookedAt: { gte: yearAgo }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyMap: Record<string, { staycation: number; dd: number }> = {};
        for (let m = 0; m < 12; m++) {
            const ref = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1);
            const key = `${monthNames[ref.getMonth()]} ${String(ref.getFullYear()).slice(2)}`;
            monthlyMap[key] = { staycation: 0, dd: 0 };
        }
        for (const b of stayMonthly) {
            const d = b.bookedAt;
            const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
            if (monthlyMap[key]) monthlyMap[key].staycation += b.totalAmount;
        }
        for (const b of ddMonthly) {
            const d = b.bookedAt;
            const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
            if (monthlyMap[key]) monthlyMap[key].dd += b.totalAmount;
        }
        const earningsYearly = Object.entries(monthlyMap).map(([period, data]) => ({
            period, staycation: data.staycation, dd: data.dd, total: data.staycation + data.dd,
        }));

        // ── DD booking sources ──
        const ddWebsiteCount = await prisma.ddBooking.count({
            where: { bookedAt: { gte: startDate }, source: "website", status: { notIn: ["cancelled", "no_show", "transferred"] } },
        });
        const ddWalkInCount = await prisma.ddBooking.count({
            where: { bookedAt: { gte: startDate }, source: "reception", status: { notIn: ["cancelled", "no_show", "transferred"] } },
        });

        // ── DD screen & package chart data ──
        const allDdBookings = await prisma.ddBooking.findMany({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            include: { screen: true, package: true },
        });
        const ddScreenMap: Record<string, number> = {};
        const ddPackageMap: Record<string, { revenue: number; bookings: number }> = {};
        for (const b of allDdBookings) {
            const screenName = b.screen?.name?.replace(/\s*\(.*\)$/, '') || "Unknown";
            ddScreenMap[screenName] = (ddScreenMap[screenName] || 0) + b.totalAmount;
            const pkgName = b.package?.name || "Unknown";
            if (!ddPackageMap[pkgName]) ddPackageMap[pkgName] = { revenue: 0, bookings: 0 };
            ddPackageMap[pkgName].revenue += b.totalAmount;
            ddPackageMap[pkgName].bookings += 1;
        }
        const ddScreenChart = Object.entries(ddScreenMap).map(([screen, revenue]) => ({ screen, revenue }));
        const ddPackageChart = Object.entries(ddPackageMap).map(([pkg, data]) => ({ package: pkg, revenue: data.revenue, bookings: data.bookings }));

        // ── Recent bookings (live feed) ──
        const recentStay = await prisma.staycationBooking.findMany({
            take: 10, orderBy: { bookedAt: "desc" }, include: { property: true },
        });
        const recentDd = await prisma.ddBooking.findMany({
            take: 10, orderBy: { bookedAt: "desc" }, include: { screen: true },
        });

        return res.json({
            kpis: {
                totalRevenue: (stayRevenue._sum.totalAmount || 0) + (ddRevenue._sum.totalAmount || 0),
                totalReservations: totalStayBookings + totalDdBookings,
                staycationRevenue: stayRevenue._sum.totalAmount || 0,
                ddRevenue: ddRevenue._sum.totalAmount || 0,
                totalStayBookings,
                totalDdBookings,
                totalNightsBooked,
            },
            charts: {
                ambrose: ambroseChart,
                amstelSales,
                amstelNights,
                standaloneVillas: standaloneChart,
                earnings1Month,
                earningsYearly,
                ddScreen: ddScreenChart,
                ddPackage: ddPackageChart,
            },
            ddBookingSources: { website: ddWebsiteCount, walkIn: ddWalkInCount },
            recentStayBookings: recentStay.map(b => ({
                id: b.bookingRef, guest: b.customerName, property: b.property.name,
                total: b.totalAmount, status: b.status,
                phone: b.customerPhone ? decrypt(b.customerPhone) : "—",
            })),
            recentDdBookings: recentDd.map(b => ({
                id: b.bookingRef, guest: b.customerName, screen: b.screen.name,
                total: b.totalAmount, status: b.status,
                phone: b.customerPhone ? decrypt(b.customerPhone) : "—",
            })),
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
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
            select: { totalAmount: true, bookedAt: true },
        });
        const ddBookings = await prisma.ddBooking.findMany({
            where: { bookedAt: { gte: startDate }, status: { notIn: ["cancelled", "no_show", "transferred"] } },
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
        // For @db.Date fields, normalize to UTC midnight
        const todayStr = date ? (date as string) : targetDate.toISOString().split('T')[0];
        const todayStart = new Date(todayStr + 'T00:00:00.000Z');
        const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

        console.log(`[property-status] date param: ${date}, todayStr: ${todayStr}, todayStart: ${todayStart.toISOString()}, todayEnd: ${todayEnd.toISOString()}`);

        const properties = await prisma.property.findMany({
            where: { isActive: true },
            include: { subProperties: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } },
            orderBy: { displayOrder: 'asc' }
        });

        const activeBookings = await prisma.staycationBooking.findMany({
            where: {
                checkInDate: { lte: todayEnd },
                checkOutDate: { gte: todayStart },
                status: { in: ["confirmed", "checked_in", "checked_out"] },
            },
            include: {
                property: true,
                subProperty: true,
                extraGuests: true,
                foodBills: true,
            },
        });

        console.log(`[property-status] Found ${activeBookings.length} active bookings for ${todayStr}`);
        activeBookings.forEach(b => {
            console.log(`  booking #${b.id}: ${b.customerName} @ propId=${b.propertyId} subPropId=${b.subPropertyId} status=${b.status} checkIn=${b.checkInDate} checkOut=${b.checkOutDate}`);
        });

        // Fetch matching UpiPayments for active bookings (case-insensitive, optional leading #)
        const bookingRefs = activeBookings.map(b => b.bookingRef).filter(Boolean) as string[];
        const normalizedRefs: string[] = [];
        bookingRefs.forEach(r => {
            const clean = r.replace("#", "").trim();
            normalizedRefs.push(clean);
            normalizedRefs.push(clean.toLowerCase());
            normalizedRefs.push(clean.toUpperCase());
            normalizedRefs.push(`#${clean}`);
            normalizedRefs.push(`#${clean.toLowerCase()}`);
            normalizedRefs.push(`#${clean.toUpperCase()}`);
        });

        const upiPayments = normalizedRefs.length > 0 ? await prisma.upiPayment.findMany({
            where: {
                bookingRef: { in: Array.from(new Set(normalizedRefs)) },
            }
        }) : [];

        // Decorate properties with check-in info for frontend
        const decoratedProperties = properties.map(p => {
            const propBookings = activeBookings.filter(b => b.propertyId === p.id && !b.subPropertyId);
            const isBooked = propBookings.some(b => {
                const checkInStr = new Date(b.checkInDate).toISOString().split('T')[0];
                const checkOutStr = new Date(b.checkOutDate).toISOString().split('T')[0];
                return checkOutStr !== todayStr || checkInStr === todayStr;
            });
            const booking = propBookings[0];

            const propUpiPayments = booking ? upiPayments.filter(upi => {
                if (!upi.bookingRef || !booking.bookingRef) return false;
                const uRef = upi.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                const bRef = booking.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                return uRef === bRef;
            }) : [];
            const balanceUpi = propUpiPayments.find(upi => upi.paymentType === "balance" && (upi.proofImageKey || upi.proofImageUrl));
            const depositUpi = propUpiPayments.find(upi => upi.paymentType === "deposit" && (upi.proofImageKey || upi.proofImageUrl));

            return {
                ...p,
                villas: (p.subProperties || []).map(sp => {
                    const spBookings = activeBookings.filter(b => b.subPropertyId === sp.id);
                    const isSpBooked = spBookings.some(b => {
                        const checkInStr = new Date(b.checkInDate).toISOString().split('T')[0];
                        const checkOutStr = new Date(b.checkOutDate).toISOString().split('T')[0];
                        return checkOutStr !== todayStr || checkInStr === todayStr;
                    });
                    const spBooking = spBookings[0];

                    const spUpiPayments = spBooking ? upiPayments.filter(upi => {
                        if (!upi.bookingRef || !spBooking.bookingRef) return false;
                        const uRef = upi.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const bRef = spBooking.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                        return uRef === bRef;
                    }) : [];
                    const spBalanceUpi = spUpiPayments.find(upi => upi.paymentType === "balance" && (upi.proofImageKey || upi.proofImageUrl));
                    const spDepositUpi = spUpiPayments.find(upi => upi.paymentType === "deposit" && (upi.proofImageKey || upi.proofImageUrl));

                    return {
                        ...sp,
                        checkedIn: isSpBooked && spBooking?.status === 'checked_in',
                        booked: isSpBooked,
                        bookingStatus: spBooking?.status || null,
                        guest: spBooking?.customerName || null,
                        guests: spBooking?.numGuests || 0,
                        kids: spBooking?.numKids || 0,
                        phone: spBooking?.customerPhone ? decrypt(spBooking.customerPhone) : null,
                        checkInDate: spBooking?.checkInDate ? new Date(spBooking.checkInDate).toLocaleDateString('en-IN') : null,
                        checkOutDate: spBooking?.checkOutDate ? new Date(spBooking.checkOutDate).toLocaleDateString('en-IN') : null,
                        isCheckinDay: spBooking ? new Date(spBooking.checkInDate).toISOString().split('T')[0] === todayStr : false,
                        isCheckoutDay: spBooking ? new Date(spBooking.checkOutDate).toISOString().split('T')[0] === todayStr : false,
                        balanceCollected: spBooking?.balanceCollected || false,
                        balanceMode: spBooking?.balanceMethod || "Online",
                        balanceTime: spBooking?.balanceCollectedAt ? new Date(spBooking.balanceCollectedAt).toLocaleString('en-IN') : null,
                        depositCollected: spBooking?.depositCollected || false,
                        depositMode: spBooking?.depositMethod || "UPI",
                        depositTime: spBooking?.depositCollectedAt ? new Date(spBooking.depositCollectedAt).toLocaleString('en-IN') : null,
                        extraGuests: spBooking?.extraGuests || [],
                        balanceUpiId: spBalanceUpi?.id || null,
                        depositUpiId: spDepositUpi?.id || null,
                    };
                }),
                checkedIn: isBooked && booking?.status === 'checked_in',
                booked: isBooked,
                bookingStatus: booking?.status || null,
                guest: booking?.customerName || null,
                guests: booking?.numGuests || 0,
                kids: booking?.numKids || 0,
                phone: booking?.customerPhone ? decrypt(booking.customerPhone) : null,
                checkInDate: booking?.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN') : null,
                checkOutDate: booking?.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-IN') : null,
                isCheckinDay: booking ? new Date(booking.checkInDate).toISOString().split('T')[0] === todayStr : false,
                isCheckoutDay: booking ? new Date(booking.checkOutDate).toISOString().split('T')[0] === todayStr : false,
                balanceCollected: booking?.balanceCollected || false,
                balanceMode: booking?.balanceMethod || "Online",
                balanceTime: booking?.balanceCollectedAt ? new Date(booking.balanceCollectedAt).toLocaleString('en-IN') : null,
                depositCollected: booking?.depositCollected || false,
                depositMode: booking?.depositMethod || "UPI",
                depositTime: booking?.depositCollectedAt ? new Date(booking.depositCollectedAt).toLocaleString('en-IN') : null,
                extraGuests: booking?.extraGuests || [],
                balanceUpiId: balanceUpi?.id || null,
                depositUpiId: depositUpi?.id || null,
            };
        });

        // Decrypt phone numbers in activeBookings for frontend display
        const decryptedBookings = activeBookings.map(b => {
            const bookingUpiPayments = upiPayments.filter(upi => {
                if (!upi.bookingRef || !b.bookingRef) return false;
                const uRef = upi.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                const bRef = b.bookingRef.toLowerCase().replace(/[^a-z0-9]/g, "");
                return uRef === bRef;
            });
            const balanceUpi = bookingUpiPayments.find(upi => upi.paymentType === "balance" && (upi.proofImageKey || upi.proofImageUrl));
            const depositUpi = bookingUpiPayments.find(upi => upi.paymentType === "deposit" && (upi.proofImageKey || upi.proofImageUrl));
            const refundUpi = bookingUpiPayments.find(upi => upi.paymentType === "deposit_refund");
            return {
                ...b,
                customerPhone: b.customerPhone ? decrypt(b.customerPhone) : null,
                balanceUpiId: balanceUpi?.id || null,
                depositUpiId: depositUpi?.id || null,
                refundUpiId: refundUpi?.id || null,
                upiPayments: bookingUpiPayments.map(upi => ({
                    id: upi.id,
                    paymentType: upi.paymentType,
                    amount: upi.amount
                }))
            };
        });

        return res.json({ properties: decoratedProperties, activeBookings: decryptedBookings });
    } catch (error) {
        console.error("Property status error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
