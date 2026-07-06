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

async function run() {
    console.log("Updating review dates for target users...");

    for (const email of TARGET_EMAILS) {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                stayBookings: true,
                reviews: true
            }
        });

        if (!user) {
            console.log(`❌ User ${email} not found.`);
            continue;
        }

        if (user.stayBookings.length === 0) {
            console.log(`⚠️ User ${user.fullName} has no staycation bookings.`);
            continue;
        }

        if (user.reviews.length === 0) {
            console.log(`⚠️ User ${user.fullName} has no reviews.`);
            continue;
        }

        // Get the staycation booking
        const booking = user.stayBookings[0];
        
        // Checkout date is checkInDate + 1 day. Let's make review date checkout date + random hours (between 1 PM and 9 PM IST)
        const checkIn = new Date(booking.checkInDate);
        const reviewDate = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000); // Check-out day
        
        // Add random hours/minutes to make it look human
        const randomHours = 13 + Math.floor(Math.random() * 8); // 13:00 to 21:00
        const randomMinutes = Math.floor(Math.random() * 60);
        reviewDate.setUTCHours(randomHours, randomMinutes, 0, 0);

        // Update the review date
        const review = user.reviews[0];
        await prisma.review.update({
            where: { id: review.id },
            data: {
                createdAt: reviewDate
            }
        });

        console.log(`👤 Updated review date for ${user.fullName} to: ${reviewDate.toISOString()} (Booking checkout was ${reviewDate.toISOString().split('T')[0]})`);
    }

    console.log("Review dates update completed.");
}

run()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
