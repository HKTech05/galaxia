import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seeding of Housekeeping profiles (hk1..hk8) and Amb2...");

    const hkPasswordHash = await bcrypt.hash("hk123", 10);

    // 1. Seed / update hk1 to hk8 profiles
    for (let i = 1; i <= 8; i++) {
        const username = `hk${i}`;
        const email = `hk${i}@galaxiaresorts.com`;
        const displayName = `Housekeeping Staff ${i}`;

        const existing = await prisma.adminAccount.findUnique({
            where: { username }
        });

        if (existing) {
            console.log(`Updating profile for ${username}...`);
            await prisma.adminAccount.update({
                where: { id: existing.id },
                data: {
                    passwordHash: hkPasswordHash,
                    plainPassword: "hk123",
                    role: "housekeeping",
                    displayName,
                    isActive: true,
                    assignedProperties: ["ambrose", "amstel-nest"]
                }
            });
        } else {
            console.log(`Creating profile for ${username}...`);
            await prisma.adminAccount.create({
                data: {
                    username,
                    email,
                    displayName,
                    passwordHash: hkPasswordHash,
                    plainPassword: "hk123",
                    role: "housekeeping",
                    isActive: true,
                    assignedProperties: ["ambrose", "amstel-nest"]
                }
            });
        }
    }

    // 2. Also align default 'housekeeping' account password to hk123 and set assignedProperties
    const defaultHk = await prisma.adminAccount.findUnique({
        where: { username: "housekeeping" }
    });
    if (defaultHk) {
        console.log("Updating default 'housekeeping' account password to hk123...");
        await prisma.adminAccount.update({
            where: { id: defaultHk.id },
            data: {
                passwordHash: hkPasswordHash,
                plainPassword: "hk123",
                role: "housekeeping",
                isActive: true,
                assignedProperties: ["ambrose", "amstel-nest"]
            }
        });
    }

    // 3. Seed Amb2 profile with same role and assignedProperties as Amb
    const ambAccount = await prisma.adminAccount.findUnique({
        where: { username: "Amb" }
    });

    const ambPassword = ambAccount?.plainPassword || "9821";
    const ambPasswordHash = ambAccount?.passwordHash || await bcrypt.hash(ambPassword, 10);
    const ambAssignedProps = ambAccount?.assignedProperties || ["ambrose", "amstel-nest"];

    const existingAmb2 = await prisma.adminAccount.findUnique({
        where: { username: "Amb2" }
    });

    if (existingAmb2) {
        console.log("Updating profile for Amb2...");
        await prisma.adminAccount.update({
            where: { id: existingAmb2.id },
            data: {
                passwordHash: ambPasswordHash,
                plainPassword: ambPassword,
                role: "staycation_admin",
                displayName: "Ambrose & Amstel 2",
                assignedProperties: ambAssignedProps as any,
                isActive: true
            }
        });
    } else {
        console.log("Creating profile for Amb2...");
        await prisma.adminAccount.create({
            data: {
                username: "Amb2",
                email: "amb2@galaxiaresorts.com",
                displayName: "Ambrose & Amstel 2",
                passwordHash: ambPasswordHash,
                plainPassword: ambPassword,
                role: "staycation_admin",
                assignedProperties: ambAssignedProps as any,
                isActive: true
            }
        });
    }

    console.log("Successfully seeded all 8 Housekeeping profiles and Amb2!");
}

main()
    .catch((e) => {
        console.error("Error seeding profiles:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
