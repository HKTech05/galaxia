import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // All Dec 31 overrides
  const all = await prisma.propertyPricing.findMany({
    where: { overrideDate: new Date('2026-12-31') },
    include: { property: { select: { name: true } }, subProperty: { select: { name: true } } },
    orderBy: [{ propertyId: 'asc' }, { subPropertyId: 'asc' }],
  });
  console.log(`=== ALL DEC 31 OVERRIDES (${all.length} rows) ===`);
  all.forEach(r => console.log(JSON.stringify({
    id: r.id, prop: r.property?.name, subProp: r.subProperty?.name,
    propId: r.propertyId, subPropId: r.subPropertyId,
    dayType: r.dayType, basePrice: r.basePrice, personsLabel: r.personsLabel,
    extraAdult: r.extraAdultPrice, kids: r.kidsPrice,
  })));

  // Check Amstel base pricing for reference
  const amstelBase = await prisma.propertyPricing.findMany({
    where: { propertyId: 5, overrideDate: null },
    orderBy: [{ subPropertyId: 'asc' }, { dayType: 'asc' }],
  });
  console.log(`\n=== AMSTEL BASE PRICING ===`);
  amstelBase.forEach(r => console.log(JSON.stringify({
    id: r.id, subPropId: r.subPropertyId, dayType: r.dayType,
    basePrice: r.basePrice, personsLabel: r.personsLabel,
    extraAdult: r.extraAdultPrice, kids: r.kidsPrice,
  })));

  await prisma.$disconnect();
})();
