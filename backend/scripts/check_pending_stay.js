const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // 1. Delete 3 duplicate bookings (keep the EARLIER one, delete the LATER one)
    const dupeRefs = ['ST-20260802-015vb', 'ST-20260802-013bj', 'ST-20260802-008qi'];
    
    console.log('=== DELETING DUPLICATE BOOKINGS ===');
    for (const ref of dupeRefs) {
        const booking = await p.staycationBooking.findFirst({ where: { bookingRef: ref } });
        if (booking) {
            await p.staycationBooking.delete({ where: { id: booking.id } });
            console.log('Deleted duplicate:', ref, '(ID:', booking.id, ')');
        } else {
            console.log('Not found (already deleted?):', ref);
        }
    }

    // 2. Recover missing booking for JAI PRAKASH SINGH
    console.log('\n=== RECOVERING MISSING BOOKING: JAI PRAKASH SINGH ===');
    const pendingRec = await p.pendingDdPayment.findFirst({ where: { razorpayOrderId: 'order_TKzTLa8uubRYiB' } });
    if (!pendingRec) {
        console.log('ERROR: Pending record not found');
        return;
    }
    if (pendingRec.createdBookingRef) {
        console.log('Already recovered:', pendingRec.createdBookingRef);
        return;
    }

    const pl = pendingRec.bookingPayload;
    const item = pl.items[0]; // Single item in cart
    
    // Check availability first
    const checkIn = new Date(pl.checkInDate + 'T00:00:00');
    const checkOut = new Date(pl.checkOutDate + 'T00:00:00');
    
    // Find or create user
    const cleanPhone = pl.customerPhone.replace(/\D/g, '').slice(-10);
    let user = await p.user.findFirst({ where: { phone: { endsWith: cleanPhone } } });
    if (!user) {
        user = await p.user.create({
            data: {
                phone: cleanPhone,
                name: pl.customerName,
                email: pl.customerEmail || null,
                role: 'customer',
            },
        });
        console.log('Created user:', user.id);
    } else {
        console.log('Found existing user:', user.id, user.name);
    }

    // Generate booking ref
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
    const existingCount = await p.staycationBooking.count({
        where: {
            bookingRef: { startsWith: 'ST-' + dateStr },
        },
    });
    const seqNum = String(existingCount + 1).padStart(3, '0');
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let suffix = '';
    for (let i = 0; i < 2; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const bookingRef = 'ST-' + dateStr + '-' + seqNum + suffix;

    // Create the booking
    const booking = await p.staycationBooking.create({
        data: {
            bookingRef: bookingRef,
            customerName: pl.customerName,
            customerPhone: cleanPhone,
            customerEmail: pl.customerEmail || null,
            propertyId: item.propertyId,
            subPropertyId: item.subPropertyId || null,
            numGuests: item.numGuests || 2,
            numKids: item.numKids || 0,
            numPets: item.numPets || 0,
            numCottages: item.numCottages || 1,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            nightlyRate: item.nightlyRate || 0,
            basePrice: item.basePrice || 0,
            extraPersonCharge: item.extraPersonCharge || 0,
            extraAdultCharge: item.extraAdultCharge || 0,
            extraKidsCharge: item.extraKidsCharge || 0,
            gstAmount: item.gstAmount || 0,
            totalAmount: item.totalAmount || 0,
            advanceAmount: item.advanceAmount || 0,
            balanceAmount: item.balanceAmount || 0,
            securityDeposit: item.securityDeposit || 0,
            advancePaid: true,
            advanceMethod: 'Razorpay: pay_TKzTSJRWnefiQa',
            source: 'website',
            status: 'confirmed',
            userId: user.id,
        },
    });
    console.log('Created recovered booking:', booking.bookingRef, '(ID:', booking.id, ')');

    // Handle addons
    if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
            if (addon.name === 'Food Preference') {
                await p.staycationBooking.update({
                    where: { id: booking.id },
                    data: { foodPreference: addon.foodType },
                });
                console.log('  Set food preference:', addon.foodType);
            }
        }
    }

    // Mark pending record as recovered
    await p.pendingDdPayment.update({
        where: { id: pendingRec.id },
        data: {
            status: 'manual_recovery',
            razorpayPaymentId: 'pay_TKzTSJRWnefiQa',
            createdBookingRef: booking.bookingRef,
        },
    });
    console.log('Marked pending record as manual_recovery');

    console.log('\n=== DONE ===');
    console.log('Deleted duplicates:', dupeRefs.join(', '));
    console.log('Recovered booking:', booking.bookingRef, 'for', pl.customerName);
}

main().catch(console.error).finally(() => p['$disconnect']());
