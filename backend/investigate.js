const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const p = new PrismaClient();

// Decrypt function to get actual phone numbers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "galaxia-default-encryption-key-32";
function decrypt(text) {
    try {
        const [iv, authTag, encrypted] = text.split(":");
        const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), Buffer.from(iv, "hex"));
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch { return text; }
}

(async () => {
    // Get the two bookings
    const b1 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-006" },
        select: { id: true, bookingRef: true, customerName: true, customerPhone: true, customerEmail: true, userId: true }
    });
    const b2 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-007" },
        select: { id: true, bookingRef: true, customerName: true, customerPhone: true, customerEmail: true, userId: true }
    });

    console.log("Booking 1:", b1.bookingRef, b1.customerName, "phone:", decrypt(b1.customerPhone));
    console.log("Booking 2:", b2.bookingRef, b2.customerName, "phone:", decrypt(b2.customerPhone));

    // Create new user for iqbal
    const user1 = await p.user.create({
        data: {
            fullName: b1.customerName,
            phone: decrypt(b1.customerPhone),
            email: b1.customerEmail ? decrypt(b1.customerEmail) : null,
        }
    });
    console.log("Created user for iqbal:", user1.id, user1.fullName, user1.phone);

    // Create new user for sajjad
    const user2 = await p.user.create({
        data: {
            fullName: b2.customerName,
            phone: decrypt(b2.customerPhone),
            email: b2.customerEmail ? decrypt(b2.customerEmail) : null,
        }
    });
    console.log("Created user for sajjad:", user2.id, user2.fullName, user2.phone);

    // Unlink from Hani and link to correct users
    await p.ddBooking.update({ where: { id: b1.id }, data: { userId: user1.id } });
    console.log("Linked", b1.bookingRef, "to user", user1.id, "(was user 17)");

    await p.ddBooking.update({ where: { id: b2.id }, data: { userId: user2.id } });
    console.log("Linked", b2.bookingRef, "to user", user2.id, "(was user 17)");

    // Verify Hani has no more DD bookings
    const remaining = await p.ddBooking.count({ where: { userId: 17 } });
    console.log("\nHani (user 17) now has", remaining, "DD bookings linked");

    await p.$disconnect();
})();
