const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const b = await p.ddBooking.findMany({
    where: { bookingRef: { startsWith: "DD-20260427" } },
    select: { id: true, bookingRef: true, basePrice: true, totalAmount: true, bookedAt: true },
    orderBy: { bookedAt: "asc" },
  });
  b.forEach(x => console.log(`${x.bookingRef} | base=${x.basePrice} | total=${x.totalAmount} | at=${x.bookedAt.toISOString()}`));
  await p.$disconnect();
})();
