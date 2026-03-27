import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Update Hill View and Mount View security deposit to 2000
    const result = await prisma.property.updateMany({
        where: {
            slug: { in: ["hill-view", "mount-view"] },
        },
        data: {
            securityDeposit: 2000,
        },
    });
    console.log(`Updated ${result.count} properties (hill-view, mount-view) → securityDeposit = 2000`);

    // Verify
    const props = await prisma.property.findMany({
        where: { slug: { in: ["hill-view", "mount-view", "ambrose", "amstel-nest"] } },
        select: { slug: true, securityDeposit: true },
    });
    console.log("Current deposits:", props);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
