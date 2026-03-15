import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'owner';
  const password = 'galaxia2026';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminAccount.upsert({
    where: { username },
    update: { 
      passwordHash,
      isActive: true,
      role: 'owner',
      email: 'owner@galaxiaresorts.com'
    },
    create: {
      username,
      email: 'owner@galaxiaresorts.com',
      passwordHash,
      displayName: 'Galaxia Owner',
      role: 'owner',
      isActive: true
    }
  });

  console.log(`Admin account ${username} updated/created successfully.`);
  
  // Also fix antigravity account if needed
  const antigravityHash = await bcrypt.hash('galaxia2026', 10);
  await prisma.adminAccount.upsert({
    where: { username: 'antigravity' },
    update: { 
      passwordHash: antigravityHash,
      isActive: true,
      role: 'developer',
      email: 'dev@galaxiaresorts.com'
    },
    create: {
      username: 'antigravity',
      email: 'dev@galaxiaresorts.com',
      passwordHash: antigravityHash,
      displayName: 'Antigravity Dev',
      role: 'developer',
      isActive: true
    }
  });
  console.log(`Admin account antigravity updated/created successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
