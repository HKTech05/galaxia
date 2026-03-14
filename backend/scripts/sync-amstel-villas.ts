import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function syncVillas() {
    console.log("Starting Amstel Nest villa sync...");
    
    // 1. Find Amstel Nest property
    const amstel = await prisma.property.findUnique({
        where: { slug: "amstel-nest" }
    });

    if (!amstel) {
        console.error("Property Amstel Nest not found!");
        return;
    }

    console.log(`Found Amstel Nest with ID: ${amstel.id}`);

    // 2. Clear existing sub-properties to ensure a clean sync (Optional, but safer for count)
    // Or just check what's missing.
    const existing = await prisma.subProperty.findMany({
        where: { propertyId: amstel.id }
    });
    
    console.log(`Currently has ${existing.length} sub-properties.`);

    // 3. Ensure 13 standard cottages
    for (let i = 1; i <= 13; i++) {
        const slug = `cottage-${i}`;
        const name = `Cottage ${i}`;
        
        await prisma.subProperty.upsert({
            where: { propertyId_slug: { propertyId: amstel.id, slug } },
            update: { name, isActive: true, displayOrder: i },
            create: {
                propertyId: amstel.id,
                slug,
                name,
                theme: "Amsterdam-Inspired",
                description: "Cozy cottage with double bed and private indoor pool.",
                maxPersons: 4,
                displayOrder: i,
                isActive: true
            }
        });
    }

    // 4. Ensure 1 family cottage
    await prisma.subProperty.upsert({
        where: { propertyId_slug: { propertyId: amstel.id, slug: "family-cottage" } },
        update: { name: "Family Cottage (14)", isActive: true, displayOrder: 14 },
        create: {
            propertyId: amstel.id,
            slug: "family-cottage",
            name: "Family Cottage (14)",
            theme: "Amsterdam-Inspired (Larger)",
            description: "Spacious cottage with 2 double beds — perfect for families.",
            maxPersons: 6,
            displayOrder: 14,
            isActive: true
        }
    });

    console.log("Amstel Nest sync complete (14 villas ensured).");
    process.exit(0);
}

syncVillas().catch(err => {
    console.error(err);
    process.exit(1);
});
