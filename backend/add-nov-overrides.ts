import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Ambrose property and sub-properties
  const ambrose = await prisma.property.findFirst({ where: { slug: 'ambrose' } });
  if (!ambrose) { console.log('ERROR: Ambrose not found'); return; }
  console.log(`Ambrose property ID: ${ambrose.id}`);

  const subs = await prisma.subProperty.findMany({ where: { propertyId: ambrose.id } });
  console.log('\nSub-properties:');
  for (const s of subs) {
    console.log(`  ${s.id}: ${s.name} (slug: ${s.slug})`);
  }

  // Map sub-property slugs to IDs
  const subMap: Record<string, number> = {};
  for (const s of subs) {
    subMap[s.slug] = s.id;
  }

  // Dates to override (Nov 8-13, excluding Nov 14 Saturday)
  const overrideDates = [
    '2026-11-08', // Sunday
    '2026-11-09', // Monday
    '2026-11-10', // Tuesday
    '2026-11-11', // Wednesday
    '2026-11-12', // Thursday
    '2026-11-13', // Friday
  ];

  // Pricing overrides
  const villaOverrides: { slugs: string[]; price: number; personsLabel: string }[] = [
    { slugs: ['take-1', 'alta', 'santorini'], price: 12500, personsLabel: 'Up to 4 with meals' },
    { slugs: ['bamboosa'], price: 13000, personsLabel: '4 with meals' },
    { slugs: ['cypress'], price: 6500, personsLabel: '2 with meals' },
  ];

  // First, read existing base rows to get extraAdultPrice and kidsPrice
  const baseRows = await prisma.propertyPricing.findMany({
    where: { propertyId: ambrose.id, overrideDate: null }
  });
  console.log('\nExisting base rows:');
  for (const r of baseRows) {
    const subName = subs.find(s => s.id === r.subPropertyId)?.name || 'parent';
    console.log(`  [${r.dayType}] ${subName}: price=${r.basePrice}, persons="${r.personsLabel}", extraAdult=${r.extraAdultPrice}, kids=${r.kidsPrice}`);
  }

  // Delete any existing overrides for these dates first
  for (const dateStr of overrideDates) {
    const deleted = await prisma.propertyPricing.deleteMany({
      where: {
        propertyId: ambrose.id,
        overrideDate: new Date(dateStr),
      }
    });
    if (deleted.count > 0) {
      console.log(`  Deleted ${deleted.count} existing override(s) for ${dateStr}`);
    }
  }

  // Create new override rows
  let created = 0;
  for (const vo of villaOverrides) {
    for (const slug of vo.slugs) {
      const subId = subMap[slug];
      if (!subId) {
        console.log(`ERROR: Sub-property ${slug} not found!`);
        continue;
      }

      // Get the base weekday row for this sub to copy extraAdultPrice/kidsPrice
      const baseRow = baseRows.find(r => r.subPropertyId === subId && r.dayType === 'weekday');
      const extraAdult = baseRow?.extraAdultPrice || 2000;
      const kidsPrice = baseRow?.kidsPrice || 1000;

      for (const dateStr of overrideDates) {
        await prisma.propertyPricing.create({
          data: {
            propertyId: ambrose.id,
            subPropertyId: subId,
            dayType: 'weekday', // day type for override rows
            basePrice: vo.price,
            personsLabel: vo.personsLabel,
            overrideDate: new Date(dateStr),
            specialLabel: `Override ${dateStr}`,
            extraAdultPrice: extraAdult,
            kidsPrice: kidsPrice,
          }
        });
        created++;
      }
      console.log(`  Created 6 overrides for ${slug} at ₹${vo.price}`);
    }
  }

  console.log(`\nTotal override rows created: ${created}`);

  // Verify
  const allOverrides = await prisma.propertyPricing.findMany({
    where: {
      propertyId: ambrose.id,
      overrideDate: { not: null }
    },
    orderBy: [{ subPropertyId: 'asc' }, { overrideDate: 'asc' }]
  });
  console.log(`\nVerification — ${allOverrides.length} override rows exist:`);
  for (const r of allOverrides) {
    const subName = subs.find(s => s.id === r.subPropertyId)?.name || 'parent';
    const dateStr = r.overrideDate ? r.overrideDate.toISOString().split('T')[0] : 'null';
    console.log(`  ${dateStr} | ${subName.padEnd(12)} | ₹${r.basePrice} | ${r.personsLabel}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
