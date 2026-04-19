const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function fix() {
    // Fix DD-20260419-006: amountPaid -> 1100, amountToCollect -> 1100
    const fix006 = await p.ddBooking.updateMany({
        where: { bookingRef: "DD-20260419-006" },
        data: { amountPaid: 1100, amountToCollect: 1100 }
    });
    console.log(`DD-20260419-006: amountPaid -> 1100, amountToCollect -> 1100 (${fix006.count} updated)`);

    // Verify all 4
    const refs = ["DD-20260419-004", "DD-20260419-005", "DD-20260419-006", "DD-20260419-007"];
    const bookings = await p.ddBooking.findMany({
        where: { bookingRef: { in: refs } },
        select: { bookingRef: true, source: true, amountPaid: true, amountToCollect: true, totalAmount: true }
    });
    console.log("Verification:", JSON.stringify(bookings, null, 2));

    await p.$disconnect();
}
fix().catch(e => { console.error(e); process.exit(1); });
