require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Find bookings for both guests in SS2 (currently active)
    const bookings = await prisma.staycationBooking.findMany({
        where: {
            customerName: { in: ["Kaustubh Gurav", "Atul Kulkarni"] },
            status: { not: "cancelled" },
            checkOutDate: { gte: new Date() }
        },
        select: {
            id: true,
            bookingRef: true,
            customerName: true,
            assignedUnit: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
            subProperty: { select: { name: true } }
        }
    });

    console.log("Found bookings:");
    bookings.forEach(b => {
        console.log(`  ID: ${b.id} | Ref: ${b.bookingRef} | Guest: ${b.customerName} | Unit: ${b.assignedUnit} | SubProp: ${b.subProperty?.name} | Status: ${b.status}`);
    });

    const kaustubh = bookings.find(b => b.customerName === "Kaustubh Gurav");
    const atul = bookings.find(b => b.customerName === "Atul Kulkarni");

    if (!kaustubh || !atul) {
        console.error("Could not find both bookings!");
        if (!kaustubh) console.error("  Missing: Kaustubh Gurav");
        if (!atul) console.error("  Missing: Atul Kulkarni");
        process.exit(1);
    }

    console.log(`\nSwapping:`);
    console.log(`  ${kaustubh.customerName}: ${kaustubh.assignedUnit} -> Cottage 3`);
    console.log(`  ${atul.customerName}: ${atul.assignedUnit} -> Cottage 11`);

    // Swap assigned units
    await prisma.staycationBooking.update({
        where: { id: kaustubh.id },
        data: { assignedUnit: "Cottage 3" }
    });
    await prisma.staycationBooking.update({
        where: { id: atul.id },
        data: { assignedUnit: "Cottage 11" }
    });

    console.log("\n✅ Cottage assignments swapped successfully!");

    // Verify
    const updated = await prisma.staycationBooking.findMany({
        where: { id: { in: [kaustubh.id, atul.id] } },
        select: { id: true, customerName: true, assignedUnit: true }
    });
    updated.forEach(b => {
        console.log(`  ${b.customerName}: ${b.assignedUnit}`);
    });
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
