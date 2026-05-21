const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const b = await p.staycationBooking.findFirst({
            where: { bookingRef: 'ST-20260521-003og' },
            include: {
                property: true,
                subProperty: true
            }
        });
        console.log('BOOKING DETAILS:', JSON.stringify(b, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await p.$disconnect();
    }
})();
