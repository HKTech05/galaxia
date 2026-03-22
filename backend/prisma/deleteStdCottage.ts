import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const sc = await p.subProperty.findFirst({ where: { slug: 'standard-cottage' } });
  if (sc) {
    console.log('Deleting Standard Cottage id:', sc.id);
    await p.staycationBooking.deleteMany({ where: { subPropertyId: sc.id } });
    await p.subProperty.delete({ where: { id: sc.id } });
    console.log('Deleted!');
  } else {
    console.log('Standard Cottage not found');
  }
  await p.$disconnect();
}
main();
