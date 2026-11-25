import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // Find Amstel property
  const props = await prisma.property.findMany({ select: { id: true, name: true } });
  console.log("=== ALL PROPERTIES ===");
  props.forEach(p => console.log(`  ${p.id}: ${p.name}`));

  // Find Amstel Nest pricing (all rows)
  const amstel = await prisma.propertyPricing.findMany({
    where: { property: { name: { contains: 'Amstel' } } },
    orderBy: [{ subPropertyId: 'asc' }, { dayType: 'asc' }, { overrideDate: 'asc' }],
  });
  console.log(`\n=== AMSTEL PRICING (${amstel.length} rows) ===`);
  amstel.forEach(r => console.log(JSON.stringify({
    id: r.id, propId: r.propertyId, subPropId: r.subPropertyId,
    dayType: r.dayType, basePrice: r.basePrice, personsLabel: r.personsLabel,
    extraAdult: r.extraAdultPrice, kids: r.kidsPrice,
    overrideDate: r.overrideDate, isActive: r.isActive
  })));

  await prisma.$disconnect();
})();
