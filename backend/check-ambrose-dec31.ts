import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // Get Ambrose sub-properties
  const subs = await prisma.subProperty.findMany({
    where: { property: { slug: 'ambrose' } },
    select: { id: true, name: true, propertyId: true },
  });
  console.log("=== AMBROSE SUB-PROPERTIES ===");
  subs.forEach(s => console.log(`  ${s.id}: ${s.name} (propId=${s.propertyId})`));

  // Check existing Dec 31 overrides for Ambrose
  const existing = await prisma.propertyPricing.findMany({
    where: { property: { slug: 'ambrose' }, overrideDate: new Date('2026-12-31') },
  });
  console.log(`\n=== EXISTING DEC 31 OVERRIDES FOR AMBROSE (${existing.length} rows) ===`);
  existing.forEach(r => console.log(JSON.stringify({ id: r.id, subPropId: r.subPropertyId, dayType: r.dayType, basePrice: r.basePrice, extraAdult: r.extraAdultPrice, kids: r.kidsPrice })));

  await prisma.$disconnect();
})();
