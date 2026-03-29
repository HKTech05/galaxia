import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Find the movie-time package
    const movieTime = await prisma.ddPackage.findUnique({ where: { slug: "movie-time" } });
    if (!movieTime) {
        console.error("❌ movie-time package not found");
        return;
    }

    // Update the 3-hour pricing row
    const result = await prisma.ddPackagePricing.updateMany({
        where: {
            packageId: movieTime.id,
            hours: 3,
        },
        data: {
            weekdayPrice: 2500,
            weekendPrice: 2500,
        },
    });

    console.log(`✅ Updated ${result.count} pricing row(s): Movie Time 3hr → ₹2500 (was ₹1950)`);
}

main()
    .catch((e) => { console.error("Error:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
