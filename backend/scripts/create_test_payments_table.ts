import prisma from "../src/lib/prisma";

async function main() {
    console.log("Creating test_payments table safely...");
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.test_payments (
            id SERIAL PRIMARY KEY,
            payment_id VARCHAR(100) UNIQUE NOT NULL,
            razorpay_order_id VARCHAR(100),
            razorpay_payment_id VARCHAR(100),
            amount INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(30) NOT NULL,
            verified BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("✅ test_payments table created successfully!");
}

main()
    .catch((e) => {
        console.error("Error creating table:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
