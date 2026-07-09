import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const username = "accountant";
    const password = "1234";
    const email = "accountant@galaxiaresorts.com";
    const displayName = "Accountant";
    const role = "accountant";

    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await prisma.adminAccount.findUnique({ where: { username } });

    if (existing) {
        await prisma.adminAccount.update({
            where: { id: existing.id },
            data: {
                email,
                passwordHash: hashedPassword,
                plainPassword: password,
                displayName,
                role,
                isActive: true
            }
        });
        console.log(`Updated existing user: ${username}`);
    } else {
        await prisma.adminAccount.create({
            data: {
                username,
                email,
                passwordHash: hashedPassword,
                plainPassword: password,
                displayName,
                role,
                isActive: true
            }
        });
        console.log(`Created new user: ${username}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
