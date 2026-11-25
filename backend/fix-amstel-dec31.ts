const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.propertyPricing.findMany({ where: { id: { in: [316, 322] } }, select: { id: true, propertyId: true, subPropertyId: true, dayType: true, overrideDate: true, basePrice: true, extraAdultPrice: true, kidsPrice: true, personsLabel: true } });
  console.log('BEFORE:', JSON.stringify(rows, null, 2));
  const result = await prisma.propertyPricing.updateMany({ where: { id: { in: [316, 322] } }, data: { extraAdultPrice: 5000, kidsPrice: 3000 } });
  console.log('Updated:', result.count, 'rows');
  const after = await prisma.propertyPricing.findMany({ where: { id: { in: [316, 322] } }, select: { id: true, extraAdultPrice: true, kidsPrice: true, personsLabel: true } });
  console.log('AFTER:', JSON.stringify(after, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
