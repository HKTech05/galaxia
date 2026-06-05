import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";
import { generateStaycationBookingPDF } from "./src/lib/pdfService";
import { sendOwnerBookingNotification } from "./src/lib/emailService";

async function main() {
    console.log("Starting corrected segregation of Rinkal Sidhiya's bookings...");

    // 1. Clean up previously created Booking 2 if it exists
    const existingBooking2 = await prisma.staycationBooking.findFirst({
        where: { bookingRef: "ST-20260531-001rs" }
    });

    if (existingBooking2) {
        console.log(`Found existing Booking 2 (ID: ${existingBooking2.id}), deleting first for clean run...`);
        await prisma.staycationBooking.delete({
            where: { id: existingBooking2.id }
        });
        console.log("Existing Booking 2 deleted.");
    }

    // 2. Fetch the original corrupted booking (ID 771)
    const originalBooking = await prisma.staycationBooking.findUnique({
        where: { id: 771 },
        include: {
            property: true,
            subProperty: true
        }
    });

    if (!originalBooking) {
        throw new Error("Could not find booking with ID 771. Please verify.");
    }

    console.log("Original Booking Details:", {
        id: originalBooking.id,
        ref: originalBooking.bookingRef,
        name: originalBooking.customerName,
        checkIn: originalBooking.checkInDate,
        checkOut: originalBooking.checkOutDate,
        advance: originalBooking.advanceAmount,
        total: originalBooking.totalAmount,
    });

    // 3. Booking 1 Data (June 7 to June 8, 1 night)
    // base: 6500, extraAdult: 4000, gst: 525, total: 11030, advance: 8820, balance: 2210
    const booking1CheckIn = new Date("2026-06-07T00:00:00.000Z");
    const booking1CheckOut = new Date("2026-06-08T00:00:00.000Z");

    console.log("Updating Booking 1 (ID 771) to match June 7-8...");
    const updatedBooking1 = await prisma.staycationBooking.update({
        where: { id: 771 },
        data: {
            bookingRef: "ST-20260530-001pq", // Keep the original May 30 reference
            checkInDate: booking1CheckIn,
            checkOutDate: booking1CheckOut,
            numNights: 1,
            nightlyRate: 6500,
            basePrice: 6500,
            extraAdultCharge: 4000,
            extraKidsCharge: 0,
            extraPersonCharge: 0,
            gstAmount: 525,
            totalAmount: 11030,
            advanceAmount: 8820,
            balanceAmount: 2210,
            advancePaid: true,
            advanceMethod: originalBooking.advanceMethod || "Razorpay: pay_SvWvpvT8GYzGNn",
            advancePaidAt: originalBooking.advancePaidAt || new Date("2026-05-30T12:00:00Z"),
            status: "confirmed",
            source: "website",
            addons: [
                { name: "Food Preference", foodType: "Regular" }
            ]
        }
    });

    console.log("Booking 1 updated successfully:", {
        id: updatedBooking1.id,
        ref: updatedBooking1.bookingRef,
        total: updatedBooking1.totalAmount,
        advance: updatedBooking1.advanceAmount,
        balance: updatedBooking1.balanceAmount
    });

    // 4. Booking 2 Data (June 6 to June 7, 1 night - Saturday night)
    // base: 8500, extraAdult: 4000, gst: 625, total: 13125, advance: 10500, balance: 2625
    const booking2CheckIn = new Date("2026-06-06T00:00:00.000Z");
    const booking2CheckOut = new Date("2026-06-07T00:00:00.000Z");
    const booking2Ref = "ST-20260531-001rs"; // Unique suffix for Rinkal Sidhiya Booking 2

    console.log("Creating Booking 2 (June 6-7)...");
    const createdBooking2 = await prisma.staycationBooking.create({
        data: {
            bookingRef: booking2Ref,
            userId: originalBooking.userId,
            propertyId: originalBooking.propertyId,
            subPropertyId: originalBooking.subPropertyId,
            customerName: originalBooking.customerName,
            customerPhone: originalBooking.customerPhone,
            customerEmail: originalBooking.customerEmail,
            numGuests: originalBooking.numGuests || 4,
            numKids: originalBooking.numKids || 0,
            numPets: originalBooking.numPets || 0,
            numCottages: originalBooking.numCottages || 1,
            checkInDate: booking2CheckIn,
            checkOutDate: booking2CheckOut,
            numNights: 1,
            nightlyRate: 8500,
            basePrice: 8500,
            extraAdultCharge: 4000,
            extraKidsCharge: 0,
            extraPersonCharge: 0,
            gstAmount: 625,
            totalAmount: 13125,
            advanceAmount: 10500,
            balanceAmount: 2625,
            advancePaid: true,
            advanceMethod: "Razorpay: manual_segregation_booking_2",
            advancePaidAt: new Date("2026-05-31T12:00:00Z"),
            status: "confirmed",
            source: "website",
            addons: [
                { name: "Food Preference", foodType: "Regular" }
            ],
            bookedAt: new Date("2026-05-31T10:00:00Z")
        }
    });

    console.log("Booking 2 created successfully:", {
        id: createdBooking2.id,
        ref: createdBooking2.bookingRef,
        total: createdBooking2.totalAmount,
        advance: createdBooking2.advanceAmount,
        balance: createdBooking2.balanceAmount
    });

    // 5. PDF Generation & Owner Notification
    const b1Full = await prisma.staycationBooking.findUnique({
        where: { id: updatedBooking1.id },
        include: {
            property: { include: { pricing: true } },
            subProperty: { include: { pricing: true } },
            coupon: true
        }
    });

    const b2Full = await prisma.staycationBooking.findUnique({
        where: { id: createdBooking2.id },
        include: {
            property: { include: { pricing: true } },
            subProperty: { include: { pricing: true } },
            coupon: true
        }
    });

    if (!b1Full || !b2Full) {
        throw new Error("Failed to reload full bookings with relations.");
    }

    const { decrypt } = await import("./src/lib/encryption");
    const plainPhone = decrypt(b1Full.customerPhone);
    const plainEmail = b1Full.customerEmail ? decrypt(b1Full.customerEmail) : null;

    console.log("Generating and sending Booking 1 PDF...");
    const pdfBuffer1 = await generateStaycationBookingPDF({
        ...b1Full,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });
    const prop1 = b1Full.property || {};
    const sub1 = b1Full.subProperty;
    const propName1 = sub1 ? `${sub1.name} — ${prop1.name}` : (prop1.name || "Ambrose");

    await sendOwnerBookingNotification({
        bookingRef: b1Full.bookingRef,
        customerName: b1Full.customerName,
        module: "staycation",
        propertyName: propName1,
        pdfBuffer: pdfBuffer1
    });

    console.log("Generating and sending Booking 2 PDF...");
    const pdfBuffer2 = await generateStaycationBookingPDF({
        ...b2Full,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });
    const prop2 = b2Full.property || {};
    const sub2 = b2Full.subProperty;
    const propName2 = sub2 ? `${sub2.name} — ${prop2.name}` : (prop2.name || "Ambrose");

    await sendOwnerBookingNotification({
        bookingRef: b2Full.bookingRef,
        customerName: b2Full.customerName,
        module: "staycation",
        propertyName: propName2,
        pdfBuffer: pdfBuffer2
    });

    console.log("✅ All tasks completed successfully!");
}

main().catch(err => {
    console.error("Fatal error during migration:", err);
    process.exit(1);
});
