const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Mark pending record as recovered (booking was already created as ST-20260802-013jl)
    await p.pendingDdPayment.update({
        where: { id: 23 },
        data: {
            status: 'manual_recovery',
            razorpayPaymentId: 'pay_TKzTSJRWnefiQa',
            createdBookingRef: 'ST-20260802-013jl',
        },
    });
    console.log('Marked pending record #23 as manual_recovery');

    // Add food preference as addon JSON (Regular food type)
    await p.staycationBooking.update({
        where: { id: 1431 },
        data: {
            addons: [{ name: 'Food Preference', foodType: 'Regular' }],
        },
    });
    console.log('Updated booking #1431 addons with food preference');

    // Verify
    const booking = await p.staycationBooking.findUnique({ where: { id: 1431 }, select: { bookingRef: true, customerName: true, addons: true, status: true } });
    console.log('Verified:', JSON.stringify(booking));
}

main().catch(console.error).finally(() => p['$disconnect']());
