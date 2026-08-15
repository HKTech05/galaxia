require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Find Manoj Aher's booking
    const booking = await prisma.staycationBooking.findFirst({
        where: {
            bookingRef: { startsWith: "ST-20260813-007" },
            customerName: { contains: "Manoj", mode: "insensitive" },
        },
        select: {
            id: true,
            bookingRef: true,
            customerName: true,
            status: true,
            depositRefunded: true,
            depositRefundMethod: true,
            depositRefundedAt: true,
            securityDeposit: true,
        }
    });

    if (!booking) {
        console.error("Booking not found!");
        process.exit(1);
    }

    console.log("Found booking:", JSON.stringify(booking, null, 2));

    // The deposit was already refunded by the first handler, verify this
    if (!booking.depositRefunded) {
        console.log("Deposit NOT yet refunded. Marking as refunded via cash...");
        await prisma.staycationBooking.update({
            where: { id: booking.id },
            data: {
                depositRefunded: true,
                depositRefundedAt: new Date(),
                depositRefundMethod: "cash",
            }
        });

        // Also handle the cash tracking
        const fullBooking = await prisma.staycationBooking.findUnique({
            where: { id: booking.id },
            include: { property: true }
        });
        const depositAmount = fullBooking.securityDeposit || 0;
        if (depositAmount > 0) {
            const employee = await prisma.employee.findFirst({
                where: { propertyId: fullBooking.propertyId, isActive: true },
            });
            if (employee) {
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { 
                        cashCollected: { decrement: depositAmount },
                        depositCollected: { decrement: depositAmount }
                    },
                });
                await prisma.cashTransaction.create({
                    data: {
                        employeeId: employee.id,
                        bookingRef: fullBooking.bookingRef,
                        guestName: fullBooking.customerName,
                        amount: -depositAmount,
                        transactionType: "refund",
                        note: `Deposit refund (cash) — ${fullBooking.property?.name || "Property"}`,
                    },
                });
                console.log(`  Cash tracking updated: decremented ${depositAmount} from employee ${employee.id}`);
            }
        }
        console.log("✅ Deposit marked as refunded via cash");
    } else {
        console.log(`Deposit already refunded: ${booking.depositRefundMethod} at ${booking.depositRefundedAt}`);
    }

    // Now mark as checked_out
    if (booking.status !== "checked_out") {
        await prisma.staycationBooking.update({
            where: { id: booking.id },
            data: { status: "checked_out" }
        });
        console.log(`✅ Status updated: ${booking.status} -> checked_out`);
    } else {
        console.log("Status already checked_out");
    }

    // Verify final state
    const final = await prisma.staycationBooking.findUnique({
        where: { id: booking.id },
        select: { id: true, bookingRef: true, customerName: true, status: true, depositRefunded: true, depositRefundMethod: true }
    });
    console.log("\nFinal state:", JSON.stringify(final, null, 2));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
