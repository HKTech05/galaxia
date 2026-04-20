const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
    const r = await p.ddBooking.update({
        where: { id: 252 },
        data: { bookingDate: new Date("2026-04-22T00:00:00") }
    });
    console.log("Updated:", r.id, r.bookingRef, "new date:", r.bookingDate);
    await p.$disconnect();
})();
