const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
async function main() {
  const rows = await p.propertyPricing.findMany({
    where: { overrideDate: { gte: new Date('2026-10-02'), lte: new Date('2026-10-04') } },
    include: { property: { select: { name: true } }, subProperty: { select: { name: true } } },
    orderBy: [{ overrideDate: 'asc' }]
  });
  console.log('Found ' + rows.length + ' Oct 2-3 override rows in DB:');
  console.log('DATE       | PROPERTY         | UNIT             | PRICE');
  console.log('-----------|------------------|------------------|------');
  rows.forEach(r => {
    const date = r.overrideDate.toISOString().split('T')[0];
    const prop = r.property.name.padEnd(16);
    const unit = (r.subProperty ? r.subProperty.name : '(parent)').padEnd(16);
    console.log(date + ' | ' + prop + ' | ' + unit + ' | Rs ' + Number(r.basePrice));
  });
}
main().catch(console.error).finally(() => p.$disconnect());
