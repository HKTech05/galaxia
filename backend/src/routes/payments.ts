import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../lib/prisma";

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/payments/create-order
// Creates a Razorpay order and optionally saves a pending booking
router.post("/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR", receipt, notes, pendingBooking } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Valid amount is required" });
        }

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects paise
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {},
        };

        const order = await razorpay.orders.create(options);

        // Save pending booking if provided (for webhook fallback)
        if (pendingBooking && pendingBooking.bookingType && pendingBooking.payload) {
            try {
                await prisma.pendingBooking.create({
                    data: {
                        razorpayOrderId: order.id,
                        bookingType: pendingBooking.bookingType,
                        payload: pendingBooking.payload,
                        status: "pending",
                    },
                });
            } catch (pbErr) {
                // Non-critical — booking can still be created by frontend
                console.error("[PendingBooking] Failed to save:", pbErr);
            }
        }

        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment verification fields" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            return res.json({ verified: true, paymentId: razorpay_payment_id });
        } else {
            return res.status(400).json({ verified: false, error: "Invalid payment signature" });
        }
    } catch (error: any) {
        console.error("Razorpay verify error:", error);
        return res.status(500).json({ error: error.message || "Payment verification failed" });
    }
});

// ───── Razorpay Webhook ─────────────────────────────────────────────────
// POST /api/payments/webhook
// Called by Razorpay when a payment event occurs (e.g. payment.captured)
// This is the SAFETY NET: if the frontend fails to create the booking after payment,
// the webhook creates it automatically using the saved pending booking.
router.post("/webhook", async (req, res) => {
    try {
        // 1. Verify webhook signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers["x-razorpay-signature"] as string;
            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(body)
                .digest("hex");

            if (signature !== expectedSignature) {
                console.error("[Webhook] Invalid signature");
                return res.status(400).json({ error: "Invalid webhook signature" });
            }
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        // 2. Only handle payment.captured events
        if (event !== "payment.captured") {
            return res.json({ status: "ignored", event });
        }

        const payment = payload?.payment?.entity;
        if (!payment) {
            return res.json({ status: "ignored", reason: "no payment entity" });
        }

        const orderId = payment.order_id;
        const paymentId = payment.id;
        console.log(`[Webhook] payment.captured — orderId=${orderId}, paymentId=${paymentId}`);

        // 3. Find the pending booking for this order
        const pending = await prisma.pendingBooking.findUnique({
            where: { razorpayOrderId: orderId },
        });

        if (!pending) {
            console.log(`[Webhook] No pending booking found for order ${orderId} — frontend likely already created it`);
            return res.json({ status: "ok", reason: "no_pending_booking" });
        }

        if (pending.status === "completed") {
            console.log(`[Webhook] Pending booking ${pending.id} already completed`);
            return res.json({ status: "ok", reason: "already_completed" });
        }

        // 4. Update pending booking with payment ID
        await prisma.pendingBooking.update({
            where: { id: pending.id },
            data: { razorpayPaymentId: paymentId },
        });

        // 5. Check if booking already exists (idempotency — frontend may have created it)
        const bookingPayload = pending.payload as any;
        if (pending.bookingType === "dd") {
            const existing = await prisma.ddBooking.findFirst({
                where: { paymentDetails: { contains: paymentId } },
            });
            if (existing) {
                await prisma.pendingBooking.update({
                    where: { id: pending.id },
                    data: { status: "completed", completedAt: new Date() },
                });
                console.log(`[Webhook] DD booking already exists (${existing.bookingRef}) for payment ${paymentId}`);
                return res.json({ status: "ok", reason: "already_exists", bookingRef: existing.bookingRef });
            }
        } else if (pending.bookingType === "staycation") {
            const existing = await prisma.staycationBooking.findFirst({
                where: { advanceMethod: { contains: paymentId } },
            });
            if (existing) {
                await prisma.pendingBooking.update({
                    where: { id: pending.id },
                    data: { status: "completed", completedAt: new Date() },
                });
                console.log(`[Webhook] Staycation booking already exists (${existing.bookingRef}) for payment ${paymentId}`);
                return res.json({ status: "ok", reason: "already_exists", bookingRef: existing.bookingRef });
            }
        }

        // 6. Create the booking via internal API call
        // We inject the payment ID into the payload
        console.log(`[Webhook] Creating ${pending.bookingType} booking from pending #${pending.id}`);

        try {
            if (pending.bookingType === "dd") {
                bookingPayload.paymentDetails = `Razorpay: ${paymentId}`;
                const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
                const response = await fetch(`${baseUrl}/api/bookings/dd`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bookingPayload),
                });
                const result: any = await response.json();
                if (response.ok) {
                    await prisma.pendingBooking.update({
                        where: { id: pending.id },
                        data: { status: "completed", completedAt: new Date() },
                    });
                    console.log(`[Webhook] ✅ DD booking created: ${result.bookingRef}`);
                } else {
                    console.error(`[Webhook] ❌ DD booking creation failed:`, result);
                    await prisma.pendingBooking.update({
                        where: { id: pending.id },
                        data: { status: "failed" },
                    });
                }
            } else if (pending.bookingType === "staycation") {
                bookingPayload.advanceMethod = `Razorpay: ${paymentId}`;
                const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
                const response = await fetch(`${baseUrl}/api/bookings/staycation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bookingPayload),
                });
                const result: any = await response.json();
                if (response.ok) {
                    await prisma.pendingBooking.update({
                        where: { id: pending.id },
                        data: { status: "completed", completedAt: new Date() },
                    });
                    console.log(`[Webhook] ✅ Staycation booking created: ${result.bookingRef}`);
                } else {
                    console.error(`[Webhook] ❌ Staycation booking creation failed:`, result);
                    await prisma.pendingBooking.update({
                        where: { id: pending.id },
                        data: { status: "failed" },
                    });
                }
            }
        } catch (createErr) {
            console.error(`[Webhook] Booking creation error:`, createErr);
            await prisma.pendingBooking.update({
                where: { id: pending.id },
                data: { status: "failed" },
            });
        }

        return res.json({ status: "ok" });
    } catch (error: any) {
        console.error("[Webhook] Error:", error);
        // Always return 200 to Razorpay to prevent retries on our errors
        return res.json({ status: "error", message: error.message });
    }
});

export default router;
