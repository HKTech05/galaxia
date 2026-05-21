const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const bookings = await p.staycationBooking.findMany({
            take: 15,
            orderBy: { id: 'desc' },
            include: { property: true }
        });
        console.log('RECENT BOOKINGS:');
        bookings.forEach(b => {
            console.log(`Ref: ${b.bookingRef} | Source: ${b.source} | Property: ${b.property?.slug} | Guests: ${b.numGuests} | Kids: ${b.numKids} | Cottages: ${b.numCottages} | Total Amount: ${b.totalAmount}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await p.$disconnect();
    }
})();
