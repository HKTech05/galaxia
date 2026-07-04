const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const allSessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" }
    });

    console.log("Total sessions in DB:", allSessions.length);

    const humanActive = allSessions.filter(s => s.isHumanActive === true);
    console.log(`Sessions with isHumanActive == true: ${humanActive.length}`);
    humanActive.forEach(s => {
      console.log(`[HUMAN ACTIVE] ID: ${s.sessionId} | Name: ${s.displayName} | BotType: ${s.botType} | Platform: ${s.platform} | Tags: ${JSON.stringify(s.tags)}`);
    });

    const humanTags = allSessions.filter(s => s.tags && JSON.stringify(s.tags).toLowerCase().includes("human"));
    console.log(`Sessions with 'human' in tags: ${humanTags.length}`);
    humanTags.forEach(s => {
      console.log(`[TAG HUMAN] ID: ${s.sessionId} | Name: ${s.displayName} | BotType: ${s.botType} | Platform: ${s.platform} | Tags: ${JSON.stringify(s.tags)}`);
    });

    // Let's also check all IG sessions and print their botType and isHumanActive
    const igSessions = allSessions.filter(s => s.platform === "instagram" || s.sessionId.toLowerCase().includes("ig"));
    console.log(`\nTotal IG sessions: ${igSessions.length}`);
    
    // Group IG sessions by botType
    const byBot = {};
    igSessions.forEach(s => {
      const b = s.botType || "unknown";
      if (!byBot[b]) byBot[b] = [];
      byBot[b].push(s);
    });

    console.log("\nIG Sessions count by botType:");
    Object.keys(byBot).forEach(b => {
      const humanCount = byBot[b].filter(s => s.isHumanActive).length;
      console.log(` - ${b}: ${byBot[b].length} total (Human active: ${humanCount})`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
