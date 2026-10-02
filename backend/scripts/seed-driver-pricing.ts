import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Create base driver pricing rows (no overrideDate = base price)
    const types = [
        { type: 'stay', basePrice: 500 },
        { type: 'food', basePrice: 1000 },
        { type: 'stay_food', basePrice: 1500 },
    ];
    
    for (const t of types) {
        const existing = await prisma.driverPricing.findFirst({
            where: { type: t.type, overrideDate: null }
        });
        if (!existing) {
            await prisma.driverPricing.create({
                data: { type: t.type, basePrice: t.basePrice }
            });
            console.log(`Created base driver pricing: ${t.type} = ₹${t.basePrice}`);
        } else {
            console.log(`Driver pricing already exists: ${t.type} = ₹${existing.basePrice}`);
        }
    }
    
    console.log('Done seeding driver pricing.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
