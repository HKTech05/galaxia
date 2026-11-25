import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // Fix subProperty 1 base rows - revert extraAdult from 5000->2000, kids from 3000->1000
  const result = await prisma.propertyPricing.updateMany({
    where: {
      propertyId: 5,
      subPropertyId: 1,
      overrideDate: null, // only base rows
    },
    data: {
      extraAdultPrice: 2000,
      kidsPrice: 1000,
    },
  });
  console.log(`Fixed ${result.count} base rows for Amstel subProperty 1`);

  // Also delete the Oct 31 override if it exists (it was for a past date)
  const oct31 = await prisma.propertyPricing.findMany({
    where: {
      propertyId: 5,
      overrideDate: new Date('2026-10-31'),
    },
  });
  console.log(`\nOct 31 override rows found: ${oct31.length}`);
  if (oct31.length > 0) {
    oct31.forEach(r => console.log(JSON.stringify({ id: r.id, subPropId: r.subPropertyId, dayType: r.dayType, basePrice: r.basePrice, extraAdult: r.extraAdultPrice, kids: r.kidsPrice })));
    const del = await prisma.propertyPricing.deleteMany({
      where: { propertyId: 5, overrideDate: new Date('2026-10-31') },
    });
    console.log(`Deleted ${del.count} stale Oct 31 override rows`);
  }

  // Verify
  const verify = await prisma.propertyPricing.findMany({
    where: { propertyId: 5, subPropertyId: 1, overrideDate: null },
  });
  console.log('\n=== VERIFIED BASE ROWS (subProp 1) ===');
  verify.forEach(r => console.log(JSON.stringify({ id: r.id, dayType: r.dayType, extraAdult: r.extraAdultPrice, kids: r.kidsPrice })));

  await prisma.$disconnect();
})();
