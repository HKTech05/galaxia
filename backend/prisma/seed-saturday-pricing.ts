import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Seed Saturday pricing rows for all Ambrose sub-properties.
 * Also updates weekday/weekend prices to match the new price list.
 * 
 * New Price List:
 * - Take-1, Alta, Santorini: Mon-Thu ₹5,500 (2p) | Fri/Sun ₹6,500 (2p) | Sat ₹8,500 (2p) | Extra ₹2,000 | Kids ₹1,000
 * - Bamboosa: Mon-Thu ₹10,500 (4p) | Fri/Sun ₹11,500 (4p) | Sat ₹13,000 (4p) | Extra ₹2,000 | Kids ₹1,000
 * - Cypress: Mon-Thu ₹5,500 (2p) | Fri/Sat/Sun ₹6,500 (2p) | Extra ₹2,000 | Kids ₹1,000
 */
async function main() {
    // Find Ambrose property
    const ambrose = await prisma.property.findUnique({ where: { slug: 'ambrose' }, include: { subProperties: true } });
    if (!ambrose) { console.log('Ambrose not found'); return; }

    const priceMap: Record<string, { weekday: number; weekend: number; saturday: number; wdLabel: string; weLabel: string; saLabel: string }> = {
        'take-1':    { weekday: 5500,  weekend: 6500,  saturday: 8500,  wdLabel: '2 with meals', weLabel: '2 with meals', saLabel: '2 with meals' },
        'alta':      { weekday: 5500,  weekend: 6500,  saturday: 8500,  wdLabel: '2 with meals', weLabel: '2 with meals', saLabel: '2 with meals' },
        'santorini': { weekday: 5500,  weekend: 6500,  saturday: 8500,  wdLabel: '2 with meals', weLabel: '2 with meals', saLabel: '2 with meals' },
        'bamboosa':  { weekday: 10500, weekend: 11500, saturday: 13000, wdLabel: '4 with meals', weLabel: '4 with meals', saLabel: '4 with meals' },
        'cypress':   { weekday: 5500,  weekend: 6500,  saturday: 6500,  wdLabel: '2 with meals', weLabel: '2 with meals', saLabel: '2 with meals' },
    };

    for (const sp of ambrose.subProperties) {
        const prices = priceMap[sp.slug];
        if (!prices) { console.log(`No price map for ${sp.slug}, skipping`); continue; }

        for (const [dayType, price, label] of [
            ['weekday', prices.weekday, prices.wdLabel],
            ['weekend', prices.weekend, prices.weLabel],
            ['saturday', prices.saturday, prices.saLabel],
        ] as [string, number, string][]) {
            const existing = await prisma.propertyPricing.findFirst({
                where: { subPropertyId: sp.id, dayType, overrideDate: null, isActive: true },
            });
            if (existing) {
                await prisma.propertyPricing.update({
                    where: { id: existing.id },
                    data: { basePrice: price, extraAdultPrice: 2000, kidsPrice: 1000, personsLabel: label },
                });
                console.log(`Updated ${sp.name} ${dayType}: ₹${price} (${label})`);
            } else {
                await prisma.propertyPricing.create({
                    data: {
                        subPropertyId: sp.id,
                        propertyId: ambrose.id,
                        dayType,
                        basePrice: price,
                        extraAdultPrice: 2000,
                        kidsPrice: 1000,
                        personsLabel: label,
                        kidsAgeRange: '5-12 yrs',
                    },
                });
                console.log(`Created ${sp.name} ${dayType}: ₹${price} (${label})`);
            }
        }
    }

    console.log('\n✅ All Ambrose sub-property pricing updated!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
