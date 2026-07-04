const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const unreadSessions = await prisma.chatSession.findMany({
      where: {
        isHumanActive: false,
        platform: "instagram",
        unreadCount: { gt: 0 },
        botType: {
          in: ["amstelnest_ig", "ambrose_ig", "laparaiso_ig", "mountview_ig", "heavenlyvilla_ig", "hillview_ig"]
        }
      },
      orderBy: { botType: "asc" }
    });

    console.log("Total Unread Non-Human Staycation IG Sessions:", unreadSessions.length);

    const counts = {};
    unreadSessions.forEach(s => {
      counts[s.botType] = (counts[s.botType] || 0) + 1;
    });

    console.log("Counts by botType:", JSON.stringify(counts, null, 2));

    if (unreadSessions.length > 0) {
      console.log("\nSample 5 sessions:");
      unreadSessions.slice(0, 5).forEach(s => {
        console.log(`- ID: ${s.sessionId} | Name: ${s.displayName} | BotType: ${s.botType} | UnreadCount: ${s.unreadCount} | LastMsg: ${s.lastMessage}`);
      });
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
