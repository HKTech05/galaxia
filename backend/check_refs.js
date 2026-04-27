const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const b = await p.ddBooking.findMany({
    where: { bookingRef: { startsWith: "DD-2026042" } },
    select: { id: true, bookingRef: true, status: true },
    orderBy: { bookingRef: "desc" },
  });
  console.log(JSON.stringify(b, null, 2));
  await p.$disconnect();
})();
