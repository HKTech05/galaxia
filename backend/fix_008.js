const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function fix() {
    const result = await p.ddBooking.updateMany({
        where: { bookingRef: "DD-20260419-008" },
        data: { source: "website" }
    });
    console.log(`DD-20260419-008: source -> website (${result.count} updated)`);

    const verify = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-008" },
        select: { bookingRef: true, source: true }
    });
    console.log("Verification:", verify);

    await p.$disconnect();
}
fix().catch(e => { console.error(e); process.exit(1); });
