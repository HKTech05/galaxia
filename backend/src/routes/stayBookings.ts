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
            source, couponCode,
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
            // ── Capacity-aware conflict check ──────────────────────────
            // 1. Get all sub-properties for this property (determines capacity)
            const subProperties = await tx.subProperty.findMany({
                where: { propertyId: parsedPropertyId, isActive: true },
                select: { id: true },
            });
            const totalCapacity = subProperties.length > 0 ? subProperties.length : 1;
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

            let assignedSubPropertyId: number | null = null;
            if (subPropertyId) {
                const parsed = parseInt(subPropertyId);
                if (!isNaN(parsed)) assignedSubPropertyId = parsed;
            }

            if (isMultiUnit) {
                // ── Multi-unit property (e.g. Amstel Nest with 14 cottages) ──
                // For each date in the requested range, count how many units are booked
                const allSubIds = subProperties.map(sp => sp.id);
                const bookedSubIdsForRange = new Set<number>();

                // Check each day in the range to find consistently-free sub-properties
                for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
                    const dayStart = new Date(d);
                    const dayEnd = new Date(d);
                    dayEnd.setDate(dayEnd.getDate() + 1);

                    // Find bookings that overlap this specific day
                    const dayBookings = overlappingBookings.filter(b => {
                        const bIn = new Date(b.checkInDate);
                        const bOut = new Date(b.checkOutDate);
                        return bIn < dayEnd && bOut > dayStart;
                    });

                    // Check if all sub-properties are booked on this day
                    const bookedSubIdsOnDay = new Set(dayBookings.map(b => b.subPropertyId).filter((id): id is number => id !== null));
                    if (bookedSubIdsOnDay.size >= totalCapacity) {
                        throw new Error("DATE_CONFLICT");
                    }

                    // Track which sub-properties are booked on ANY day in the range
                    bookedSubIdsOnDay.forEach(id => bookedSubIdsForRange.add(id));
                }

                if (assignedSubPropertyId) {
                    // Specific sub-property requested — check if it's free for ALL days
                    const isSubBooked = overlappingBookings.some(
                        b => b.subPropertyId === assignedSubPropertyId
                    );
                    if (isSubBooked) {
                        throw new Error("DATE_CONFLICT");
                    }
                } else {
                    // No specific sub-property requested — auto-assign a free one
                    const freeSubIds = allSubIds.filter(id => !bookedSubIdsForRange.has(id));
                    if (freeSubIds.length === 0) {
                        throw new Error("DATE_CONFLICT");
                    }
                    assignedSubPropertyId = freeSubIds[0]; // Assign first available
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
            if (startDate) where.checkInDate.gte = new Date(startDate as string);
            if (endDate) where.checkInDate.lte = new Date(endDate as string);
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
        }));

        return res.json(decrypted);
    } catch (error) {
        console.error("List stay bookings error:", error);
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

        return res.json(payment);
    } catch (error) {
        console.error("Record payment error:", error);
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

        // Update guest count
        await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: { numGuests: { increment: 1 } },
        });

        return res.status(201).json(extraGuest);
    } catch (error) {
        console.error("Add extra guest error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/bookings/staycation/booked-dates — Public: get booked/fully-booked dates for a property
router.get("/booked-dates", async (req, res) => {
    try {
        const { propertyId, startDate, endDate } = req.query;
        if (!propertyId) return res.status(400).json({ error: "propertyId required" });

        const parsedPropertyId = parseInt(propertyId as string);
        if (isNaN(parsedPropertyId)) {
            console.error("Invalid propertyId received in booked-dates:", propertyId);
            return res.status(400).json({ error: "Invalid propertyId" });
        }

        // Determine property capacity from sub-properties
        const subProperties = await prisma.subProperty.findMany({
            where: { propertyId: parsedPropertyId, isActive: true },
            select: { id: true },
        });
        const totalCapacity = subProperties.length > 0 ? subProperties.length : 1;

        const bookings = await prisma.staycationBooking.findMany({
            where: {
                propertyId: parsedPropertyId,
                status: { notIn: ["cancelled", "no_show"] },
                checkInDate: { lte: new Date(endDate as string || "2099-12-31") },
                checkOutDate: { gte: new Date(startDate as string || "2000-01-01") },
            },
            select: { checkInDate: true, checkOutDate: true, subPropertyId: true },
        });

        // Count bookings per date
        const dateBookingCount: Record<string, Set<number | null>> = {};
        for (const b of bookings) {
            const start = new Date(b.checkInDate);
            const end = new Date(b.checkOutDate);
            for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split("T")[0];
                if (!dateBookingCount[dateStr]) {
                    dateBookingCount[dateStr] = new Set();
                }
                // Use subPropertyId (or null for standalone) as the unique booking unit
                dateBookingCount[dateStr].add(b.subPropertyId);
            }
        }

        // A date is fully booked when booking count >= capacity
        const fullyBookedDates: string[] = [];
        for (const [dateStr, bookedUnits] of Object.entries(dateBookingCount)) {
            if (bookedUnits.size >= totalCapacity) {
                fullyBookedDates.push(dateStr);
            }
        }

        return res.json({ dates: fullyBookedDates, capacity: totalCapacity });
    } catch (error) {
        console.error("Booked dates error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
