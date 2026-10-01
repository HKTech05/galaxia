-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatbotUser" (
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

ALTER TABLE "ChatbotUser" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChatbotUser_username_key" ON "ChatbotUser"("username");
