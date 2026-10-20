import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

async function main() {
    console.log("Checking and fixing Amstel Nest extraAdultPrice and kidsPrice in database...");

    const amstelProp = await prisma.property.findUnique({
        where: { slug: "amstel-nest" },
        include: { subProperties: true }
    });

    if (!amstelProp) {
        console.error("Amstel Nest property not found!");
        return;
    }

    const stdSub = amstelProp.subProperties.find(sp => sp.slug === "standard-cottage");
    if (!stdSub) {
        console.error("Standard cottage sub-property not found!");
        return;
    }

    // Update standard cottage base pricing rows (weekday, weekend, saturday)
    const result = await prisma.propertyPricing.updateMany({
        where: {
            propertyId: amstelProp.id,
            subPropertyId: stdSub.id,
            overrideDate: null
        },
        data: {
            extraAdultPrice: 2000,
            kidsPrice: 1000,
        }
    });

    console.log(`Updated ${result.count} regular pricing rows for Standard Cottage (set extraAdultPrice=2000, kidsPrice=1000)`);

    // Verify all rows for Amstel Nest
    const rows = await prisma.propertyPricing.findMany({
        where: { propertyId: amstelProp.id }
    });

    console.log("--- Current Amstel Nest Pricing Rows ---");
    for (const r of rows) {
        const subName = r.subPropertyId === stdSub.id ? "Standard" : (r.subPropertyId ? "Family" : "PARENT");
        console.log(`${subName} | ${r.dayType} | override: ${r.overrideDate ? r.overrideDate.toISOString().slice(0, 10) : "none"} | base: ${r.basePrice} | adult: ${r.extraAdultPrice} | kid: ${r.kidsPrice}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
