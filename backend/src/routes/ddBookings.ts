import { Router } from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { auditLog } from "../lib/logger";
import { sendDDBookingConfirmation as sendDDBookingEmail } from "../lib/emailService";
import { generateDDBookingPDF } from "../lib/pdfService";
import { sendDDBookingConfirmation as sendDDWhatsApp } from "../lib/whatsappService";

const router = Router();

// Generate booking ref: DD-YYYYMMDD-NNN
async function generateDdRef(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `DD-${dateStr}-`;
    // Find the highest existing ref number for today (handles deleted bookings)
    const latest = await prisma.ddBooking.findFirst({
        where: { bookingRef: { startsWith: prefix } },
        orderBy: { bookingRef: "desc" },
        select: { bookingRef: true },
    });
    let nextNum = 1;
    if (latest?.bookingRef) {
        const lastNum = parseInt(latest.bookingRef.split("-").pop() || "0");
        nextNum = lastNum + 1;
    }
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// POST /api/bookings/dd — Create DD booking (transaction-locked)
router.post("/", async (req, res) => {
    try {
        const {
            screenId, packageId, bookingDate, startHour, durationHours,
            customerName, customerPhone, customerEmail,
            occasion, cakeMessage, specialRequests, numGuests,
            basePrice, extraPersonCharge, gstAmount, totalAmount,
            amountPaid, paymentMethod, paymentDetails,
            addons, source, couponCode, isMaintenance,
        } = req.body;

        // Maintenance bookings have relaxed validation
        if (isMaintenance) {
            if (!screenId || !bookingDate || startHour === undefined) {
                return res.status(400).json({ error: "Missing required fields for maintenance block" });
            }
        } else if (!screenId || !packageId || !bookingDate || startHour === undefined || !customerName || !customerPhone) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Extract logged-in user ID from token
        let loggedInUserId: number | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
                if (decoded.type === "customer" && decoded.id) {
                    loggedInUserId = decoded.id;
                }
            } catch (err) {
                // Token invalid or expired, proceed lightly
            }
        }

        // Use serializable transaction to prevent double-booking
        const booking = await prisma.$transaction(async (tx) => {
            // 0. Check if screen is active
            const screen = await tx.subProperty.findUnique({ 
                where: { id: parseInt(screenId) },
                include: { property: true }
            });
            if (!screen || !screen.isActive || (screen.property && !screen.property.isActive)) {
                throw new Error("PROPERTY_INACTIVE");
            }

            // Atomic overlap check inside transaction
            const existingBookings = await tx.ddBooking.findMany({
                where: {
                    screenId: parseInt(screenId),
                    bookingDate: new Date(bookingDate + 'T12:00:00'),
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
                const coupon = await tx.coupon.findFirst({ where: { code: couponCode, isActive: true, expiryDate: { gte: new Date() } }, orderBy: { createdAt: "desc" } });
                if (coupon && coupon.isActive && coupon.currentUses < coupon.maxUses && new Date(coupon.expiryDate) >= new Date()) {
                    couponId = coupon.id;
                    if (coupon.discountType === "percentage") {
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

            // For maintenance blocks, skip user association
            let user: any = null;
            let encryptedPhone = "";
            let encryptedEmail: string | null = null;

            if (isMaintenance) {
                encryptedPhone = encrypt("0000000000");
            } else {
                // Find or create user
                if (loggedInUserId) {
                    user = await tx.user.findUnique({ where: { id: loggedInUserId } });
                }
                if (!user && customerEmail) {
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

                // Encrypt sensitive data before storing
                encryptedPhone = encrypt(customerPhone);
                encryptedEmail = customerEmail ? encrypt(customerEmail) : null;
            }

            const bookingRef = await generateDdRef();

            const created = await tx.ddBooking.create({
                data: {
                    bookingRef,
                    userId: user?.id || null,
                    screenId: parseInt(screenId),
                    packageId: parseInt(packageId || "1"),
                    bookingDate: new Date(bookingDate + 'T12:00:00'),
                    startHour: newStart,
                    durationHours: parseInt(durationHours || "1"),
                    customerName: customerName || (isMaintenance ? "Maintenance Block" : "Guest"),
                    customerPhone: encryptedPhone,
                    customerEmail: encryptedEmail,
                    isMaintenance: isMaintenance || false,
                    occasion,
                    cakeMessage,
                    specialRequests: specialRequests || null,
                    numGuests: numGuests || 2,
                    basePrice: basePrice || 0,
                    extraPersonCharge: extraPersonCharge || 0,
                    gstAmount: gstAmount || 0,
                    totalAmount: (totalAmount || 0) - discountAmount,
                    amountPaid: amountPaid || 0,
                    amountToCollect: req.body.amountToCollect !== undefined
                        ? req.body.amountToCollect
                        : Math.max(0, ((totalAmount || 0) - discountAmount) - (amountPaid || 0)),
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

        // Track cash for reception walk-in bookings
        if (source === "reception" && (amountPaid || 0) > 0) {
            const cashMethod = (paymentMethod || "").toLowerCase();
            if (cashMethod === "cash") {
                try {
                    const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
                    if (ddProperty) {
                        const employee = await prisma.employee.findFirst({
                            where: { propertyId: ddProperty.id, isActive: true },
                        });
                        if (employee) {
                            await prisma.employee.update({
                                where: { id: employee.id },
                                data: { cashCollected: { increment: amountPaid } },
                            });
                            await prisma.cashTransaction.create({
                                data: {
                                    employeeId: employee.id,
                                    bookingRef: booking.bookingRef,
                                    guestName: customerName,
                                    amount: amountPaid,
                                    transactionType: "collection",
                                    note: `DD walk-in booking — ${booking.screen?.name || "Screen"}`,
                                },
                            });
                        }
                    }
                } catch (e) { console.error("Cash tracking for walk-in failed:", e); }
            }
        }

        // Send confirmation email (fire-and-forget) — skip for maintenance blocks
        if (!isMaintenance) {
            sendDDBookingEmail({ ...booking, customerPhone, customerEmail }).catch(() => { });

            // Send WhatsApp confirmation with voucher link (fire-and-forget)
            if (customerPhone) {
                const baseUrl = process.env.FRONTEND_URL || "https://galaxiaresorts.com";
                const voucherUrl = `${baseUrl}/api/bookings/dd/voucher/${booking.bookingRef}`;
                sendDDWhatsApp(customerPhone, booking.bookingRef, voucherUrl).catch(() => { });
            }
        }

        return res.status(201).json(booking);
    } catch (error: any) {
        if (error?.message === "SLOT_CONFLICT") {
            return res.status(409).json({ error: "Time slot overlaps with existing booking" });
        }
        if (error?.message === "PROPERTY_INACTIVE") {
            return res.status(400).json({ error: "This screen is currently inactive or unavailable" });
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
            where.bookingDate = new Date((date as string) + 'T12:00:00');
        } else if (startDate || endDate) {
            where.bookingDate = {};
            if (startDate) where.bookingDate.gte = new Date((startDate as string) + 'T12:00:00');
            if (endDate) where.bookingDate.lte = new Date((endDate as string) + 'T12:00:00');
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
            screen: b.screen ? { ...b.screen, name: `${b.screen.name} (Digital Diaries)` } : b.screen,
            customerPhone: decrypt(b.customerPhone),
            customerEmail: b.customerEmail ? decrypt(b.customerEmail) : null,
            guestIds: (b.guestIds || []).map((g: any) => ({
                id: g.id,
                fileName: g.fileName ? decrypt(g.fileName) : null,
                fileType: g.fileType,
                ddBookingId: g.ddBookingId,
                createdAt: g.createdAt,
            })),
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

        const booking = await prisma.ddBooking.findUnique({
            where: { id: bookingId },
            include: { screen: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        // Guard: prevent over-collection
        if (booking.amountToCollect <= 0) {
            return res.status(400).json({ error: "No balance remaining to collect" });
        }
        const collectAmount = Math.min(amount, booking.amountToCollect);

        const payment = await prisma.bookingPayment.create({
            data: {
                ddBookingId: bookingId,
                paymentType: "balance",
                amount: collectAmount,
                method,
                collectedBy: req.admin!.id,
            },
        });

        await prisma.ddBooking.update({
            where: { id: bookingId },
            data: {
                amountPaid: { increment: collectAmount },
                amountToCollect: { decrement: collectAmount },
                paymentStatus: "paid",
                paymentMethod: method,
            },
        });

        // Track cash collection for employee
        if (method?.toLowerCase() === "cash" && collectAmount > 0) {
            const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
            if (ddProperty) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: ddProperty.id, isActive: true },
                });
                if (employee) {
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { cashCollected: { increment: collectAmount } },
                    });
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            bookingRef: booking.bookingRef,
                            guestName: booking.customerName,
                            amount: collectAmount,
                            transactionType: "collection",
                            note: `DD balance payment — ${booking.screen?.name || "Screen"}`,
                        },
                    });
                }
            }
        }

        return res.json(payment);
    } catch (error) {
        console.error("DD payment error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/bookings/dd/addons/:addonId/collect
router.patch("/addons/:addonId/collect", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const addonId = parseInt(req.params.addonId as string);
        const { method } = req.body;

        const addon = await prisma.ddBookingAddon.update({
            where: { id: addonId },
            data: { 
                isPaid: true,
                paymentMethod: method 
            },
            include: { booking: true }
        });

        const effectiveMethod = method || "cash";

        // Record payment in ledger
        await prisma.bookingPayment.create({
            data: {
                ddBookingId: addon.bookingId,
                paymentType: `addon_${addon.addonType}`,
                amount: addon.price,
                method: effectiveMethod,
                collectedBy: req.admin!.id,
                notes: `Addon payment: ${addon.addonType}`
            }
        });

        // NOTE: Do NOT modify booking amountPaid/amountToCollect here.
        // Financials section reflects booking-only amounts from the website.
        // Addon payments are tracked separately via the addon's isPaid/paymentMethod fields.

        // Track cash collection for employee
        if (effectiveMethod.toLowerCase() === "cash" && addon.price > 0) {
            const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
            if (ddProperty) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: ddProperty.id, isActive: true },
                });
                if (employee) {
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { cashCollected: { increment: addon.price } },
                    });
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            bookingRef: addon.booking.bookingRef,
                            guestName: addon.booking.customerName,
                            amount: addon.price,
                            transactionType: "collection",
                            note: `DD addon (${addon.addonType}) — ₹${addon.price}`,
                        },
                    });
                }
            }
        }

        return res.json(addon);
    } catch (error) {
        console.error("Addon payment collection error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/bookings/dd/:id/addons — Add new addons to an existing booking
router.post("/:id/addons", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const { addons } = req.body; // Array of { type, value, price }

        if (!addons || !Array.isArray(addons) || addons.length === 0) {
            return res.status(400).json({ error: "No addons provided" });
        }

        const booking = await prisma.ddBooking.findUnique({ where: { id: bookingId } });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const created = [];
        for (const addon of addons) {
            // Check if addon of this type already exists (unpaid)
            const existing = await prisma.ddBookingAddon.findFirst({
                where: { bookingId, addonType: addon.type, isPaid: false }
            });
            if (!existing) {
                const record = await prisma.ddBookingAddon.create({
                    data: {
                        bookingId,
                        addonType: addon.type,
                        addonValue: addon.value || null,
                        price: addon.price || 400,
                    },
                });
                created.push(record);
            }
        }

        return res.json({ created, count: created.length });
    } catch (error) {
        console.error("Add addon error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ────────────────────────────────────────────────────────────────
//  BOOKING HOLD — Temporary 7-minute slot lock (DD)
// ────────────────────────────────────────────────────────────────

// POST /api/bookings/dd/hold — Create a temporary DD hold
router.post("/hold", async (req, res) => {
    try {
        const { screenId, bookingDate, hours } = req.body; // hours = [10,11,12]
        if (!screenId || !bookingDate || !hours || !Array.isArray(hours) || hours.length === 0) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const parsedScreenId = parseInt(screenId);
        const date = new Date(bookingDate + 'T12:00:00');
        const sessionId = `dh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes

        // Clean up expired holds
        await prisma.bookingHold.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        // Check for conflicts with existing bookings
        const existingBookings = await prisma.ddBooking.findMany({
            where: {
                screenId: parsedScreenId,
                bookingDate: date,
                status: { notIn: ["cancelled", "no_show"] },
            },
            select: { startHour: true, durationHours: true },
        });

        const bookedHours = new Set<number>();
        for (const b of existingBookings) {
            for (let i = 0; i < b.durationHours; i++) {
                bookedHours.add(b.startHour + i);
            }
        }

        // Check for conflicts with active holds
        const activeHolds = await prisma.bookingHold.findMany({
            where: {
                holdType: "dd",
                screenId: parsedScreenId,
                holdDate: date,
                expiresAt: { gt: new Date() },
            },
            select: { holdHours: true },
        });

        for (const h of activeHolds) {
            if (h.holdHours && Array.isArray(h.holdHours)) {
                for (const hr of h.holdHours as number[]) {
                    bookedHours.add(hr);
                }
            }
        }

        // Check if any requested hour conflicts
        for (const hr of hours) {
            if (bookedHours.has(hr)) {
                return res.status(409).json({
                    error: "These time slots are currently held by another guest. Please try different slots.",
                });
            }
        }

        // Create the hold
        const hold = await prisma.bookingHold.create({
            data: {
                holdType: "dd",
                sessionId,
                screenId: parsedScreenId,
                holdDate: date,
                holdHours: hours,
                expiresAt,
            },
        });

        return res.status(201).json({ sessionId: hold.sessionId, expiresAt: hold.expiresAt });
    } catch (error) {
        console.error("Create DD hold error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/bookings/dd/hold/:sessionId — Release a DD hold
router.delete("/hold/:sessionId", async (req, res) => {
    try {
        await prisma.bookingHold.deleteMany({
            where: { sessionId: req.params.sessionId },
        });
        return res.json({ success: true });
    } catch (error) {
        console.error("Release DD hold error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ────────────────────────────────────────────────────────────────
//  DELETE BOOKING — Permanently remove a DD booking + rollback financials
// ────────────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const booking = await prisma.ddBooking.findUnique({
            where: { id: bookingId },
            include: { screen: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const bookingRef = booking.bookingRef;

        // 1. Reverse cash tracking: find all cash transactions for this booking
        const cashTxns = await prisma.cashTransaction.findMany({
            where: { bookingRef },
        });
        for (const tx of cashTxns) {
            if (tx.transactionType === "collection") {
                await prisma.employee.update({
                    where: { id: tx.employeeId },
                    data: { cashCollected: { decrement: tx.amount } },
                });
            }
        }
        await prisma.cashTransaction.deleteMany({ where: { bookingRef } });

        // 2. Delete UPI payment logs for this booking
        await prisma.upiPayment.deleteMany({ where: { bookingRef } });
        // Also check DD-prefixed bookingRef used by frontend
        await prisma.upiPayment.deleteMany({ where: { bookingRef: `DD-${bookingId}` } });
        await prisma.cashTransaction.deleteMany({ where: { bookingRef: `DD-${bookingId}` } });

        // 3. Delete booking payments
        await prisma.bookingPayment.deleteMany({ where: { ddBookingId: bookingId } });

        // 4. Delete addons
        await prisma.ddBookingAddon.deleteMany({ where: { bookingId } });

        // 5. Delete guest IDs
        await prisma.guestId.deleteMany({ where: { ddBookingId: bookingId } });

        // 6. Delete coupon usage
        await prisma.couponUsage.deleteMany({ where: { bookingRef } });

        // 7. Delete the booking itself
        await prisma.ddBooking.delete({ where: { id: bookingId } });

        // Audit log
        await prisma.auditLog.create({
            data: {
                adminId: req.admin!.id,
                action: "booking_deleted",
                entityType: "dd_booking",
                entityId: bookingId,
                details: { bookingRef, customerName: booking.customerName },
                isDeveloper: req.admin!.role === "developer",
            },
        });

        return res.json({ success: true, message: `Booking ${bookingRef} deleted` });
    } catch (error) {
        console.error("Delete DD booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/bookings/dd/voucher/:ref ─── Public voucher PDF download
router.get("/voucher/:ref", async (req, res) => {
    try {
        const { ref } = req.params;
        const booking = await prisma.ddBooking.findFirst({
            where: { bookingRef: ref },
            include: { screen: true, package: true },
        });

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const pdfBuffer = await generateDDBookingPDF(booking);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Galaxia-DD-${booking.bookingRef}.pdf"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Voucher PDF error:", error);
        return res.status(500).json({ error: "Failed to generate voucher" });
    }
});

export default router;
