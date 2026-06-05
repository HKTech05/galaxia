import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";

async function main() {
    const booking = await prisma.staycationBooking.findUnique({
        where: { id: 867 },
        include: {
            property: true,
            subProperty: true
        }
    });

    if (!booking) {
        console.log("Could not find booking with ID 867");
        return;
    }

    console.log("BOOKING 867 DETAILS:");
    console.log(JSON.stringify(booking, null, 2));
}

main().catch(console.error);
