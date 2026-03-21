import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'galaxia2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    const accounts = [
        { username: 'owner', email: 'owner@galaxiaresorts.com', displayName: 'Admin User', role: 'owner' },
        { username: 'asmita', email: 'asmita@galaxiaresorts.com', displayName: 'Asmita', role: 'staycation_admin' },
        { username: 'H&H', email: 'hh@galaxiaresorts.com', displayName: 'H&H', role: 'staycation_admin' },
        { username: 'M&L', email: 'ml@galaxiaresorts.com', displayName: 'M&L', role: 'staycation_admin' },
        { username: 'Ambrose', email: 'ambrose@galaxiaresorts.com', displayName: 'Ambrose', role: 'staycation_admin' },
        { username: 'Amstelnest', email: 'amstelnest@galaxiaresorts.com', displayName: 'Amstel Nest', role: 'staycation_admin' },
        { username: 'Developer', email: 'dev@galaxiaresorts.com', displayName: 'Developer', role: 'developer' },
    ];

    // Clean up old accounts that might conflict
    await prisma.adminAccount.deleteMany({
        where: { username: { in: ['dd_admin', 'reception', 'developer'] } }
    });
    console.log('🧹 Cleaned up old conflicting accounts');

    // Reactivate all remaining accounts
    await prisma.adminAccount.updateMany({
        data: { isActive: true }
    });
    console.log('✅ Reactivated all existing accounts');

    for (const acc of accounts) {
        await prisma.adminAccount.upsert({
            where: { username: acc.username },
            update: {
                passwordHash: hashedPassword,
                isActive: true,
                role: acc.role,
                displayName: acc.displayName,
                email: acc.email,
            },
            create: {
                username: acc.username,
                email: acc.email,
                passwordHash: hashedPassword,
                displayName: acc.displayName,
                role: acc.role,
                isActive: true,
            },
        });
        console.log(`  ✅ ${acc.username} (${acc.role})`);
    }

    console.log('\n🎉 All 7 admin accounts ready!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
