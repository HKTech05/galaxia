/**
 * Seed script: Reset all staycation bookings and create diverse test data.
 * Uses UTC midnight dates so @db.Date fields store the correct date.
 * Run: npx tsx scripts/seedStaycationBookings.ts
 */
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

async function main() {
    console.log("🔄 Resetting staycation bookings...");

    await prisma.extraGuest.deleteMany({});
    await prisma.guestId.deleteMany({ where: { bookingId: { not: null } } });
    await prisma.bookingPayment.deleteMany({ where: { staycationBookingId: { not: null } } });
    await prisma.staycationBooking.deleteMany({});

    console.log("✅ All staycation bookings cleared.");

    // Helper: create a UTC midnight date for the given offset from today (IST)
    const now = new Date();
    // Get today's date in IST
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    const todayIST = istNow.toISOString().split('T')[0]; // e.g. "2026-03-17"
    
    const d = (offset: number) => {
        const base = new Date(todayIST + 'T00:00:00.000Z'); // UTC midnight of today IST date
        base.setUTCDate(base.getUTCDate() + offset);
        return base;
    };

    console.log(`📅 Today (IST): ${todayIST}`);
    console.log(`   d(0) = ${d(0).toISOString()}`);
    console.log(`   d(1) = ${d(1).toISOString()}`);
    console.log(`   d(-1) = ${d(-1).toISOString()}`);

    let refCounter = 1;
    const makeRef = () => `ST-${todayIST.replace(/-/g, "")}-${String(refCounter++).padStart(3, "0")}`;

    // Property/sub-property IDs (from DB)
    const HEAVENLY = 3;
    const AMBROSE = 6;
    const AMSTEL = 5;
    const LA_PARAISO = 4;
    const TAKE1 = 3;
    const ALTA = 4;
    const SANTORINI = 5;
    const BAMBOOSA_SUB = 6;
    const CYPRESS_SUB = 7;
    const COTTAGE1 = 8;
    const FAMILY_COTTAGE = 2;

    const bookings: any[] = [
        // 1: HEAVENLY — Checked in today
        {
            bookingRef: makeRef(), propertyId: HEAVENLY,
            customerName: "Rahul Sharma", customerPhone: encrypt("9876543210"),
            customerEmail: "rahul.sharma@email.com", numGuests: 4,
            checkInDate: d(0), checkOutDate: d(2), numNights: 2,
            nightlyRate: 15000, basePrice: 30000, gstAmount: 1500, totalAmount: 31500,
            advanceAmount: 6300, balanceAmount: 25200, securityDeposit: 5000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(-1),
            status: "checked_in", source: "website",
        },
        // 2: LA PARAISO — Confirmed, check-in tomorrow
        {
            bookingRef: makeRef(), propertyId: LA_PARAISO,
            customerName: "Priya Patel", customerPhone: encrypt("9988776655"),
            customerEmail: "priya.p@email.com", numGuests: 2,
            checkInDate: d(1), checkOutDate: d(3), numNights: 2,
            nightlyRate: 12000, basePrice: 24000, gstAmount: 1200, totalAmount: 25200,
            advanceAmount: 5040, balanceAmount: 20160, securityDeposit: 3000,
            advancePaid: true, advanceMethod: "Online", advancePaidAt: d(-2),
            status: "confirmed", source: "website",
        },
        // 3: AMBROSE/ALTA — Checked in, checkout TODAY
        {
            bookingRef: makeRef(), propertyId: AMBROSE, subPropertyId: ALTA,
            customerName: "Vikram Mehta", customerPhone: encrypt("8877665544"),
            numGuests: 3, checkInDate: d(-1), checkOutDate: d(0), numNights: 1,
            nightlyRate: 8500, basePrice: 8500, gstAmount: 425, totalAmount: 8925,
            advanceAmount: 1785, balanceAmount: 7140, securityDeposit: 2000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(-3),
            balanceCollected: true, balanceMethod: "Cash", balanceCollectedAt: d(-1),
            depositCollected: true, depositMethod: "UPI", depositCollectedAt: d(-1),
            status: "checked_in", source: "walk_in",
        },
        // 4: AMBROSE/TAKE-1 — Confirmed, CHECK-IN TODAY
        {
            bookingRef: makeRef(), propertyId: AMBROSE, subPropertyId: TAKE1,
            customerName: "Ananya Desai", customerPhone: encrypt("7766554433"),
            customerEmail: "ananya.d@email.com", numGuests: 2,
            checkInDate: d(0), checkOutDate: d(1), numNights: 1,
            nightlyRate: 5500, basePrice: 5500, gstAmount: 275, totalAmount: 5775,
            advanceAmount: 1155, balanceAmount: 4620, securityDeposit: 2000,
            advancePaid: true, advanceMethod: "Online", advancePaidAt: d(-1),
            status: "confirmed", source: "website",
        },
        // 5: AMBROSE/CYPRESS — Cancelled
        {
            bookingRef: makeRef(), propertyId: AMBROSE, subPropertyId: CYPRESS_SUB,
            customerName: "Ravi Kumar", customerPhone: encrypt("6655443322"),
            numGuests: 6, checkInDate: d(2), checkOutDate: d(4), numNights: 2,
            nightlyRate: 18000, basePrice: 36000, gstAmount: 1800, totalAmount: 37800,
            advanceAmount: 7560, balanceAmount: 30240, securityDeposit: 5000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(-5),
            status: "cancelled", source: "website",
        },
        // 6: HEAVENLY — Future booking next week
        {
            bookingRef: makeRef(), propertyId: HEAVENLY,
            customerName: "Meera Joshi", customerPhone: encrypt("5544332211"),
            customerEmail: "meera.j@email.com", numGuests: 2,
            checkInDate: d(7), checkOutDate: d(9), numNights: 2,
            nightlyRate: 15000, basePrice: 30000, gstAmount: 1500, totalAmount: 31500,
            advanceAmount: 6300, balanceAmount: 25200, securityDeposit: 5000,
            advancePaid: true, advanceMethod: "Online", advancePaidAt: d(0),
            status: "confirmed", source: "website",
        },
        // 7: AMBROSE/SANTORINI — Checked out
        {
            bookingRef: makeRef(), propertyId: AMBROSE, subPropertyId: SANTORINI,
            customerName: "Deep Kapoor", customerPhone: encrypt("4433221100"),
            numGuests: 4, checkInDate: d(-3), checkOutDate: d(-1), numNights: 2,
            nightlyRate: 9500, basePrice: 19000, gstAmount: 950, totalAmount: 19950,
            advanceAmount: 3990, balanceAmount: 15960, securityDeposit: 2000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(-5),
            balanceCollected: true, balanceMethod: "Cash", balanceCollectedAt: d(-3),
            depositCollected: true, depositMethod: "Cash", depositCollectedAt: d(-3),
            depositRefunded: true, depositRefundedAt: d(-1),
            status: "checked_out", source: "website",
        },
        // 8: AMBROSE/BAMBOOSA — Checked in today
        {
            bookingRef: makeRef(), propertyId: AMBROSE, subPropertyId: BAMBOOSA_SUB,
            customerName: "Kiran Naidu", customerPhone: encrypt("3344556677"),
            customerEmail: "kiran.n@email.com", numGuests: 2,
            checkInDate: d(0), checkOutDate: d(1), numNights: 1,
            nightlyRate: 6500, basePrice: 6500, gstAmount: 325, totalAmount: 6825,
            advanceAmount: 1365, balanceAmount: 5460, securityDeposit: 2000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(-1),
            status: "checked_in", source: "website",
        },
        // 9: AMSTEL/COTTAGE 1 — Confirmed today
        {
            bookingRef: makeRef(), propertyId: AMSTEL, subPropertyId: COTTAGE1,
            customerName: "Sanjay Gupta", customerPhone: encrypt("3322110099"),
            numGuests: 2, checkInDate: d(0), checkOutDate: d(1), numNights: 1,
            nightlyRate: 4950, basePrice: 4950, gstAmount: 248, totalAmount: 5198,
            advanceAmount: 1040, balanceAmount: 4158, securityDeposit: 1000,
            advancePaid: true, advanceMethod: "Online", advancePaidAt: d(-1),
            status: "confirmed", source: "website",
        },
        // 10: AMSTEL/FAMILY COTTAGE — Confirmed tomorrow
        {
            bookingRef: makeRef(), propertyId: AMSTEL, subPropertyId: FAMILY_COTTAGE,
            customerName: "Neha Agarwal", customerPhone: encrypt("2211009988"),
            customerEmail: "neha.a@email.com", numGuests: 4,
            checkInDate: d(1), checkOutDate: d(3), numNights: 2,
            nightlyRate: 6950, basePrice: 13900, gstAmount: 695, totalAmount: 14595,
            advanceAmount: 2919, balanceAmount: 11676, securityDeposit: 2000,
            advancePaid: true, advanceMethod: "UPI", advancePaidAt: d(0),
            status: "confirmed", source: "website",
        },
    ];

    console.log(`\n📝 Creating ${bookings.length} test bookings...`);

    for (const b of bookings) {
        const created = await prisma.staycationBooking.create({ data: b });
        console.log(`  ✅ ${created.bookingRef} — ${created.customerName} @ ${created.status} (ID: ${created.id}) checkIn=${created.checkInDate.toISOString()} checkOut=${created.checkOutDate.toISOString()}`);
    }

    // Add extra guest
    const allBookings = await prisma.staycationBooking.findMany({ orderBy: { id: "asc" } });
    if (allBookings.length > 0) {
        await prisma.extraGuest.create({
            data: { bookingId: allBookings[0].id, guestName: "Amit Sharma", idProofType: "Aadhar", chargeAmount: 1500, paymentMethod: "Cash" },
        });
        console.log(`  ✅ Added extra guest to ${allBookings[0].bookingRef}`);
    }

    console.log("\n🎉 Seed complete!");
}

main()
    .catch(e => { console.error("❌ Error:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
