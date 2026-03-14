
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting employee seeding...');

    const properties = await prisma.property.findMany();
    
    for (const prop of properties) {
        // Check if employee already exists for this property
        const existing = await prisma.employee.findFirst({
            where: { propertyId: prop.id }
        });

        if (!existing) {
            await prisma.employee.create({
                data: {
                    name: `${prop.name} Manager`,
                    role: 'Resort Manager',
                    propertyId: prop.id,
                    phone: '0000000000',
                    isActive: true
                }
            });
            console.log(`Created manager for ${prop.name}`);
        } else {
            console.log(`Manager already exists for ${prop.name}`);
        }
    }

    // Also Digital Diaries (if it's not a property in the 'properties' table, check if we need a separate record)
    // The properties list for employees in frontend includes "Digital Diaries"
    // Let's check if there is a property with slug 'digital-diaries'
    const ddProp = await prisma.property.findUnique({ where: { slug: 'digital-diaries' } });
    if (ddProp) {
        const existingDD = await prisma.employee.findFirst({ where: { propertyId: ddProp.id } });
        if (!existingDD) {
             await prisma.employee.create({
                data: {
                    name: `Digital Diaries Manager`,
                    role: 'Manager',
                    propertyId: ddProp.id,
                    phone: '0000000000',
                    isActive: true
                }
            });
            console.log('Created manager for Digital Diaries');
        }
    }

    console.log('Employee seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
