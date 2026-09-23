import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

/**
 * Fix Ambrose weekend/saturday pricing for Take-1, Alta, Santorini:
 * - Weekend (Fri/Sun): REVERT to Rs 6,500 / "2 with meals"
 * - Saturday: Fix to Rs 12,000 / "4 with meals"
 */
async function fixAmbroseWeekendPricing() {
    console.log("Fixing Ambrose weekend/saturday pricing...");

    const ambrose = await prisma.property.findFirst({
        where: { slug: "ambrose" },
        include: { subProperties: true }
    });

    if (!ambrose) {
        console.error("Ambrose property not found!");
        return;
    }

    const targetSlugs = ["take-1", "alta", "santorini"];
    const targetSubs = ambrose.subProperties.filter(sp => targetSlugs.includes(sp.slug));

    console.log(`Found ${targetSubs.length} target sub-properties: ${targetSubs.map(s => s.slug).join(", ")}`);

    for (const sp of targetSubs) {
        console.log(`\nFixing ${sp.slug}...`);

        // REVERT weekend to original: Rs 6,500 / "2 with meals"
        const weekendUpdate = await prisma.propertyPricing.updateMany({
            where: {
                propertyId: ambrose.id,
                subPropertyId: sp.id,
                dayType: "weekend",
                overrideDate: null,
            },
            data: {
                basePrice: 6500,
                personsLabel: "2 with meals",
            }
        });
        console.log(`  Weekend rows reverted: ${weekendUpdate.count}`);

        // FIX saturday to Rs 12,000 / "4 with meals"
        const saturdayUpdate = await prisma.propertyPricing.updateMany({
            where: {
                propertyId: ambrose.id,
                subPropertyId: sp.id,
                dayType: "saturday",
                overrideDate: null,
            },
            data: {
                basePrice: 12000,
                personsLabel: "4 with meals",
            }
        });
        console.log(`  Saturday rows fixed: ${saturdayUpdate.count}`);
    }

    // Verify
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

    console.log("\nDone!");
}

fixAmbroseWeekendPricing().catch(console.error).finally(() => prisma.$disconnect());
