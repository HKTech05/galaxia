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

async function check() {
    console.log("Checking DB records for target users...");
    for (const email of TARGET_EMAILS) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                stayBookings: {
                    include: { property: true }
                },
                reviews: {
                    include: { property: true }
                }
            }
        });

        if (!user) {
            console.log(`❌ User ${email} not found.`);
            continue;
        }

        console.log(`\n👤 User: ${user.fullName} (${email})`);
        console.log(`  Stay Bookings count: ${user.stayBookings.length}`);
        user.stayBookings.forEach(b => {
            console.log(`    Ref: ${b.bookingRef}, Property: ${b.property.name}, Dates: ${b.checkInDate.toISOString().split('T')[0]} to ${b.checkOutDate.toISOString().split('T')[0]}, Amount: ₹${b.totalAmount}`);
        });

        console.log(`  Reviews count: ${user.reviews.length}`);
        user.reviews.forEach(r => {
            console.log(`    Rating: ${r.rating} stars, Property: ${r.property?.name}, Text: "${r.reviewText}"`);
        });
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
