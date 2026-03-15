import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'owner';
    const password = 'galaxia2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure only 'owner' is active
    await prisma.adminAccount.updateMany({
        where: { username: { not: username } },
        data: { isActive: false }
    });

    await prisma.adminAccount.upsert({
        where: { username },
        update: {
            passwordHash: hashedPassword,
            isActive: true,
            role: 'owner'
        },
        create: {
            username,
            email: 'owner@galaxiaresorts.com',
            passwordHash: hashedPassword,
            displayName: 'Galaxia Owner',
            role: 'owner',
            isActive: true
        }
    });

    console.log('Admin account "owner" created/updated and other accounts deactivated.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
