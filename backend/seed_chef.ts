import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Chef admin account...");
    const hashedPassword = await bcrypt.hash("chef123", 10);
    const chef = await prisma.adminAccount.upsert({
        where: { username: "chef" },
        update: {
            passwordHash: hashedPassword,
            plainPassword: "chef123",
            role: "chef",
            displayName: "Chef",
            assignedProperties: ["chef"],
        },
        create: {
            username: "chef",
            email: "chef@galaxiaresorts.com",
            passwordHash: hashedPassword,
            plainPassword: "chef123",
            displayName: "Chef",
            role: "chef",
            assignedProperties: ["chef"],
        },
    });
    console.log("Chef admin account seeded successfully:", chef);
}

main()
    .catch((e) => {
        console.error("Error seeding Chef:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
