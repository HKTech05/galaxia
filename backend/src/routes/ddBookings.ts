import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { auditLog } from "../lib/logger";
import { sendDDBookingConfirmation } from "../lib/emailService";

const router = Router();

// Generate booking ref: DD-YYYYMMDD-NNN
async function generateDdRef(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.ddBooking.count({
        where: {
            bookedAt: {
                gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            },
        },
    });
    return `DD-${dateStr}-${String(count + 1).padStart(3, "0")}`;
}

// POST /api/bookings/dd — Create DD booking (transaction-locked)
router.post("/", async (req, res) => {
    try {
        const {
            screenId, packageId, bookingDate, startHour, durationHours,
            customerName, customerPhone, customerEmail,
            occasion, cakeMessage, numGuests,
            basePrice, extraPersonCharge, gstAmount, totalAmount,
            amountPaid, paymentMethod, paymentDetails,
            addons, source, couponCode,
        } = req.body;

        if (!screenId || !packageId || !bookingDate || startHour === undefined || !customerName || !customerPhone) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Use serializable transaction to prevent double-booking
        const booking = await prisma.$transaction(async (tx) => {
            // Atomic overlap check inside transaction
            const existingBookings = await tx.ddBooking.findMany({
                where: {
                    screenId: parseInt(screenId),
                    bookingDate: new Date(bookingDate),
                    status: { notIn: ["cancelled", "no_show"] },
                },
            });

            const newStart = parseInt(startHour);
            const newEnd = newStart + parseInt(durationHours || 1);

            for (const existing of existingBookings) {
                const existStart = existing.startHour;
                const existEnd = existStart + existing.durationHours;
                if (newStart < existEnd && newEnd > existStart) {
                    throw new Error("SLOT_CONFLICT");
                }
            }

            // Handle coupon
            let couponId = null;
            let discountAmount = 0;
            if (couponCode) {
                const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
                if (coupon && coupon.isActive && coupon.currentUses < coupon.maxUses && new Date(coupon.expiryDate) >= new Date()) {
                    couponId = coupon.id;
                    if (coupon.discountType === "percent") {
                        discountAmount = Math.round((totalAmount * Number(coupon.discountValue)) / 100);
                    } else {
                        discountAmount = Number(coupon.discountValue);
                    }
                    await tx.coupon.update({
                        where: { id: coupon.id },
                        data: { currentUses: { increment: 1 } },
                    });
                }
            }

            // Find or create user
            let user = null;
            if (customerEmail) {
                user = await tx.user.findUnique({ where: { email: customerEmail } });
            }
            if (!user && customerPhone) {
                user = await tx.user.findFirst({ where: { phone: customerPhone } });
            }

            if (!user) {
                user = await tx.user.create({
                    data: { fullName: customerName, phone: customerPhone, email: customerEmail || null },
                });
            } else {
                // If user exists but is missing phone (e.g. from Cognito login), update it
                if (!user.phone || user.phone === "") {
                    user = await tx.user.update({
                        where: { id: user.id },
                        data: { phone: customerPhone, fullName: user.fullName === "Guest" ? customerName : user.fullName },
                    });
                }
            }

            const bookingRef = await generateDdRef();

            // Encrypt sensitive data before storing
            const encryptedPhone = encrypt(customerPhone);
            const encryptedEmail = customerEmail ? encrypt(customerEmail) : null;

            const created = await tx.ddBooking.create({
                data: {
                    bookingRef,
                    userId: user.id,
                    screenId: parseInt(screenId),
                    packageId: parseInt(packageId),
                    bookingDate: new Date(bookingDate),
                    startHour: newStart,
                    durationHours: parseInt(durationHours || "1"),
                    customerName,
                    customerPhone: encryptedPhone,
                    customerEmail: encryptedEmail,
                    occasion,
                    cakeMessage,
                    numGuests: numGuests || 2,
                    basePrice: basePrice || 0,
                    extraPersonCharge: extraPersonCharge || 0,
                    gstAmount: gstAmount || 0,
                    totalAmount: (totalAmount || 0) - discountAmount,
                    amountPaid: amountPaid || 0,
                    amountToCollect: Math.max(0, ((totalAmount || 0) - discountAmount) - (amountPaid || 0)),
                    paymentMethod,
                    paymentDetails,
                    source: source || "website",
                    couponId,
                    discountAmount,
                },
                include: { screen: true, package: true },
            });

            // Create add-ons
            if (addons && Array.isArray(addons)) {
                for (const addon of addons) {
                    await tx.ddBookingAddon.create({
                        data: {
                            bookingId: created.id,
                            addonType: addon.type,
                            addonValue: addon.value,
                            price: addon.price || 0,
                        },
                    });
                }
            }

            // Record coupon usage
            if (couponId) {
                await tx.couponUsage.create({
                    data: {
                        couponId,
                        bookingRef,
                        customerName,
                        discountSaved: discountAmount,
                    },
                });
            }

            return created;
        }, { isolationLevel: "Serializable" });

        // Audit log (fire-and-forget, outside transaction)
        auditLog({ action: "booking_created", entityType: "dd_booking", entityId: booking.id, details: { source: source || "website" } });

        // Send confirmation email (fire-and-forget)
        sendDDBookingConfirmation({ ...booking, customerPhone, customerEmail }).catch(() => { });

        return res.status(201).json(booking);
    } catch (error: any) {
        if (error?.message === "SLOT_CONFLICT") {
            return res.status(409).json({ error: "Time slot overlaps with existing booking" });
        }
        console.error("Create DD booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/bookings/dd — List DD bookings (admin)
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { status, screenId, date, startDate, endDate } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (screenId) where.screenId = parseInt(screenId as string);
        if (date) {
            where.bookingDate = new Date(date as string);
        } else if (startDate || endDate) {
            where.bookingDate = {};
            if (startDate) where.bookingDate.gte = new Date(startDate as string);
            if (endDate) where.bookingDate.lte = new Date(endDate as string);
        }

        // Role-based filtering
        if (req.admin!.role === "staycation_admin") {
            return res.status(403).json({ error: "Staycation admins cannot view DD bookings" });
        }

        const bookings = await prisma.ddBooking.findMany({
            where,
            include: {
                screen: true,
                package: true,
                addons: true,
                guestIds: true,
            },
            orderBy: [{ bookingDate: "desc" }, { startHour: "asc" }],
        });

        // Decrypt sensitive fields for admin view
        const decrypted = bookings.map(b => ({
            ...b,
            customerPhone: decrypt(b.customerPhone),
            customerEmail: b.customerEmail ? decrypt(b.customerEmail) : null,
        }));

        return res.json(decrypted);
    } catch (error) {
        console.error("List DD bookings error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/bookings/dd/:id/status
router.patch("/:id/status", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { status } = req.body;
        const booking = await prisma.ddBooking.update({
            where: { id: parseInt(req.params.id as string) },
            data: { status },
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin!.id,
                action: "update_status",
                entityType: "dd_booking",
                entityId: booking.id,
                details: { newStatus: status },
                isDeveloper: req.admin!.role === "developer",
            },
        });

        return res.json(booking);
    } catch (error) {
        console.error("Update DD booking status error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/bookings/dd/:id/payment
router.post("/:id/payment", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { amount, method } = req.body;
        const bookingId = parseInt(req.params.id as string);

        const payment = await prisma.bookingPayment.create({
            data: {
                ddBookingId: bookingId,
                paymentType: "balance",
                amount,
                method,
                collectedBy: req.admin!.id,
            },
        });

        await prisma.ddBooking.update({
            where: { id: bookingId },
            data: {
                amountPaid: { increment: amount },
                amountToCollect: { decrement: amount },
                paymentStatus: "paid",
                paymentMethod: method,
            },
        });

        return res.json(payment);
    } catch (error) {
        console.error("DD payment error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
