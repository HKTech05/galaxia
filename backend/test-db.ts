import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Testing Review table...");
        const reviews = await prisma.review.findMany({
            include: {
                property: true
            }
        });
        console.log("Reviews found:", reviews.length);
        console.log("SUCCESS");
    } catch (error) {
        console.error("ERROR testing reviews:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
