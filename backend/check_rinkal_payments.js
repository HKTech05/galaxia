const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const payments = await p.bookingPayment.findMany({
            where: { staycationBookingId: 771 }
        });
        console.log('PAYMENTS FOR BOOKING 771:');
        console.log(JSON.stringify(payments, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
})();
