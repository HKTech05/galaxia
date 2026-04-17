/**
 * One-time script to fix Ayush Singh's DD booking date from April 17 to April 18.
 * Run with: npx ts-node fix-ayush-booking.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Find Ayush Singh's DD booking on 2026-04-17
    const bookings = await prisma.ddBooking.findMany({
        where: {
            customerName: { contains: "Ayush", mode: "insensitive" },
            bookingDate: new Date("2026-04-17"),
        },
        select: {
            id: true,
            bookingRef: true,
            customerName: true,
            bookingDate: true,
            totalAmount: true,
            amountPaid: true,
            startHour: true,
        },
    });

    console.log("Found DD bookings:", JSON.stringify(bookings, null, 2));

    if (bookings.length === 0) {
        console.log("No matching booking found on April 17. Trying broader search...");
        const allAyush = await prisma.ddBooking.findMany({
            where: { customerName: { contains: "Ayush", mode: "insensitive" } },
            select: {
                id: true,
                bookingRef: true,
                customerName: true,
                bookingDate: true,
                totalAmount: true,
            },
        });
        console.log("All Ayush DD bookings:", JSON.stringify(allAyush, null, 2));
        return;
    }

    for (const booking of bookings) {
        console.log(`\nUpdating DD booking ${booking.bookingRef} (ID: ${booking.id})`);
        console.log(`  Old date: ${booking.bookingDate}`);

        await prisma.ddBooking.update({
            where: { id: booking.id },
            data: {
                bookingDate: new Date("2026-04-18"),
            },
        });

        console.log(`  New date: 2026-04-18`);
        console.log("  ✅ Updated successfully");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
