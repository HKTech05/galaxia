/**
 * One-time migration script: Fix walk-in/manual staycation booking dates
 * Shifts checkInDate and checkOutDate forward by 1 day for all
 * manual bookings (source = 'reception' or 'admin') that have the timezone bug.
 * 
 * DOES NOT touch website bookings.
 * 
 * Run: npx ts-node scripts/fix-walkin-dates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Finding all WALKIN/MANUAL staycation bookings...\n");

    const manualBookings = await prisma.staycationBooking.findMany({
        where: {
            source: { in: ["reception", "admin"] },
        },
        select: {
            id: true,
            bookingRef: true,
            customerName: true,
            checkInDate: true,
            checkOutDate: true,
            source: true,
        },
        orderBy: { id: "asc" },
    });

    console.log(`Found ${manualBookings.length} manual/walk-in bookings to fix.\n`);

    if (manualBookings.length === 0) {
        console.log("✅ No manual bookings found. Nothing to do.");
        return;
    }

    let fixed = 0;
    for (const booking of manualBookings) {
        const oldCheckIn = new Date(booking.checkInDate);
        const oldCheckOut = new Date(booking.checkOutDate);

        // Shift both dates forward by 1 day
        const newCheckIn = new Date(oldCheckIn);
        newCheckIn.setDate(newCheckIn.getDate() + 1);

        const newCheckOut = new Date(oldCheckOut);
        newCheckOut.setDate(newCheckOut.getDate() + 1);

        console.log(
            `[${booking.bookingRef}] ${booking.customerName} (${booking.source})` +
            `\n  Check-in:  ${oldCheckIn.toISOString().slice(0, 10)} → ${newCheckIn.toISOString().slice(0, 10)}` +
            `\n  Check-out: ${oldCheckOut.toISOString().slice(0, 10)} → ${newCheckOut.toISOString().slice(0, 10)}\n`
        );

        await prisma.staycationBooking.update({
            where: { id: booking.id },
            data: {
                checkInDate: newCheckIn,
                checkOutDate: newCheckOut,
            },
        });
        fixed++;
    }

    console.log(`\n✅ Done! Fixed ${fixed} bookings.`);
}

main()
    .catch((err) => {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
