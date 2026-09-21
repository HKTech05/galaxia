const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Applying booked_via columns and indexes safely...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "staycation_bookings" ADD COLUMN IF NOT EXISTS "booked_via" VARCHAR(100);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "dd_bookings" ADD COLUMN IF NOT EXISTS "booked_via" VARCHAR(100);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "staycation_bookings_booked_via_idx" ON "staycation_bookings"("booked_via");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "dd_bookings_booked_via_idx" ON "dd_bookings"("booked_via");`);
    console.log("SUCCESS: booked_via columns and indexes safely created without affecting any other tables or columns.");
}

main()
    .catch((err) => {
        console.error("Migration error:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
