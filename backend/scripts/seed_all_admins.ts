import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'galaxia2026';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete old conflicting accounts
    await prisma.adminAccount.deleteMany({
        where: {
            OR: [
                { username: { in: ['dd_admin', 'reception', 'developer'] } },
                { email: { in: ['dev@galaxiaresorts.com', 'developer@galaxiaresorts.com', 'dev@galaxia.in', 'dd@galaxia.in', 'reception@galaxia.in'] } },
            ]
        }
    });
    console.log('🧹 Cleaned up old accounts');

    const accounts = [
        // owner + developer = null (full access to everything)
        { username: 'owner', email: 'owner@galaxiaresorts.com', displayName: 'Admin User', role: 'owner', assignedProperties: null },
        { username: 'Developer', email: 'developer@galaxiaresorts.com', displayName: 'Developer', role: 'developer', assignedProperties: null },
        // Property-scoped admins
        { username: 'asmita', email: 'asmita@galaxiaresorts.com', displayName: 'Asmita', role: 'staycation_admin', assignedProperties: ['hill-view', 'mount-view', 'heavenly-villa', 'la-paraiso', 'ambrose', 'amstel-nest'] },
        { username: 'H&H', email: 'hh@galaxiaresorts.com', displayName: 'H&H', role: 'staycation_admin', assignedProperties: ['hill-view', 'heavenly-villa'] },
        { username: 'M&L', email: 'ml@galaxiaresorts.com', displayName: 'M&L', role: 'staycation_admin', assignedProperties: ['mount-view', 'la-paraiso'] },
        { username: 'Ambrose', email: 'ambrose@galaxiaresorts.com', displayName: 'Ambrose', role: 'staycation_admin', assignedProperties: ['ambrose'] },
        { username: 'Amstelnest', email: 'amstelnest@galaxiaresorts.com', displayName: 'Amstel Nest', role: 'staycation_admin', assignedProperties: ['amstel-nest'] },
    ];

    for (const acc of accounts) {
        await prisma.adminAccount.upsert({
            where: { username: acc.username },
            update: {
                passwordHash: hashedPassword,
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
                displayName: acc.displayName,
                role: acc.role,
                isActive: true,
                assignedProperties: acc.assignedProperties,
            },
        });
        console.log(`  ✅ ${acc.username} (${acc.role}) → ${acc.assignedProperties ? acc.assignedProperties.join(', ') : 'ALL'}`);
    }

    console.log('\n🎉 All 7 admin accounts ready with property assignments!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
