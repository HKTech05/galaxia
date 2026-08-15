require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Find Abdul's booking - Park N Watch, Movie Time, today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await prisma.ddBooking.findMany({
        where: {
            customerName: { contains: "Abdul", mode: "insensitive" },
            bookingDate: { gte: today, lt: tomorrow },
            status: { notIn: ["cancelled", "no_show"] }
        },
        include: {
            screen: true,
            payments: true
        }
    });

    console.log(`Found ${bookings.length} booking(s) for Abdul today:`);
    for (const b of bookings) {
        console.log(`  ID: ${b.id} | Ref: ${b.bookingRef} | Screen: ${b.screen?.name}`);
        console.log(`  amountPaid: ${b.amountPaid} | amountToCollect: ${b.amountToCollect} | total: ${b.totalAmount}`);
        console.log(`  paymentStatus: ${b.paymentStatus} | paymentMethod: ${b.paymentMethod}`);
        console.log(`  Payments:`, b.payments.map(p => `${p.id}: ${p.amount} via ${p.method} (${p.paymentType})`));
    }

    if (bookings.length !== 1) {
        console.error("Expected exactly 1 booking. Aborting.");
        process.exit(1);
    }

    const booking = bookings[0];
    
    // Find the balance payment(s) that were collected (the accidental collection)
    const balancePayments = booking.payments.filter(p => p.paymentType === "balance");
    console.log(`\nBalance payments to remove: ${balancePayments.length}`);
    
    if (balancePayments.length === 0) {
        console.log("No balance payments found. Checking if amountPaid was set during booking creation...");
        // The ₹999 was set during booking creation as "on arrival" amount
        // We need to restore: amountPaid back to prepaid only, amountToCollect back to 999
        console.log(`Resetting: amountPaid ${booking.amountPaid} -> 0, amountToCollect ${booking.amountToCollect} -> ${booking.totalAmount}`);
        
        await prisma.ddBooking.update({
            where: { id: booking.id },
            data: {
                amountPaid: 0,
                amountToCollect: booking.totalAmount,
                paymentStatus: booking.totalAmount > 0 ? "partial" : "paid",
                paymentMethod: null,
            }
        });
        console.log("✅ Reset booking financials (no balance payment records to delete)");
    } else {
        let totalReversed = 0;
        for (const p of balancePayments) {
            console.log(`  Deleting payment ${p.id}: ${p.amount} via ${p.method}`);
            
            // If it was cash, also undo the employee cash tracking
            if (p.method?.toLowerCase() === "cash" && p.amount > 0) {
                const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
                if (ddProperty) {
                    const employee = await prisma.employee.findFirst({
                        where: { propertyId: ddProperty.id, isActive: true },
                    });
                    if (employee) {
                        await prisma.employee.update({
                            where: { id: employee.id },
                            data: { cashCollected: { decrement: p.amount } },
                        });
                        console.log(`  Decremented employee ${employee.id} cashCollected by ${p.amount}`);
                        
                        // Delete the cash transaction
                        const cashTx = await prisma.cashTransaction.findFirst({
                            where: {
                                employeeId: employee.id,
                                bookingRef: booking.bookingRef,
                                transactionType: "collection",
                                amount: p.amount,
                            },
                            orderBy: { createdAt: "desc" }
                        });
                        if (cashTx) {
                            await prisma.cashTransaction.delete({ where: { id: cashTx.id } });
                            console.log(`  Deleted CashTransaction ${cashTx.id}`);
                        }
                    }
                }
            }
            
            // Delete the BookingPayment record
            await prisma.bookingPayment.delete({ where: { id: p.id } });
            totalReversed += p.amount;
        }
        
        // Update the booking totals
        await prisma.ddBooking.update({
            where: { id: booking.id },
            data: {
                amountPaid: { decrement: totalReversed },
                amountToCollect: { increment: totalReversed },
                paymentStatus: "partial",
            }
        });
        console.log(`\n✅ Reversed ${totalReversed} in payments. Booking restored.`);
    }

    // Verify
    const updated = await prisma.ddBooking.findUnique({
        where: { id: booking.id },
        select: { id: true, customerName: true, amountPaid: true, amountToCollect: true, totalAmount: true, paymentStatus: true }
    });
    console.log("\nFinal state:", JSON.stringify(updated, null, 2));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
