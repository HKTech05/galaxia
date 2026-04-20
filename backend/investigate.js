const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
    // Search for the transferred booking ref
    const r = await p.$queryRawUnsafe(
        `SELECT id, booking_ref, customer_name, status, booking_date, start_hour FROM dd_bookings WHERE booking_ref LIKE '%T03DB3C%'`
    );
    console.log("Transfer booking search:", JSON.stringify(r));
    
    // Also fix DD-248 source to website
    const fix = await p.$queryRawUnsafe(
        `UPDATE dd_bookings SET source = 'website' WHERE id = 248 RETURNING id, booking_ref, source`
    );
    console.log("Fixed DD-248 source:", JSON.stringify(fix));
    
    await p.$disconnect();
})();
