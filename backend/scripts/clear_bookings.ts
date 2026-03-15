import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting to clear booking-related tables...');

    try {
        // Delete in order to respect foreign keys
        await prisma.couponUsage.deleteMany({});
        await prisma.extraGuest.deleteMany({});
        await prisma.guestId.deleteMany({});
        await prisma.bookingPayment.deleteMany({});
        await prisma.staycationBooking.deleteMany({});
        await prisma.ddBooking.deleteMany({});
        
        console.log('Successfully cleared all booking tables.');
    } catch (error) {
        console.error('Error clearing tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
