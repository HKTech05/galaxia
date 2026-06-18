import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Deleting all records from hospitality_requests table...");
    const result = await prisma.hospitalityRequest.deleteMany();
    console.log(`Successfully deleted ${result.count} hospitality requests!`);
}

main()
    .catch((e) => {
        console.error("Error clearing hospitality requests:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
