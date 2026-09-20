const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Note: Local time or IST date check
    const now = new Date();
    // Format to YYYY-MM-DD in Asia/Kolkata timezone
    const kolkataDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayStr = `${kolkataDate.getFullYear()}-${String(kolkataDate.getMonth()+1).padStart(2,'0')}-${String(kolkataDate.getDate()).padStart(2,'0')}`;
    
    console.log(`Current Date (IST): ${todayStr}\n`);

    const bookings = await prisma.staycationBooking.findMany({
        where: {
            status: { in: ['checked_in', 'Checked In'] }
        },
        include: {
            property: true,
            subProperty: true
        },
        orderBy: { checkOutDate: 'asc' }
    });

    console.log(`Total currently checked-in bookings in DB: ${bookings.length}`);

    const pending = bookings.filter(b => {
        if (!b.checkOutDate) return false;
        const d = new Date(b.checkOutDate);
        const kD = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const codStr = `${kD.getFullYear()}-${String(kD.getMonth()+1).padStart(2,'0')}-${String(kD.getDate()).padStart(2,'0')}`;
        return codStr <= todayStr;
    });

    console.log(`Pending checkouts (Checkout Date <= ${todayStr}): ${pending.length}\n`);

    console.log("========================================================================================");
    console.log("LIST OF PENDING CHECKOUTS");
    console.log("========================================================================================");

    pending.forEach((b, i) => {
        const inD = new Date(b.checkInDate);
        const inKD = new Date(inD.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const cidStr = `${inKD.getFullYear()}-${String(inKD.getMonth()+1).padStart(2,'0')}-${String(inKD.getDate()).padStart(2,'0')}`;
        
        const outD = new Date(b.checkOutDate);
        const outKD = new Date(outD.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const codStr = `${outKD.getFullYear()}-${String(outKD.getMonth()+1).padStart(2,'0')}-${String(outKD.getDate()).padStart(2,'0')}`;

        const propName = b.subProperty ? b.subProperty.name : (b.property ? b.property.name : 'Unknown');

        console.log(`${i + 1}. [${b.bookingRef || '#ST-' + b.id}]`);
        console.log(`   Guest Name   : ${b.customerName} (${b.customerPhone || 'No Phone'})`);
        console.log(`   Property     : ${propName} ${b.assignedUnit ? `(Unit: ${b.assignedUnit})` : ''}`);
        console.log(`   Check-In     : ${cidStr}`);
        console.log(`   Check-Out    : ${codStr} ${codStr < todayStr ? '⚠️ OVERDUE!' : '📅 Today'}`);
        console.log(`   Status       : ${b.status}`);
        console.log("----------------------------------------------------------------------------------------");
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
