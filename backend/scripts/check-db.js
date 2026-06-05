const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pricings = await prisma.propertyPricing.findMany({
        include: {
            property: true,
            subProperty: true
        }
    });
    console.log("PRICING RULES:");
    for (const p of pricings) {
        if (p.property?.slug === 'la-paraiso' || p.property?.slug === 'ambrose' || p.subProperty?.propertyId === 6) {
            console.log(`- ID: ${p.id}, Prop: ${p.property?.slug || 'none'}, SubProp: ${p.subProperty?.name || 'none'}, DayType: ${p.dayType}, BasePrice: ${p.basePrice}, ExtraAdult: ${p.extraAdultPrice}, Kids: ${p.kidsPrice}, PersonsLabel: ${p.personsLabel}, IsActive: ${p.isActive}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
