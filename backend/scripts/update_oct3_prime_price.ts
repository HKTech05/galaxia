import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

/**
 * Update Oct 3 prime date override for Take-1, Alta, Santorini
 * from Rs 9,500 to Rs 13,000 (new Saturday base Rs 12,000 + Rs 1,000)
 */
async function updateOct3PrimeDate() {
    console.log("Updating Oct 3 prime date for Take-1/Alta/Santorini...");

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

    for (const sp of targetSubs) {
        const updated = await prisma.propertyPricing.updateMany({
            where: {
                propertyId: ambrose.id,
                subPropertyId: sp.id,
                overrideDate: new Date("2026-10-03"),
            },
            data: {
                basePrice: 13000,
                personsLabel: "4 with meals",
            }
        });
        console.log(`${sp.slug}: Oct 3 rows updated: ${updated.count}`);
    }

    // Verify all Oct overrides
    console.log("\n--- Oct Override Verification ---");
    const overrides = await prisma.propertyPricing.findMany({
        where: {
            propertyId: ambrose.id,
            overrideDate: { not: null },
        },
        include: { subProperty: { select: { slug: true } } },
        orderBy: [{ subPropertyId: "asc" }, { overrideDate: "asc" }],
    });

    for (const p of overrides) {
        const dateStr = p.overrideDate ? p.overrideDate.toISOString().split("T")[0] : "?";
        console.log(`${(p.subProperty?.slug || "parent").padEnd(12)} | ${dateStr} | Rs ${Number(p.basePrice).toString().padStart(6)} | ${p.personsLabel}`);
    }

    console.log("\nDone!");
}

updateOct3PrimeDate().catch(console.error).finally(() => prisma.$disconnect());
