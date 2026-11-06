// Fix Pricing Script — Run from backend/ directory: npx ts-node fix-pricing.ts
// This script:
// 1. Shows current property_pricing state
// 2. Fixes base prices for Take-1, Alta, Santorini sub-properties
// 3. Removes ALL date overrides from property_pricing table

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CURRENT STATE ===\n");

    // Get all sub-properties
    const subProps = await prisma.subProperty.findMany({
        include: { property: true, pricing: { orderBy: { dayType: 'asc' } } },
    });

    for (const sp of subProps) {
        console.log(`\n--- ${sp.name} (${sp.property.name}) [subProp id=${sp.id}] ---`);
        for (const p of sp.pricing) {
            console.log(`  ${p.dayType} | base=${p.basePrice} | extraAdult=${p.extraAdultPrice} | kids=${p.kidsPrice} | persons=${p.personsLabel} | override=${p.overrideDate ? p.overrideDate.toISOString().split('T')[0] : 'BASE'} | active=${p.isActive} | id=${p.id}`);
        }
    }

    // Get parent-level property pricing too
    const parentPricing = await prisma.propertyPricing.findMany({
        where: { subPropertyId: null },
        include: { property: true },
        orderBy: [{ propertyId: 'asc' }, { dayType: 'asc' }],
    });
    console.log("\n--- Parent-level pricing (no sub-property) ---");
    for (const p of parentPricing) {
        console.log(`  ${p.property?.name} | ${p.dayType} | base=${p.basePrice} | extraAdult=${p.extraAdultPrice} | kids=${p.kidsPrice} | persons=${p.personsLabel} | override=${p.overrideDate ? p.overrideDate.toISOString().split('T')[0] : 'BASE'} | active=${p.isActive} | id=${p.id}`);
    }

    // Also show driver pricing
    const driverPricing = await prisma.driverPricing.findMany();
    console.log("\n--- Driver Pricing ---");
    for (const d of driverPricing) {
        console.log(`  ${d.type} | base=${d.basePrice} | override=${d.overrideDate ? d.overrideDate.toISOString().split('T')[0] : 'BASE'} | id=${d.id}`);
    }

    console.log("\n\n=== DONE — Read-only. No changes made. ===");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
