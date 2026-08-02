import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

// ── Two Razorpay accounts: Staycation (default) and Digital Diaries ──
const razorpayStay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const razorpayDD = new Razorpay({
    key_id: process.env.DD_RAZORPAY_KEY_ID!,
    key_secret: process.env.DD_RAZORPAY_KEY_SECRET!,
});

// Helper: select correct Razorpay instance + secret based on type
function getRazorpay(type?: string) {
    if (type === "dd") {
        return {
            instance: razorpayDD,
            secret: process.env.DD_RAZORPAY_KEY_SECRET!,
            keyId: process.env.DD_RAZORPAY_KEY_ID!,
        };
    }
    // Default: Staycation
    return {
        instance: razorpayStay,
        secret: process.env.RAZORPAY_KEY_SECRET!,
        keyId: process.env.RAZORPAY_KEY_ID!,
    };
}

// POST /api/payments/create-order
// Creates a Razorpay order for the given amount (in INR)
router.post("/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR", receipt, notes, type, bookingPayload } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Valid amount is required" });
        }

        const { instance, keyId } = getRazorpay(type);

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects paise
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {},
        };

        const order = await instance.orders.create(options);

        // Store booking intent so webhook can create booking if frontend fails
        if ((type === "dd" || type === "stay") && bookingPayload) {
            try {
                await prisma.pendingDdPayment.create({
                    data: {
                        razorpayOrderId: order.id,
                        amount: Math.round(amount * 100),
                        bookingPayload,
                        customerName: bookingPayload.customerName || "",
                        customerPhone: bookingPayload.customerPhone || "",
                        customerEmail: bookingPayload.customerEmail || null,
                        status: "pending",
                        module: type, // "dd" or "stay"
                    },
                });
                console.log(`[Pending${type.toUpperCase()}] Saved booking intent for order ${order.id}`);
            } catch (pendingErr) {
                // Non-fatal: if saving intent fails, the normal flow still works
                console.error(`[Pending${type.toUpperCase()}] Failed to save booking intent (non-fatal):`, pendingErr);
            }
        }

        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId, // Return the correct key_id for frontend to use
        });
    } catch (error: any) {
        console.error("Razorpay create order error:", error);
        return res.status(500).json({ error: error.message || "Failed to create payment order" });
    }
});

// POST /api/payments/verify
// Verifies the Razorpay payment signature
router.post("/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment verification fields" });
        }

        const { secret } = getRazorpay(type);

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Track payment ID on pending payment for later correlation
            if (type === "dd" || type === "stay") {
                prisma.pendingDdPayment.updateMany({
                    where: { razorpayOrderId: razorpay_order_id, status: "pending" },
                    data: { razorpayPaymentId: razorpay_payment_id },
                }).catch(e => console.error(`[Pending${(type || '').toUpperCase()}] Failed to update payment ID (non-fatal):`, e));
            }
            return res.json({ verified: true, paymentId: razorpay_payment_id });
        } else {
            return res.status(400).json({ verified: false, error: "Invalid payment signature" });
        }
    } catch (error: any) {
        console.error("Razorpay verify error:", error);
        return res.status(500).json({ error: error.message || "Payment verification failed" });
    }
});

// ── NEW: TEST PAYMENT SYSTEM (SEPARATE & ISOLATED) ───────────────────
import prisma from "../lib/prisma";
import { sendTestEmail, sendBookingConfirmation as sendStayEmail, sendDDBookingConfirmation as sendDDEmail, sendOwnerBookingNotification } from "../lib/emailService";
import { encrypt } from "../lib/encryption";
import { generateDDBookingPDF, generateStaycationBookingPDF } from "../lib/pdfService";
import { sendDDBookingConfirmation as sendDDWhatsApp } from "../lib/whatsappService";
import { checkAvailability, generateStayRef } from "./stayBookings";

