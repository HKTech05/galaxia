const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== HISTORICAL DELETION LOGS BY ADMIN/ROLE ===");
    const logs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { action: "booking_deleted" },
                { details: { path: ["action"], equals: "deleted" } }
            ]
        },
        include: {
            admin: {
                select: {
                    username: true,
                    role: true
                }
            }
        }
    });

    const summary = {};
    logs.forEach(l => {
        const key = l.admin ? `${l.admin.username} (${l.admin.role})` : `unknown (ID: ${l.adminId})`;
        summary[key] = (summary[key] || 0) + 1;
    });
    console.log(summary);
}

main().catch(console.error).finally(() => prisma.$disconnect());
