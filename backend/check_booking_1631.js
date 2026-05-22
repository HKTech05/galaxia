const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const b = await p.staycationBooking.findFirst({
            where: { bookingRef: 'ST-20260521-01631' },
            include: { property: true }
        });
        console.log('BOOKING ST-20260521-01631:', JSON.stringify(b, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await p.$disconnect();
    }
})();
