import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Creating or updating ChatbotUser table...");

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public."ChatbotUser" (
            "id" SERIAL NOT NULL,
            "username" TEXT NOT NULL,
            "passwordHash" TEXT NOT NULL,
            "plainPassword" TEXT,
            "displayName" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'chatbot_admin',
            "assignedNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ChatbotUser_pkey" PRIMARY KEY ("id")
        );
    `);

    await prisma.$executeRawUnsafe(`
        ALTER TABLE public."ChatbotUser" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ChatbotUser_username_key" ON public."ChatbotUser"("username");
    `);

    console.log("✅ ChatbotUser table, plainPassword column, and unique index ready.");
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
