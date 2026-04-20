const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    // 1. Delete the manual walk-in duplicate (id: 249)
    // First delete any related records
    await p.ddBookingAddon.deleteMany({ where: { bookingId: 249 } });
    await p.bookingPayment.deleteMany({ where: { ddBookingId: 249 } });
    const deleted = await p.ddBooking.delete({ where: { id: 249 } });
    console.log("Deleted walk-in:", deleted.id, deleted.bookingRef);

    // 2. Get the original transferred booking (id: 169)
    const original = await p.ddBooking.findUnique({
        where: { id: 169 },
        include: { addons: true },
    });
    console.log("Original:", original.id, original.bookingRef, original.status);

    // 3. Create the proper transfer booking (was supposed to be DD-20260419-T03DB3C)
    // Transfer was to April 20, 7:00 PM - 9:00 PM (startHour 19, duration 2)
    const newBooking = await p.ddBooking.create({
        data: {
            screenId: original.screenId,
            packageId: original.packageId,
            bookingDate: new Date("2026-04-20T00:00:00"),
            startHour: 19, // 7 PM as per transfer metadata
            durationHours: original.durationHours,
            customerName: original.customerName,
            customerPhone: original.customerPhone,
            customerEmail: original.customerEmail,
            numGuests: original.numGuests,
            occasion: original.occasion,
            cakeMessage: original.cakeMessage,
            specialRequests: `[TRANSFER:${original.bookingRef}|2026-04-19|5:00 PM-7:00 PM|400]`,
            totalAmount: original.totalAmount + 400,
            amountPaid: original.amountPaid,
            amountToCollect: original.amountToCollect + 400,
            paymentMethod: original.paymentMethod,
            paymentStatus: "partial",
            basePrice: original.basePrice,
            extraPersonCharge: original.extraPersonCharge,
            gstAmount: original.gstAmount,
            bookingRef: "DD-20260419-T03DB3C",
            status: "confirmed",
            source: original.source || "website",
        },
    });
    console.log("Created transfer booking:", newBooking.id, newBooking.bookingRef, newBooking.bookingDate, "startHour:", newBooking.startHour);

    // 4. Copy addons from original
    if (original.addons && original.addons.length > 0) {
        await p.ddBookingAddon.createMany({
            data: original.addons.map((a) => ({
                bookingId: newBooking.id,
                addonType: a.addonType,
                addonValue: a.addonValue,
                price: a.price,
                isPaid: a.isPaid,
                paymentMethod: a.paymentMethod,
            })),
        });
        console.log("Copied", original.addons.length, "addons to new booking");
    }

    console.log("\nDone! Walk-in deleted, proper transfer booking created.");
    await p.$disconnect();
})();
