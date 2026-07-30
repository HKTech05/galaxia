const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash("stay123", 10);
    
    const existing = await prisma.adminAccount.findUnique({
        where: { username: "stay123" }
    });

    if (existing) {
        const updated = await prisma.adminAccount.update({
            where: { username: "stay123" },
            data: {
                displayName: "Staycation call manager",
                role: "staycation_call_manager",
                passwordHash,
                plainPassword: "stay123",
                email: "stay123@galaxiaresorts.com",
                isActive: true,
            }
        });
        console.log("Updated existing stay123 account:", updated);
    } else {
        const created = await prisma.adminAccount.create({
            data: {
                username: "stay123",
                displayName: "Staycation call manager",
                role: "staycation_call_manager",
                passwordHash,
                plainPassword: "stay123",
                email: "stay123@galaxiaresorts.com",
                isActive: true,
            }
        });
        console.log("Created stay123 account:", created);
    }
}

main()
    .catch((e) => {
        console.error("Error creating stay123 account:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
