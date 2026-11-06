import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prop = await prisma.property.findFirst({ where: { slug: 'la-paraiso' } });
  console.log('Property:', prop?.id, prop?.name, prop?.slug);
  
  if (prop) {
    const rows = await prisma.propertyPricing.findMany({
      where: { propertyId: prop.id },
      select: { id: true, dayType: true, basePrice: true, personsLabel: true, overrideDate: true }
    });
    console.log('\nPricing rows:');
    console.log(JSON.stringify(rows, null, 2));
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
