const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
    // Find the two bookings Hani sees
    const b1 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-007" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true }
    });
    const b2 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-006" },
        select: { id: true, bookingRef: true, customerName: true, userId: true, source: true, customerPhone: true, customerEmail: true }
    });
    
    console.log("Booking 1:", JSON.stringify(b1, null, 2));
    console.log("Booking 2:", JSON.stringify(b2, null, 2));
    
    // Check which user they're linked to
    const userIds = new Set();
    if (b1 && b1.userId) userIds.add(b1.userId);
    if (b2 && b2.userId) userIds.add(b2.userId);
    
    for (const uid of userIds) {
        const u = await p.user.findUnique({
            where: { id: uid },
            select: { id: true, fullName: true, email: true, phone: true }
        });
        console.log("Linked user:", JSON.stringify(u, null, 2));
        
        // Count all bookings for this user
        const ddCount = await p.ddBooking.count({ where: { userId: uid } });
        const stayCount = await p.stayBooking.count({ where: { userId: uid } });
        console.log(`User ${uid} has ${ddCount} DD bookings, ${stayCount} stay bookings`);
    }
    
    // Find Hani's user record
    const haniUsers = await p.user.findMany({
        where: { OR: [
            { fullName: { contains: "hani", mode: "insensitive" } },
            { email: { contains: "hani", mode: "insensitive" } }
        ]},
        select: { id: true, fullName: true, email: true, phone: true }
    });
    console.log("Hani users:", JSON.stringify(haniUsers, null, 2));
    
    await p.$disconnect();
})();
