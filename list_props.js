
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProperties() {
  try {
    const props = await prisma.property.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log(JSON.stringify(props, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

listProperties();
