import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'galaxia2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete old conflicting accounts
    await prisma.adminAccount.deleteMany({
        where: {
            OR: [
                { username: { in: ['dd_admin', 'reception', 'developer', 'Ambrose', 'Amstelnest'] } },
                { email: { in: ['dev@galaxiaresorts.com', 'developer@galaxiaresorts.com', 'dev@galaxia.in', 'dd@galaxia.in', 'reception@galaxia.in', 'ambrose@galaxiaresorts.com', 'amstelnest@galaxiaresorts.com'] } },
            ]
        }
    });
    console.log('🧹 Cleaned up old accounts');

    const accounts: Array<{
        username: string; email: string; displayName: string; role: string;
        assignedProperties: Prisma.InputJsonValue | typeof Prisma.DbNull;
    }> = [
        { username: 'owner', email: 'owner@galaxiaresorts.com', displayName: 'Admin User', role: 'owner', assignedProperties: Prisma.DbNull },
        { username: 'Developer', email: 'developer@galaxiaresorts.com', displayName: 'Developer', role: 'developer', assignedProperties: Prisma.DbNull },
        { username: 'asmita', email: 'asmita@galaxiaresorts.com', displayName: 'Asmita', role: 'dd_admin', assignedProperties: ['dd'] },
        { username: 'H&H', email: 'hh@galaxiaresorts.com', displayName: 'H&H', role: 'staycation_admin', assignedProperties: ['hill-view', 'heavenly-villa'] },
        { username: 'M&L', email: 'ml@galaxiaresorts.com', displayName: 'M&L', role: 'staycation_admin', assignedProperties: ['mount-view', 'la-paraiso'] },
        { username: 'A&A', email: 'aa@galaxiaresorts.com', displayName: 'Ambrose & Amstel', role: 'staycation_admin', assignedProperties: ['ambrose', 'amstel-nest'] },
    ];

    for (const acc of accounts) {
        await prisma.adminAccount.upsert({
            where: { username: acc.username },
            update: {
                passwordHash: hashedPassword,
                plainPassword: password,
                isActive: true,
                role: acc.role,
                displayName: acc.displayName,
                email: acc.email,
                assignedProperties: acc.assignedProperties,
            },
            create: {
                username: acc.username,
                email: acc.email,
                passwordHash: hashedPassword,
                plainPassword: password,
                displayName: acc.displayName,
                role: acc.role,
                isActive: true,
                assignedProperties: acc.assignedProperties,
            },
        });
        const props = acc.assignedProperties === Prisma.DbNull ? 'ALL' : (acc.assignedProperties as string[]).join(', ');
        console.log(`  ✅ ${acc.username} (${acc.role}) → ${props}`);
    }

    console.log('\n🎉 All admin accounts ready!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
