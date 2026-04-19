import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/payments/create-order
// Creates a Razorpay order for the given amount (in INR)
router.post("/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR", receipt, notes } = req.body;

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

export default router;
