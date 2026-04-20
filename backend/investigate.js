const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    // 1. Get the two problem bookings
    const b1 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-007" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true, createdAt: true }
    });
    const b2 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-006" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true, createdAt: true }
    });
    console.log("=== PROBLEM BOOKINGS ===");
    console.log("B1:", JSON.stringify(b1, null, 2));
    console.log("B2:", JSON.stringify(b2, null, 2));

    // 2. Get Hani's user record (userId 17)
    const hani = await p.user.findUnique({
        where: { id: 17 },
    });
    console.log("\n=== HANI USER (id=17) ===");
    console.log(JSON.stringify(hani, null, 2));

    // 3. Find ALL users that could match these guests
    // Check all users with similar names
    const allUsers = await p.user.findMany({
        orderBy: { id: "asc" },
        select: { id: true, fullName: true, email: true, phone: true, cognitoSub: true, createdAt: true }
    });
    console.log("\n=== ALL USERS ===");
    for (const u of allUsers) {
        console.log(`User ${u.id}: name="${u.fullName}", email="${u.email}", phone="${u.phone}", cognito="${u.cognitoSub || 'none'}", created=${u.createdAt}`);
    }

    // 4. Check ALL bookings linked to user 17
    const haniBookings = await p.ddBooking.findMany({
        where: { userId: 17 },
        select: { id: true, bookingRef: true, customerName: true, source: true, createdAt: true }
    });
    console.log("\n=== ALL DD BOOKINGS LINKED TO USER 17 (Hani) ===");
    for (const b of haniBookings) {
        console.log(`${b.bookingRef}: customer="${b.customerName}", source="${b.source}", created=${b.createdAt}`);
    }

    // 5. Check audit logs around the booking creation time
    try {
        const logs = await p.auditLog.findMany({
            where: {
                action: "customer_login",
                createdAt: {
                    gte: new Date("2026-04-19T00:00:00"),
                    lte: new Date("2026-04-20T23:59:59"),
                }
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        console.log("\n=== CUSTOMER LOGINS April 19-20 ===");
        for (const log of logs) {
            console.log(`${log.createdAt}: userId=${log.entityId}, details=${JSON.stringify(log.details)}`);
        }
    } catch(e) {
        console.log("No audit log table or error:", e.message);
    }

    await p.$disconnect();
})();
