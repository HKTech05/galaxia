const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDDBookings() {
    console.log('=== Clearing ALL Digital Diaries Bookings ===\n');

    // 1. Count what we're deleting
    const ddBookings = await prisma.ddBooking.findMany({ select: { id: true, bookingRef: true, couponId: true } });
    console.log(`Found ${ddBookings.length} DD bookings to delete`);

    if (ddBookings.length === 0) {
        console.log('Nothing to delete!');
        await prisma.$disconnect();
        return;
    }

    const bookingIds = ddBookings.map(b => b.id);
    const bookingRefs = ddBookings.map(b => b.bookingRef);

    // 2. Delete DD booking addons
    const addons = await prisma.ddBookingAddon.deleteMany({ where: { bookingId: { in: bookingIds } } });
    console.log(`Deleted ${addons.count} DD booking addons`);

    // 3. Delete booking payments linked to DD
    const payments = await prisma.bookingPayment.deleteMany({ where: { ddBookingId: { in: bookingIds } } });
    console.log(`Deleted ${payments.count} DD booking payments`);

    // 4. Delete guest IDs linked to DD
    const guestIds = await prisma.guestId.deleteMany({ where: { ddBookingId: { in: bookingIds } } });
    console.log(`Deleted ${guestIds.count} DD guest IDs`);

    // 5. Delete coupon usage for DD bookings
    const couponUsage = await prisma.couponUsage.deleteMany({ where: { bookingRef: { in: bookingRefs } } });
    console.log(`Deleted ${couponUsage.count} coupon usage logs (DD)`);

    // 6. Reset coupon current_uses for coupons used by DD bookings
    const couponIds = [...new Set(ddBookings.filter(b => b.couponId).map(b => b.couponId))];
    if (couponIds.length > 0) {
        for (const cid of couponIds) {
            const ddUsageCount = ddBookings.filter(b => b.couponId === cid).length;
            await prisma.coupon.update({
                where: { id: cid },
                data: { currentUses: { decrement: ddUsageCount } },
            });
        }
        console.log(`Reset usage counts for ${couponIds.length} coupons`);
    }

    // 7. Delete DD booking holds
    const holds = await prisma.bookingHold.deleteMany({ where: { holdType: 'dd' } });
    console.log(`Deleted ${holds.count} DD booking holds`);

    // 8. Delete blocked dates for DD screens
    const blocked = await prisma.blockedDate.deleteMany({ where: { screenId: { not: null } } });
    console.log(`Deleted ${blocked.count} DD screen blocked dates`);

    // 9. Finally delete all DD bookings
    const deleted = await prisma.ddBooking.deleteMany({});
    console.log(`\n✅ Deleted ${deleted.count} DD bookings total`);

    // 10. Verify
    const remaining = await prisma.ddBooking.count();
    console.log(`\nRemaining DD bookings: ${remaining}`);
    const stayCount = await prisma.staycationBooking.count();
    console.log(`Staycation bookings (untouched): ${stayCount}`);

    await prisma.$disconnect();
}

clearDDBookings().catch(e => { console.error(e); process.exit(1); });
