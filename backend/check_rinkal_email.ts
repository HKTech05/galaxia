import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";
import { decrypt } from "./src/lib/encryption";

async function main() {
    const booking = await prisma.staycationBooking.findUnique({
        where: { id: 771 }
    });
    if (!booking) {
        console.log("No booking 771");
        return;
    }
    const email = booking.customerEmail ? decrypt(booking.customerEmail) : null;
    const phone = decrypt(booking.customerPhone);
    console.log("DECRYPTED DETAILS:");
    console.log("Name:", booking.customerName);
    console.log("Email:", email);
    console.log("Phone:", phone);
}

main().catch(console.error);
