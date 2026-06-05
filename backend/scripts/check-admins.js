const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== ADMIN ACCOUNTS ===");
    const admins = await prisma.adminAccount.findMany({
        select: {
            id: true,
            username: true,
            displayName: true,
            role: true
        }
    });
    console.log(admins);

    console.log("\n=== RECENT AUDIT LOGS FOR DELETION ===");
    const auditLogs = await prisma.auditLog.findMany({
        where: {
            action: { in: ["booking_deleted", "booking_cancelled"] }
        },
        orderBy: { id: 'desc' },
        take: 10
    });
    console.log(auditLogs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
