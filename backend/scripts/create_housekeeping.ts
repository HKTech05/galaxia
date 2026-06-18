import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking for housekeeping account...");
    const existing = await prisma.adminAccount.findUnique({
        where: { username: "housekeeping" }
    });

    const passwordHash = await bcrypt.hash("h123", 10);

    if (existing) {
        console.log("Housekeeping account already exists. Updating password...");
        await prisma.adminAccount.update({
            where: { id: existing.id },
            data: {
                passwordHash,
                plainPassword: "h123",
                isActive: true,
                role: "housekeeping"
            }
        });
        console.log("Housekeeping account updated!");
    } else {
        console.log("Creating new housekeeping account...");
        await prisma.adminAccount.create({
            data: {
                username: "housekeeping",
                email: "housekeeping@galaxiaresorts.com",
                displayName: "Housekeeping Staff",
                passwordHash,
                plainPassword: "h123",
                role: "housekeeping",
                isActive: true
            }
        });
        console.log("Housekeeping account created successfully!");
    }
}

main()
    .catch((e) => {
        console.error("Error creating housekeeping account:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
