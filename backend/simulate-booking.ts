import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    // 1. Get an existing property
    let property = await prisma.property.findFirst();
    if (!property) {
        console.error("No properties found in DB to test with. Creating a dummy property.");
        property = await prisma.property.create({
            data: {
                name: "Simulation Villa",
                slug: "simulation-villa",
                type: "villa",
                checkInTime: "14:00",
                checkOutTime: "11:00",
                maxPersons: 10,
                securityDeposit: 5000,
            }
        });
    }

    console.log("🏡 Using Property:", property.name, "(id:", property.id, ")");

    // 2. Simulate customer POST request to API
    console.log("\n👤 Simulating customer booking via API (`POST /api/bookings/staycation`)...");

    // Check-in tomorrow, check-out in 3 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 3);

    const payload = {
        customerName: "Simulation Test Customer",
        customerPhone: "+919876543000",
        customerEmail: "simulation@example.com",
        propertyId: property.id,
        numGuests: 2,
        checkInDate: tomorrow.toISOString(),
        checkOutDate: checkOut.toISOString(),
        nightlyRate: 5000,
        basePrice: 10000,
        gstAmount: 1800,
        totalAmount: 11800,
        advanceAmount: 5900,
        balanceAmount: 5900,
        source: "website_simulation",
    };

    const response = await fetch("http://localhost:4000/api/bookings/staycation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    console.log("➡️ API Response Status:", response.status);

    if (response.status !== 201) {
        console.error("❌ Booking failed! Error:", data);
        process.exit(1);
    }

    console.log("✅ API successfully created booking with Ref:", data.bookingRef);

    // 3. Verify in Database (Admin view simulation)
    console.log("\n🔍 Verifying booking in the database (Admin View)...");
    const bookingInDb = await prisma.staycationBooking.findUnique({
        where: { id: data.id },
        include: { user: true, property: true }
    });

    if (bookingInDb) {
        console.log("✅ Booking successfully stored in Database!");
        console.log("-----------------------------------------");
        console.log(`Booking Ref:     ${bookingInDb.bookingRef}`);
        console.log(`Status:          ${bookingInDb.status}`);
        console.log(`Property:        ${bookingInDb.property.name}`);
        console.log(`Check In:        ${bookingInDb.checkInDate.toISOString().split('T')[0]}`);
        console.log(`Check Out:       ${bookingInDb.checkOutDate.toISOString().split('T')[0]}`);
        console.log(`Total Amount:    ${bookingInDb.totalAmount}`);
        console.log(`User Linked:     ${bookingInDb.user?.fullName}`);
        console.log("-----------------------------------------");
        console.log("Admin API will correctly see this data.");
    } else {
        console.error("❌ Booking not found in database.");
    }

    // Cleanup: Delete the simulated booking and user to not pollute the DB
    console.log("\n🧹 Cleaning up simulation data...");
    await prisma.staycationBooking.delete({ where: { id: data.id } });
    console.log("Simulation complete.");

    await prisma.$disconnect();
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
