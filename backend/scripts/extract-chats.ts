import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting extraction of WhatsApp & Instagram chatbot conversations grouped by botType & platform...");

    try {
        // Fetch all chat sessions including their messages, sorted by session creation date
        const sessions = await prisma.chatSession.findMany({
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        console.log(`📊 Found ${sessions.length} total chatbot conversations in the database.`);

        const glx2Dir = path.resolve(__dirname, "../../"); // GLX2 folder root

        // Group sessions by distinct (botType, platform)
        const groups: Record<string, any[]> = {};

        for (const session of sessions) {
            const botTypeClean = (session.botType || "celebration").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
            const platformClean = (session.platform || "whatsapp").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
            const groupKey = `${botTypeClean}_${platformClean}`;

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }

            const messagesData = session.messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                message: msg.message,
                isHuman: msg.isHuman,
                createdAt: msg.createdAt
            }));

            groups[groupKey].push({
                session: {
                    id: session.id,
                    sessionId: session.sessionId,
                    customerPhone: session.customerPhone,
                    displayName: session.displayName,
                    botType: session.botType,
                    platform: session.platform,
                    isHumanActive: session.isHumanActive,
                    tags: session.tags,
                    unreadCount: session.unreadCount,
                    lastMessage: session.lastMessage,
                    lastMessageAt: session.lastMessageAt,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                },
                messages: messagesData
            });
        }

        // Write a separate JSON file for each group
        console.log("\n📦 Writing individual chatbot JSON files to glx2 root:");
        for (const [groupKey, groupSessions] of Object.entries(groups)) {
            const filename = `chatbot_conversations_${groupKey}.json`;
            const filePath = path.join(glx2Dir, filename);

            fs.writeFileSync(filePath, JSON.stringify(groupSessions, null, 2), "utf8");
            console.log(`  - ${filename} (${groupSessions.length} conversations) -> ${filePath}`);
        }

        console.log("\n✅ Completed successfully.");

    } catch (error) {
        console.error("❌ Failed to extract chatbot conversations:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
