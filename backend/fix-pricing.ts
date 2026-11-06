// Fix Pricing Script — Run from backend/ directory: npx ts-node fix-pricing.ts
// 
// What this does:
// 1. Sets the SS1 requested pricing for Take-1, Alta, Santorini, Bamboosa, Cypress
// 2. Remove ALL date overrides from property_pricing table (overrideDate IS NOT NULL)
// 
// EXACT PRICES (from SS1):
// Take-1/Alta/Santorini: Weekday ₹5,500 (2ppl) | Weekend (Fri/Sun) ₹10,500 (4ppl base) | Saturday ₹12,500 (4ppl base)
// Bamboosa:              Weekday ₹10,500 (4ppl) | Weekend (Fri/Sun) ₹11,500 (4ppl) | Saturday ₹13,000 (4ppl)
// Cypress:               Weekday ₹5,500 (2ppl) | Weekend (Fri/Sun) ₹6,500 (2ppl) | Saturday ₹6,500 (2ppl)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Target pricing per sub-property according to SS1
const CORRECT_PRICING: Record<string, {
    weekday: { price: number; persons: string; extraAdult: number; kids: number };
    weekend: { price: number; persons: string; extraAdult: number; kids: number };
    saturday: { price: number; persons: string; extraAdult: number; kids: number };
}> = {
    'take-1': {
        weekday:  { price: 5500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
        weekend:  { price: 10500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
        saturday: { price: 12500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
    },
    'alta': {
        weekday:  { price: 5500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
        weekend:  { price: 10500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
        saturday: { price: 12500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
    },
    'santorini': {
        weekday:  { price: 5500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
        weekend:  { price: 10500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
        saturday: { price: 12500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
    },
    'bamboosa': {
        weekday:  { price: 10500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
        weekend:  { price: 11500, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
        saturday: { price: 13000, persons: '4 with meals', extraAdult: 2000, kids: 1000 },
    },
    'cypress': {
        weekday:  { price: 5500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
        weekend:  { price: 6500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
        saturday: { price: 6500,  persons: '2 with meals', extraAdult: 2000, kids: 1000 },
    },
};

async function main() {
    console.log("=== STEP 1: Current State ===\n");

    const subProps = await prisma.subProperty.findMany({
        include: { property: true, pricing: { orderBy: { dayType: 'asc' } } },
    });

    for (const sp of subProps) {
        console.log(`\n--- ${sp.name} (${sp.property.name}) [subProp id=${sp.id}, slug=${sp.slug}] ---`);
        for (const p of sp.pricing) {
            console.log(`  ${p.dayType} | base=${p.basePrice} | extraAdult=${p.extraAdultPrice} | kids=${p.kidsPrice} | persons=${p.personsLabel} | override=${p.overrideDate ? p.overrideDate.toISOString().split('T')[0] : 'BASE'} | id=${p.id}`);
        }
    }

    console.log("\n\n=== STEP 2: Delete ALL date overrides (overrideDate IS NOT NULL) ===\n");

    const overrideRows = await prisma.propertyPricing.findMany({
        where: { overrideDate: { not: null } },
    });
    console.log(`Found ${overrideRows.length} override rows to delete:`);
    for (const o of overrideRows) {
        console.log(`  id=${o.id} | subPropId=${o.subPropertyId} | propId=${o.propertyId} | ${o.dayType} | price=${o.basePrice} | date=${o.overrideDate?.toISOString().split('T')[0]}`);
    }

    if (overrideRows.length > 0) {
        const deleted = await prisma.propertyPricing.deleteMany({
            where: { overrideDate: { not: null } },
        });
        console.log(`\n✅ Deleted ${deleted.count} override rows.`);
    } else {
        console.log("No overrides to delete.");
    }

    console.log("\n\n=== STEP 3: Updating base prices to match SS1 ===\n");

    for (const sp of subProps) {
        const expected = CORRECT_PRICING[sp.slug];
        if (!expected) {
            console.log(`⏭️  Skipping ${sp.name} (${sp.slug}) — not in Ambrose target list`);
            continue;
        }

        for (const dayType of ['weekday', 'weekend', 'saturday'] as const) {
            const exp = expected[dayType];
            const existing = sp.pricing.find(p => p.dayType === dayType && !p.overrideDate && p.isActive);
            
            if (existing) {
                const needsUpdate = existing.basePrice !== exp.price || 
                                     existing.extraAdultPrice !== exp.extraAdult ||
                                     existing.kidsPrice !== exp.kids ||
                                     existing.personsLabel !== exp.persons;
                
                if (needsUpdate) {
                    console.log(`🔧 Updating ${sp.name} ${dayType}: ₹${existing.basePrice} → ₹${exp.price}, persons: "${existing.personsLabel}" → "${exp.persons}", extraAdult: ${existing.extraAdultPrice} → ${exp.extraAdult}, kids: ${existing.kidsPrice} → ${exp.kids}`);
                    await prisma.propertyPricing.update({
                        where: { id: existing.id },
                        data: {
                            basePrice: exp.price,
                            personsLabel: exp.persons,
                            extraAdultPrice: exp.extraAdult,
                            kidsPrice: exp.kids,
                        },
                    });
                } else {
                    console.log(`✅ ${sp.name} ${dayType}: Already matches SS1 (₹${exp.price}, "${exp.persons}")`);
                }
            } else {
                console.log(`➕ Creating ${sp.name} ${dayType}: ₹${exp.price}, "${exp.persons}"`);
                await prisma.propertyPricing.create({
                    data: {
                        subPropertyId: sp.id,
                        propertyId: sp.propertyId,
                        dayType,
                        basePrice: exp.price,
                        personsLabel: exp.persons,
                        extraAdultPrice: exp.extraAdult,
                        kidsPrice: exp.kids,
                    },
                });
            }
        }
    }

    console.log("\n\n=== STEP 4: Verifying Final State ===\n");

    const finalSubProps = await prisma.subProperty.findMany({
        where: { property: { slug: 'ambrose' } },
        include: { property: true, pricing: { where: { isActive: true }, orderBy: { dayType: 'asc' } } },
    });

    for (const sp of finalSubProps) {
        console.log(`\n--- ${sp.name} (${sp.property.name}) ---`);
        for (const p of sp.pricing) {
            const marker = p.overrideDate ? '⚠️ OVERRIDE' : '✅ BASE';
            console.log(`  ${marker} ${p.dayType} | ₹${p.basePrice} | ${p.personsLabel} | extraAdult=₹${p.extraAdultPrice} | kids=₹${p.kidsPrice}`);
        }
    }

    const remainingOverrides = await prisma.propertyPricing.count({ where: { overrideDate: { not: null } } });
    console.log(`\n\nRemaining date overrides in DB: ${remainingOverrides}`);
    if (remainingOverrides === 0) {
        console.log("✅ ALL DATE OVERRIDES REMOVED SUCCESSFULLY");
    } else {
        console.log("⚠️ WARNING: Some overrides still exist!");
    }

    console.log("\n=== DONE ===");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
