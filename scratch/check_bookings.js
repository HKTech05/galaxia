const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
    const bookings = await prisma.staycationBooking.findMany({
        where: {
            status: 'checked_in'
        },
        include: { property: true, subProperty: true },
        orderBy: { updatedAt: 'desc' },
        take: 20
    });

    console.log("Recent checked_in staycation bookings:");
    bookings.forEach(b => {
        console.log(`ID: ${b.id} | Ref: ${b.bookingRef} | Customer: ${b.customerName} | Property: ${b.property?.name} (${b.property?.slug}) | SubProperty: ${b.subProperty?.name} | Unit: ${b.assignedUnit} | UpdatedAt: ${b.updatedAt}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
