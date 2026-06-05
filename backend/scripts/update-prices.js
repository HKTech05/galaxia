const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update La Paraiso weekday pricing
    const result = await prisma.propertyPricing.updateMany({
        where: {
            property: {
                slug: 'la-paraiso'
            },
            dayType: 'weekday'
        },
        data: {
            basePrice: 4960
        }
    });
    console.log(`Updated ${result.count} pricing rows for La Paraiso weekday to 4960.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
