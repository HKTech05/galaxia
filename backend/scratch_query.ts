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
    console.log("Checking DB records for target users with review creation dates...");
    for (const email of TARGET_EMAILS) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                stayBookings: true,
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
        user.reviews.forEach(r => {
            console.log(`  Review Date: ${r.createdAt.toISOString()}`);
            console.log(`  Rating: ${r.rating} stars, Property: ${r.property?.name}`);
            console.log(`  Text: "${r.reviewText}"`);
        });
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
