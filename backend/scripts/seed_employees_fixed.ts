import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting enhanced seeding...');

    // 1. Ensure "Digital Diaries" exists in Property table
    const ddProp = await prisma.property.upsert({
        where: { slug: 'digital-diaries' },
        update: {},
        create: {
            slug: 'digital-diaries',
            name: 'Digital Diaries',
            subtitle: 'Digital Diaries Space',
            type: 'standalone',
            description: 'Digital Diaries booking system',
            checkInTime: '12:00 PM',
            checkOutTime: '11:00 AM',
            maxPersons: 100,
            securityDeposit: 0,
            isActive: true,
            displayOrder: 100
        }
    });
    console.log('Ensured Digital Diaries property exists.');

    // 2. Clear existing employees to ensure fresh "1 per property" state
    await prisma.employee.deleteMany({});
    console.log('Cleared existing employees.');

    // 3. Seed 1 employee for each property
    const properties = await prisma.property.findMany();
    
    for (const prop of properties) {
        await prisma.employee.create({
            data: {
                name: `${prop.name} Admin`,
                role: 'Manager',
                propertyId: prop.id,
                phone: '0000000000',
                isActive: true
            }
        });
        console.log(`Created manager for ${prop.name}`);
    }

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
