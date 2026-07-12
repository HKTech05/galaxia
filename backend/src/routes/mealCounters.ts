import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Helper to get local date string YYYY-MM-DD in IST
function getLocalDateStr(date: Date = new Date()) {
    const local = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return local.toISOString().split("T")[0];
}

// GET /api/meal-counters — Get counts for a date (defaults to today)
router.get("/", authMiddleware, async (req, res) => {
    try {
        const dateStr = (req.query.date as string) || getLocalDateStr();
        
        const filterDate = new Date(dateStr);
        const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59, 999);

        // Fetch active bookings for the day
        const activeBookings = await prisma.staycationBooking.findMany({
            where: {
                status: "checked_in",
                checkInDate: { lte: endOfDay },
                checkOutDate: { gte: startOfDay },
                property: {
                    slug: { in: ["ambrose", "amstel-nest"] }
                },
                assignedUnit: { not: null }
            },
            select: {
                id: true,
                bookingRef: true,
                customerName: true,
                assignedUnit: true,
                numGuests: true,
                checkInDate: true,
                checkOutDate: true
            }
        });

        // Filter out placeholders
        const filteredBookings = activeBookings.filter(b => b.assignedUnit && b.assignedUnit.trim() !== "" && b.assignedUnit !== "Standard Cottage");

        // Fetch existing meal records for this date
        const mealRecords = await prisma.bookingMealRecord.findMany({
            where: { date: dateStr }
        });

        // Map them together
        const bookingsWithMeals = filteredBookings.map(b => {
            const record = mealRecords.find(r => r.bookingId === b.id);

            // Local date formatted string YYYY-MM-DD
            const checkInStr = b.checkInDate.toISOString().split("T")[0];
            const checkOutStr = b.checkOutDate.toISOString().split("T")[0];

            const isCheckInDay = (checkInStr === dateStr);
            const isCheckOutDay = (checkOutStr === dateStr);

            const guestsCount = b.numGuests || 0;

            const breakfastEligible = isCheckOutDay || (!isCheckInDay && !isCheckOutDay);
            const lunchEligible = isCheckInDay || (!isCheckInDay && !isCheckOutDay);
            const dinnerEligible = isCheckInDay || (!isCheckInDay && !isCheckOutDay);

            return {
                bookingId: b.id,
                bookingRef: b.bookingRef,
                guestName: b.customerName,
                villaName: b.assignedUnit!,
                numGuests: guestsCount,
                breakfast: record ? record.breakfast : 0,
                lunch: record ? record.lunch : 0,
                dinner: record ? record.dinner : 0,
                breakfastEligible: breakfastEligible ? guestsCount : 0,
                lunchEligible: lunchEligible ? guestsCount : 0,
                dinnerEligible: dinnerEligible ? guestsCount : 0,
                isNewGuest: isCheckInDay
            };
        });

        // Compute aggregates
        const totalGuests = bookingsWithMeals.reduce((sum, b) => sum + b.numGuests, 0);
        const breakfastEaten = bookingsWithMeals.reduce((sum, b) => sum + b.breakfast, 0);
        const lunchEaten = bookingsWithMeals.reduce((sum, b) => sum + b.lunch, 0);
        const dinnerEaten = bookingsWithMeals.reduce((sum, b) => sum + b.dinner, 0);

        const breakfastTotal = bookingsWithMeals.reduce((sum, b) => sum + b.breakfastEligible, 0);
        const lunchTotal = bookingsWithMeals.reduce((sum, b) => sum + b.lunchEligible, 0);
        const dinnerTotal = bookingsWithMeals.reduce((sum, b) => sum + b.dinnerEligible, 0);

        let breakfastEatenNew = 0;
        let breakfastEatenCont = 0;
        let breakfastTotalNew = 0;
        let breakfastTotalCont = 0;

        let lunchEatenNew = 0;
        let lunchEatenCont = 0;
        let lunchTotalNew = 0;
        let lunchTotalCont = 0;

        let dinnerEatenNew = 0;
        let dinnerEatenCont = 0;
        let dinnerTotalNew = 0;
        let dinnerTotalCont = 0;

        bookingsWithMeals.forEach(b => {
            if (b.isNewGuest) {
                breakfastEatenNew += b.breakfast;
                breakfastTotalNew += b.breakfastEligible;
                lunchEatenNew += b.lunch;
                lunchTotalNew += b.lunchEligible;
                dinnerEatenNew += b.dinner;
                dinnerTotalNew += b.dinnerEligible;
            } else {
                breakfastEatenCont += b.breakfast;
                breakfastTotalCont += b.breakfastEligible;
                lunchEatenCont += b.lunch;
                lunchTotalCont += b.lunchEligible;
                dinnerEatenCont += b.dinner;
                dinnerTotalCont += b.dinnerEligible;
            }
        });

        return res.json({
            date: dateStr,
            totalGuests,
            breakfastEaten,
            lunchEaten,
            dinnerEaten,
            breakfastTotal,
            lunchTotal,
            dinnerTotal,
            breakdown: {
                breakfast: { eatenNew: breakfastEatenNew, totalNew: breakfastTotalNew, eatenCont: breakfastEatenCont, totalCont: breakfastTotalCont },
                lunch: { eatenNew: lunchEatenNew, totalNew: lunchTotalNew, eatenCont: lunchEatenCont, totalCont: lunchTotalCont },
                dinner: { eatenNew: dinnerEatenNew, totalNew: dinnerTotalNew, eatenCont: dinnerEatenCont, totalCont: dinnerTotalCont }
            },
            bookings: bookingsWithMeals
        });
    } catch (err: any) {
        console.error("Error in GET /meal-counters:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/meal-counters/update — Update meal counts for a specific booking
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { date, bookingId, breakfast, lunch, dinner } = req.body;
        const dateStr = date || getLocalDateStr();
        const bId = parseInt(bookingId);

        if (isNaN(bId)) {
            return res.status(400).json({ error: "bookingId is required and must be an integer" });
        }

        // Verify booking exists
        const booking = await prisma.staycationBooking.findUnique({
            where: { id: bId }
        });
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const maxGuests = booking.numGuests || 0;

        // Upsert record
        const counter = await prisma.bookingMealRecord.upsert({
            where: {
                date_bookingId: {
                    date: dateStr,
                    bookingId: bId
                }
            },
            update: {
                breakfast: breakfast !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(breakfast))) : undefined,
                lunch: lunch !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(lunch))) : undefined,
                dinner: dinner !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(dinner))) : undefined
            },
            create: {
                date: dateStr,
                bookingId: bId,
                breakfast: breakfast !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(breakfast))) : 0,
                lunch: lunch !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(lunch))) : 0,
                dinner: dinner !== undefined ? Math.min(maxGuests, Math.max(0, parseInt(dinner))) : 0
            }
        });

        return res.json({ success: true, counter });
    } catch (err: any) {
        console.error("Error in POST /meal-counters/update:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
