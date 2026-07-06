import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
    console.log("Updating seed records for target users...");

    // 1. Find user Vedanth Shetty (gravanti51@gmail.com)
    const userVedanth = await prisma.user.findUnique({
        where: { email: "gravanti51@gmail.com" }
    });

    if (!userVedanth) {
        console.error("User Vedanth Shetty not found in DB!");
    } else {
        // Update staycation booking to property 6 (Ambrose), subProperty 5 (Santorini)
        const bookingUpdate = await prisma.staycationBooking.updateMany({
            where: { userId: userVedanth.id },
            data: {
                propertyId: 6,      // Ambrose
                subPropertyId: 5,   // Santorini
            }
        });
        console.log(`Updated Vedanth Shetty staycation booking to Ambrose (Santorini): ${bookingUpdate.count} updated.`);

        // Update Review to point to Ambrose (propertyId 6) and write a nice themed review
        const reviewUpdate = await prisma.review.updateMany({
            where: { userId: userVedanth.id },
            data: {
                propertyId: 6,
                rating: 5,
                reviewText: "Had an amazing stay in the Santorini themed villa! The attention to detail is superb, feels like you are actually in Greece. The service was top notch and the private pool area was beautiful. Highly recommend Ambrose for a unique themed getaway!"
            }
        });
        console.log(`Updated Vedanth Shetty review: ${reviewUpdate.count} updated.`);
    }

    // 2. Find user Parth Sawant (p88145559@gmail.com)
    const userParth = await prisma.user.findUnique({
        where: { email: "p88145559@gmail.com" }
    });

    if (!userParth) {
        console.error("User Parth Sawant not found in DB!");
    } else {
        // Update Review text to a detailed review of Amstel Nest
        const reviewUpdate = await prisma.review.updateMany({
            where: { userId: userParth.id },
            data: {
                rating: 5,
                reviewText: "Our stay at Amstel Nest was absolutely fantastic. We booked one of their cottages and having a completely private indoor pool inside our unit was a game changer! It was super clean and we could swim whenever we wanted in total privacy. The Amsterdam-style architecture looks gorgeous and makes for great pictures. On top of that, all meals were included in the package and the food was delicious and fresh. Highly recommend it if you want a relaxing getaway with great hospitality!"
            }
        });
        console.log(`Updated Parth Sawant detailed review of Amstel Nest: ${reviewUpdate.count} updated.`);
    }

    console.log("Database update completed.");
}

run()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
