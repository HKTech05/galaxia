/**
 * Seed historical booking data for dashboard chart testing.
 * Run: npx ts-node prisma/seedHistorical.ts
 */
import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

function randomRef(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

async function main() {
    console.log("🌱 Seeding historical bookings...");

    // Get properties
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
    const guests = [
        { name: "Rajesh Gupta", phone: "+919876543210", email: "rajesh@example.com" },
        { name: "Priya Sharma", phone: "+919812345678", email: "priya@example.com" },
        { name: "Vikram Singh", phone: "+919900112233", email: "vikram@example.com" },
        { name: "Neha Joshi", phone: "+919988776655", email: "neha@example.com" },
        { name: "Arjun Patel", phone: "+919123456789", email: "arjun@example.com" },
        { name: "Sanya Malhotra", phone: "+919876001122", email: "sanya@example.com" },
        { name: "Kiran Desai", phone: "+919765432100", email: "kiran@example.com" },
        { name: "Rohan Verma", phone: "+919654321098", email: "rohan@example.com" },
    ];

    let stayCount = 0;
    let ddCount = 0;

    // ── Ambrose bookings (spread across villas, last 18 months)
    if (ambrose && ambrose.subProperties.length > 0) {
        for (let i = 0; i < 6; i++) {
            const villa = ambrose.subProperties[i % ambrose.subProperties.length];
            const guest = guests[i % guests.length];
            const monthsBack = Math.floor(i * 3) + 1; // 1, 4, 7, 10, 13, 16 months back
            const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 10 + i);
            const nights = [1, 2, 2, 3, 1, 2][i];
            const checkOut = new Date(checkIn.getTime() + nights * 86400000);
            const rate = [5500, 6500, 5500, 6500, 5500, 6500][i];
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
                    source: i % 2 === 0 ? "website" : "walk_in",
                    bookedAt: new Date(checkIn.getTime() - 5 * 86400000),
                },
            });
            stayCount++;
        }
    }

    // ── Amstel Nest bookings (2 cottages, last 12 months)
    if (amstel && amstel.subProperties.length > 0) {
        for (let i = 0; i < 4; i++) {
            const cottage = amstel.subProperties[i % amstel.subProperties.length];
            const guest = guests[(i + 3) % guests.length];
            const monthsBack = (i + 1) * 2;
            const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 15 + i);
            const nights = [2, 1, 3, 2][i];
            const checkOut = new Date(checkIn.getTime() + nights * 86400000);
            const rate = [4950, 6950, 4950, 6950][i];
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
                    source: "website",
                    bookedAt: new Date(checkIn.getTime() - 3 * 86400000),
                },
            });
            stayCount++;
        }
    }

    // ── Standalone villa bookings (last 6 months)
    for (let i = 0; i < Math.min(standalones.length, 4); i++) {
        const prop = standalones[i];
        const guest = guests[(i + 5) % guests.length];
        const monthsBack = i + 1;
        const checkIn = new Date(now.getFullYear(), now.getMonth() - monthsBack, 5 + i * 3);
        const nights = [1, 2, 1, 2][i];
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

    // ── DD bookings (last 6 months)
    if (screens.length > 0 && packages.length > 0) {
        for (let i = 0; i < 4; i++) {
            const screen = screens[i % screens.length];
            const pkg = i % 2 === 0 ? movieTime : celebPkg;
            if (!pkg) continue;
            const guest = guests[(i + 2) % guests.length];
            const monthsBack = i + 1;
            const bookingDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 20 + i);
            const hours = i % 2 === 0 ? 2 : 3;
            const basePrice = i % 2 === 0 ? 1500 : 3450;
            const total = basePrice;

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
                    numGuests: 2,
                    basePrice: basePrice,
                    totalAmount: total,
                    status: "confirmed",
                    source: i % 2 === 0 ? "website" : "walk_in",
                    bookedAt: new Date(bookingDate.getTime() - 2 * 86400000),
                },
            });
            ddCount++;
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
