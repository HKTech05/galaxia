const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    // Today = April 5, 2026 IST = start of day in UTC
    const todayStart = new Date('2026-04-05T00:00:00+05:30');
    console.log('Cutoff (before this = delete):', todayStart.toISOString());

    // 1. Clear old CashTransactions (before today)
    const oldCash = await p.cashTransaction.deleteMany({
        where: { createdAt: { lt: todayStart } }
    });
    console.log('Deleted ' + oldCash.count + ' old cash transaction logs');

    // 2. Clear old UpiPayments (before today)
    const oldUpi = await p.upiPayment.deleteMany({
        where: { createdAt: { lt: todayStart } }
    });
    console.log('Deleted ' + oldUpi.count + ' old UPI payment logs');

    // 3. Recalculate employee cashCollected from remaining (today's) transactions
    const employees = await p.employee.findMany({ where: { isActive: true } });
    for (const emp of employees) {
        const todayCash = await p.cashTransaction.aggregate({
            where: { employeeId: emp.id, transactionType: 'collection' },
            _sum: { amount: true }
        });
        const todayPickups = await p.cashTransaction.aggregate({
            where: { employeeId: emp.id, transactionType: 'owner_pickup' },
            _sum: { amount: true }
        });
        const corrected = (todayCash._sum.amount || 0) - (todayPickups._sum.amount || 0);
        await p.employee.update({
            where: { id: emp.id },
            data: { cashCollected: Math.max(0, corrected) }
        });
        console.log('  Employee ' + emp.name + ' cashCollected reset to ' + Math.max(0, corrected));
    }

    // 4. Fix hemant booking (-799 bug): find the booking with customerName containing "hemant"
    const hemant = await p.ddBooking.findFirst({
        where: { customerName: { contains: 'hemant', mode: 'insensitive' } }
    });
    if (hemant) {
        // Recalculate: amountToCollect should be max(0, totalAmount - amountPaid)
        const correctToCollect = Math.max(0, hemant.totalAmount - hemant.amountPaid);
        if (hemant.amountToCollect < 0) {
            // The paid amount exceeded total, fix both
            await p.ddBooking.update({
                where: { id: hemant.id },
                data: {
                    amountPaid: hemant.totalAmount,
                    amountToCollect: 0,
                    paymentStatus: 'paid'
                }
            });
            console.log('Fixed hemant booking: amountPaid=' + hemant.totalAmount + ', amountToCollect=0');
        } else {
            console.log('Hemant booking looks OK: toCollect=' + hemant.amountToCollect);
        }
    } else {
        console.log('No hemant booking found (may have been deleted)');
    }

    // 5. Verify
    console.log('\n--- Verification ---');
    console.log('Remaining cash logs:', await p.cashTransaction.count());
    console.log('Remaining UPI logs:', await p.upiPayment.count());
    console.log('DD bookings (untouched):', await p.ddBooking.count());

    await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
