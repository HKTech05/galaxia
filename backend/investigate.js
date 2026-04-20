const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    const b1 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-007" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true, bookedAt: true }
    });
    const b2 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-006" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true, bookedAt: true }
    });
    console.log("=== PROBLEM BOOKINGS ===");
    console.log("B1:", JSON.stringify(b1, null, 2));
    console.log("B2:", JSON.stringify(b2, null, 2));

    const hani = await p.user.findUnique({ where: { id: 17 } });
    console.log("\n=== HANI USER (id=17) ===");
    console.log(JSON.stringify(hani, null, 2));

    const allUsers = await p.user.findMany({
        orderBy: { id: "asc" },
        select: { id: true, fullName: true, email: true, phone: true, cognitoSub: true, createdAt: true }
    });
    console.log("\n=== ALL USERS ===");
    for (const u of allUsers) {
        console.log(`User ${u.id}: name="${u.fullName}", email="${u.email}", phone="${u.phone}", cognito="${u.cognitoSub || 'none'}", created=${u.createdAt}`);
    }

    const haniDdBookings = await p.ddBooking.findMany({
        where: { userId: 17 },
        select: { id: true, bookingRef: true, customerName: true, source: true, bookedAt: true }
    });
    console.log("\n=== ALL DD BOOKINGS LINKED TO USER 17 ===");
    for (const b of haniDdBookings) {
        console.log(`${b.bookingRef}: customer="${b.customerName}", source="${b.source}", booked=${b.bookedAt}`);
    }

    try {
        const logs = await p.auditLog.findMany({
            where: {
                action: "customer_login",
                createdAt: { gte: new Date("2026-04-19T00:00:00"), lte: new Date("2026-04-20T23:59:59") }
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        console.log("\n=== CUSTOMER LOGINS April 19-20 ===");
        for (const log of logs) {
            console.log(`${log.createdAt}: entityId=${log.entityId}, details=${JSON.stringify(log.details)}`);
        }
    } catch(e) { console.log("Audit log error:", e.message); }

    await p.$disconnect();
})();
