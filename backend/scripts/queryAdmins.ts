import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
    const admins = await p.adminAccount.findMany({
        select: { id: true, username: true, email: true, role: true, isActive: true, passwordHash: true }
    });
    for (const a of admins) {
        console.log(`ID:${a.id} user:${a.username} email:${a.email} role:${a.role} active:${a.isActive} hash:${a.passwordHash.substring(0, 20)}...`);
    }
}
main().finally(() => p.$disconnect());
