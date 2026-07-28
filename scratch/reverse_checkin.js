const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function reverseCheckin() {
    const bookingId = 1206;
    
    const existing = await prisma.staycationBooking.findUnique({
        where: { id: bookingId }
    });

    if (!existing) {
        console.error("Booking 1206 not found!");
        return;
    }

    console.log(`Current Booking #1206 status: ${existing.status}`);

    const updated = await prisma.staycationBooking.update({
        where: { id: bookingId },
        data: {
            status: "confirmed",
            checkInTime: null,
        }
    });

    console.log(`Successfully reversed Booking #1206 (${updated.bookingRef} - ${updated.customerName}) status back to: ${updated.status}`);
}

reverseCheckin().catch(console.error).finally(() => prisma.$disconnect());
