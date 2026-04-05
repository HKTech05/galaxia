const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
    const b = await p.ddBooking.findMany({ select: { id: true, bookingRef: true } });
    console.log('Found ' + b.length + ' DD bookings');
    const ids = b.map(x => x.id);
    if (ids.length > 0) {
        await p.ddBookingAddon.deleteMany({ where: { bookingId: { in: ids } } });
        await p.bookingPayment.deleteMany({ where: { ddBookingId: { in: ids } } });
        await p.guestId.deleteMany({ where: { ddBookingId: { in: ids } } });
        await p.couponUsage.deleteMany({ where: { bookingRef: { in: b.map(x => x.bookingRef) } } });
        const d = await p.ddBooking.deleteMany({});
        console.log('Deleted ' + d.count + ' DD bookings');
    }
    await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
