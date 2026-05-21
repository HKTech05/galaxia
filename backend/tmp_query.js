const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
    const props = await p.property.findMany({
        include: {
            subProperties: {
                select: { id: true, name: true, slug: true, unitCount: true, isActive: true }
            }
        }
    });
    for (const pr of props) {
        console.log(JSON.stringify({ id: pr.id, name: pr.name, slug: pr.slug, subs: pr.subProperties }));
    }
    await p.$disconnect();
})();
