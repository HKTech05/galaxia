require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    console.log('=== DATABASE AUDIT ===\n');

    // 1. Properties
    const props = await prisma.property.findMany({ select: { id: true, name: true, slug: true, images: true } });
    console.log(`PROPERTIES: ${props.length}`);
    for (const p of props) {
        const hasImages = p.images && (Array.isArray(p.images) ? p.images.length > 0 : Object.keys(p.images).length > 0);
        console.log(`  ${p.id}. ${p.name} (${p.slug}) — images: ${hasImages ? JSON.stringify(p.images).substring(0, 80) + '...' : 'NONE'}`);
    }

    // 2. Sub-properties
    const subs = await prisma.subProperty.findMany({ select: { id: true, name: true, propertyId: true, imageUrl: true } });
    console.log(`\nSUB-PROPERTIES: ${subs.length}`);
    for (const s of subs) {
        console.log(`  ${s.id}. ${s.name} (propId=${s.propertyId}) — imageUrl: ${s.imageUrl || 'NONE'}`);
    }

    // 3. Admin accounts
    const admins = await prisma.adminAccount.findMany({ select: { id: true, username: true, role: true, assignedProperties: true } });
    console.log(`\nADMIN ACCOUNTS: ${admins.length}`);
    for (const a of admins) console.log(`  ${a.id}. ${a.username} (${a.role}) → ${JSON.stringify(a.assignedProperties)}`);

    // 4. Users
    const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true } });
    console.log(`\nUSERS: ${users.length}`);
    for (const u of users) console.log(`  ${u.id}. ${u.fullName} (${u.email})`);

    // 5. Employees
    const emps = await prisma.employee.findMany({ include: { property: { select: { name: true } } } });
    console.log(`\nEMPLOYEES: ${emps.length}`);
    for (const e of emps) console.log(`  ${e.id}. ${e.name} — ${e.property?.name}`);

    // 6. Staycation bookings
    const stayBookings = await prisma.staycationBooking.count();
    const stayByStatus = await prisma.staycationBooking.groupBy({ by: ['status'], _count: true });
    console.log(`\nSTAYCATION BOOKINGS: ${stayBookings}`);
    for (const s of stayByStatus) console.log(`  ${s.status}: ${s._count}`);

    // 7. DD bookings
    const ddBookings = await prisma.ddBooking.count();
    console.log(`\nDD BOOKINGS: ${ddBookings}`);

    // 8. Coupons
    const coupons = await prisma.coupon.findMany();
    console.log(`\nCOUPONS: ${coupons.length}`);
    for (const c of coupons) console.log(`  ${c.id}. ${c.code} (${c.discountType} ${c.discountValue})`);

    // 9. Reviews
    const reviews = await prisma.review.count();
    console.log(`\nREVIEWS: ${reviews}`);

    // 10. Site images
    const siteImages = await prisma.siteImage.count();
    console.log(`\nSITE IMAGES: ${siteImages}`);

    // 11. Blocked dates
    const blocked = await prisma.blockedDate.count();
    console.log(`\nBLOCKED DATES: ${blocked}`);

    // 12. Cash transactions
    const cashTx = await prisma.cashTransaction.count();
    console.log(`\nCASH TRANSACTIONS: ${cashTx}`);

    // 13. UPI payments
    const upiPay = await prisma.upiPayment.count();
    console.log(`\nUPI PAYMENTS: ${upiPay}`);

    // 14. Booking payments 
    const bookPay = await prisma.bookingPayment.count();
    console.log(`\nBOOKING PAYMENTS: ${bookPay}`);

    // 15. Guest IDs
    const guestIds = await prisma.guestId.count();
    console.log(`\nGUEST IDS: ${guestIds}`);

    // 16. Extra guests
    const extraGuests = await prisma.extraGuest.count();
    console.log(`\nEXTRA GUESTS: ${extraGuests}`);

    // 17. Property amenities
    const amenities = await prisma.propertyAmenity.count();
    console.log(`\nPROPERTY AMENITIES: ${amenities}`);

    // 18. Property pricing
    const pricing = await prisma.propertyPricing.count();
    console.log(`\nPROPERTY PRICING: ${pricing}`);

    // 19. DD screens
    const screens = await prisma.ddScreen.findMany({ select: { id: true, name: true, imageUrl: true, gallery: true } });
    console.log(`\nDD SCREENS: ${screens.length}`);
    for (const s of screens) console.log(`  ${s.id}. ${s.name} — imageUrl: ${s.imageUrl || 'NONE'}, gallery: ${s.gallery ? JSON.stringify(s.gallery).substring(0,60) : 'NONE'}`);

    // 20. DD packages
    const packages = await prisma.ddPackage.findMany({ select: { id: true, name: true } });
    console.log(`\nDD PACKAGES: ${packages.length}`);
    for (const p of packages) console.log(`  ${p.id}. ${p.name}`);

    // 21. Coupon usage
    const couponUsage = await prisma.couponUsage.count();
    console.log(`\nCOUPON USAGE LOGS: ${couponUsage}`);

    // 22. Notifications
    const notifs = await prisma.notification.count();
    console.log(`\nNOTIFICATIONS: ${notifs}`);

    // 23. Audit logs
    const auditLogs = await prisma.auditLog.count();
    console.log(`\nAUDIT LOGS: ${auditLogs}`);

    // 24. Chat memory
    const chatMem = await prisma.chat_memory.count();
    console.log(`\nCHAT MEMORY: ${chatMem}`);

    // 25. Resort knowledge
    const knowledge = await prisma.resort_knowledge.count();
    console.log(`\nRESORT KNOWLEDGE: ${knowledge}`);

    console.log('\n=== END AUDIT ===');
}

audit().catch(console.error).finally(() => prisma.$disconnect());