async function generateStayRefTest(): Promise<string> {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
    const prefix = `GLX-${dateStr}-`;
    const count = await prisma.staycationBooking.count({
        where: { bookingRef: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

async function generateDdRefTest(): Promise<string> {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
    const prefix = `DD-${dateStr}-`;
    const count = await prisma.ddBooking.count({
        where: { bookingRef: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

async function processTestBookingCreation(testRecord: any, razorpayPaymentId: string): Promise<string> {
    if (testRecord.createdBookingRef) return testRecord.createdBookingRef;

    const details = testRecord.bookingDetails || {};
    const moduleType = details.moduleType || "staycation";

    // Find or create User record to associate with customer account page
    let user: any = null;
    try {
        if (testRecord.customerEmail) {
            user = await prisma.user.findFirst({ where: { email: testRecord.customerEmail } });
        }
        if (!user && testRecord.customerPhone) {
            user = await prisma.user.findFirst({ where: { phone: testRecord.customerPhone } });
        }
        if (!user && (testRecord.customerEmail || testRecord.customerPhone)) {
            user = await prisma.user.create({
                data: {
                    fullName: testRecord.customerName || "Guest",
                    phone: testRecord.customerPhone || "",
                    email: testRecord.customerEmail || null,
                },
            });
        }
    } catch (userErr) {
        console.error("Test booking user lookup/creation error:", userErr);
    }

    if (moduleType === "staycation") {
        const bookingRef = await generateStayRefTest();
        const ciDate = details.checkInDate ? new Date(details.checkInDate + 'T00:00:00') : new Date();
        const coDate = details.checkOutDate ? new Date(details.checkOutDate + 'T00:00:00') : new Date(Date.now() + 86400000);
        const numNights = Math.max(1, Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 3600 * 24)));
        const nightlyRate = details.price ? parseInt(details.price) : 5000;
        const totalAmount = nightlyRate * numNights;

        const created = await prisma.staycationBooking.create({
            data: {
                bookingRef,
                userId: user?.id || null,
                propertyId: parseInt(details.propertyId || "1"),
                subPropertyId: details.subPropertyId ? parseInt(details.subPropertyId) : null,
                customerName: testRecord.customerName,
                customerPhone: testRecord.customerPhone,
                customerEmail: testRecord.customerEmail,
                numGuests: parseInt(details.numGuests || "2"),
                numNights,
                checkInDate: ciDate,
                checkOutDate: coDate,
                nightlyRate,
                basePrice: totalAmount,
                totalAmount,
                advanceAmount: 1, // 1 INR paid via test
                balanceAmount: Math.max(0, totalAmount - 1),
                advancePaid: true,
                advanceMethod: `Razorpay (Test): ${razorpayPaymentId}`,
                status: "confirmed",
                source: "website_testpayment",
            },
            include: { property: true, subProperty: true },
        });

        sendStayEmail(created).catch((e) => console.error("Test stay email error:", e));
        return bookingRef;
    } else {
        const bookingRef = await generateDdRefTest();
        const bDate = details.bookingDate ? new Date(details.bookingDate + 'T12:00:00') : new Date();
        const price = details.price ? parseInt(details.price) : 2500;

        const created = await prisma.ddBooking.create({
            data: {
                bookingRef,
                userId: user?.id || null,
                screenId: parseInt(details.screenId || "1"),
                packageId: parseInt(details.packageId || "1"),
                bookingDate: bDate,
                startHour: parseInt(details.startHour || "14"),
                durationHours: parseInt(details.durationHours || "2"),
                customerName: testRecord.customerName,
                customerPhone: encrypt(testRecord.customerPhone),
                customerEmail: testRecord.customerEmail ? encrypt(testRecord.customerEmail) : null,
                numGuests: parseInt(details.numGuests || "2"),
                basePrice: price,
                totalAmount: price,
                amountPaid: 1, // 1 INR paid via test
                amountToCollect: Math.max(0, price - 1),
                paymentMethod: "online",
                paymentDetails: `Razorpay (Test): ${razorpayPaymentId}`,
                paymentStatus: "partial",
                status: "confirmed",
                source: "website_testpayment",
            },
            include: { screen: true, package: true, addons: true },
        });


        sendDDEmail({ ...created, customerPhone: testRecord.customerPhone, customerEmail: testRecord.customerEmail }).catch((e) => console.error("Test DD email error:", e));
        return bookingRef;
    }
}

// GET /api/payments/test-options
// Provides active properties & screens for testpayment dropdowns

// ── REAL DD BOOKING CREATION FROM WEBHOOK (safety-net) ──
async function generateDdRefWebhook(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `DD-${dateStr}-`;
    const todayRefs = await prisma.ddBooking.findMany({
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

async function processPendingDdBooking(pendingRecord: any, razorpayPaymentId: string): Promise<string> {
    const p = pendingRecord.bookingPayload || {};

    // Find or create User record
    let user: any = null;
    try {
        if (p.customerEmail) {
            user = await prisma.user.findFirst({ where: { email: p.customerEmail } });
        }
        if (!user && p.customerPhone) {
            user = await prisma.user.findFirst({ where: { phone: p.customerPhone } });
        }
        if (!user && (p.customerEmail || p.customerPhone)) {
            user = await prisma.user.create({
                data: {
                    fullName: p.customerName || "Guest",
                    phone: p.customerPhone || "",
                    email: p.customerEmail || null,
                },
            });
        } else if (user && (!user.phone || user.phone === "") && p.customerPhone) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { phone: p.customerPhone, fullName: user.fullName === "Guest" ? (p.customerName || user.fullName) : user.fullName },
            });
        }
    } catch (userErr) {
        console.error("[Webhook DD] User lookup/creation error (non-fatal):", userErr);
    }

    const encryptedPhone = encrypt(p.customerPhone || "");
    const encryptedEmail = p.customerEmail ? encrypt(p.customerEmail) : null;

    // Use serializable transaction for slot-conflict safety
    const booking = await prisma.$transaction(async (tx: any) => {
        // Check screen is active
        const screen = await tx.subProperty.findUnique({
            where: { id: parseInt(p.screenId) },
            include: { property: true },
        });
        if (!screen || !screen.isActive || (screen.property && !screen.property.isActive)) {
            throw new Error("PROPERTY_INACTIVE");
        }

        // Slot conflict check
        const existingBookings = await tx.ddBooking.findMany({
            where: {
                screenId: parseInt(p.screenId),
                bookingDate: new Date(p.bookingDate + 'T12:00:00'),
                status: { notIn: ["cancelled", "no_show", "transferred"] },
            },
        });

        const newStart = parseInt(p.startHour);
        const newEnd = newStart + parseInt(p.durationHours || 1);

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
        if (p.couponCode) {
            const coupon = await tx.coupon.findFirst({ where: { code: p.couponCode, isActive: true, expiryDate: { gte: new Date() } }, orderBy: { createdAt: "desc" } });
            if (coupon && coupon.isActive && coupon.currentUses < coupon.maxUses && new Date(coupon.expiryDate) >= new Date()) {
                couponId = coupon.id;
                if (coupon.discountType === "percentage") {
                    discountAmount = Math.round(((p.totalAmount || 0) * Number(coupon.discountValue)) / 100);
                } else {
                    discountAmount = Number(coupon.discountValue);
                }
                await tx.coupon.update({
                    where: { id: coupon.id },
                    data: { currentUses: { increment: 1 } },
                });
            }
        }

        const bookingRef = await generateDdRefWebhook();

        const created = await tx.ddBooking.create({
            data: {
                bookingRef,
                userId: user?.id || null,
                screenId: parseInt(p.screenId),
                packageId: parseInt(p.packageId || "1"),
                bookingDate: new Date(p.bookingDate + 'T12:00:00'),
                startHour: newStart,
                durationHours: parseInt(p.durationHours || "1"),
                customerName: p.customerName || "Guest",
                customerPhone: encryptedPhone,
                customerEmail: encryptedEmail,
                occasion: p.occasion || null,
                cakeMessage: p.cakeMessage || null,
                specialRequests: p.specialRequests || null,
                numGuests: p.numGuests || 2,
                basePrice: p.basePrice || 0,
                extraPersonCharge: p.extraPersonCharge || 0,
                gstAmount: p.gstAmount || 0,
                totalAmount: (p.totalAmount || 0) - discountAmount,
                amountPaid: p.amountPaid || 0,
                amountToCollect: p.amountToCollect !== undefined
                    ? p.amountToCollect
                    : Math.max(0, ((p.totalAmount || 0) - discountAmount) - (p.amountPaid || 0)),
                paymentMethod: p.paymentMethod || "online",
                paymentDetails: `Razorpay: ${razorpayPaymentId}`,
                paymentStatus: "partial",
                status: "confirmed",
                source: p.source || "website",
                couponId,
                discountAmount,
            },
            include: { screen: true, package: true, addons: true },
        });

        // Create add-ons
        if (p.addons && Array.isArray(p.addons)) {
            for (const addon of p.addons) {
                await tx.ddBookingAddon.create({
                    data: {
                        bookingId: created.id,
                        addonType: addon.type,
                        addonValue: addon.value || null,
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
                    customerName: p.customerName || "Guest",
                    discountSaved: discountAmount,
                },
            });
        }

        return created;
    }, { isolationLevel: "Serializable" });

    // Fire-and-forget notifications (same as ddBookings.ts)
    const bookingWithAddons = await prisma.ddBooking.findUnique({
        where: { id: booking.id },
        include: { screen: true, package: true, addons: true },
    });

    // Email
    sendDDEmail({ ...(bookingWithAddons || booking), customerPhone: p.customerPhone, customerEmail: p.customerEmail }).catch(() => {});

    // WhatsApp
    if (p.customerPhone) {
        const baseUrl = process.env.FRONTEND_URL || "https://galaxiaresorts.com";
        const voucherUrl = `${baseUrl}/api/bookings/dd/voucher/${booking.bookingRef}`;
        sendDDWhatsApp(p.customerPhone, booking.bookingRef, voucherUrl).catch(() => {});
    }

    // Owner PDF notification
    const screenName = (booking.screen?.name || "Digital Diaries Screen").replace(/\s*\([^)]*\)/g, "").trim();
    generateDDBookingPDF({ ...(bookingWithAddons || booking), customerPhone: p.customerPhone, customerEmail: p.customerEmail })
        .then((pdfBuffer: Buffer) =>
            sendOwnerBookingNotification({
                bookingRef: booking.bookingRef,
                customerName: booking.customerName,
                module: "digital-diaries",
                propertyName: screenName,
                pdfBuffer,
            })
        )
        .catch((err: any) => console.error("[Webhook DD] Owner PDF/email failed:", err));

    return booking.bookingRef;
}

// ── REAL STAYCATION BOOKING CREATION FROM WEBHOOK (safety-net) ──
async function processPendingStayBooking(pendingRecord: any, razorpayPaymentId: string): Promise<string> {
    const p = pendingRecord.bookingPayload || {};

    // If this is a multi-villa booking, process each item
    if (p.isMulti && Array.isArray(p.items)) {
        return processPendingMultiStayBooking(pendingRecord, razorpayPaymentId);
    }

    const parsedPropertyId = parseInt(p.propertyId);
    if (isNaN(parsedPropertyId)) throw new Error("Invalid property ID in pending payload");

    const ciStr = typeof p.checkInDate === 'string' && !p.checkInDate.includes('T') ? p.checkInDate + 'T00:00:00' : p.checkInDate;
    const coStr = typeof p.checkOutDate === 'string' && !p.checkOutDate.includes('T') ? p.checkOutDate + 'T00:00:00' : p.checkOutDate;
    const checkIn = new Date(ciStr);
    const checkOut = new Date(coStr);
    const numNights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

    // Find or create User record
    let user: any = null;
    try {
        if (p.customerEmail) {
            user = await prisma.user.findFirst({ where: { email: p.customerEmail } });
        }
        if (!user && p.customerPhone) {
            user = await prisma.user.findFirst({ where: { phone: p.customerPhone } });
        }
        if (!user && (p.customerEmail || p.customerPhone)) {
            user = await prisma.user.create({
                data: {
                    fullName: p.customerName || "Guest",
                    phone: p.customerPhone || "",
                    email: p.customerEmail || null,
                },
            });
        } else if (user && (!user.phone || user.phone === "") && p.customerPhone) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { phone: p.customerPhone, fullName: user.fullName === "Guest" ? (p.customerName || user.fullName) : user.fullName },
            });
        }
    } catch (userErr) {
        console.error("[Webhook Stay] User lookup/creation error (non-fatal):", userErr);
    }

    const encryptedPhone = encrypt(p.customerPhone || "");
    const encryptedEmail = p.customerEmail ? encrypt(p.customerEmail) : null;

    // Handle coupon
    let couponId: number | null = null;
    let discountAmount = parseInt(p.discountAmount) || 0;

    const booking = await prisma.$transaction(async (tx: any) => {
        const property = await tx.property.findUnique({ where: { id: parsedPropertyId } });
        if (!property || !property.isActive) {
            throw new Error("PROPERTY_INACTIVE");
        }

        const assignedSubPropertyId = await checkAvailability(
            tx,
            parsedPropertyId,
            p.subPropertyId ? parseInt(p.subPropertyId) : null,
            checkIn,
            checkOut,
            p.numCottages || 1
        );

        // Coupon handling
        if (p.couponCode) {
            const coupon = await tx.coupon.findFirst({ where: { code: p.couponCode, isActive: true, expiryDate: { gte: new Date() } }, orderBy: { createdAt: "desc" } });
            if (coupon && coupon.isActive && coupon.currentUses < coupon.maxUses && new Date(coupon.expiryDate) >= new Date()) {
                couponId = coupon.id;
                if (coupon.discountType === "percentage") {
                    const petCharges = (p.numPets || 0) * 600;
                    let addonsTotal = 0;
                    if (p.addons) {
                        const addonsArr = Array.isArray(p.addons) ? p.addons : [p.addons];
                        for (const addon of addonsArr) {
                            if (addon && addon.price) addonsTotal += Number(addon.price) || 0;
                        }
                    }
                    const subtotal = (p.basePrice || 0) + (p.extraPersonCharge || 0) + (p.extraAdultCharge || 0) + (p.extraKidsCharge || 0) + petCharges + addonsTotal;
                    const preDiscountTotal = subtotal + (p.gstAmount || 0);
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

        const bookingRef = await generateStayRef(tx);

        const created = await tx.staycationBooking.create({
            data: {
                bookingRef,
                userId: user?.id || null,
                propertyId: parsedPropertyId,
                subPropertyId: assignedSubPropertyId,
                customerName: p.customerName || "Guest",
                customerPhone: encryptedPhone,
                customerEmail: encryptedEmail,
                numGuests: p.numGuests || 2,
                numKids: p.numKids || 0,
                numPets: p.numPets || 0,
                numCottages: p.numCottages || 1,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                numNights,
                nightlyRate: p.nightlyRate || 0,
                basePrice: p.basePrice || 0,
                extraPersonCharge: p.extraPersonCharge || 0,
                extraAdultCharge: p.extraAdultCharge || 0,
                extraKidsCharge: p.extraKidsCharge || 0,
                gstAmount: p.gstAmount || 0,
                totalAmount: p.totalAmount || 0,
                advanceAmount: p.advanceAmount || 0,
                balanceAmount: p.balanceAmount || 0,
                securityDeposit: p.securityDeposit || 3000,
                advancePaid: true,
                advanceMethod: `Razorpay: ${razorpayPaymentId}`,
                advancePaidAt: new Date(),
                source: p.source || "website",
                couponId,
                discountAmount,
                addons: p.addons || null,
            },
            include: { property: { include: { pricing: true } }, subProperty: { include: { pricing: true } }, coupon: true },
        });

        if (couponId) {
            await tx.couponUsage.create({
                data: {
                    couponId,
                    bookingRef,
                    customerName: p.customerName || "Guest",
                    discountSaved: discountAmount,
                },
            });
        }

        return created;
    }, { isolationLevel: "Serializable" });

    // Fire-and-forget notifications
    sendStayEmail({ ...booking, customerPhone: p.customerPhone, customerEmail: p.customerEmail }).catch(() => {});

    const prop = booking.property || {} as any;
    const sub = booking.subProperty;
    const ownerPropertyName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Galaxia Property");
    generateStaycationBookingPDF({ ...booking, customerPhone: p.customerPhone, customerEmail: p.customerEmail })
        .then((pdfBuffer: Buffer) =>
            sendOwnerBookingNotification({
                bookingRef: booking.bookingRef,
                customerName: booking.customerName,
                module: "staycation",
                propertyName: ownerPropertyName,
                pdfBuffer,
            })
        )
        .catch((err: any) => console.error("[Webhook Stay] Owner PDF/email failed:", err));

    return booking.bookingRef;
}

async function processPendingMultiStayBooking(pendingRecord: any, razorpayPaymentId: string): Promise<string> {
    const p = pendingRecord.bookingPayload || {};
    const items = p.items || [];
    const bookingRefs: string[] = [];

    // For multi-villa, we create each booking individually
    // The items array contains villa metadata; full payloads are constructed from shared data
    for (const item of items) {
        try {
            // Build a single-booking payload from the multi data
            const singlePayload: any = {
                ...pendingRecord,
                bookingPayload: {
                    customerName: p.customerName,
                    customerPhone: p.customerPhone,
                    customerEmail: p.customerEmail,
                    checkInDate: p.checkInDate,
                    checkOutDate: p.checkOutDate,
                    propertyId: item.propertyId || p.propertyId,
                    subPropertyId: item.subPropertyId || null,
                    numGuests: item.numGuests || p.numGuests || 2,
                    numKids: item.numKids || p.numKids || 0,
                    numPets: item.numPets || 0,
                    numCottages: item.unitCount || 1,
                    nightlyRate: item.nightlyRate || 0,
                    basePrice: item.basePrice || 0,
                    extraPersonCharge: item.extraPersonCharge || 0,
                    extraAdultCharge: item.extraAdultCharge || 0,
                    extraKidsCharge: item.extraKidsCharge || 0,
                    gstAmount: item.gstAmount || 0,
                    totalAmount: item.totalAmount || 0,
                    advanceAmount: item.advanceAmount || 0,
                    balanceAmount: item.balanceAmount || 0,
                    securityDeposit: item.securityDeposit || 3000,
                    source: "website",
                    addons: item.addons || null,
                },
            };
            const ref = await processPendingStayBooking(singlePayload, razorpayPaymentId);
            bookingRefs.push(ref);
        } catch (itemErr: any) {
            if (itemErr?.message === "DATE_CONFLICT") {
                console.log(`[Webhook Stay Multi] Date conflict for item ${item.villaId || 'unknown'} — likely already booked`);
            } else {
                console.error(`[Webhook Stay Multi] Error creating booking for item:`, itemErr);
            }
        }
    }

    return bookingRefs.join(", ") || "multi-webhook-no-bookings";
}

router.get("/test-options", async (_req, res) => {
    try {
        const properties = await prisma.property.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true, maxPersons: true },
            orderBy: { displayOrder: "asc" },
        });
        const screens = await prisma.ddScreen.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true },
            orderBy: { displayOrder: "asc" },
        });
        return res.json({ properties, screens });
    } catch (e: any) {
        return res.status(500).json({ error: e.message || "Failed to fetch options" });
    }
});

