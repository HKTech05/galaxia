import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";

async function main() {
    const properties = await prisma.property.findMany({
        select: {
            id: true,
            slug: true,
            name: true,
            securityDeposit: true,
        }
    });

    console.log("PROPERTIES IN DB:");
    console.log(properties);
}

main().catch(console.error).finally(() => prisma.$disconnect());
