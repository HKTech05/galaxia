/**
 * Seed historical booking data for dashboard chart testing.
 * Run: npx ts-node prisma/seedHistorical.ts
 * 
 * This script dynamically fetches all sub-properties and screens
 * and creates bookings for EACH one, ensuring full chart coverage.
 */
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

function randomRef(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const guests = [
    { name: "Rajesh Gupta", phone: "+919876543210", email: "rajesh@example.com" },
    { name: "Priya Sharma", phone: "+919812345678", email: "priya@example.com" },
    { name: "Vikram Singh", phone: "+919900112233", email: "vikram@example.com" },
    { name: "Neha Joshi", phone: "+919988776655", email: "neha@example.com" },
    { name: "Arjun Patel", phone: "+919123456789", email: "arjun@example.com" },
    { name: "Sanya Malhotra", phone: "+919876001122", email: "sanya@example.com" },
    { name: "Kiran Desai", phone: "+919765432100", email: "kiran@example.com" },
    { name: "Rohan Verma", phone: "+919654321098", email: "rohan@example.com" },
    { name: "Ananya Mehta", phone: "+919543210987", email: "ananya@example.com" },
    { name: "Deepak Rao", phone: "+919432109876", email: "deepak@example.com" },
];

async function main() {
    console.log("🌱 Seeding historical bookings...");

    const properties = await prisma.property.findMany({ include: { subProperties: true } });
    const screens = await prisma.ddScreen.findMany();
    const packages = await prisma.ddPackage.findMany();

    if (properties.length === 0) {
        console.error("❌ No properties found. Run main seed first!");
        return;
    }

    const ambrose = properties.find(p => p.name === "Ambrose");
    const amstel = properties.find(p => p.name === "Amstel Nest");
    const standalones = properties.filter(p => !["Ambrose", "Amstel Nest"].includes(p.name));
    const movieTime = packages.find(p => p.slug === "movie-time");
    const celebPkg = packages.find(p => p.slug === "celebration");

    const now = new Date();
    let stayCount = 0;
    let ddCount = 0;

    // ── Ambrose bookings: 2 bookings per villa ──
    if (ambrose && ambrose.subProperties.length > 0) {
        console.log(`  Found ${ambrose.subProperties.length} Ambrose villas`);
        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < ambrose.subProperties.length; i++) {
                const villa = ambrose.subProperties[i];
                const guest = guests[(i + round * 5) % guests.length];
                const monthsBack = round === 0 ? (i + 1) : (i + 7);
                const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 8 + i * 2);
                const nights = [1, 2, 2, 3, 1][i % 5];
                const checkOut = new Date(checkIn.getTime() + nights * 86400000);
                const rate = round === 0 ? 6500 : 5500;
                const total = rate * nights;

                await prisma.staycationBooking.create({
                    data: {
                        bookingRef: randomRef("GLX"),
                        propertyId: ambrose.id,
                        subPropertyId: villa.id,
                        customerName: guest.name,
                        customerPhone: encrypt(guest.phone),
                        customerEmail: guest.email,
                        numGuests: 2 + (i % 3),
                        checkInDate: checkIn,
                        checkOutDate: checkOut,
                        numNights: nights,
                        nightlyRate: rate,
                        basePrice: total,
                        totalAmount: total,
                        advanceAmount: Math.round(total * 0.8),
                        balanceAmount: Math.round(total * 0.2),
                        status: "checked_out",
                        source: round === 0 ? "website" : "walk_in",
                        bookedAt: new Date(checkIn.getTime() - 5 * 86400000),
                    },
                });
                stayCount++;
            }
        }
    }

    // ── Amstel Nest bookings: 2 bookings per cottage ──
    if (amstel && amstel.subProperties.length > 0) {
        console.log(`  Found ${amstel.subProperties.length} Amstel Nest cottages`);
        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < amstel.subProperties.length; i++) {
                const cottage = amstel.subProperties[i];
                const guest = guests[(i + round * 3 + 2) % guests.length];
                const monthsBack = round === 0 ? (i % 6 + 1) : (i % 6 + 4);
                const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 10 + i);
                const nights = [2, 1, 3, 2, 1, 2, 3, 1, 2, 2, 1, 3, 2, 1, 2][i % 15];
                const checkOut = new Date(checkIn.getTime() + nights * 86400000);
                const rate = round === 0 ? 6950 : 4950;
                const total = rate * nights;

                await prisma.staycationBooking.create({
                    data: {
                        bookingRef: randomRef("GLX"),
                        propertyId: amstel.id,
                        subPropertyId: cottage.id,
                        customerName: guest.name,
                        customerPhone: encrypt(guest.phone),
                        customerEmail: guest.email,
                        numGuests: 2,
                        checkInDate: checkIn,
                        checkOutDate: checkOut,
                        numNights: nights,
                        nightlyRate: rate,
                        basePrice: total,
                        totalAmount: total,
                        advanceAmount: Math.round(total * 0.8),
                        balanceAmount: Math.round(total * 0.2),
                        status: "checked_out",
                        source: i % 2 === 0 ? "website" : "walk_in",
                        bookedAt: new Date(checkIn.getTime() - 3 * 86400000),
                    },
                });
                stayCount++;
            }
        }
    }

    // ── Standalone villa bookings: 2 per villa ──
    for (let round = 0; round < 2; round++) {
        for (let i = 0; i < standalones.length; i++) {
            const prop = standalones[i];
            const guest = guests[(i + round * 4 + 5) % guests.length];
            const monthsBack = round === 0 ? (i + 1) : (i + 5);
            const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 5 + i * 3);
            const nights = [1, 2, 1, 2][i % 4];
            const checkOut = new Date(checkIn.getTime() + nights * 86400000);
            const rates = [2500, 3500, 3950, 4950];
            const rate = rates[i % rates.length];
            const total = rate * nights;

            await prisma.staycationBooking.create({
                data: {
                    bookingRef: randomRef("GLX"),
                    propertyId: prop.id,
                    customerName: guest.name,
                    customerPhone: encrypt(guest.phone),
                    customerEmail: guest.email,
                    numGuests: 2,
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    numNights: nights,
                    nightlyRate: rate,
                    basePrice: total,
                    totalAmount: total,
                    advanceAmount: Math.round(total * 0.8),
                    balanceAmount: Math.round(total * 0.2),
                    status: "checked_out",
                    source: "website",
                    bookedAt: new Date(checkIn.getTime() - 4 * 86400000),
                },
            });
            stayCount++;
        }
    }

    // ── DD bookings: 2 per screen, across packages ──
    if (screens.length > 0 && packages.length > 0) {
        console.log(`  Found ${screens.length} DD screens, ${packages.length} packages`);
        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < screens.length; i++) {
                const screen = screens[i];
                const pkg = (i + round) % 2 === 0 ? movieTime : celebPkg;
                if (!pkg) continue;
                const guest = guests[(i + round * 2 + 1) % guests.length];
                const monthsBack = round === 0 ? (i + 1) : (i + 3);
                const bookingDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 15 + i * 3);
                const hours = (i + round) % 2 === 0 ? 2 : 3;
                const basePrices: Record<string, Record<number, number>> = {
                    "movie-time": { 2: 1500, 3: 2500 },
                    "celebration": { 2: 2950, 3: 3450 },
                };
                const basePrice = basePrices[pkg.slug]?.[hours] || 1500;

                await prisma.ddBooking.create({
                    data: {
                        bookingRef: randomRef("DD"),
                        screenId: screen.id,
                        packageId: pkg.id,
                        bookingDate: bookingDate,
                        startHour: 14 + i,
                        durationHours: hours,
                        customerName: guest.name,
                        customerPhone: encrypt(guest.phone),
                        customerEmail: guest.email,
                        numGuests: 2 + (i % 2),
                        basePrice: basePrice,
                        totalAmount: basePrice,
                        status: "confirmed",
                        source: (i + round) % 2 === 0 ? "website" : "walk_in",
                        bookedAt: new Date(bookingDate.getTime() - 2 * 86400000),
                    },
                });
                ddCount++;
            }
        }
    }

    console.log(`  ✅ ${stayCount} staycation bookings`);
    console.log(`  ✅ ${ddCount} DD bookings`);
    console.log("\n🎉 Historical seed complete!");
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
