/**
 * Safe migration: Create pending_dd_payments table
 * Uses IF NOT EXISTS — safe to run multiple times.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Creating pending_dd_payments table (IF NOT EXISTS)...");

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.pending_dd_payments (
            id SERIAL PRIMARY KEY,
            razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
            razorpay_payment_id VARCHAR(100),
            amount INTEGER NOT NULL,
            booking_payload JSONB NOT NULL,
            customer_name VARCHAR(200) NOT NULL,
            customer_phone VARCHAR(30) NOT NULL,
            customer_email VARCHAR(255),
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_booking_ref VARCHAR(50),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    console.log("✅ pending_dd_payments table ready.");
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
