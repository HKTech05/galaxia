
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixPasswords() {
  try {
    const owner = await prisma.adminAccount.findUnique({ where: { username: 'owner' } });
    if (owner) {
      const hashed = await bcrypt.hash('galaxia2026', 10);
      await prisma.adminAccount.update({
        where: { id: owner.id },
        data: { passwordHash: hashed, isActive: true }
      });
      console.log("Owner password reset to galaxia2026");
    }

    const reception = await prisma.adminAccount.findUnique({ where: { username: 'reception' } });
    if (reception) {
      const hashed = await bcrypt.hash('reception2026', 10);
      await prisma.adminAccount.update({
        where: { id: reception.id },
        data: { passwordHash: hashed, isActive: true }
      });
      console.log("Reception password reset to reception2026");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
