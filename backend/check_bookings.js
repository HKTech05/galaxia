const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    const b1 = await p.staycationBooking.findFirst({
        where: { bookingRef: { contains: 'ST-20260509-009' } },
        select: {
            id: true, bookingRef: true, totalAmount: true, advanceAmount: true,
            balanceAmount: true, securityDeposit: true, basePrice: true,
            gstAmount: true, extraAdultCharge: true, extraKidsCharge: true,
            extraPersonCharge: true, source: true, numNights: true,
            numGuests: true, nightlyRate: true, discountAmount: true
        }
    });
    const b2 = await p.staycationBooking.findFirst({
        where: { bookingRef: { contains: 'ST-20260513-007' } },
        select: {
            id: true, bookingRef: true, totalAmount: true, advanceAmount: true,
            balanceAmount: true, securityDeposit: true, basePrice: true,
            gstAmount: true, extraAdultCharge: true, extraKidsCharge: true,
            extraPersonCharge: true, source: true, numNights: true,
            numGuests: true, nightlyRate: true, discountAmount: true
        }
    });

    console.log('BOOKING 1 (correct):', JSON.stringify(b1, null, 2));
    console.log('BOOKING 2 (wrong):', JSON.stringify(b2, null, 2));
    
    // Also get the last 7 bookings
    const last7 = await p.staycationBooking.findMany({
        orderBy: { id: 'desc' },
        take: 7,
        select: {
            bookingRef: true, totalAmount: true, advanceAmount: true,
            balanceAmount: true, securityDeposit: true, source: true,
            propertyId: true
        }
    });
    console.log('\nLAST 7 BOOKINGS:');
    last7.forEach(b => {
        const expected = b.totalAmount - b.advanceAmount;
        const match = expected === b.balanceAmount ? 'OK' : `MISMATCH (expected ${expected}, got ${b.balanceAmount})`;
        console.log(`  ${b.bookingRef}: total=${b.totalAmount}, advance=${b.advanceAmount}, balance=${b.balanceAmount}, deposit=${b.securityDeposit}, source=${b.source} => ${match}`);
    });

    await p.$disconnect();
})();
