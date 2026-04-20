require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const p = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
function decrypt(text) {
    try {
        const [iv, authTag, encrypted] = text.split(":");
        const key = Buffer.from(ENCRYPTION_KEY, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch(e) { console.log("Decrypt error:", e.message); return text; }
}

(async () => {
    // Fix the incorrectly created users (130, 131) - delete them first
    await p.ddBooking.update({ where: { id: 244 }, data: { userId: null } }); // DD-20260419-006
    await p.ddBooking.update({ where: { id: 245 }, data: { userId: null } }); // DD-20260419-007
    await p.user.delete({ where: { id: 130 } }).catch(() => {});
    await p.user.delete({ where: { id: 131 } }).catch(() => {});
    console.log("Cleaned up bad users 130, 131");

    // Get bookings again
    const b1 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-006" },
        select: { id: true, bookingRef: true, customerName: true, customerPhone: true, customerEmail: true }
    });
    const b2 = await p.ddBooking.findFirst({
        where: { bookingRef: "DD-20260419-007" },
        select: { id: true, bookingRef: true, customerName: true, customerPhone: true, customerEmail: true }
    });

    const phone1 = decrypt(b1.customerPhone);
    const phone2 = decrypt(b2.customerPhone);
    const email1 = b1.customerEmail ? decrypt(b1.customerEmail) : null;
    const email2 = b2.customerEmail ? decrypt(b2.customerEmail) : null;

    console.log("Booking 1:", b1.bookingRef, b1.customerName, "phone:", phone1, "email:", email1);
    console.log("Booking 2:", b2.bookingRef, b2.customerName, "phone:", phone2, "email:", email2);

    // Create proper user for iqbal
    const user1 = await p.user.create({
        data: { fullName: b1.customerName, phone: phone1, email: email1 }
    });
    console.log("Created user for iqbal:", user1.id, user1.fullName, user1.phone);

    // Create proper user for sajjad
    const user2 = await p.user.create({
        data: { fullName: b2.customerName, phone: phone2, email: email2 }
    });
    console.log("Created user for sajjad:", user2.id, user2.fullName, user2.phone);

    // Link bookings
    await p.ddBooking.update({ where: { id: b1.id }, data: { userId: user1.id } });
    await p.ddBooking.update({ where: { id: b2.id }, data: { userId: user2.id } });
    console.log("Linked", b1.bookingRef, "-> user", user1.id);
    console.log("Linked", b2.bookingRef, "-> user", user2.id);

    // Verify
    const haniCount = await p.ddBooking.count({ where: { userId: 17 } });
    console.log("\nHani (user 17) now has", haniCount, "DD bookings");

    await p.$disconnect();
})();
