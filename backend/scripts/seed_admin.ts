import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'antigravity';
    const password = 'antigravity@2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.adminAccount.upsert({
        where: { username },
        update: {
            passwordHash: hashedPassword,
            isActive: true,
            role: 'developer'
        },
        create: {
            username,
            email: 'antigravity@galaxia.com',
            passwordHash: hashedPassword,
            displayName: 'Antigravity Dev',
            role: 'developer',
            isActive: true
        }
    });

    console.log('Admin account "antigravity" created/updated.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
