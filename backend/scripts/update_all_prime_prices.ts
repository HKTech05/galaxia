import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

async function updateAllPrimePricing() {
    console.log("Updating 14 and 15 August prime date pricing for all properties in database...");

    const d14Aug = new Date("2026-08-14T00:00:00.000Z");
    const d15Aug = new Date("2026-08-15T00:00:00.000Z");

    const props = await prisma.property.findMany({
        include: { subProperties: true }
    });

    for (const prop of props) {
        const slug = prop.slug;

        // Delete existing prime date entries for 14/15 Aug to avoid duplicates
        await prisma.propertyPricing.deleteMany({
            where: {
                propertyId: prop.id,
                dayType: "prime",
                overrideDate: {
                    in: [d14Aug, d15Aug]
                }
            }
        });

        if (slug === "amstel-nest") {
            const stdSub = prop.subProperties.find(sp => sp.slug === "standard-cottage");
            const famSub = prop.subProperties.find(sp => sp.slug === "family-cottage");

            const amstelEntries = [
                { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
                { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: 8500, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
                ...(stdSub ? [
                    { propertyId: prop.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
                    { propertyId: prop.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 8500, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
                ] : []),
                ...(famSub ? [
                    { propertyId: prop.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 11000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
                    { propertyId: prop.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 13500, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
                ] : []),
            ];
            for (const data of amstelEntries) {
                await prisma.propertyPricing.create({ data });
            }
        } else if (slug === "ambrose") {
            const ambroseOverrides: Record<string, { p14: number; p15: number; baseGuests: number }> = {
                "take-1": { p14: 7500, p15: 9500, baseGuests: 2 },
                "alta": { p14: 7500, p15: 9500, baseGuests: 2 },
                "santorini": { p14: 7500, p15: 9500, baseGuests: 2 },
                "bamboosa": { p14: 12500, p15: 14000, baseGuests: 4 },
                "cypress": { p14: 7500, p15: 7500, baseGuests: 2 },
            };

            for (const sp of prop.subProperties) {
                const rates = ambroseOverrides[sp.slug] || { p14: 7500, p15: 9500, baseGuests: 2 };
                await prisma.propertyPricing.createMany({
                    data: [
                        { propertyId: prop.id, subPropertyId: sp.id, dayType: "prime", basePrice: rates.p14, personsLabel: `${rates.baseGuests} with meals`, extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
                        { propertyId: prop.id, subPropertyId: sp.id, dayType: "prime", basePrice: rates.p15, personsLabel: `${rates.baseGuests} with meals`, extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
                    ]
                });
            }
        } else {
            // Standalone properties
            let p14 = 0, p15 = 0, extraAdult = 800, kids = 500, personsLabel = "2 persons";
            if (slug === "hill-view") { p14 = 4950; p15 = 4950; extraAdult = 600; kids = 400; }
            else if (slug === "mount-view") { p14 = 5950; p15 = 5950; extraAdult = 800; kids = 500; }
            else if (slug === "heavenly-villa") { p14 = 5950; p15 = 5950; extraAdult = 800; kids = 500; }
            else if (slug === "la-paraiso") { p14 = 8500; p15 = 9500; extraAdult = 1200; kids = 800; personsLabel = "Up to 4 persons"; }

            if (p14 > 0) {
                await prisma.propertyPricing.createMany({
                    data: [
                        { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: p14, personsLabel, extraAdultPrice: extraAdult, kidsPrice: kids, overrideDate: d14Aug },
                        { propertyId: prop.id, subPropertyId: null, dayType: "prime", basePrice: p15, personsLabel, extraAdultPrice: extraAdult, kidsPrice: kids, overrideDate: d15Aug },
                    ]
                });
            }
        }
    }

    console.log("Successfully updated 14 and 15 August prime pricing for all properties in DB!");
}

updateAllPrimePricing().catch(console.error).finally(() => prisma.$disconnect());
