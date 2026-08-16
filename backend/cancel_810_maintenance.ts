import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    // Cancel all 8-10 PM maintenance blocks from August 17, 2026 onwards
    const startDate = new Date('2026-08-17T12:00:00');
    
    const result = await prisma.ddBooking.updateMany({
        where: {
            isMaintenance: true,
            customerName: 'Maintenance Block',
            startHour: 20,
            durationHours: 2,
            bookingDate: {
                gte: startDate,
            },
            status: { notIn: ['cancelled'] },
        },
        data: {
            status: 'cancelled',
        },
    });

    console.log(`Cancelled ${result.count} maintenance blocks (8-10 PM) from Aug 17, 2026 onwards.`);
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
