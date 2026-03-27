import { Router } from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import { auditLog } from "../lib/logger";
import { sendBookingConfirmation } from "../lib/emailService";

const router = Router();

// Generate booking ref: ST-YYYYMMDD-NNN
async function generateStayRef(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.staycationBooking.count({
        where: {
            bookedAt: {
                gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            },
        },
    });
    return `ST-${dateStr}-${String(count + 1).padStart(3, "0")}`;
}

// POST /api/bookings/staycation — Create booking (transaction-locked, capacity-aware)
router.post("/", async (req, res) => {
    try {
        const {
            customerName, customerPhone, customerEmail,
            propertyId, subPropertyId, numGuests,
            checkInDate, checkOutDate,
            nightlyRate, basePrice, extraPersonCharge,
            gstAmount, totalAmount,
            advanceAmount, balanceAmount, securityDeposit,
            advancePaid, advanceMethod,
            source, couponCode, addons,
        } = req.body;

        if (!customerName || !customerPhone || !propertyId || !checkInDate || !checkOutDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
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
                    status: { notIn: ["cancelled", "no_show"] },
                    checkInDate: { lt: checkOut },
                    checkOutDate: { gt: checkIn },
                },
                select: { id: true, subPropertyId: true, checkInDate: true, checkOutDate: true },
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
                        }).length;

                        // Count blocks for this sub-property on this day
                        const dayBlocksForSub = blockedInRange.filter(bl => {
                            const blDate = bl.blockedDate.toISOString().split('T')[0];
                            return blDate === dateStr && (bl.subPropertyId === assignedSubPropertyId || bl.subPropertyId === null);
                        }).length;

                        if (dayBookingsForSub + dayBlocksForSub >= targetCapacity) {
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
                            }).length;

                            const dayBlocks = blockedInRange.filter(bl => {
                                const blDate = bl.blockedDate.toISOString().split('T')[0];
                                return blDate === dateStr && (bl.subPropertyId === sp.id || bl.subPropertyId === null);
                            }).length;

                            if (dayBookings + dayBlocks >= spCapacity) {
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
            let discountAmount = 0;
            if (couponCode) {
                const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
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

            const bookingRef = await generateStayRef();

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
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    numNights,
                    nightlyRate: nightlyRate || 0,
                    basePrice: basePrice || 0,
                    extraPersonCharge: extraPersonCharge || 0,
                    gstAmount: gstAmount || 0,
                    totalAmount: (totalAmount || 0) - discountAmount,
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
                include: { property: true, subProperty: true },
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

            return created;
        }, { isolationLevel: "Serializable" });

        auditLog({ action: "booking_created", entityType: "staycation_booking", entityId: booking.id, details: { source: source || "website" } });

        // Send confirmation email (fire-and-forget)
        sendBookingConfirmation({ ...booking, customerPhone, customerEmail }).catch(() => { });

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
        const { status, propertyId, startDate, endDate } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (propertyId) {
            const parsed = parseInt(propertyId as string);
            if (!isNaN(parsed)) {
                where.propertyId = parsed;
            }
        }
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

        // Role-based filtering
        if (req.admin!.role === "dd_admin") {
            return res.status(403).json({ error: "DD admins cannot view staycation bookings" });
        }

        const bookings = await prisma.staycationBooking.findMany({
            where,
            include: {
                property: true,
                subProperty: true,
                extraGuests: true,
                guestIds: true,
            },
            orderBy: { checkInDate: "desc" },
        });

        // Decrypt sensitive fields for admin view
        const decrypted = bookings.map(b => ({
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
        }));

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
        const { status } = req.body;
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const booking = await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: {
                status,
                ...(status === "checked_in" ? { checkInTime: new Date() } : {}),
                ...(status === "checked_out" ? { checkOutTime: new Date() } : {}),
            },
        });

        // Audit log
        auditLog({ adminId: req.admin!.id, action: "booking_status_update", entityType: "staycation_booking", entityId: booking.id, details: { newStatus: status } });

        return res.json(booking);
    } catch (error) {
        console.error("Update stay booking status error:", error);
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
        if (paymentType === "balance") {
            updateData.balanceCollected = true;
            updateData.balanceMethod = method;
            updateData.balanceCollectedAt = new Date();
        } else if (paymentType === "deposit") {
            updateData.depositCollected = true;
            updateData.depositMethod = method;
            updateData.depositCollectedAt = new Date();
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
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { cashCollected: { increment: amount } },
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
        const { method } = req.body; // "cash", "upi", or "none"
        const bookingId = parseInt(req.params.id as string);
        if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

        const booking = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        // Mark deposit as refunded
        await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: {
                depositRefunded: true,
                depositRefundedAt: new Date(),
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
                    data: { cashCollected: { decrement: depositAmount } },
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
                        data: { cashCollected: { increment: chargeAmount } },
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
                status: { notIn: ["cancelled", "no_show"] },
                checkInDate: { lte: end },
                checkOutDate: { gte: start },
            },
            select: { checkInDate: true, checkOutDate: true, subPropertyId: true },
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
            select: { blockedDate: true, subPropertyId: true },
        });

        // Count bookings + blocks per date
        const dateCounts: Record<string, number> = {};

        // Add bookings
        for (const b of bookings) {
            const bStart = new Date(b.checkInDate);
            const bEnd = new Date(b.checkOutDate);
            for (let d = new Date(bStart); d < bEnd; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split("T")[0];
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
            }
        }

        // Add blocks
        for (const bl of blockedEntries) {
            const dateStr = bl.blockedDate.toISOString().split("T")[0];
            if (bl.subPropertyId === null && !parsedSubPropertyId) {
                // Global block: counts against total capacity
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + totalCapacity;
            } else {
                // Specific sub-property block or global block when viewing a specific sub
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
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

export default router;
