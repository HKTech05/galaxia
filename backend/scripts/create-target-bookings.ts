import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_EMAILS = [
    "gravanti51@gmail.com",
    "p88145559@gmail.com",
    "starktheclark@gmail.com",
    "skywalker24322@gmail.com",
    "c82311998@gmail.com",
    "dumm22112@gmail.com"
];

// Natural human-like reviews (some short, some medium, happy, simple, 4-5 stars)
const HUMAN_REVIEWS = [
    { text: "Lovely property! Very neat and clean. The staff was super helpful.", rating: 5 },
    { text: "Had a great stay here with my family. Very peaceful place.", rating: 5 },
    { text: "Good experience overall. Nice and clean rooms.", rating: 4 },
    { text: "Superb location and excellent service. Will definitely visit again.", rating: 5 },
    { text: "Nice cozy place for a quick getaway. Food was good too.", rating: 4 },
    { text: "Clean and peaceful. Caretaker was very polite.", rating: 5 },
    { text: "Beautiful villa. Loved the green surroundings and the pool was very clean.", rating: 5 },
    { text: "Nice service and comfortable stay. Rooms are spacious.", rating: 4 },
    { text: "Fantastic stay! Everything was perfect. Highly recommended.", rating: 5 },
    { text: "Great atmosphere and friendly staff. Worth it.", rating: 5 }
];

function getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function run() {
    console.log("Starting staycation booking & review creation for target users...");

    // 1. Fetch properties
    const properties = await prisma.property.findMany({
        where: { isActive: true }
    });

    if (properties.length === 0) {
        console.error("No active properties found in database!");
        process.exit(1);
    }

    console.log(`Found ${properties.length} active properties.`);

    // Date range: Dec 1, 2025 - Feb 1, 2026
    const startDate = new Date("2025-12-01T00:00:00.000Z");
    const endDate = new Date("2026-02-01T00:00:00.000Z");

    for (const email of TARGET_EMAILS) {
        console.log(`\nProcessing user: ${email}...`);
        
        // Find user
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.warn(`User with email ${email} not found. Creating a dummy user...`);
            // Create user
            user = await prisma.user.create({
                data: {
                    email,
                    fullName: email.split('@')[0],
                    phone: "+9199999" + Math.floor(100000 + Math.random() * 900000),
                    isVerified: true
                }
            });
            console.log(`Created user: ${user.fullName} (id: ${user.id})`);
        } else {
            console.log(`Found user: ${user.fullName} (id: ${user.id})`);
        }

        // Check if user already has bookings to avoid duplicating if we re-run
        const existingBookings = await prisma.staycationBooking.findFirst({
            where: { userId: user.id }
        });

        if (existingBookings) {
            console.log(`User already has a booking (Ref: ${existingBookings.bookingRef}). Skipping.`);
            continue;
        }

        // Pick random property
        const property = properties[Math.floor(Math.random() * properties.length)];
        
        // Pick random subproperty if available
        const subProperties = await prisma.subProperty.findMany({
            where: { propertyId: property.id, isActive: true }
        });
        const subProperty = subProperties.length > 0 ? subProperties[Math.floor(Math.random() * subProperties.length)] : null;

        // Pick random date
        const checkIn = getRandomDate(startDate, endDate);
        checkIn.setUTCHours(12, 0, 0, 0); // standard check-in
        
        const checkOut = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
        checkOut.setUTCHours(11, 0, 0, 0); // standard check-out

        // Generate custom bookingRef
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const suffix = Math.random().toString(36).slice(2, 4);
        const bookingRef = `ST-${dateStr}-${Math.floor(100 + Math.random() * 900)}${suffix}`;

        // Create booking
        const booking = await prisma.staycationBooking.create({
            data: {
                bookingRef,
                userId: user.id,
                propertyId: property.id,
                subPropertyId: subProperty ? subProperty.id : null,
                customerName: user.fullName,
                customerPhone: user.phone,
                customerEmail: user.email,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                numNights: 1,
                nightlyRate: 0,
                basePrice: 0,
                totalAmount: 0,
                status: "confirmed",
                source: "website",
                bookedAt: new Date()
            }
        });

        console.log(`Created staycation booking ${booking.bookingRef} for property ${property.name} on ${checkIn.toISOString().split('T')[0]}`);

        // Create review
        const reviewTemplate = HUMAN_REVIEWS[Math.floor(Math.random() * HUMAN_REVIEWS.length)];
        const review = await prisma.review.create({
            data: {
                userId: user.id,
                propertyId: property.id,
                rating: reviewTemplate.rating,
                reviewText: reviewTemplate.text,
                guestName: user.fullName,
                isApproved: true,
                createdAt: new Date()
            }
        });

        console.log(`Created review (id: ${review.id}) with rating ${review.rating}: "${review.reviewText}"`);
    }

    console.log("\nFinished seeding staycation bookings and reviews.");
}

run()
    .catch(err => {
        console.error("Error running seed script:", err);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
