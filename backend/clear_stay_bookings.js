const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllBookings() {
    console.log('=== Clearing ALL Staycation + DD Bookings ===');
    console.log('(Site images / photos are NOT touched)\n');

    // ─── STAYCATION ───────────────────────────────────────
    const stayBookings = await prisma.staycationBooking.findMany({ select: { id: true, bookingRef: true, couponId: true } });
    console.log(`Found ${stayBookings.length} staycation bookings`);

    if (stayBookings.length > 0) {
        const stayIds = stayBookings.map(b => b.id);
        const stayRefs = stayBookings.map(b => b.bookingRef);

        const p1 = await prisma.bookingPayment.deleteMany({ where: { staycationBookingId: { in: stayIds } } });
        console.log(`  Deleted ${p1.count} staycation payments`);
        const e1 = await prisma.extraGuest.deleteMany({ where: { bookingId: { in: stayIds } } });
        console.log(`  Deleted ${e1.count} extra guests`);
        const g1 = await prisma.guestId.deleteMany({ where: { bookingId: { in: stayIds } } });
        console.log(`  Deleted ${g1.count} staycation guest IDs`);
        const c1 = await prisma.couponUsage.deleteMany({ where: { bookingRef: { in: stayRefs } } });
        console.log(`  Deleted ${c1.count} staycation coupon usage logs`);

        const stayCouponIds = [...new Set(stayBookings.filter(b => b.couponId).map(b => b.couponId))];
        for (const cid of stayCouponIds) {
            const count = stayBookings.filter(b => b.couponId === cid).length;
            await prisma.coupon.update({ where: { id: cid }, data: { currentUses: { decrement: count } } });
        }
        if (stayCouponIds.length > 0) console.log(`  Reset ${stayCouponIds.length} coupon(s)`);

        const h1 = await prisma.bookingHold.deleteMany({ where: { holdType: 'staycation' } });
        console.log(`  Deleted ${h1.count} staycation holds`);

        const d1 = await prisma.staycationBooking.deleteMany({});
        console.log(`  ✅ Deleted ${d1.count} staycation bookings\n`);
    }

    // ─── DIGITAL DIARIES ──────────────────────────────────
    const ddBookings = await prisma.ddBooking.findMany({ select: { id: true, bookingRef: true, couponId: true } });
    console.log(`Found ${ddBookings.length} DD bookings`);

    if (ddBookings.length > 0) {
        const ddIds = ddBookings.map(b => b.id);
        const ddRefs = ddBookings.map(b => b.bookingRef);

        const a1 = await prisma.ddBookingAddon.deleteMany({ where: { bookingId: { in: ddIds } } });
        console.log(`  Deleted ${a1.count} DD booking addons`);
        const p2 = await prisma.bookingPayment.deleteMany({ where: { ddBookingId: { in: ddIds } } });
        console.log(`  Deleted ${p2.count} DD payments`);
        const g2 = await prisma.guestId.deleteMany({ where: { ddBookingId: { in: ddIds } } });
        console.log(`  Deleted ${g2.count} DD guest IDs`);
        const c2 = await prisma.couponUsage.deleteMany({ where: { bookingRef: { in: ddRefs } } });
        console.log(`  Deleted ${c2.count} DD coupon usage logs`);

        const ddCouponIds = [...new Set(ddBookings.filter(b => b.couponId).map(b => b.couponId))];
        for (const cid of ddCouponIds) {
            const count = ddBookings.filter(b => b.couponId === cid).length;
            await prisma.coupon.update({ where: { id: cid }, data: { currentUses: { decrement: count } } });
        }
        if (ddCouponIds.length > 0) console.log(`  Reset ${ddCouponIds.length} coupon(s)`);

        const h2 = await prisma.bookingHold.deleteMany({ where: { holdType: 'dd' } });
        console.log(`  Deleted ${h2.count} DD holds`);

        const d2 = await prisma.ddBooking.deleteMany({});
        console.log(`  ✅ Deleted ${d2.count} DD bookings\n`);
    }

    // ─── VERIFY ───────────────────────────────────────────
    console.log('── Verification ──');
    console.log(`Remaining staycation bookings: ${await prisma.staycationBooking.count()}`);
    console.log(`Remaining DD bookings: ${await prisma.ddBooking.count()}`);
    console.log(`Site images (untouched): ${await prisma.siteImage.count()}`);

    await prisma.$disconnect();
}

clearAllBookings().catch(e => { console.error(e); process.exit(1); });
