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
        const { amount, currency = "INR", receipt, notes, type } = req.body;

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
import { sendTestEmail } from "../lib/emailService";

// POST /api/payments/test-create-order
// Creates a 1 INR test order for Digital Diaries Razorpay account & tracks status
router.post("/test-create-order", async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone } = req.body;

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
            // Use rawBody buffer if present for strict HMAC SHA256 validation
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
            const paymentId = payload?.payment?.entity?.id || entity?.payment_id;

            if (orderId) {
                // Find matching test payment record
                const testRecord = await prisma.testPayment.findFirst({
                    where: { razorpayOrderId: orderId },
                });

                if (testRecord && !testRecord.verified) {
                    // Turn system status to true!
                    await prisma.testPayment.update({
                        where: { id: testRecord.id },
                        data: {
                            verified: true,
                            status: "success",
                            razorpayPaymentId: paymentId || testRecord.razorpayPaymentId,
                        },
                    });

                    console.log(`✅ [Backend Payment Verification] Payment ${testRecord.paymentId} confirmed & set verified = TRUE!`);

                    // Trigger confirmation email
                    if (testRecord.customerEmail) {
                        sendTestEmail(testRecord.customerEmail).catch((err) => {
                            console.error("[Webhook DD] Failed to send test confirmation email:", err);
                        });
                    }
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
            }
        }

        return res.json({ status: "ok" });
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return res.status(500).json({ error: error.message || "Webhook handling failed" });
    }
});

export default router;

