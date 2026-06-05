const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const bookings = await p.staycationBooking.findMany({
            where: {
                OR: [
                    { customerName: { contains: 'Rinkal' } },
                    { customerName: { contains: 'Sidhya' } },
                    { id: 771 }
                ]
            },
            include: {
                property: true,
                subProperty: true
            }
        });

        console.log('RINKAL BOOKINGS FOUND:', bookings.length);
        bookings.forEach(b => {
            console.log('ID:', b.id);
            console.log('Ref:', b.bookingRef);
            console.log('Name:', b.customerName);
            console.log('Email (encrypted):', b.customerEmail);
            console.log('Phone (encrypted):', b.customerPhone);
            console.log('Property:', b.property?.name);
            console.log('SubProperty:', b.subProperty?.name);
            console.log('Dates:', b.checkInDate, 'to', b.checkOutDate);
            console.log('Amounts: Base =', b.basePrice, 'ExtraAdult =', b.extraAdultCharge, 'GST =', b.gstAmount, 'Total =', b.totalAmount, 'Advance =', b.advanceAmount, 'Balance =', b.balanceAmount);
            console.log('Advance Method:', b.advanceMethod);
            console.log('Advance Paid:', b.advancePaid);
            console.log('--------------------------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
})();
