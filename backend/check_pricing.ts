import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";

async function main() {
    const pricings = await prisma.propertyPricing.findMany({
        where: { propertyId: 5 }
    });

    console.log("PRICING FOR PROPERTY 5 (Amstel Nest):");
    console.log(JSON.stringify(pricings, null, 2));
}

main().catch(console.error);
