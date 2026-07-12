import { Router } from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { auditLog } from "../lib/logger";
import { sendBookingConfirmation, sendOwnerBookingNotification } from "../lib/emailService";
import { generateStaycationBookingPDF } from "../lib/pdfService";
import { sendStaycationBookingConfirmation, sendWhatsAppTemplateMessage } from "../lib/whatsappService";
import { deductItemStock } from "./hospitality";

const router = Router();

// Generate booking ref: ST-YYYYMMDD-NNN (transaction-safe)
async function generateStayRef(tx: any): Promise<string> {
    // Use IST date to match Indian business day (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const dateStr = istNow.toISOString().slice(0, 10).replace(/-/g, "");

    // IST midnight for count query
    const istDateOnly = new Date(istNow.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const istMidnight = new Date(istDateOnly.getTime() - istOffset);

    const count = await tx.staycationBooking.count({
        where: {
            bookedAt: {
                gte: istMidnight,
            },
        },
    });
    // Add random suffix to prevent collisions under concurrent load
    const suffix = Math.random().toString(36).slice(2, 4);
    return `ST-${dateStr}-${String(count + 1).padStart(3, "0")}${suffix}`;
}

// POST /api/bookings/staycation — Create booking (transaction-locked, capacity-aware)
router.post("/", async (req, res) => {
    try {
        const {
            customerName, customerPhone, customerEmail,
            propertyId, subPropertyId, numGuests, numKids, numPets, numCottages,
            checkInDate, checkOutDate,
            nightlyRate, basePrice, extraPersonCharge, extraAdultCharge, extraKidsCharge,
            gstAmount, totalAmount,
            advanceAmount, balanceAmount, securityDeposit,
            advancePaid, advanceMethod,
            source, couponCode, addons, discountAmount: reqDiscountAmount,
        } = req.body;

        if (!customerName || !customerPhone || !propertyId || !checkInDate || !checkOutDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Parse dates with explicit time to prevent UTC-offset shifting
        // Without T00:00:00, "2026-04-22" is parsed as UTC midnight → April 21 in IST
        const ciStr = typeof checkInDate === 'string' && !checkInDate.includes('T') ? checkInDate + 'T00:00:00' : checkInDate;
        const coStr = typeof checkOutDate === 'string' && !checkOutDate.includes('T') ? checkOutDate + 'T00:00:00' : checkOutDate;
        const checkIn = new Date(ciStr);
        const checkOut = new Date(coStr);
        const numNights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
        const parsedPropertyId = parseInt(propertyId);
        if (isNaN(parsedPropertyId)) return res.status(400).json({ error: "Invalid property ID" });

        // Extract logged-in user ID from token (JWT verification)
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
                // Token invalid or expired — proceed for walk-in / admin bookings
            }
        }

        // Use serializable transaction to prevent double-booking (race-condition safe)
        const booking = await prisma.$transaction(async (tx) => {
            // 0. Check if property is active
            const property = await tx.property.findUnique({ where: { id: parsedPropertyId } });
            if (!property || !property.isActive) {
                throw new Error("PROPERTY_INACTIVE");
            }

            // ── Capacity-aware conflict check ──────────────────────────
            // 1. Get all sub-properties for this property (determines capacity)
            const subProperties = await tx.subProperty.findMany({
                where: { propertyId: parsedPropertyId, isActive: true },
                select: { id: true, unitCount: true },
            });
            // Total capacity = sum of unitCount across all sub-properties (e.g. 14 standard + 1 family = 15)
            const totalCapacity = subProperties.length > 0
                ? subProperties.reduce((sum, sp) => sum + (sp.unitCount || 1), 0)
                : 1;
            const isMultiUnit = totalCapacity > 1;

            // 2. Find ALL overlapping active bookings for this property
            const overlappingBookings = await tx.staycationBooking.findMany({
                where: {
                    propertyId: parsedPropertyId,
                    status: { notIn: ["cancelled", "no_show", "transferred"] },
                    checkInDate: { lt: checkOut },
                    checkOutDate: { gt: checkIn },
                },
                select: { id: true, subPropertyId: true, checkInDate: true, checkOutDate: true, numCottages: true },
            });

            // 2b. Get blocked dates in the range for this property
            const blockedInRange = await tx.blockedDate.findMany({
                where: {
                    propertyId: parsedPropertyId,
                    blockedDate: { gte: checkIn, lt: checkOut },
                },
                select: { blockedDate: true, subPropertyId: true },
            });

            let assignedSubPropertyId: number | null = null;
            if (subPropertyId) {
                const parsed = parseInt(subPropertyId);
                if (!isNaN(parsed)) assignedSubPropertyId = parsed;
            }

            if (isMultiUnit) {
                // ── Multi-unit property (e.g. Amstel Nest: 14 standard + 1 family = 15) ──
                if (assignedSubPropertyId) {
                    // Specific sub-property type requested (e.g. standard-cottage)
                    const targetSp = subProperties.find(sp => sp.id === assignedSubPropertyId);
                    const targetCapacity = targetSp?.unitCount || 1;

                    // Check each day: count bookings + blocks for THIS sub-property type
                    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
                        const dayStart = new Date(d);
                        const dayEnd = new Date(d);
                        dayEnd.setDate(dayEnd.getDate() + 1);
                        const dateStr = d.toISOString().split('T')[0];

                        // Count bookings for this sub-property on this day
                        const dayBookingsForSub = overlappingBookings.filter(b => {
                            if (b.subPropertyId !== assignedSubPropertyId) return false;
                            const bIn = new Date(b.checkInDate);
                            const bOut = new Date(b.checkOutDate);
                            return bIn < dayEnd && bOut > dayStart;
                        }).reduce((sum, b) => sum + (b.numCottages || 1), 0);

                        // Count blocks for this sub-property on this day
                        const dayBlocksForSub = blockedInRange.filter(bl => {
                            const blDate = bl.blockedDate.toISOString().split('T')[0];
                            return blDate === dateStr && (bl.subPropertyId === assignedSubPropertyId || bl.subPropertyId === null);
                        }).length;

                        const newCottages = numCottages || 1;
                        if (dayBookingsForSub + dayBlocksForSub + newCottages > targetCapacity) {
                            throw new Error("DATE_CONFLICT");
                        }
                    }
                } else {
                    // No specific sub-property — find which type still has capacity
                    // Try each sub-property type, pick the first with remaining capacity for ALL days
                    let foundFree = false;
                    for (const sp of subProperties) {
                        const spCapacity = sp.unitCount || 1;
                        let spFreeAllDays = true;

                        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
                            const dayStart = new Date(d);
                            const dayEnd = new Date(d);
                            dayEnd.setDate(dayEnd.getDate() + 1);
                            const dateStr = d.toISOString().split('T')[0];

                            const dayBookings = overlappingBookings.filter(b => {
                                if (b.subPropertyId !== sp.id) return false;
                                const bIn = new Date(b.checkInDate);
                                const bOut = new Date(b.checkOutDate);
                                return bIn < dayEnd && bOut > dayStart;
                            }).reduce((sum, b) => sum + (b.numCottages || 1), 0);

                            const dayBlocks = blockedInRange.filter(bl => {
                                const blDate = bl.blockedDate.toISOString().split('T')[0];
                                return blDate === dateStr && (bl.subPropertyId === sp.id || bl.subPropertyId === null);
                            }).length;

                            if (dayBookings + dayBlocks + (numCottages || 1) > spCapacity) {
                                spFreeAllDays = false;
                                break;
                            }
                        }

                        if (spFreeAllDays) {
                            assignedSubPropertyId = sp.id;
                            foundFree = true;
                            break;
                        }
                    }

                    if (!foundFree) {
                        throw new Error("DATE_CONFLICT");
                    }
                }
            } else {
                // ── Single-unit property — only 1 booking allowed per date ──
                if (overlappingBookings.length > 0) {
                    throw new Error("DATE_CONFLICT");
                }
            }

            // Handle coupon
            let couponId = null;
            let discountAmount = parseInt(reqDiscountAmount) || 0;
            if (couponCode) {
                const coupon = await tx.coupon.findFirst({ where: { code: couponCode, isActive: true, expiryDate: { gte: new Date() } }, orderBy: { createdAt: "desc" } });
                if (coupon && coupon.isActive && coupon.currentUses < coupon.maxUses && new Date(coupon.expiryDate) >= new Date()) {
                    couponId = coupon.id;
                    if (coupon.discountType === "percentage") {
                        const petCharges = (numPets || 0) * 600;
                        let addonsTotal = 0;
                        if (addons) {
                            const addonsArr = Array.isArray(addons) ? addons : [addons];
                            for (const addon of addonsArr) {
                                if (addon && addon.price) {
                                    addonsTotal += Number(addon.price) || 0;
                                }
                            }
                        }
                        const subtotal = (basePrice || 0) + (extraPersonCharge || 0) + (extraAdultCharge || 0) + (extraKidsCharge || 0) + petCharges + addonsTotal;
                        const preDiscountTotal = subtotal + (gstAmount || 0);
                        discountAmount = Math.round((preDiscountTotal * Number(coupon.discountValue)) / 100);
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
                if (!user.phone || user.phone === "") {
                    user = await tx.user.update({
                        where: { id: user.id },
                        data: { phone: customerPhone, fullName: user.fullName === "Guest" ? customerName : user.fullName },
                    });
                }
            }

            const bookingRef = await generateStayRef(tx);

            // Encrypt sensitive data
            const encryptedPhone = encrypt(customerPhone);
            const encryptedEmail = customerEmail ? encrypt(customerEmail) : null;

            const created = await tx.staycationBooking.create({
                data: {
                    bookingRef,
                    userId: user.id,
                    propertyId: parsedPropertyId,
                    subPropertyId: assignedSubPropertyId,
                    customerName,
                    customerPhone: encryptedPhone,
                    customerEmail: encryptedEmail,
                    numGuests: numGuests || 2,
                    numKids: numKids || 0,
                    numPets: numPets || 0,
                    numCottages: numCottages || 1,
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    numNights,
                    nightlyRate: nightlyRate || 0,
                    basePrice: basePrice || 0,
                    extraPersonCharge: extraPersonCharge || 0,
                    extraAdultCharge: extraAdultCharge || 0,
                    extraKidsCharge: extraKidsCharge || 0,
                    gstAmount: gstAmount || 0,
                    totalAmount: totalAmount || 0,
                    advanceAmount: advanceAmount || 0,
                    balanceAmount: balanceAmount || 0,
                    securityDeposit: securityDeposit || 0,
                    advancePaid: advancePaid || false,
                    advanceMethod: advanceMethod || null,
                    advancePaidAt: advancePaid ? new Date() : null,
                    source: source || "website",
                    couponId,
                    discountAmount,
                    addons: addons || null,
                },
                include: { property: { include: { pricing: true } }, subProperty: { include: { pricing: true } }, coupon: true },
            });

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

            const isManual = source === "admin" || source === "collab" || req.body.isAdminBooking === true || created.isAdminBooking === true;
            // Track cash collection for employee if advance is paid in cash (reception/portal bookings only)
            if (advancePaid && advanceMethod?.toLowerCase() === "cash" && (advanceAmount || 0) > 0 && source === "reception" && !isManual) {
                const employee = await tx.employee.findFirst({
                    where: { propertyId: parsedPropertyId, isActive: true },
                });
                if (employee) {
                    await tx.employee.update({
                        where: { id: employee.id },
                        data: { 
                            cashCollected: { increment: advanceAmount },
                            rentCollected: { increment: advanceAmount }
                        },
                    });
                    await tx.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            bookingRef,
                            guestName: customerName,
                            amount: advanceAmount,
                            transactionType: "collection",
                            note: `Advance payment (cash) — ${created.property?.name || "Property"}`,
                        },
                    });
                }
            }

            return created;
        }, { isolationLevel: "Serializable" });

        auditLog({ action: "booking_created", entityType: "staycation_booking", entityId: booking.id, details: { source: source || "website" } });

        // Send confirmation email (fire-and-forget)
        sendBookingConfirmation({ ...booking, customerPhone, customerEmail }).catch(() => { });

        // Send WhatsApp confirmation with voucher link (fire-and-forget)
        // DISABLED: Do not send staycation confirmations until staycation WhatsApp numbers are provided.
        // if (customerPhone) {
        //     const baseUrl = process.env.FRONTEND_URL || "https://galaxiaresorts.com";
        //     const voucherUrl = `${baseUrl}/api/bookings/staycation/voucher/${booking.bookingRef}`;
        //     sendStaycationBookingConfirmation("stay1", customerPhone, booking.bookingRef, voucherUrl).catch(() => { });
        // }

        // Send owner notification with PDF attachment (fire-and-forget)
        const prop = booking.property || {};
        const sub = booking.subProperty;
        const ownerPropertyName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Galaxia Property");
        generateStaycationBookingPDF({ ...booking, customerPhone, customerEmail })
            .then((pdfBuffer) =>
                sendOwnerBookingNotification({
                    bookingRef: booking.bookingRef,
                    customerName: booking.customerName,
                    module: "staycation",
                    propertyName: ownerPropertyName,
                    pdfBuffer,
                })
            )
            .catch((err) => console.error("[Owner Notify] Staycation PDF/email failed:", err));

        return res.status(201).json(booking);
    } catch (error: any) {
        if (error?.message === "DATE_CONFLICT") {
            return res.status(409).json({ error: "Property is already booked for these dates. Please choose different dates." });
        }
        if (error?.message === "PROPERTY_INACTIVE") {
            return res.status(403).json({ error: "Property is currently under maintenance" });
        }
        console.error("Create stay booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/bookings/staycation — List bookings (admin)
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { status, propertyId, startDate, endDate, bookedOnFrom, bookedOnTo } = req.query;

        const where: any = {};
        if (status) {
            if (status === "collab") {
                where.source = "collab";
            } else {
                where.status = status;
            }
        }
        if (propertyId) {
            const parsed = parseInt(propertyId as string);
            if (!isNaN(parsed)) {
                where.propertyId = parsed;
            }
        }
        // Filter by check-in dates
        if (startDate || endDate) {
            where.checkInDate = {};
            if (startDate) {
                const s = new Date(startDate as string);
                s.setHours(0, 0, 0, 0);
                where.checkInDate.gte = s;
            }
            if (endDate) {
                const e = new Date(endDate as string);
                e.setHours(23, 59, 59, 999);
                where.checkInDate.lte = e;
            }
        }
        // Filter by booked-on (bookedAt) dates
        if (bookedOnFrom || bookedOnTo) {
            where.bookedAt = {};
            if (bookedOnFrom) {
                const s = new Date((bookedOnFrom as string) + 'T00:00:00');
                s.setHours(0, 0, 0, 0);
                where.bookedAt.gte = s;
            }
            if (bookedOnTo) {
                const e = new Date((bookedOnTo as string) + 'T00:00:00');
                e.setHours(23, 59, 59, 999);
                where.bookedAt.lte = e;
            }
        }

        // Role-based filtering
        if (req.admin!.role === "dd_admin") {
            return res.status(403).json({ error: "DD admins cannot view staycation bookings" });
        }

        const bookings = await prisma.staycationBooking.findMany({
            where,
            include: {
                property: true,
                subProperty: { include: { pricing: true } },
                extraGuests: true,
                guestIds: true,
                foodBills: true,
                coupon: true,
                payments: true,
            },
            orderBy: { checkInDate: "desc" },
        });

        // Fetch upi payments for these bookings
        const refs = bookings.map(b => b.bookingRef).filter(Boolean);
        const upiPayments = await prisma.upiPayment.findMany({
            where: { bookingRef: { in: refs } }
        });

        // Decrypt sensitive fields for admin view
        const decrypted = bookings.map(b => {
            const bookingUpiPayments = upiPayments.filter(upi => upi.bookingRef === b.bookingRef);
            return {
                ...b,
                customerPhone: decrypt(b.customerPhone),
                customerEmail: b.customerEmail ? decrypt(b.customerEmail) : null,
                guestIds: (b.guestIds || []).map((g: any) => ({
                    id: g.id,
                    fileName: g.fileName ? decrypt(g.fileName) : null,
                    fileType: g.fileType,
                    bookingId: g.bookingId,
                    createdAt: g.createdAt,
                })),
                upiPayments: bookingUpiPayments.map(upi => ({
                    id: upi.id,
                    paymentType: upi.paymentType,
                    proofImageUrl: upi.proofImageUrl,
                    proofImageKey: upi.proofImageKey,
                    amount: upi.amount,
                    createdAt: upi.createdAt
                }))
            };
        });

        return res.json(decrypted);
    } catch (error: any) {
        if (error?.message === "PROPERTY_INACTIVE") {
            return res.status(403).json({ error: "Property is currently under maintenance" });
        }
        console.error("Create stay booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/bookings/staycation/:id/status — Update status
router.patch("/:id/status", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { status, assignedUnit } = req.body;
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const existing = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { extraGuests: true }
        });
        if (!existing) return res.status(404).json({ error: "Booking not found" });

        const booking = await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: {
                status,
                ...(assignedUnit !== undefined ? { assignedUnit } : {}),
                ...(status === "checked_in" ? { checkInTime: new Date() } : {}),
                ...(status === "checked_out" ? { checkOutTime: new Date() } : {}),
            },
            include: {
                property: true,
            }
        });

        // Deduct complimentary water bottles (1 per adult guest + extra adult guests) on check-in for Ambrose & Amstel Nest only
        let waterBottlesDeducted = 0;
        if (status === "checked_in" && existing.status !== "checked_in") {
            const propSlug = (booking.property?.slug || "").toLowerCase();
            const propName = (booking.property?.name || "").toLowerCase();
            const isAmbroseOrAmstel = propSlug.includes("ambrose") || propSlug.includes("amstel") || propName.includes("ambrose") || propName.includes("amstel");

            if (isAmbroseOrAmstel) {
                const extraAdultsCount = (existing.extraGuests || []).filter(
                    (eg: any) => !eg.guestName?.toLowerCase().includes("pet")
                ).length;
                const totalAdults = Math.max(1, (existing.numGuests || 0) + extraAdultsCount);
                waterBottlesDeducted = totalAdults;
                deductItemStock("water", totalAdults);
            }

            try {
                const allottedUnit = booking.assignedUnit;
                if (allottedUnit && allottedUnit.trim() !== "") {
                    const guestPhone = decrypt(booking.customerPhone);

                    // Menu URL routing (using only the first unit for slug in case of multiple units)
                    const firstUnit = allottedUnit.split(",")[0].trim();
                    const slugifiedUnit = firstUnit.toLowerCase().replace(/\s+/g, "-");
                    const menuUrl = `galaxiaresorts.com/hospitalityemenu/${slugifiedUnit}`;

                    await sendWhatsAppTemplateMessage(
                        "otp",
                        guestPhone,
                        "hospitality_checkin_notification",
                        [allottedUnit, menuUrl]
                    );
                }
            } catch (waErr: any) {
                console.error("Staycation check-in WhatsApp notification failed:", waErr.message);
            }
        }

        // Audit log
        auditLog({ adminId: req.admin!.id, action: "booking_status_update", entityType: "staycation_booking", entityId: booking.id, details: { newStatus: status, assignedUnit, waterBottlesDeducted } });

        return res.json(booking);
    } catch (error) {
        console.error("Update stay booking status error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/bookings/staycation/:id — Master Edit (owner only)
router.patch("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const existing = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: { include: { pricing: true } }, subProperty: { include: { pricing: true } }, coupon: true },
        });
        if (!existing) return res.status(404).json({ error: "Booking not found" });

        const {
            customerName, customerPhone, customerEmail,
            numGuests, numKids, numPets, numCottages,
            checkInDate, checkOutDate,
            nightlyRate, basePrice, extraPersonCharge, extraAdultCharge, extraKidsCharge,
            gstAmount, totalAmount,
            advanceAmount, balanceAmount, securityDeposit,
            status, source, addons, discountAmount,
            subPropertyId, comments,
        } = req.body;

        // Build update data — only include fields that were actually sent
        const updateData: any = {};

        if (customerName !== undefined) updateData.customerName = customerName;
        if (customerPhone !== undefined) updateData.customerPhone = encrypt(customerPhone);
        if (customerEmail !== undefined) updateData.customerEmail = customerEmail ? encrypt(customerEmail) : null;
        if (numGuests !== undefined) updateData.numGuests = parseInt(numGuests);
        if (numKids !== undefined) updateData.numKids = parseInt(numKids);
        if (numPets !== undefined) updateData.numPets = parseInt(numPets);
        if (numCottages !== undefined) updateData.numCottages = parseInt(numCottages);
        if (nightlyRate !== undefined) updateData.nightlyRate = parseFloat(nightlyRate) || 0;
        if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice) || 0;
        if (extraPersonCharge !== undefined) updateData.extraPersonCharge = parseFloat(extraPersonCharge) || 0;
        if (extraAdultCharge !== undefined) updateData.extraAdultCharge = parseFloat(extraAdultCharge) || 0;
        if (extraKidsCharge !== undefined) updateData.extraKidsCharge = parseFloat(extraKidsCharge) || 0;
        if (gstAmount !== undefined) updateData.gstAmount = parseFloat(gstAmount) || 0;
        if (discountAmount !== undefined) updateData.discountAmount = parseInt(discountAmount) || 0;
        if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount) || 0;
        if (advanceAmount !== undefined) updateData.advanceAmount = parseFloat(advanceAmount) || 0;
        if (balanceAmount !== undefined) updateData.balanceAmount = parseFloat(balanceAmount) || 0;
        if (securityDeposit !== undefined) updateData.securityDeposit = parseFloat(securityDeposit) || 0;
        if (status !== undefined) updateData.status = status;
        if (source !== undefined) updateData.source = source;
        if (addons !== undefined) updateData.addons = addons;
        if (comments !== undefined) updateData.comments = comments;
        if (subPropertyId !== undefined) {
            updateData.subPropertyId = subPropertyId ? parseInt(subPropertyId) : null;
        }

        // Handle date changes — recalculate numNights
        if (checkInDate !== undefined || checkOutDate !== undefined) {
            const ciStr = checkInDate || existing.checkInDate.toISOString().split('T')[0];
            const coStr = checkOutDate || existing.checkOutDate.toISOString().split('T')[0];
            const ci = new Date(typeof ciStr === 'string' && !ciStr.includes('T') ? ciStr + 'T00:00:00' : ciStr);
            const co = new Date(typeof coStr === 'string' && !coStr.includes('T') ? coStr + 'T00:00:00' : coStr);
            if (checkInDate !== undefined) updateData.checkInDate = ci;
            if (checkOutDate !== undefined) updateData.checkOutDate = co;
            updateData.numNights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 3600 * 24)));
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const updated = await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: updateData,
            include: { property: { include: { pricing: true } }, subProperty: { include: { pricing: true } }, coupon: true },
        });

        // Comprehensive audit log with before/after snapshot
        const changedFields: Record<string, { before: any; after: any }> = {};
        for (const key of Object.keys(updateData)) {
            const beforeVal = (existing as any)[key];
            const afterVal = (updated as any)[key];
            if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
                changedFields[key] = { before: beforeVal, after: afterVal };
            }
        }

        console.log(`[MASTER EDIT] Booking #${bookingId} (${existing.bookingRef}) edited by admin #${req.admin!.id}:`, JSON.stringify(changedFields, null, 2));

        auditLog({
            adminId: req.admin!.id,
            action: "booking_master_edit",
            entityType: "staycation_booking",
            entityId: bookingId,
            details: {
                bookingRef: existing.bookingRef,
                changedFields,
            },
        });

        // Decrypt for response
        const decrypted = {
            ...updated,
            customerPhone: decrypt(updated.customerPhone),
            customerEmail: updated.customerEmail ? decrypt(updated.customerEmail) : null,
        };

        // Resend confirmation email & owner notification with updated details (fire-and-forget)
        const plainPhone = decrypt(updated.customerPhone);
        const plainEmail = updated.customerEmail ? decrypt(updated.customerEmail) : null;
        sendBookingConfirmation({ ...updated, customerPhone: plainPhone, customerEmail: plainEmail }).catch(() => {});

        const prop = updated.property || {};
        const sub = updated.subProperty;
        const ownerPropertyName = sub ? `${sub.name} — ${(prop as any).name}` : ((prop as any).name || "Galaxia Property");
        generateStaycationBookingPDF({ ...updated, customerPhone: plainPhone, customerEmail: plainEmail })
            .then((pdfBuffer) =>
                sendOwnerBookingNotification({
                    bookingRef: updated.bookingRef,
                    customerName: updated.customerName,
                    module: "staycation",
                    propertyName: ownerPropertyName,
                    pdfBuffer,
                })
            )
            .catch((err) => console.error("[Owner Notify] Edit resend failed:", err));

        return res.json(decrypted);
    } catch (error) {
        console.error("Master edit staycation booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/bookings/staycation/:id/payment — Record payment
router.post("/:id/payment", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { paymentType, amount, method } = req.body;
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const payment = await prisma.bookingPayment.create({
            data: {
                staycationBookingId: bookingId,
                paymentType,
                amount,
                method,
                collectedBy: req.admin!.id,
            },
        });

        // Update booking payment status
        const updateData: any = {};

        const allPayments = await prisma.bookingPayment.findMany({
            where: {
                staycationBookingId: bookingId,
                paymentType: paymentType
            }
        });
        const methods = Array.from(new Set(allPayments.map(p => p.method?.toUpperCase()).filter(Boolean)));
        let finalMethod = method;
        if (methods.includes("CASH") && methods.includes("UPI")) {
            finalMethod = "CASH & UPI";
        } else if (methods.includes("CASH")) {
            finalMethod = "Cash";
        } else if (methods.includes("UPI")) {
            finalMethod = "UPI";
        }

        if (paymentType === "balance") {
            updateData.balanceCollected = true;
            updateData.balanceMethod = finalMethod;
            updateData.balanceCollectedAt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        } else if (paymentType === "deposit") {
            updateData.depositCollected = true;
            updateData.depositMethod = finalMethod;
            updateData.depositCollectedAt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.staycationBooking.update({
                where: { id: bookingId },
                data: updateData,
            });
        }

        // Track cash collection for employee
        if (method?.toLowerCase() === "cash" && amount > 0) {
            const booking = await prisma.staycationBooking.findUnique({
                where: { id: bookingId },
                include: { property: true },
            });
            if (booking) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: booking.propertyId, isActive: true },
                });
                if (employee) {
                    const isDeposit = paymentType === "deposit";
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { 
                            cashCollected: { increment: amount },
                            [isDeposit ? 'depositCollected' : 'rentCollected']: { increment: amount }
                        },
                    });
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            bookingRef: booking.bookingRef,
                            guestName: booking.customerName,
                            amount,
                            transactionType: "collection",
                            note: `${paymentType === "deposit" ? "Security deposit" : "Balance"} — ${booking.property?.name || "Property"}`,
                        },
                    });
                }
            }
        }

        return res.json(payment);
    } catch (error) {
        console.error("Record payment error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/bookings/staycation/:id/refund-deposit — Record deposit refund
router.post("/:id/refund-deposit", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { method, proofImageUrl, proofImageKey } = req.body; // "cash", "upi", or "none"
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const booking = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (booking.depositRefunded) {
            return res.status(400).json({ error: "Security deposit has already been refunded" });
        }

        // Mark deposit as refunded
        await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: {
                depositRefunded: true,
                depositRefundedAt: new Date(),
                depositRefundMethod: method || null,
            },
        });

        const depositAmount = booking.securityDeposit || 0;

        // If refund method is cash, decrement employee's cashCollected
        if (method?.toLowerCase() === "cash" && depositAmount > 0) {
            const employee = await prisma.employee.findFirst({
                where: { propertyId: booking.propertyId, isActive: true },
            });
            if (employee) {
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { 
                        cashCollected: { decrement: depositAmount },
                        depositCollected: { decrement: depositAmount }
                    },
                });
                await prisma.cashTransaction.create({
                    data: {
                        employeeId: employee.id,
                        bookingRef: booking.bookingRef,
                        guestName: booking.customerName,
                        amount: -depositAmount,
                        transactionType: "refund",
                        note: `Deposit refund (cash) — ${booking.property?.name || "Property"}`,
                    },
                });
            }
        }

        // If refund method is UPI, create a UpiPayment record
        if (method?.toLowerCase() === "upi") {
            const employee = await prisma.employee.findFirst({
                where: { propertyId: booking.propertyId, isActive: true },
            });
            if (employee) {
                let relativeKey = proofImageKey || null;
                if (relativeKey && (relativeKey.startsWith("http://") || relativeKey.startsWith("https://"))) {
                    try {
                        const urlObj = new URL(relativeKey);
                        relativeKey = urlObj.pathname.slice(1);
                    } catch {}
                }
                await prisma.upiPayment.create({
                    data: {
                        employeeId: employee.id,
                        bookingRef: booking.bookingRef,
                        guestName: booking.customerName,
                        amount: -depositAmount, // negative since it's a refund
                        paymentType: "deposit_refund",
                        proofImageUrl: proofImageUrl || null,
                        proofImageKey: relativeKey,
                        note: `Deposit refund (UPI) — ${booking.property?.name || "Property"}`,
                    },
                });
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Refund deposit error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/bookings/staycation/:id/extra-guest — Add extra guest
router.post("/:id/extra-guest", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { guestName, idProofType, chargeAmount, paymentMethod } = req.body;
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const extraGuest = await prisma.extraGuest.create({
            data: {
                bookingId,
                guestName,
                idProofType,
                chargeAmount,
                paymentMethod,
                addedBy: req.admin!.id,
            },
        });

        // Update guest count (only if it's not purely pets being added)
        const isPet = guestName.toLowerCase().includes("pet");
        if (!isPet) {
            await prisma.staycationBooking.update({
                where: { id: bookingId },
                data: { numGuests: { increment: 1 } },
            });
        }

        // Track cash collection for employee
        if (paymentMethod?.toLowerCase() === "cash" && chargeAmount > 0) {
            const booking = await prisma.staycationBooking.findUnique({
                where: { id: bookingId },
                include: { property: true }
            });
            if (booking) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: booking.propertyId, isActive: true },
                });
                if (employee) {
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { 
                            cashCollected: { increment: chargeAmount },
                            rentCollected: { increment: chargeAmount }
                        },
                    });
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            bookingRef: booking.bookingRef,
                            guestName: booking.customerName,
                            amount: chargeAmount,
                            transactionType: "collection",
                            note: `${isPet ? 'Pet' : 'Extra guest'} charge (cash) — ${booking.property?.name || "Property"}`,
                        },
                    });
                }
            }
        }

        return res.status(201).json(extraGuest);
    } catch (error) {
        console.error("Add extra guest error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/bookings/staycation/daily-report — Admin: get all guests staying on a specific date for PDF report
router.get("/daily-report", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { date, property } = req.query;
        if (!date) return res.status(400).json({ error: "date query parameter is required (YYYY-MM-DD)" });

        // Parse the target date
        const targetDateStr = date as string;
        const targetDate = new Date(targetDateStr + "T00:00:00");
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Determine which property slugs to filter
        let propertySlugs: string[] = [];
        if (property === "ambrose") {
            propertySlugs = ["ambrose"];
        } else if (property === "amstel-nest") {
            propertySlugs = ["amstel-nest"];
        } else {
            // "both" or default — Ambrose + Amstel Nest
            propertySlugs = ["ambrose", "amstel-nest"];
        }

        // Find property IDs for the slugs
        const properties = await prisma.property.findMany({
            where: { slug: { in: propertySlugs } },
            select: { id: true, name: true, slug: true },
        });
        const propertyIds = properties.map(p => p.id);
        const propIdToName: Record<number, string> = {};
        for (const p of properties) {
            propIdToName[p.id] = p.name;
        }

        if (propertyIds.length === 0) {
            return res.json({ bookings: [], summary: {} });
        }

        // Fetch bookings where: checkInDate <= targetDate AND checkOutDate > targetDate
        // This means: the guest has checked in on or before this date, and hasn't checked out yet
        // Exclude cancelled and no_show
        const bookings = await prisma.staycationBooking.findMany({
            where: {
                propertyId: { in: propertyIds },
                status: { notIn: ["cancelled", "no_show", "transferred"] },
                checkInDate: { lte: targetDate },   // checked in on or before this date
                checkOutDate: { gt: targetDate },    // hasn't checked out yet (checkout is after this date)
            },
            include: {
                property: { select: { id: true, name: true, slug: true } },
                subProperty: { select: { id: true, name: true } },
            },
            orderBy: [{ propertyId: "asc" }, { checkInDate: "asc" }],
        });

        // Decrypt and map response
        const mapped = bookings.map(b => {
            // Extract food preference from addons JSON
            let foodPreference = "Regular";
            if (b.addons && Array.isArray(b.addons)) {
                const foodPrefs: string[] = [];
                for (const a of b.addons as any[]) {
                    if (a && a.name === "Food Preference" && a.foodType) {
                        if (a.count !== undefined && a.count !== null && a.count > 0) {
                            foodPrefs.push(`${a.foodType} Veg: ${a.count}`);
                        } else {
                            foodPrefs.push(a.foodType);
                        }
                    }
                }
                if (foodPrefs.length > 0) {
                    foodPreference = foodPrefs.join(", ");
                }
            }

            const numNights = b.numNights || Math.max(1, Math.ceil(
                (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 3600 * 24)
            ));

            // Determine if this booking is a check-in on this specific date
            const checkInDateStr = b.checkInDate.toISOString().split("T")[0];
            const isCheckInToday = checkInDateStr === targetDateStr;

            return {
                id: b.id,
                bookingRef: b.bookingRef,
                customerName: decrypt(b.customerPhone) ? b.customerName : b.customerName,
                propertyName: b.property?.name || "Unknown",
                subPropertyName: b.subProperty?.name || null,
                numCottages: b.numCottages || 1,
                checkInDate: b.checkInDate.toISOString().split("T")[0],
                checkOutDate: b.checkOutDate.toISOString().split("T")[0],
                numNights,
                numAdults: b.numGuests || 0,
                numChildren: b.numKids || 0,
                foodPreference,
                isCheckInToday,
                balanceAmount: b.balanceAmount || 0,
                comments: b.comments || "",
            };
        });

        // Calculate summary statistics
        const checkInsToday = mapped.filter(b => b.isCheckInToday).length;
        const totalBookings = mapped.length;

        // Per-property breakdown
        const ambroseBookings = mapped.filter(b => b.propertyName === "Ambrose");
        const amstelBookings = mapped.filter(b => b.propertyName === "Amstel Nest");

        const ambroseAdults = ambroseBookings.reduce((s, b) => s + b.numAdults, 0);
        const ambroseChildren = ambroseBookings.reduce((s, b) => s + b.numChildren, 0);
        const ambroseTotal = ambroseAdults + ambroseChildren;

        const amstelAdults = amstelBookings.reduce((s, b) => s + b.numAdults, 0);
        const amstelChildren = amstelBookings.reduce((s, b) => s + b.numChildren, 0);
        const amstelTotal = amstelAdults + amstelChildren;

        const grandTotalAdults = ambroseAdults + amstelAdults;
        const grandTotalChildren = ambroseChildren + amstelChildren;
        const grandTotal = grandTotalAdults + grandTotalChildren;

        // Food preference counts — count actual people, not bookings
        let jainCount = 0;
        let regularCount = 0;
        for (const b of bookings) {
            let hasExplicitCount = false;
            let bJain = 0;
            let bRegular = 0;
            if (b.addons && Array.isArray(b.addons)) {
                for (const a of b.addons as any[]) {
                    if (a && a.name === "Food Preference" && a.foodType) {
                        if (a.count !== undefined && a.count !== null && a.count > 0) {
                            hasExplicitCount = true;
                            if (a.foodType.toLowerCase() === "jain") {
                                bJain += a.count;
                            } else {
                                bRegular += a.count;
                            }
                        }
                    }
                }
            }
            if (hasExplicitCount) {
                jainCount += bJain;
                regularCount += bRegular;
            } else {
                // Fallback: count total guests (adults + children) as either Jain or Regular depending on foodPreference
                let foodPref = "Regular";
                if (b.addons && Array.isArray(b.addons)) {
                    const foodAddon = (b.addons as any[]).find((a: any) => a.name === "Food Preference");
                    if (foodAddon && foodAddon.foodType) {
                        foodPref = foodAddon.foodType;
                    }
                }
                const totalGuests = (b.numGuests || 0) + (b.numKids || 0);
                if (foodPref.toLowerCase() === "jain") {
                    jainCount += totalGuests;
                } else {
                    regularCount += totalGuests;
                }
            }
        }

        return res.json({
            date: targetDateStr,
            property: property || "both",
            bookings: mapped,
            summary: {
                totalCheckIns: checkInsToday,
                totalStaying: totalBookings,
                ambrose: { adults: ambroseAdults, children: ambroseChildren, total: ambroseTotal, bookings: ambroseBookings.length },
                amstelNest: { adults: amstelAdults, children: amstelChildren, total: amstelTotal, bookings: amstelBookings.length },
                grandTotal: { adults: grandTotalAdults, children: grandTotalChildren, total: grandTotal },
                foodPreference: { jain: jainCount, regular: regularCount },
            },
        });
    } catch (error) {
        console.error("Daily report error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/bookings/staycation/booked-dates — Public: get booked/fully-booked dates for a property
router.get("/booked-dates", async (req, res) => {
    try {
        const { propertyId, subPropertyId, startDate, endDate } = req.query;
        if (!propertyId) return res.status(400).json({ error: "propertyId required" });

        const parsedPropertyId = parseInt(propertyId as string);
        const parsedSubPropertyId = subPropertyId ? parseInt(subPropertyId as string) : null;
        if (isNaN(parsedPropertyId)) return res.status(400).json({ error: "Invalid propertyId" });

        const start = new Date(startDate as string || "2000-01-01");
        const end = new Date(endDate as string || "2099-12-31");

        // Determine property capacity from sub-properties (using unitCount)
        const subProperties = await prisma.subProperty.findMany({
            where: { propertyId: parsedPropertyId, isActive: true },
            select: { id: true, unitCount: true },
        });
        const totalCapacity = subProperties.length > 0
            ? subProperties.reduce((sum, sp) => sum + (sp.unitCount || 1), 0)
            : 1;

        // If a specific sub-property is requested, use its unitCount as capacity
        const targetCapacity = parsedSubPropertyId
            ? (subProperties.find(sp => sp.id === parsedSubPropertyId)?.unitCount || 1)
            : totalCapacity;

        // 1. Get bookings (filtered by subPropertyId if provided)
        const bookings = await prisma.staycationBooking.findMany({
            where: {
                propertyId: parsedPropertyId,
                ...(parsedSubPropertyId ? { subPropertyId: parsedSubPropertyId } : {}),
                status: { notIn: ["cancelled", "no_show", "transferred"] },
                checkInDate: { lte: end },
                checkOutDate: { gte: start },
            },
            select: { checkInDate: true, checkOutDate: true, subPropertyId: true, numCottages: true },
        });

        // 2. Get blocked dates
        const blockedEntries = await prisma.blockedDate.findMany({
            where: {
                propertyId: parsedPropertyId,
                blockedDate: { gte: start, lte: end },
                // If subPropertyId specified, get blocks for that sub OR global blocks (null)
                ...(parsedSubPropertyId
                    ? { OR: [{ subPropertyId: parsedSubPropertyId }, { subPropertyId: null }] }
                    : {}),
            },
            select: { blockedDate: true, subPropertyId: true, numUnits: true },
        });

        // Count bookings + blocks per date
        const dateCounts: Record<string, number> = {};

        // Add bookings
        for (const b of bookings) {
            const bStart = new Date(b.checkInDate);
            const bEnd = new Date(b.checkOutDate);
            for (let d = new Date(bStart); d < bEnd; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split("T")[0];
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + (b.numCottages || 1);
            }
        }

        // Add blocks
        for (const bl of blockedEntries) {
            const dateStr = bl.blockedDate.toISOString().split("T")[0];
            const blockUnits = (bl as any).numUnits || 1;
            if (bl.subPropertyId === null && !parsedSubPropertyId) {
                // Global block: counts against total capacity
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + totalCapacity;
            } else {
                // Specific sub-property block: use numUnits from the block
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + blockUnits;
            }
        }

        // A date is fully booked when capacity is reached
        const fullyBookedDates: string[] = [];
        for (const [dateStr, count] of Object.entries(dateCounts)) {
            if (count >= targetCapacity) {
                fullyBookedDates.push(dateStr);
            }
        }

        return res.json({ dates: fullyBookedDates, capacity: targetCapacity, dateCounts });
    } catch (error) {
        console.error("Booked dates error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// ────────────────────────────────────────────────────────────────
//  BOOKING HOLD — Temporary 7-minute reservation lock
// ────────────────────────────────────────────────────────────────

// POST /api/bookings/staycation/hold — Create a temporary hold
router.post("/hold", async (req, res) => {
    try {
        const { propertyId, subPropertyId, checkInDate, checkOutDate } = req.body;
        if (!propertyId || !checkInDate || !checkOutDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const parsedPropertyId = parseInt(propertyId);
        const parsedSubPropertyId = subPropertyId ? parseInt(subPropertyId) : null;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const sessionId = `sh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes

        // Clean up expired holds first
        await prisma.bookingHold.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        // Check capacity including existing bookings + active holds
        const subProperties = await prisma.subProperty.findMany({
            where: { propertyId: parsedPropertyId, isActive: true },
            select: { id: true, unitCount: true },
        });
        const totalCapacity = subProperties.length > 0
            ? subProperties.reduce((sum, sp) => sum + (sp.unitCount || 1), 0)
            : 1;
        const targetCapacity = parsedSubPropertyId
            ? (subProperties.find(sp => sp.id === parsedSubPropertyId)?.unitCount || 1)
            : totalCapacity;

        // Check each day in the range
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
            const dayStart = new Date(d);
            const dayEnd = new Date(d);
            dayEnd.setDate(dayEnd.getDate() + 1);

            // Count existing bookings
            const bookingCount = await prisma.staycationBooking.count({
                where: {
                    propertyId: parsedPropertyId,
                    ...(parsedSubPropertyId ? { subPropertyId: parsedSubPropertyId } : {}),
                    status: { notIn: ["cancelled", "no_show", "transferred"] },
                    checkInDate: { lt: dayEnd },
                    checkOutDate: { gt: dayStart },
                },
            });

            // Count active holds (excluding expired)
            const holdCount = await prisma.bookingHold.count({
                where: {
                    holdType: "staycation",
                    propertyId: parsedPropertyId,
                    ...(parsedSubPropertyId ? { subPropertyId: parsedSubPropertyId } : {}),
                    checkIn: { lt: dayEnd },
                    checkOut: { gt: dayStart },
                    expiresAt: { gt: new Date() },
                },
            });

            if (bookingCount + holdCount >= targetCapacity) {
                return res.status(409).json({
                    error: "These dates are currently held by another guest. Please try different dates.",
                });
            }
        }

        // Create the hold
        const hold = await prisma.bookingHold.create({
            data: {
                holdType: "staycation",
                sessionId,
                propertyId: parsedPropertyId,
                subPropertyId: parsedSubPropertyId,
                checkIn,
                checkOut,
                expiresAt,
            },
        });

        return res.status(201).json({ sessionId: hold.sessionId, expiresAt: hold.expiresAt });
    } catch (error) {
        console.error("Create booking hold error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/bookings/staycation/hold/:sessionId — Release a hold
router.delete("/hold/:sessionId", async (req, res) => {
    try {
        await prisma.bookingHold.deleteMany({
            where: { sessionId: req.params.sessionId },
        });
        return res.json({ success: true });
    } catch (error) {
        console.error("Release booking hold error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/bookings/staycation/voucher/:ref ─── Public voucher PDF download
router.get("/voucher/:ref", async (req, res) => {
    try {
        const { ref } = req.params;
        const booking = await prisma.staycationBooking.findFirst({
            where: { bookingRef: ref },
            include: { property: { include: { pricing: true } }, subProperty: { include: { pricing: true } }, coupon: true },
        });

        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }

        const plainPhone = decrypt(booking.customerPhone);
        const plainEmail = booking.customerEmail ? decrypt(booking.customerEmail) : null;
        const pdfBuffer = await generateStaycationBookingPDF({
            ...booking,
            customerPhone: plainPhone,
            customerEmail: plainEmail,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Galaxia-${booking.bookingRef}.pdf"`);
        return res.send(pdfBuffer);
    } catch (error) {
        console.error("Voucher PDF error:", error);
        return res.status(500).json({ error: "Failed to generate voucher" });
    }
});

// ─── POST /api/bookings/staycation/:id/refund-deposit ─── Record security deposit refund
router.post("/:id/refund-deposit", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const { method } = req.body; // "cash" or "upi"

        const booking = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (booking.depositRefunded) {
            return res.status(400).json({ error: "Security deposit has already been refunded" });
        }

        const depositAmt = booking.securityDeposit || 0;
        if (depositAmt <= 0) return res.status(400).json({ error: "No security deposit to refund" });

        // Find the employee for this property
        const employee = await prisma.employee.findFirst({
            where: { propertyId: booking.propertyId, isActive: true },
        });

        if (method === "upi" && employee) {
            // Create negative UPI payment record for refund
            await prisma.upiPayment.create({
                data: {
                    employeeId: employee.id,
                    bookingRef: booking.bookingRef || `ST-${bookingId}`,
                    guestName: booking.customerName || null,
                    amount: -depositAmt,
                    paymentType: "deposit_refund",
                    proofImageUrl: req.body.proofImageUrl || null,
                    proofImageKey: req.body.proofImageKey || null,
                    note: `Security deposit refund — ${booking.property?.name || "Staycation"}`,
                },
            });
        } else if (method === "cash" && employee) {
            // Deduct from employee cash collected
            await prisma.employee.update({
                where: { id: employee.id },
                data: { 
                    cashCollected: { decrement: depositAmt },
                    depositCollected: { decrement: depositAmt }
                },
            });
            await prisma.cashTransaction.create({
                data: {
                    employeeId: employee.id,
                    amount: depositAmt,
                    transactionType: "refund",
                    note: `Security deposit refund — ${booking.property?.name || "Staycation"} (${booking.bookingRef})`,
                },
            });
        }

        // Mark booking deposit as refunded
        await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: { depositRefunded: true, depositRefundMethod: method },
        });

        return res.json({ success: true, method, amount: depositAmt });
    } catch (error) {
        console.error("Refund deposit error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/bookings/staycation/:id — Permanently delete booking + cascade
router.delete("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const booking = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const bookingRef = booking.bookingRef;

        // 1. Reverse cash tracking: find all cash transactions for this booking
        const cashTxns = await prisma.cashTransaction.findMany({ where: { bookingRef } });
        for (const tx of cashTxns) {
            const note = (tx.note || "").toLowerCase();
            const isDeposit = note.includes("security deposit") || note.includes("deposit refund") || tx.transactionType === "refund" || note.includes("(security deposit)");

            if (tx.transactionType === "collection" || tx.transactionType === "food_collection") {
                await prisma.employee.update({
                    where: { id: tx.employeeId },
                    data: { 
                        cashCollected: { decrement: tx.amount },
                        [isDeposit ? 'depositCollected' : 'rentCollected']: { decrement: tx.amount }
                    },
                });
            } else if (tx.transactionType === "refund") {
                // Undo refund decrement (re-add)
                await prisma.employee.update({
                    where: { id: tx.employeeId },
                    data: { 
                        cashCollected: { increment: Math.abs(tx.amount) },
                        depositCollected: { increment: Math.abs(tx.amount) }
                    },
                });
            }
        }
        await prisma.cashTransaction.deleteMany({ where: { bookingRef } });

        // 2. Delete UPI payment logs
        await prisma.upiPayment.deleteMany({ where: { bookingRef } });
        await prisma.upiPayment.deleteMany({ where: { bookingRef: `ST-${bookingId}` } });
        await prisma.cashTransaction.deleteMany({ where: { bookingRef: `ST-${bookingId}` } });

        // 3. Delete booking payments
        await prisma.bookingPayment.deleteMany({ where: { staycationBookingId: bookingId } });

        // 4. Delete extra guests
        await prisma.extraGuest.deleteMany({ where: { bookingId } });

        // 5. Delete guest IDs
        await prisma.guestId.deleteMany({ where: { bookingId } });

        // 6. Delete coupon usage
        await prisma.couponUsage.deleteMany({ where: { bookingRef } });

        // 7. Delete food bills
        await prisma.staycationFoodBill.deleteMany({ where: { bookingId } });

        // 8. Delete the booking itself
        await prisma.staycationBooking.delete({ where: { id: bookingId } });

        auditLog({ adminId: req.admin!.id, action: "booking_created", entityType: "staycation_booking", entityId: bookingId, details: { action: "deleted", bookingRef } });

        return res.json({ success: true, deletedRef: bookingRef });
    } catch (error) {
        console.error("Delete staycation booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── POST /api/bookings/staycation/:id/transfer ─── Transfer booking to new dates with ₹1000 fee
router.post("/:id/transfer", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.id as string);
        const { newCheckIn, newCheckOut, newPropertyId, newSubPropertyId } = req.body;
        const TRANSFER_FEE = 1000;

        if (!newCheckIn || !newCheckOut) {
            return res.status(400).json({ error: "newCheckIn and newCheckOut are required" });
        }

        const original = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true, subProperty: true },
        });
        if (!original) return res.status(404).json({ error: "Booking not found" });
        if (original.status === "transferred") return res.status(400).json({ error: "Booking already transferred" });

        // Generate unique transfer booking ref
        const crypto = require("crypto");
        const today = new Date();
        const datePrefix = `ST-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
        const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const newRef = `${datePrefix}-T${randomSuffix}`;

        // Calculate nights for new dates
        const ciDate = new Date(newCheckIn + "T00:00:00");
        const coDate = new Date(newCheckOut + "T00:00:00");
        const newNights = Math.max(1, Math.round((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Build transfer metadata in addons JSON
        const origCheckIn = original.checkInDate.toISOString().slice(0, 10);
        const origCheckOut = original.checkOutDate.toISOString().slice(0, 10);
        const origAddons = (original.addons && typeof original.addons === 'object') ? original.addons : [];
        const transferInfo = {
            fromRef: original.bookingRef,
            fromCheckIn: origCheckIn,
            fromCheckOut: origCheckOut,
            fromProperty: original.property?.name || '',
            fee: TRANSFER_FEE,
            transferDate: new Date().toISOString(),
        };

        // Determine target property/sub-property
        const targetPropertyId = newPropertyId ? parseInt(newPropertyId) : original.propertyId;
        const targetSubPropertyId = newSubPropertyId !== undefined
            ? (newSubPropertyId ? parseInt(newSubPropertyId) : null)
            : original.subPropertyId;

        const { newBooking } = await prisma.$transaction(async (tx) => {
            // Create new booking with same details + ₹1000 transfer fee
            const created = await tx.staycationBooking.create({
                data: {
                    bookingRef: newRef,
                    propertyId: targetPropertyId,
                    subPropertyId: targetSubPropertyId,
                    customerName: original.customerName,
                    customerPhone: original.customerPhone,
                    customerEmail: original.customerEmail,
                    userId: original.userId,
                    numGuests: original.numGuests,
                    numKids: original.numKids,
                    numPets: original.numPets,
                    numCottages: original.numCottages,
                    checkInDate: ciDate,
                    checkOutDate: coDate,
                    numNights: newNights,
                    nightlyRate: original.nightlyRate,
                    basePrice: original.basePrice,
                    extraPersonCharge: original.extraPersonCharge,
                    extraAdultCharge: original.extraAdultCharge,
                    extraKidsCharge: original.extraKidsCharge,
                    gstAmount: original.gstAmount,
                    totalAmount: original.totalAmount + TRANSFER_FEE,
                    advanceAmount: original.advanceAmount,
                    balanceAmount: original.balanceAmount + TRANSFER_FEE,
                    securityDeposit: original.securityDeposit,
                    advancePaid: original.advancePaid,
                    advanceMethod: original.advanceMethod,
                    advancePaidAt: original.advancePaidAt,
                    status: "confirmed",
                    source: original.source || "website",
                    isAdminBooking: true,
                    couponId: original.couponId,
                    discountAmount: original.discountAmount,
                    createdBy: req.admin!.id,
                    addons: Array.isArray(origAddons)
                        ? [...(origAddons as any[]), { transferInfo }]
                        : [origAddons, { transferInfo }],
                },
            });

            // Mark original as transferred
            await tx.staycationBooking.update({
                where: { id: bookingId },
                data: {
                    status: "transferred",
                    addons: Array.isArray(origAddons)
                        ? [...(origAddons as any[]), { transferredTo: newRef }]
                        : [origAddons, { transferredTo: newRef }],
                },
            });

            return { newBooking: created };
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin!.id,
                action: "transfer_booking",
                entityType: "staycation_booking",
                entityId: bookingId,
                details: {
                    originalRef: original.bookingRef,
                    newRef,
                    newCheckIn,
                    newCheckOut,
                    transferFee: TRANSFER_FEE,
                    newPropertyId: targetPropertyId,
                    newSubPropertyId: targetSubPropertyId,
                },
                isDeveloper: req.admin!.role === "developer",
            },
        });

        // Fetch newBooking with populated properties
        const populatedNewBooking = await prisma.staycationBooking.findUnique({
            where: { id: newBooking.id },
            include: { property: true, subProperty: true }
        });

        if (populatedNewBooking) {
            const plainPhone = populatedNewBooking.customerPhone ? decrypt(populatedNewBooking.customerPhone) : null;
            const plainEmail = populatedNewBooking.customerEmail ? decrypt(populatedNewBooking.customerEmail) : null;
            
            // Send confirmation email (fire-and-forget)
            sendBookingConfirmation({ ...populatedNewBooking, customerPhone: plainPhone, customerEmail: plainEmail }).catch(() => {});
            
            // Generate and send PDF (fire-and-forget)
            const prop = populatedNewBooking.property || {};
            const sub = populatedNewBooking.subProperty;
            const ownerPropertyName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Galaxia Property");
            generateStaycationBookingPDF({ ...populatedNewBooking, customerPhone: plainPhone, customerEmail: plainEmail })
                .then((pdfBuffer) =>
                    sendOwnerBookingNotification({
                        bookingRef: populatedNewBooking.bookingRef,
                        customerName: populatedNewBooking.customerName,
                        module: "staycation",
                        propertyName: ownerPropertyName,
                        pdfBuffer,
                    })
                )
                .catch((err) => console.error("[Owner Notify] Transfer PDF/email failed:", err));
        }

        return res.json({ original: { id: bookingId, status: "transferred" }, newBooking });
    } catch (error) {
        console.error("Transfer staycation booking error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
