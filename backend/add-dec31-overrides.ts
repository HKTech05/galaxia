import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const overrideDate = new Date('2026-12-31');
  overrideDate.setUTCHours(0, 0, 0, 0);
  const propertyId = 6; // Ambrose
  const dayType = 'weekday'; // Dec 31 2026 = Thursday

  const overrides = [
    // Take-1 (id=3), Alta (id=4), Santorini (id=5): 24000 up to 4 ppl
    { subPropertyId: 3, basePrice: 24000, personsLabel: '4 with meals' },
    { subPropertyId: 4, basePrice: 24000, personsLabel: '4 with meals' },
    { subPropertyId: 5, basePrice: 24000, personsLabel: '4 with meals' },
    // Cypress (id=7): 13000 for 2 ppl
    { subPropertyId: 7, basePrice: 13000, personsLabel: '2 persons with meals' },
    // Bamboosa (id=6): 30000 up to 4 ppl
    { subPropertyId: 6, basePrice: 30000, personsLabel: '4 with meals' },
  ];

  for (const ov of overrides) {
    await prisma.propertyPricing.create({
      data: {
        propertyId,
        subPropertyId: ov.subPropertyId,
        dayType,
        basePrice: ov.basePrice,
        overrideDate,
        specialLabel: 'Override 2026-12-31',
        personsLabel: ov.personsLabel,
        extraAdultPrice: 5000,
        kidsPrice: 3000,
      },
    });
    console.log(`Created: subProp=${ov.subPropertyId}, price=${ov.basePrice}, extra=5000/3000`);
  }

  // Verify
  const verify = await prisma.propertyPricing.findMany({
    where: { propertyId, overrideDate },
  });
  console.log(`\n=== VERIFIED (${verify.length} rows) ===`);
  verify.forEach(r => console.log(JSON.stringify({
    id: r.id, subPropId: r.subPropertyId, dayType: r.dayType,
    basePrice: r.basePrice, personsLabel: r.personsLabel,
    extraAdult: r.extraAdultPrice, kids: r.kidsPrice,
  })));

  await prisma.$disconnect();
})();
