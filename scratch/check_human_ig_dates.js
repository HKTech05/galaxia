const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const allSessions = await prisma.chatSession.findMany({
      where: {
        isHumanActive: true,
        platform: "instagram"
      },
      orderBy: { lastMessageAt: "desc" }
    });

    console.log("Total Human Active IG sessions:", allSessions.length);
    
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    let within24h = 0;
    let olderThan24h = 0;

    allSessions.forEach(s => {
      const diff = now.getTime() - new Date(s.lastMessageAt).getTime();
      if (diff <= oneDayMs) {
        within24h++;
      } else {
        olderThan24h++;
      }
    });

    console.log(`Within last 24 hours: ${within24h}`);
    console.log(`Older than 24 hours: ${olderThan24h}`);

    if (allSessions.length > 0) {
      console.log("\nSample sessions:");
      allSessions.slice(0, 10).forEach(s => {
        console.log(`- ${s.sessionId} (${s.displayName}) | Last msg at: ${s.lastMessageAt} | BotType: ${s.botType}`);
      });
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
