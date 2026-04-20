const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function investigate() {
    // Issue 1: Find DD-0248 booking and check its source
    const booking248 = await p.$queryRawUnsafe(
        `SELECT id, booking_ref, customer_name, source, status, booked_at, booking_date, start_hour, duration_hours, screen_id
         FROM dd_bookings
         WHERE booking_ref LIKE '%248%' OR id = 248
         ORDER BY id DESC LIMIT 5`
    );
    console.log("=== Booking(s) matching 248 ===");
    console.log(JSON.stringify(booking248, null, 2));

    // Issue 2: Find Aman Jain bookings
    const amanBookings = await p.$queryRawUnsafe(
        `SELECT id, booking_ref, customer_name, customer_phone, source, status, booking_date, start_hour, duration_hours, special_requests, screen_id
         FROM dd_bookings
         WHERE customer_name ILIKE '%aman%jain%'
         ORDER BY id DESC LIMIT 10`
    );
    console.log("\n=== Aman Jain bookings ===");
    console.log(JSON.stringify(amanBookings, null, 2));

    // Check if there's a transferred booking that should appear on April 20th
    const apr20 = await p.$queryRawUnsafe(
        `SELECT id, booking_ref, customer_name, status, booking_date, start_hour, duration_hours, source
         FROM dd_bookings
         WHERE booking_date::text LIKE '2026-04-20%' OR booking_date::text LIKE '2026-04-19%'
         ORDER BY booking_date, start_hour`
    );
    console.log("\n=== All bookings on Apr 19-20 ===");
    console.log(JSON.stringify(apr20, null, 2));

    await p.$disconnect();
}

investigate().catch(e => { console.error(e); process.exit(1); });
