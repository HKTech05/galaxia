import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

async function updateAmstelPricing() {
    console.log("Updating Amstel Nest database pricing...");

    const amstelProp = await prisma.property.findUnique({
        where: { slug: "amstel-nest" },
        include: { subProperties: true }
    });

    if (!amstelProp) {
        console.error("Amstel Nest property not found!");
        return;
    }

    const stdSub = amstelProp.subProperties.find(sp => sp.slug === "standard-cottage");
    const famSub = amstelProp.subProperties.find(sp => sp.slug === "family-cottage");

    // 1. Delete existing PropertyPricing entries for Amstel Nest
    await prisma.propertyPricing.deleteMany({
        where: { propertyId: amstelProp.id }
    });
    console.log("Cleared old pricing entries for Amstel Nest.");

    const d14Aug = new Date("2026-08-14T00:00:00.000Z");
    const d15Aug = new Date("2026-08-15T00:00:00.000Z");

    const entries = [
        // Parent property pricing (Standard Cottage defaults)
        { propertyId: amstelProp.id, subPropertyId: null, dayType: "weekday", basePrice: 4950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
        { propertyId: amstelProp.id, subPropertyId: null, dayType: "weekend", basePrice: 5950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
        { propertyId: amstelProp.id, subPropertyId: null, dayType: "saturday", basePrice: 6950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
        { propertyId: amstelProp.id, subPropertyId: null, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
        { propertyId: amstelProp.id, subPropertyId: null, dayType: "prime", basePrice: 8500, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },

        // Standard Cottage pricing
        ...(stdSub ? [
            { propertyId: amstelProp.id, subPropertyId: stdSub.id, dayType: "weekday", basePrice: 4950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: stdSub.id, dayType: "weekend", basePrice: 5950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: stdSub.id, dayType: "saturday", basePrice: 6950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 7950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
            { propertyId: amstelProp.id, subPropertyId: stdSub.id, dayType: "prime", basePrice: 8500, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
        ] : []),

        // Family Cottage pricing
        ...(famSub ? [
            { propertyId: amstelProp.id, subPropertyId: famSub.id, dayType: "weekday", basePrice: 9000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: famSub.id, dayType: "weekend", basePrice: 10000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: famSub.id, dayType: "saturday", basePrice: 12000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            { propertyId: amstelProp.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 11000, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d14Aug },
            { propertyId: amstelProp.id, subPropertyId: famSub.id, dayType: "prime", basePrice: 13500, personsLabel: "upto 4 with meals", extraAdultPrice: 2000, kidsPrice: 1000, overrideDate: d15Aug },
        ] : []),
    ];

    for (const data of entries) {
        await prisma.propertyPricing.create({ data });
    }

    console.log("Successfully seeded updated Amstel Nest pricing in DB!");
}

updateAmstelPricing().catch(console.error).finally(() => prisma.$disconnect());
