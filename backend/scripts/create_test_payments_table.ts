import prisma from "../src/lib/prisma";

async function main() {
    console.log("Adding booking_details & created_booking_ref to test_payments safely...");
    await prisma.$executeRawUnsafe(`
        ALTER TABLE public.test_payments
        ADD COLUMN IF NOT EXISTS booking_details JSONB,
        ADD COLUMN IF NOT EXISTS created_booking_ref VARCHAR(50);
    `);
    console.log("✅ Columns added to test_payments table successfully!");
}

main()
    .catch((e) => {
        console.error("Error altering table:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
