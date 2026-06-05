import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";

async function main() {
    const bookings = await prisma.staycationBooking.findMany({
        where: {
            propertyId: 5,
            numCottages: { gt: 1 }
        },
        select: {
            id: true,
            bookingRef: true,
            customerName: true,
            numCottages: true,
            numNights: true,
            nightlyRate: true,
            basePrice: true,
            totalAmount: true,
            discountAmount: true,
            source: true,
            checkInDate: true
        }
    });

    console.log("AMSTEL NEST MULTI-COTTAGE BOOKINGS FOUND:", bookings.length);
    console.log(JSON.stringify(bookings, null, 2));
}

main().catch(console.error);
