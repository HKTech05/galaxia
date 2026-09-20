import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

/**
 * Update Ambrose weekend/saturday pricing to 4-person base rates.
 * Only affects Take-1, Alta, Santorini.
 * Bamboosa already has 4ppl base. Cypress stays unchanged.
 */
async function updateAmbroseWeekend4ppl() {
    console.log("Updating Ambrose weekend/saturday pricing to 4-person base rates...");

    const ambrose = await prisma.property.findFirst({
        where: { slug: "ambrose" },
        include: { subProperties: true }
    });

    if (!ambrose) {
        console.error("Ambrose property not found!");
        return;
    }

    // Only update Take-1, Alta, Santorini
    const targetSlugs = ["take-1", "alta", "santorini"];
    const targetSubs = ambrose.subProperties.filter(sp => targetSlugs.includes(sp.slug));

    console.log(`Found ${targetSubs.length} target sub-properties: ${targetSubs.map(s => s.slug).join(", ")}`);

    for (const sp of targetSubs) {
        console.log(`\nUpdating ${sp.slug}...`);

        // Update weekend pricing (dayType = "weekend")
        const weekendUpdate = await prisma.propertyPricing.updateMany({
            where: {
                propertyId: ambrose.id,
                subPropertyId: sp.id,
                dayType: "weekend",
                overrideDate: null, // Only regular pricing, not prime date overrides
            },
            data: {
                basePrice: 10500,
                personsLabel: "4 with meals",
            }
        });
        console.log(`  Weekend rows updated: ${weekendUpdate.count}`);

        // Update saturday pricing (dayType = "saturday")
        const saturdayUpdate = await prisma.propertyPricing.updateMany({
            where: {
                propertyId: ambrose.id,
                subPropertyId: sp.id,
                dayType: "saturday",
                overrideDate: null,
            },
            data: {
                basePrice: 12500,
                personsLabel: "4 with meals",
            }
        });
        console.log(`  Saturday rows updated: ${saturdayUpdate.count}`);
    }

    // Verify the updates
    console.log("\n--- Verification ---");
    const allPricing = await prisma.propertyPricing.findMany({
        where: {
            propertyId: ambrose.id,
            overrideDate: null,
            dayType: { in: ["weekday", "weekend", "saturday"] },
        },
        include: { subProperty: { select: { name: true, slug: true } } },
        orderBy: [{ subPropertyId: "asc" }, { dayType: "asc" }],
    });

    for (const p of allPricing) {
        console.log(
            `${(p.subProperty?.slug || "parent").padEnd(12)} | ${p.dayType.padEnd(10)} | Rs ${Number(p.basePrice).toString().padStart(6)} | ${p.personsLabel}`
        );
    }

    console.log("\nDone! Ambrose weekend/saturday pricing updated to 4-person base.");
}

updateAmbroseWeekend4ppl().catch(console.error).finally(() => prisma.$disconnect());
