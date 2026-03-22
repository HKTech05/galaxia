import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const hillViewMap = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4681.478223317829!2d73.4821025!3d18.9892144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdd57edcee9b063%3A0x886c42c660252443!2sHoliday%20Maiyaan!5e1!3m2!1sen!2sin!4v1774188563792!5m2!1sen!2sin";
    const laParaisoMap = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4681.48728811449!2d73.4832867!3d18.988892!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdd578f4295d5f7%3A0xb9668f8ece1fd08b!2sLa%20Paraiso!5e1!3m2!1sen!2sin!4v1774188535176!5m2!1sen!2sin";
    const amstelNestMap = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4681.386338290377!2d73.4719264!3d18.9924821!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdd57a0cdf40eb9%3A0xe1d6da31ef9a0ee6!2sAmstel%20nest!5e1!3m2!1sen!2sin!4v1774188512576!5m2!1sen!2sin";
    const ambroseMap = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4681.38095862043!2d73.4718958!3d18.992673399999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdd57105ba96147%3A0x164ca3cb8874bed2!2sAmbrose!5e1!3m2!1sen!2sin!4v1774188490076!5m2!1sen!2sin";

    console.log("Updating property map links and check-in times to 1:00 PM...");

    // Update Ambrose
    await prisma.property.updateMany({
        where: { slug: "ambrose" },
        data: { googleMapUrl: ambroseMap, checkInTime: "1:00 PM" }
    });

    // Update Amstel Nest
    await prisma.property.updateMany({
        where: { slug: "amstel-nest" },
        data: { googleMapUrl: amstelNestMap, checkInTime: "1:00 PM" }
    });

    // Update La Paraiso
    await prisma.property.updateMany({
        where: { slug: "la-paraiso" },
        data: { googleMapUrl: laParaisoMap, checkInTime: "1:00 PM" }
    });

    // Update Hill View
    await prisma.property.updateMany({
        where: { slug: "hill-view" },
        data: { googleMapUrl: hillViewMap, checkInTime: "1:00 PM" }
    });

    // Update Mount View
    await prisma.property.updateMany({
        where: { slug: "mount-view" },
        data: { googleMapUrl: hillViewMap, checkInTime: "1:00 PM" }
    });

    // Update Heavenly Villa (if it exists)
    await prisma.property.updateMany({
        where: { slug: "heavenly-villa" },
        data: { checkInTime: "1:00 PM" }
    });

    console.log("Property links up to date.");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
