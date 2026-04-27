const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const records = await p.propertyPricing.findMany({
    where: { propertyId: 5, isActive: true, overrideDate: null },
    orderBy: { id: "asc" },
  });
  for (const r of records) {
    console.log(`ID=${r.id}, dayType=${r.dayType}, basePrice=${r.basePrice}, extraAdult=${r.extraAdultPrice}, subPropertyId=${r.subPropertyId}, persons=${r.personsLabel}`);
  }
  await p.$disconnect();
})();
