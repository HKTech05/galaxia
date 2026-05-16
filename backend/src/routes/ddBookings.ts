import { Router } from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { auditLog } from "../lib/logger";
import { sendDDBookingConfirmation as sendDDBookingEmail, sendOwnerBookingNotification } from "../lib/emailService";
import { generateDDBookingPDF } from "../lib/pdfService";
import { sendDDBookingConfirmation as sendDDWhatsApp } from "../lib/whatsappService";

const router = Router();

// Generate booking ref: DD-YYYYMMDD-NNN
async function generateDdRef(client: any = prisma): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `DD-${dateStr}-`;
    // Find all refs for today, then filter to only standard numeric refs (not transfer T... or NaN)
    const todayRefs = await client.ddBooking.findMany({
        where: { bookingRef: { startsWith: prefix } },
        select: { bookingRef: true },
    });
    let maxNum = 0;
    for (const r of todayRefs) {
        const suffix = r.bookingRef.slice(prefix.length);
        const num = parseInt(suffix);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
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
                    status: { notIn: ["cancelled", "no_show", "transferred"] },
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

            const bookingRef = await generateDdRef(tx);

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
                    basePrice: basePrice || (() => {
                        // Server-side fallback: compute basePrice from duration if not provided
                        const dur = parseInt(durationHours || "1");
                        const pkgId = parseInt(packageId || "1");
                        if (pkgId === 2) { // Celebration
                            const bd = new Date(bookingDate + 'T12:00:00');
                            const isWe = bd.getDay() === 0 || bd.getDay() === 6;
                            if (dur === 1) return 2200;
                            if (dur === 2) return 2950;
                            if (dur === 3) return isWe ? 3950 : 3450;
                            return (isWe ? 3950 : 3450) + ((dur - 3) * 1000);
                        }
                        // Movie Time
                        if (dur === 1) return 999;
                        if (dur === 2) return 1500;
                        if (dur === 3) return 2500;
                        return 2500 + ((dur - 3) * 1000);
                    })(),
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
                include: { screen: true, package: true, addons: true },
            });

            // Create add-ons
            // Note: These addons' prices are already included in totalAmount above,
            // so mark them as isPaid=true to avoid double-counting at check-in.
            if (addons && Array.isArray(addons)) {
                for (const addon of addons) {
                    await tx.ddBookingAddon.create({
                        data: {
                            bookingId: created.id,
                            addonType: addon.type,
                            addonValue: addon.value,
                            price: addon.price || 0,
                            isPaid: true,
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
            // Re-fetch booking with addons (addons are created after initial booking in the transaction)
            const bookingWithAddons = await prisma.ddBooking.findUnique({
                where: { id: booking.id },
                include: { screen: true, package: true, addons: true },
            });
            sendDDBookingEmail({ ...(bookingWithAddons || booking), customerPhone, customerEmail }).catch(() => { });

            // Send WhatsApp confirmation with voucher link (fire-and-forget)
            if (customerPhone) {
                const baseUrl = process.env.FRONTEND_URL || "https://galaxiaresorts.com";
                const voucherUrl = `${baseUrl}/api/bookings/dd/voucher/${booking.bookingRef}`;
                sendDDWhatsApp(customerPhone, booking.bookingRef, voucherUrl).catch(() => { });
            }

            // Send owner notification with PDF attachment (fire-and-forget)
            const screenName = (booking.screen?.name || "Digital Diaries Screen").replace(/\s*\([^)]*\)/g, "").trim();
            generateDDBookingPDF({ ...(bookingWithAddons || booking), customerPhone, customerEmail })
                .then((pdfBuffer) =>
                    sendOwnerBookingNotification({
                        bookingRef: booking.bookingRef,
                        customerName: booking.customerName,
                        module: "digital-diaries",
                        propertyName: screenName,
                        pdfBuffer,
                    })
                )
                .catch((err) => console.error("[Owner Notify] DD PDF/email failed:", err));
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
        const { status, screenId, date, startDate, endDate, filterBy, includeMaintenance } = req.query;

        const where: any = {};
        // Hide maintenance blocks from booking list pages unless explicitly requested
        if (includeMaintenance !== 'true') {
            where.isMaintenance = false;
        }
        if (status) where.status = status;
        if (screenId) where.screenId = parseInt(screenId as string);

        // Determine which date field to filter on
        const dateField = filterBy === 'bookedAt' ? 'bookedAt' : 'bookingDate';
        // IST offset: UTC+5:30 = 5.5 hours = 330 minutes
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

        if (date) {
            if (dateField === 'bookedAt') {
                // For bookedAt, use IST day boundaries (midnight IST = 18:30 UTC prev day)
                const dayStartIST = new Date(new Date((date as string) + 'T00:00:00Z').getTime() - IST_OFFSET_MS);
                const dayEndIST = new Date(new Date((date as string) + 'T23:59:59.999Z').getTime() - IST_OFFSET_MS);
                where.bookedAt = { gte: dayStartIST, lte: dayEndIST };
            } else {
                where.bookingDate = new Date((date as string) + 'T12:00:00');
            }
        } else if (startDate || endDate) {
            if (dateField === 'bookedAt') {
                where.bookedAt = {};
                if (startDate) where.bookedAt.gte = new Date(new Date((startDate as string) + 'T00:00:00Z').getTime() - IST_OFFSET_MS);
                if (endDate) where.bookedAt.lte = new Date(new Date((endDate as string) + 'T23:59:59.999Z').getTime() - IST_OFFSET_MS);
            } else {
                where.bookingDate = {};
                if (startDate) where.bookingDate.gte = new Date((startDate as string) + 'T12:00:00');
                if (endDate) where.bookingDate.lte = new Date((endDate as string) + 'T12:00:00');
            }
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
                payments: true,
            },
            orderBy: [{ bookingDate: "desc" }, { startHour: "asc" }],
        });

        // Compute collected amounts from BookingPayment records (balance collections only)
        // These are the actual post-booking payments — NOT the advance paid at creation
        const decrypted = bookings.map(b => {
            // Sum only "balance" payments from BookingPayment table
            const collected = (b.payments || [])
                .filter((p: any) => p.paymentType === "balance" && p.status === "completed")
                .reduce((sum: number, p: any) => sum + p.amount, 0);
            const actualRemaining = Math.max(0, b.amountToCollect - collected);
            return {
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
                collectedAmount: collected,
                actualRemaining,
            };
        });

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

// PATCH /api/bookings/dd/:id — Master Edit (owner only)
router.patch("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const existing = await prisma.ddBooking.findUnique({ where: { id: bookingId } });
        if (!existing) return res.status(404).json({ error: "Booking not found" });

        const {
            customerName, customerPhone, customerEmail,
            numGuests, totalAmount, amountPaid, amountToCollect,
            gstAmount, status, source,
            screenId, packageId, bookingDate, startHour, durationHours,
            occasion, cakeMessage, specialRequests, basePrice, extraPersonCharge,
        } = req.body;

        const updateData: any = {};
        if (customerName !== undefined) updateData.customerName = customerName;
        if (customerPhone !== undefined) updateData.customerPhone = encrypt(customerPhone);
        if (customerEmail !== undefined) updateData.customerEmail = customerEmail ? encrypt(customerEmail) : null;
        if (numGuests !== undefined) updateData.numGuests = parseInt(numGuests);
        if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount) || 0;
        if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid) || 0;
        if (amountToCollect !== undefined) updateData.amountToCollect = parseFloat(amountToCollect) || 0;
        if (gstAmount !== undefined) updateData.gstAmount = parseFloat(gstAmount) || 0;
        if (status !== undefined) updateData.status = status;
        if (source !== undefined) updateData.source = source;
        if (screenId !== undefined) updateData.screenId = parseInt(screenId);
        if (packageId !== undefined) updateData.packageId = parseInt(packageId);
        if (bookingDate !== undefined) updateData.bookingDate = new Date(bookingDate + "T00:00:00");
        if (startHour !== undefined) updateData.startHour = parseInt(startHour);
        if (durationHours !== undefined) updateData.durationHours = parseInt(durationHours);
        if (occasion !== undefined) updateData.occasion = occasion || null;
        if (cakeMessage !== undefined) updateData.cakeMessage = cakeMessage || null;
        if (specialRequests !== undefined) updateData.specialRequests = specialRequests || null;
        if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice) || 0;
        if (extraPersonCharge !== undefined) updateData.extraPersonCharge = parseFloat(extraPersonCharge) || 0;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const updated = await prisma.ddBooking.update({
            where: { id: bookingId },
            data: updateData,
        });

        // Audit log
        const changedFields: Record<string, { before: any; after: any }> = {};
        for (const key of Object.keys(updateData)) {
            const beforeVal = (existing as any)[key];
            const afterVal = (updated as any)[key];
            if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
                changedFields[key] = { before: beforeVal, after: afterVal };
            }
        }

        console.log(`[MASTER EDIT DD] Booking #${bookingId} (${existing.bookingRef}) edited by admin #${req.admin!.id}:`, JSON.stringify(changedFields, null, 2));

        auditLog({
            adminId: req.admin!.id,
            action: "booking_master_edit",
            entityType: "dd_booking",
            entityId: bookingId,
            details: { bookingRef: existing.bookingRef, changedFields },
        });

        const decrypted = {
            ...updated,
            customerPhone: decrypt(updated.customerPhone),
            customerEmail: updated.customerEmail ? decrypt(updated.customerEmail) : null,
        };

        // Resend confirmation email & WhatsApp with updated details (fire-and-forget)
        if (!existing.isMaintenance) {
            const updatedWithIncludes = await prisma.ddBooking.findUnique({
                where: { id: bookingId },
                include: { screen: true, package: true, addons: true },
            });
            if (updatedWithIncludes) {
                const plainPhone = decrypt(updatedWithIncludes.customerPhone);
                const plainEmail = updatedWithIncludes.customerEmail ? decrypt(updatedWithIncludes.customerEmail) : null;
                sendDDBookingEmail({ ...updatedWithIncludes, customerPhone: plainPhone, customerEmail: plainEmail }).catch(() => {});

                if (plainPhone) {
                    const baseUrl = process.env.FRONTEND_URL || "https://galaxiaresorts.com";
                    const voucherUrl = `${baseUrl}/api/bookings/dd/voucher/${updatedWithIncludes.bookingRef}`;
                    sendDDWhatsApp(plainPhone, updatedWithIncludes.bookingRef, voucherUrl).catch(() => {});
                }

                const screenName = (updatedWithIncludes.screen?.name || "Digital Diaries Screen").replace(/\s*\([^)]*\)/g, "").trim();
                generateDDBookingPDF({ ...updatedWithIncludes, customerPhone: plainPhone, customerEmail: plainEmail })
                    .then((pdfBuffer) =>
                        sendOwnerBookingNotification({
                            bookingRef: updatedWithIncludes.bookingRef,
                            customerName: updatedWithIncludes.customerName,
                            module: "digital-diaries",
                            propertyName: screenName,
                            pdfBuffer,
                        })
                    )
                    .catch((err) => console.error("[Owner Notify] DD edit resend failed:", err));
            }
        }

        return res.json(decrypted);
    } catch (error) {
        console.error("Master edit DD booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── PATCH /api/bookings/dd/:id/no-show ─── Mark booking as no-show
router.patch("/:id/no-show", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const booking = await prisma.ddBooking.findUnique({ where: { id: bookingId } });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const updated = await prisma.ddBooking.update({
            where: { id: bookingId },
            data: { status: "no_show" },
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin!.id,
                action: "no_show",
                entityType: "dd_booking",
                entityId: bookingId,
                details: { bookingRef: booking.bookingRef, customerName: booking.customerName },
                isDeveloper: req.admin!.role === "developer",
            },
        });

        return res.json(updated);
    } catch (error) {
        console.error("No-show error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── POST /api/bookings/dd/:id/transfer ─── Transfer booking to new date/time with ₹400 fee
router.post("/:id/transfer", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const { newDate, newStartHour, newScreenId } = req.body;
        const TRANSFER_FEE = 400;

        if (!newDate || newStartHour === undefined) {
            return res.status(400).json({ error: "newDate and newStartHour are required" });
        }

        const original = await prisma.ddBooking.findUnique({
            where: { id: bookingId },
            include: { addons: true },
        });
        if (!original) return res.status(404).json({ error: "Booking not found" });

        // Generate unique transfer booking ref using timestamp + random suffix
        const crypto = require("crypto");
        const today = new Date();
        const datePrefix = `DD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
        const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const newRef = `${datePrefix}-T${randomSuffix}`;

        // Build transfer metadata with original date/slot info
        const origDate = original.bookingDate.toISOString().slice(0, 10);
        const origSlotStart = original.startHour;
        const origSlotEnd = original.startHour + original.durationHours;
        const fmtHr = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
        const transferMeta = `[TRANSFER:${original.bookingRef}|${origDate}|${fmtHr(origSlotStart)}-${fmtHr(origSlotEnd)}|${TRANSFER_FEE}]`;

        // Use newScreenId if provided, otherwise keep original screen
        const targetScreenId = newScreenId ? parseInt(newScreenId) : original.screenId;

        // Create new booking with same details + ₹400 transfer fee added to amountToCollect
        // Use transaction to ensure both create + original update succeed atomically
        const { newBooking } = await prisma.$transaction(async (tx) => {
            const created = await tx.ddBooking.create({
                data: {
                    screenId: targetScreenId,
                    packageId: original.packageId,
                    bookingDate: new Date(newDate + "T00:00:00"),
                    startHour: parseInt(newStartHour),
                    durationHours: original.durationHours,
                    customerName: original.customerName,
                    customerPhone: original.customerPhone,
                    customerEmail: original.customerEmail,
                    numGuests: original.numGuests,
                    occasion: original.occasion,
                    cakeMessage: original.cakeMessage,
                    specialRequests: original.specialRequests
                        ? `${original.specialRequests.replace(/\[TRANSFER:.*?\]/g, '').trim()} ${transferMeta}`.trim()
                        : transferMeta,
                    totalAmount: original.totalAmount + TRANSFER_FEE,
                    amountPaid: original.amountPaid,
                    amountToCollect: original.amountToCollect + TRANSFER_FEE,
                    paymentMethod: original.paymentMethod,
                    paymentStatus: original.amountToCollect + TRANSFER_FEE > 0 ? "partial" : "paid",
                    basePrice: original.basePrice,
                    extraPersonCharge: original.extraPersonCharge,
                    gstAmount: original.gstAmount,
                    bookingRef: newRef,
                    status: "confirmed",
                    source: original.source || "website",
                    couponId: original.couponId || null,
                },
            });

            // Copy add-ons to new booking
            if (original.addons && original.addons.length > 0) {
                await tx.ddBookingAddon.createMany({
                    data: original.addons.map((a) => ({
                        bookingId: created.id,
                        addonType: a.addonType,
                        addonValue: a.addonValue,
                        price: a.price,
                        isPaid: a.isPaid,
                        paymentMethod: a.paymentMethod,
                    })),
                });
            }

            // Mark original as transferred
            const newSlotFmt = `${fmtHr(parseInt(newStartHour))}-${fmtHr(parseInt(newStartHour) + original.durationHours)}`;
            await tx.ddBooking.update({
                where: { id: bookingId },
                data: { status: "transferred", specialRequests: `${original.specialRequests || ""} [Transferred to ${newRef} on ${newDate} ${newSlotFmt}]`.trim() },
            });

            return { newBooking: created };
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin!.id,
                action: "transfer_booking",
                entityType: "dd_booking",
                entityId: bookingId,
                details: {
                    originalRef: original.bookingRef,
                    newRef,
                    newDate,
                    newStartHour,
                    transferFee: TRANSFER_FEE,
                },
                isDeveloper: req.admin!.role === "developer",
            },
        });

        return res.json({ original: { id: bookingId, status: "transferred" }, newBooking });
    } catch (error) {
        console.error("Transfer booking error:", error);
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

        // Record payment in ledger — but only if this addon's price is truly extra
        // (i.e., not already included in the booking total via a paid duplicate)
        const paidDuplicate = await prisma.ddBookingAddon.findFirst({
            where: { bookingId: addon.bookingId, addonType: addon.addonType, isPaid: true, id: { not: addonId } }
        });

        if (!paidDuplicate) {
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
            // Check if addon of this type already exists (paid OR unpaid)
            const existing = await prisma.ddBookingAddon.findFirst({
                where: { bookingId, addonType: addon.type }
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
                status: { notIn: ["cancelled", "no_show", "transferred"] },
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
            include: { screen: true, package: true, addons: true },
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