// POST /api/payments/test-create-order
// Creates a 1 INR test order for Digital Diaries Razorpay account & tracks status
router.post("/test-create-order", async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, bookingDetails } = req.body;

        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({ error: "Name, email, and phone are required for test payment" });
        }

        const { instance, keyId } = getRazorpay("dd");
        const amountPaise = 100; // 1 INR = 100 paise

        const paymentId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const receipt = `rcpt_${paymentId}`;

        const order = await instance.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt,
            notes: {
                paymentType: "test_payment",
                paymentId,
                customerName,
                customerEmail,
                customerPhone,
                moduleType: bookingDetails?.moduleType || "staycation",
            },
        });

        // Store payment attempt in database with verified = false
        await prisma.testPayment.create({
            data: {
                paymentId,
                razorpayOrderId: order.id,
                amount: amountPaise,
                customerName,
                customerEmail,
                customerPhone,
                bookingDetails: bookingDetails || null,
                status: "pending",
                verified: false,
            },
        });

        return res.json({
            orderId: order.id,
            paymentId,
            amount: amountPaise,
            currency: "INR",
            keyId,
        });
    } catch (error: any) {
        console.error("Test payment order error:", error);
        return res.status(500).json({ error: error.message || "Failed to create test payment order" });
    }
});

// GET /api/payments/test-status/:paymentId
// Polls backend status to check if backend verified payment (turns true)
router.get("/test-status/:paymentId", async (req, res) => {
    try {
        const { paymentId } = req.params;
        const record = await prisma.testPayment.findUnique({
            where: { paymentId },
        });

        if (!record) {
            return res.status(404).json({ error: "Test payment record not found" });
        }

        return res.json({
            paymentId: record.paymentId,
            verified: record.verified,
            status: record.status,
            customerName: record.customerName,
            customerEmail: record.customerEmail,
            razorpayPaymentId: record.razorpayPaymentId,
            createdBookingRef: record.createdBookingRef,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        });
    } catch (error: any) {
        console.error("Test status check error:", error);
        return res.status(500).json({ error: error.message || "Failed to check status" });
    }
});

