import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fix La Paraiso weekday price: 3950 -> 4950
  const result = await prisma.propertyPricing.updateMany({
    where: {
      property: { slug: 'la-paraiso' },
      dayType: 'weekday',
      overrideDate: null
    },
    data: { basePrice: 4950 }
  });
  console.log(`Updated ${result.count} weekday row(s) to 4950`);

  // Verify
  const rows = await prisma.propertyPricing.findMany({
    where: { property: { slug: 'la-paraiso' } },
    select: { id: true, dayType: true, basePrice: true, personsLabel: true, overrideDate: true }
  });
  console.log('\nVerification - all La Paraiso pricing rows:');
  for (const r of rows) {
    console.log(`  [${r.dayType}] price=${r.basePrice} persons="${r.personsLabel}" override=${r.overrideDate}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
