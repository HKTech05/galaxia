
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    const admins = await prisma.adminAccount.findMany({
      select: { id: true, username: true, email: true, role: true, displayName: true, propertyId: true }
    });
    console.log(JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();
