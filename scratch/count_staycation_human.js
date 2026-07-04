const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: {
        isHumanActive: true,
        platform: "instagram",
        botType: {
          in: ["amstelnest_ig", "ambrose_ig", "laparaiso_ig", "mountview_ig", "heavenlyvilla_ig", "hillview_ig"]
        }
      },
      orderBy: { botType: "asc" }
    });

    console.log("Total Staycation Human Active IG Sessions:", sessions.length);

    const counts = {};
    sessions.forEach(s => {
      counts[s.botType] = (counts[s.botType] || 0) + 1;
    });

    console.log("Counts by botType:", counts);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
