import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";
import { generateStaycationBookingPDF } from "./src/lib/pdfService";
import { sendOwnerBookingNotification } from "./src/lib/emailService";

async function main() {
    console.log("Starting database correction for Amstel Nest Standard Cottage booking (Ref: ST-20260605-007q2)...");

    // 1. Find the booking by reference
    const booking = await prisma.staycationBooking.findFirst({
        where: { bookingRef: "ST-20260605-007q2" }
    });

    if (!booking) {
        throw new Error("Could not find booking with reference ST-20260605-007q2");
    }

    console.log(`Found booking ID: ${booking.id}. Current nightlyRate: ${booking.nightlyRate}`);

    // 2. Update the nightlyRate to 4950
    const updated = await prisma.staycationBooking.update({
        where: { id: booking.id },
        data: {
            nightlyRate: 4950
        }
    });

    console.log(`Booking nightlyRate updated successfully. New nightlyRate: ${updated.nightlyRate}`);

    // 3. Fetch the updated booking with property and subProperty relations
    const bookingFull = await prisma.staycationBooking.findUnique({
        where: { id: booking.id },
        include: {
            property: { include: { pricing: true } },
            subProperty: { include: { pricing: true } },
            coupon: true
        }
    });

    if (!bookingFull) {
        throw new Error("Failed to load booking with relations.");
    }

    // 4. Decrypt customer contact details
    const { decrypt } = await import("./src/lib/encryption");
    const plainPhone = decrypt(bookingFull.customerPhone);
    const plainEmail = bookingFull.customerEmail ? decrypt(bookingFull.customerEmail) : null;

    console.log(`Decrypted customer contact details: Phone: ${plainPhone}, Email: ${plainEmail}`);

    // 5. Generate the corrected PDF voucher
    console.log("Generating corrected PDF voucher...");
    const pdfBuffer = await generateStaycationBookingPDF({
        ...bookingFull,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });

    // 6. Send notification to owner (bookings@galaxiaresorts.com)
    console.log("Sending email notification to bookings@galaxiaresorts.com...");
    const prop = bookingFull.property || {};
    const sub = bookingFull.subProperty;
    const propName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Amstel Nest");

    await sendOwnerBookingNotification({
        bookingRef: bookingFull.bookingRef,
        customerName: bookingFull.customerName,
        module: "staycation",
        propertyName: propName,
        pdfBuffer: pdfBuffer
    });

    console.log("✅ Fix and notification completed successfully!");
}

main().catch(err => {
    console.error("Fatal error during database correction:", err);
    process.exit(1);
});