// POST /api/payments/webhook/dd
// Razorpay Webhook listener for Digital Diaries account
router.post("/webhook/dd", async (req: any, res) => {
    try {
        const webhookSecret = process.env.DD_RAZORPAY_WEBHOOK_SECRET || "galaxia_dd_webhook_secret_TESTING";
        const signature = req.headers["x-razorpay-signature"] as string;

        if (webhookSecret && signature) {
            const bodyPayload = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(bodyPayload)
                .digest("hex");

            if (expectedSignature !== signature) {
                console.warn("[Webhook DD] Signature mismatch! Event rejected.");
                return res.status(400).json({ error: "Invalid webhook signature" });
            }
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        console.log(`[Webhook DD] Received event: ${event}`);

        if (event === "order.paid" || event === "payment.captured") {
            const entity = payload?.payment?.entity || payload?.order?.entity;
            const orderId = entity?.order_id || entity?.id;
            const paymentId = payload?.payment?.entity?.id || entity?.payment_id || "pay_webhook";

            if (orderId) {
                // ── 1. Check test payments (existing test system) ──
                const testRecord = await prisma.testPayment.findFirst({
                    where: { razorpayOrderId: orderId },
                });

                if (testRecord && !testRecord.verified) {
                    // Create real booking in DB
                    let createdBookingRef: string | null = null;
                    try {
                        createdBookingRef = await processTestBookingCreation(testRecord, paymentId);
                    } catch (bookingErr) {
                        console.error("[Webhook DD] Test booking creation error:", bookingErr);
                    }

                    // Turn system status to true!
                    await prisma.testPayment.update({
                        where: { id: testRecord.id },
                        data: {
                            verified: true,
                            status: "success",
                            razorpayPaymentId: paymentId || testRecord.razorpayPaymentId,
                            createdBookingRef: createdBookingRef || testRecord.createdBookingRef,
                        },
                    });

                    console.log(`✅ [Backend Payment Verification] Payment ${testRecord.paymentId} confirmed & set verified = TRUE! Booking Ref: ${createdBookingRef}`);

                    if (testRecord.customerEmail && !createdBookingRef) {
                        sendTestEmail(testRecord.customerEmail).catch((err) => {
                            console.error("[Webhook DD] Failed to send test confirmation email:", err);
                        });
                    }
                }

                // ── 2. Check real DD pending payments (webhook safety-net) ──
                try {
                    // Atomically claim the pending record (prevents race with frontend)
                    const claimed = await prisma.pendingDdPayment.updateMany({
                        where: { razorpayOrderId: orderId, module: "dd", status: { in: ["pending", "failed"] } },
                        data: { status: "webhook_processing" },
                    });

                    if (claimed.count > 0) {
                        const pendingRecord = await prisma.pendingDdPayment.findFirst({
                            where: { razorpayOrderId: orderId, module: "dd", status: "webhook_processing" },
                        });

                        if (pendingRecord) {
                            console.log(`[Webhook DD] Claimed pending DD payment for order ${orderId}, creating booking...`);
                            try {
                                const bookingRef = await processPendingDdBooking(pendingRecord, paymentId);
                                await prisma.pendingDdPayment.update({
                                    where: { id: pendingRecord.id },
                                    data: {
                                        status: "webhook_fulfilled",
                                        razorpayPaymentId: paymentId,
                                        createdBookingRef: bookingRef,
                                    },
                                });
                                console.log(`✅ [Webhook DD] Real DD booking created via webhook! Ref: ${bookingRef}`);
                            } catch (bookingErr: any) {
                                // If it's a slot conflict, the frontend likely already created the booking
                                if (bookingErr?.message === "SLOT_CONFLICT") {
                                    console.log(`[Webhook DD] Slot conflict for order ${orderId} — booking likely already created by frontend.`);
                                    await prisma.pendingDdPayment.update({
                                        where: { id: pendingRecord.id },
                                        data: { status: "fulfilled", razorpayPaymentId: paymentId },
                                    }).catch(() => {});
                                } else {
                                    console.error("[Webhook DD] Real DD booking creation error:", bookingErr);
                                }
                            }
                        }
                    } else {
                        console.log(`[Webhook DD] Order ${orderId} already claimed by frontend, skipping.`);
                    }
                } catch (pendingErr) {
                    console.error("[Webhook DD] Pending payment lookup error (non-fatal):", pendingErr);
                }
            }
        } else if (event === "payment.failed") {
            const entity = payload?.payment?.entity;
            const orderId = entity?.order_id;

            if (orderId) {
                const testRecord = await prisma.testPayment.findFirst({
                    where: { razorpayOrderId: orderId },
                });
                if (testRecord) {
                    await prisma.testPayment.update({
                        where: { id: testRecord.id },
                        data: { status: "failed" },
                    });
                    console.log(`❌ [Backend Payment Verification] Payment ${testRecord.paymentId} marked FAILED via Webhook.`);
                }

                // Also mark pending DD payment as failed
                prisma.pendingDdPayment.updateMany({
                    where: { razorpayOrderId: orderId, status: "pending" },
                    data: { status: "failed" },
                }).catch(e => console.error("[Webhook DD] Failed to mark pending payment as failed:", e));
            }
        }

        return res.json({ status: "ok" });
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return res.status(500).json({ error: error.message || "Webhook handling failed" });
    }
});

// POST /api/payments/webhook/stay
// Razorpay Webhook listener for Staycation account
router.post("/webhook/stay", async (req: any, res) => {
    try {
        const webhookSecret = process.env.STAY_RAZORPAY_WEBHOOK_SECRET || "";
        const signature = req.headers["x-razorpay-signature"] as string;

        if (webhookSecret && signature) {
            const bodyPayload = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(bodyPayload)
                .digest("hex");

            if (expectedSignature !== signature) {
                console.warn("[Webhook Stay] Signature mismatch! Event rejected.");
                return res.status(400).json({ error: "Invalid webhook signature" });
            }
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        console.log(`[Webhook Stay] Received event: ${event}`);

        if (event === "order.paid" || event === "payment.captured") {
            const entity = payload?.payment?.entity || payload?.order?.entity;
            const orderId = entity?.order_id || entity?.id;
            const paymentId = payload?.payment?.entity?.id || entity?.payment_id || "pay_webhook";

            if (orderId) {
                // Check pending staycation payments
                try {
                    // Atomically claim the pending record (prevents race with frontend)
                    const claimed = await prisma.pendingDdPayment.updateMany({
                        where: { razorpayOrderId: orderId, module: "stay", status: { in: ["pending", "failed"] } },
                        data: { status: "webhook_processing" },
                    });

                    if (claimed.count > 0) {
                        const pendingRecord = await prisma.pendingDdPayment.findFirst({
                            where: { razorpayOrderId: orderId, module: "stay", status: "webhook_processing" },
                        });

                        if (pendingRecord) {
                            console.log(`[Webhook Stay] Claimed pending Stay payment for order ${orderId}, creating booking...`);
                            try {
                                const bookingRef = await processPendingStayBooking(pendingRecord, paymentId);
                                await prisma.pendingDdPayment.update({
                                    where: { id: pendingRecord.id },
                                    data: {
                                        status: "webhook_fulfilled",
                                        razorpayPaymentId: paymentId,
                                        createdBookingRef: bookingRef,
                                    },
                                });
                                console.log(`✅ [Webhook Stay] Staycation booking created via webhook! Ref: ${bookingRef}`);
                            } catch (bookingErr: any) {
                                if (bookingErr?.message === "DATE_CONFLICT") {
                                    console.log(`[Webhook Stay] Date conflict for order ${orderId} — booking likely already created by frontend.`);
                                    await prisma.pendingDdPayment.update({
                                        where: { id: pendingRecord.id },
                                        data: { status: "fulfilled", razorpayPaymentId: paymentId },
                                    }).catch(() => {});
                                } else {
                                    console.error("[Webhook Stay] Staycation booking creation error:", bookingErr);
                                }
                            }
                        }
                    } else {
                        console.log(`[Webhook Stay] Order ${orderId} already claimed by frontend, skipping.`);
                    }
                } catch (pendingErr) {
                    console.error("[Webhook Stay] Pending payment lookup error (non-fatal):", pendingErr);
                }
            }
        } else if (event === "payment.failed") {
            const entity = payload?.payment?.entity;
            const orderId = entity?.order_id;

            if (orderId) {
                // Mark pending staycation payment as failed
                prisma.pendingDdPayment.updateMany({
                    where: { razorpayOrderId: orderId, status: "pending", module: "stay" },
                    data: { status: "failed" },
                }).catch(e => console.error("[Webhook Stay] Failed to mark pending payment as failed:", e));
            }
        }

        return res.json({ status: "ok" });
    } catch (error: any) {
        console.error("Webhook Stay processing error:", error);
        return res.status(500).json({ error: error.message || "Webhook handling failed" });
    }
});

export default router;


