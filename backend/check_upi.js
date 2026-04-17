const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
    const admins = await p.adminAccount.findMany({
        select: { id: true, username: true, role: true, displayName: true }
    });
    console.log("ADMINS:", JSON.stringify(admins, null, 2));
    await p.$disconnect();
})();
