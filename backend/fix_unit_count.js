const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    // 1. Verify current state
    const before = await p.subProperty.findMany({
        where: { property: { slug: 'amstel-nest' } },
        select: { id: true, slug: true, name: true, unitCount: true },
    });
    console.log("BEFORE:", JSON.stringify(before, null, 2));

    // 2. Find the standard-cottage sub-property
    const stdCottage = before.find(sp => sp.slug === 'standard-cottage');
    if (!stdCottage) {
        console.log("ERROR: standard-cottage sub-property not found!");
        await p.$disconnect();
        return;
    }

    console.log(`\nStandard Cottage current unit_count: ${stdCottage.unitCount}`);

    if (stdCottage.unitCount === 14) {
        console.log("Already set to 14. No update needed.");
        await p.$disconnect();
        return;
    }

    // 3. Update from 13 to 14
    const updated = await p.subProperty.update({
        where: { id: stdCottage.id },
        data: { unitCount: 14 },
    });
    console.log(`\nUPDATED: unit_count changed from ${stdCottage.unitCount} to ${updated.unitCount}`);

    // 4. Verify after
    const after = await p.subProperty.findMany({
        where: { property: { slug: 'amstel-nest' } },
        select: { id: true, slug: true, name: true, unitCount: true },
    });
    console.log("\nAFTER:", JSON.stringify(after, null, 2));

    await p.$disconnect();
})();
