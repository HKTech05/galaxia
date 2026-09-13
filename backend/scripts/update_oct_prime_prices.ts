import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

async function updateOctPrimePricing() {
    console.log("Updating 2 and 3 October prime date pricing for all properties in database...");

    const d2Oct = new Date("2026-10-02T00:00:00.000Z");
    const d3Oct = new Date("2026-10-03T00:00:00.000Z");

    const props = await prisma.property.findMany({
        include: { subProperties: true }
    });

    for (const prop of props) {
        const slug = prop.slug;

        // Delete existing prime date entries for Oct 2/3 to avoid duplicates
        await prisma.propertyPricing.deleteMany({
            where: {
                propertyId: prop.id,
                dayType: "prime",
                overrideDate: {
                    in: [d2Oct, d3Oct]
                }
            }
        });

        if (slug === "amstel-nest") {
            const stdSub = prop.subProperties.find(sp => sp.slug === "standard-cottage");
            const famSub = prop.subProperties.find(sp => sp.slug === "family-cottage");

            const amstelEntries = [
                // Parent-level (Standard rates as default)
                { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: 6950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d2Oct },
                { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d3Oct },
                // Standard Cottage: Fri 5950+1000=6950, Sat 6950+1000=7950
                ...(stdSub ? [
                    { propertyId: prop.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 6950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d2Oct },
                    { propertyId: prop.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d3Oct },
                ] : []),
                // Family Cottage: Fri 10000+1000=11000, Sat 12000+1000=13000
                ...(famSub ? [
                    { propertyId: prop.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 11000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d2Oct },
                    { propertyId: prop.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 13000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d3Oct },
                ] : []),
            ];
            for (const data of amstelEntries) {
                await prisma.propertyPricing.create({ data });
            }
        } else if (slug === "ambrose") {
            const ambroseOverrides: Record<string, { p2: number; p3: number; baseGuests: number }> = {
                "take-1": { p2: 7500, p3: 9500, baseGuests: 2 },
                "alta": { p2: 7500, p3: 9500, baseGuests: 2 },
                "santorini": { p2: 7500, p3: 9500, baseGuests: 2 },
                "bamboosa": { p2: 12500, p3: 14000, baseGuests: 4 },
                "cypress": { p2: 7500, p3: 7500, baseGuests: 2 },
            };

            for (const sp of prop.subProperties) {
                const rates = ambroseOverrides[sp.slug] || { p2: 7500, p3: 9500, baseGuests: 2 };
                await prisma.propertyPricing.createMany({
                    data: [
                        { propertyId: prop.id, subPropertyId: sp.id, dayType: "prime", basePrice: rates.p2, personsLabel: `${rates.baseGuests} with meals`, extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d2Oct },
                        { propertyId: prop.id, subPropertyId: sp.id, dayType: "prime", basePrice: rates.p3, personsLabel: `${rates.baseGuests} with meals`, extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d3Oct },
                    ]
                });
            }
        } else {
            let p2 = 0, p3 = 0, extraAdult = 800, kids = 500, personsLabel = "2 persons";
            if (slug === "hill-view") { p2 = 4950; p3 = 4950; extraAdult = 600; kids = 400; }
            else if (slug === "mount-view") { p2 = 5950; p3 = 5950; extraAdult = 800; kids = 500; }
            else if (slug === "heavenly-villa") { p2 = 5950; p3 = 5950; extraAdult = 800; kids = 500; }
            else if (slug === "la-paraiso") { p2 = 8500; p3 = 9500; extraAdult = 1200; kids = 800; personsLabel = "Up to 4 persons"; }

            if (p2 > 0) {
                await prisma.propertyPricing.createMany({
                    data: [
                        { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: p2, personsLabel, extraAdultPrice: extraAdult, kidsPrice: kids, overrideDate: d2Oct },
                        { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: p3, personsLabel, extraAdultPrice: extraAdult, kidsPrice: kids, overrideDate: d3Oct },
                    ]
                });
            }
        }
    }

    console.log("Successfully updated 2 and 3 October prime pricing for all properties in DB!");
}

updateOctPrimePricing().catch(console.error).finally(() => prisma.$disconnect());
