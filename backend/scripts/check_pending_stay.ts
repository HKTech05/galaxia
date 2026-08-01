import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
    const records = await p.pendingDdPayment.findMany({
        where: { module: "stay" },
        orderBy: { createdAt: "desc" },
        take: 3,
    });

    for (const x of records) {
        console.log("ID:", x.id, "status:", x.status, "ref:", x.createdBookingRef);
        const payload = x.bookingPayload as any;
        if (payload?.items) {
            console.log("  isMulti:", payload.isMulti);
            console.log("  items count:", payload.items.length);
            for (const item of payload.items) {
                console.log("  item:", {
                    villaId: item.villaId,
                    propertyId: item.propertyId,
                    subPropertyId: item.subPropertyId,
                    basePrice: item.basePrice,
                    numGuests: item.numGuests,
                });
            }
        } else {
            console.log("  NOT multi, payload keys:", Object.keys(payload || {}));
        }
        console.log("---");
    }
}

main().finally(() => p.$disconnect());
