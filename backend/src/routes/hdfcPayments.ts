import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { sendTestEmail, sendBookingConfirmation as sendStayEmail, sendDDBookingConfirmation as sendDDEmail, sendOwnerBookingNotification } from "../lib/emailService";
import { encrypt } from "../lib/encryption";
import { generateDDBookingPDF, generateStaycationBookingPDF } from "../lib/pdfService";
import { sendDDBookingConfirmation as sendDDWhatsApp } from "../lib/whatsappService";
import { checkAvailability, generateStayRef } from "./stayBookings";

const router = Router();

// ── HDFC SmartGateway Configuration ──
const HDFC_BASE_URL = process.env.HDFC_BASE_URL || "https://smartgateway.hdfcuat.bank.in";
const HDFC_API_KEY = process.env.HDFC_API_KEY || "";
const HDFC_MERCHANT_ID = process.env.HDFC_MERCHANT_ID || "";
const HDFC_CLIENT_ID = process.env.HDFC_CLIENT_ID || "hdfcmaster"; // "hdfcmaster" for sandbox
const HDFC_RESPONSE_KEY = process.env.HDFC_RESPONSE_KEY || "";
const HDFC_WEBHOOK_USERNAME = process.env.HDFC_WEBHOOK_USERNAME || "";
const HDFC_WEBHOOK_PASSWORD = process.env.HDFC_WEBHOOK_PASSWORD || "";

// Return URL for HDFC to redirect back to after payment
const HDFC_RETURN_URL = process.env.HDFC_RETURN_URL || 
    (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/testpayment/callback` : "https://galaxiaresorts.com/testpayment/callback");

// Build Basic Auth header from API key only (no password/colon)
function getHdfcAuthHeader(): string {
    return `Basic ${Buffer.from(HDFC_API_KEY).toString("base64")}`;
}

// Generate a clean order ID for HDFC (max 20 chars, alphanumeric only, NO special chars)
function generateHdfcOrderId(): string {
    const ts = Date.now().toString(36).toUpperCase(); // base36 timestamp
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GX${ts}${rand}`.substring(0, 20);
}

// ── Reuse the same booking creation logic from payments.ts ──
// (These functions create real bookings in the DB, same as the Razorpay test payment system)

async function generateStayRefHdfc(): Promise<string> {
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

async function generateDdRefHdfc(): Promise<string> {
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

async function processHdfcTestBooking(testRecord: any, hdfcTxnId: string): Promise<string> {
    if (testRecord.createdBookingRef) return testRecord.createdBookingRef;

    const details = testRecord.bookingDetails || {};
    const moduleType = details.moduleType || "staycation";

    // Find or create User record
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
        console.error("[HDFC Test] User lookup/creation error:", userErr);
    }

    if (moduleType === "staycation") {
        const bookingRef = await generateStayRefHdfc();
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
                advanceMethod: `HDFC SmartGateway (Test): ${hdfcTxnId}`,
                status: "confirmed",
                source: "website_testpayment",
            },
            include: { property: true, subProperty: true },
        });

        sendStayEmail(created).catch((e) => console.error("[HDFC Test] Stay email error:", e));
        return bookingRef;
    } else {
        const bookingRef = await generateDdRefHdfc();
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
                paymentDetails: `HDFC SmartGateway (Test): ${hdfcTxnId}`,
                paymentStatus: "partial",
                status: "confirmed",
                source: "website_testpayment",
            },
            include: { screen: true, package: true, addons: true },
        });

        sendDDEmail({ ...created, customerPhone: testRecord.customerPhone, customerEmail: testRecord.customerEmail }).catch((e) => console.error("[HDFC Test] DD email error:", e));
        return bookingRef;
    }
}

// ══════════════════════════════════════════════════════════════════════
// POST /api/payments/hdfc-test/create-order
// Creates a 1 INR test order on HDFC SmartGateway & tracks in test_payments DB
// ══════════════════════════════════════════════════════════════════════
router.post("/hdfc-test/create-order", async (req: Request, res: Response) => {
    try {
        const { customerName, customerEmail, customerPhone, bookingDetails } = req.body;

        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({ error: "Name, email, and phone are required for test payment" });
        }

        const hdfcOrderId = generateHdfcOrderId();
        const paymentId = `hdfc_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Split name for HDFC
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || "Guest";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        // Clean phone number (remove +91 prefix if present)
        const cleanPhone = customerPhone.replace(/^\+91/, "").replace(/\D/g, "").slice(-10);

        console.log(`[HDFC Test] Creating order ${hdfcOrderId} for ${customerName}...`);

        // Call HDFC SmartGateway POST /session
        const sessionRes = await fetch(`${HDFC_BASE_URL}/session`, {
            method: "POST",
            headers: {
                "Authorization": getHdfcAuthHeader(),
                "Content-Type": "application/json",
                "x-merchantid": HDFC_MERCHANT_ID,
                "x-customerid": paymentId,
                "x-resellerid": "hdfc_reseller",
            },
            body: JSON.stringify({
                order_id: hdfcOrderId,
                amount: "1.00", // 1 INR — string with 2 decimal places
                currency: "INR",
                customer_id: paymentId,
                customer_email: customerEmail,
                customer_phone: cleanPhone,
                payment_page_client_id: HDFC_CLIENT_ID,
                action: "paymentPage",
                return_url: HDFC_RETURN_URL,
                description: `Galaxia Test Payment - ${bookingDetails?.moduleType === "dd" ? "Digital Diaries" : "Staycation"}`,
                first_name: firstName.replace(/[^a-zA-Z0-9().\-_\s]/g, ""),
                last_name: lastName.replace(/[^a-zA-Z0-9().\-_\s]/g, ""),
                udf1: paymentId, // Store our internal payment ID for correlation
            }),
        });

        if (!sessionRes.ok) {
            const errText = await sessionRes.text();
            console.error(`[HDFC Test] Session API error (${sessionRes.status}):`, errText);
            throw new Error(`HDFC API error: ${sessionRes.status} - ${errText}`);
        }

        const sessionData: any = await sessionRes.json();
        console.log(`[HDFC Test] Session created:`, JSON.stringify(sessionData, null, 2));

        const paymentUrl = sessionData?.payment_links?.web;
        if (!paymentUrl) {
            throw new Error("HDFC did not return a payment page URL");
        }

        // Store payment attempt in test_payments DB with verified = false
        await prisma.testPayment.create({
            data: {
                paymentId,
                razorpayOrderId: hdfcOrderId, // Reusing this column for HDFC order ID
                amount: 100, // 1 INR = 100 paise (stored as paise for consistency)
                customerName,
                customerEmail,
                customerPhone,
                bookingDetails: bookingDetails || null,
                status: "pending",
                verified: false,
            },
        });

        return res.json({
            paymentId,
            hdfcOrderId,
            paymentUrl,
            amount: "1.00",
            currency: "INR",
            sdkPayload: sessionData?.sdk_payload || null, // In case we want SDK integration later
        });
    } catch (error: any) {
        console.error("[HDFC Test] Create order error:", error);
        return res.status(500).json({ error: error.message || "Failed to create HDFC payment order" });
    }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/payments/hdfc-test/verify-return
// Called after HDFC redirects user back to return_url
// 1. Verifies HMAC-SHA256 signature from return params
// 2. Calls GET /orders/{order_id} to confirm status === CHARGED
// 3. Updates test_payment in DB and creates booking
// ══════════════════════════════════════════════════════════════════════
router.post("/hdfc-test/verify-return", async (req: Request, res: Response) => {
    try {
        const params = req.body; // { order_id, status, status_id, signature, signature_algorithm, ... }
        const { order_id, status, signature, signature_algorithm } = params;

        if (!order_id) {
            return res.status(400).json({ error: "Missing order_id" });
        }

        console.log(`[HDFC Test] Return URL hit for order ${order_id}, status: ${status}`);

        // Step 1: Verify HMAC-SHA256 signature if present
        let signatureValid = false;
        if (signature && HDFC_RESPONSE_KEY) {
            try {
                // Exclude signature and signature_algorithm from params
                const filteredParams: Record<string, string> = {};
                for (const key of Object.keys(params)) {
                    if (key !== "signature" && key !== "signature_algorithm") {
                        filteredParams[key] = String(params[key]);
                    }
                }

                // Sort keys alphabetically
                const sortedKeys = Object.keys(filteredParams).sort();

                // Build key=value& string
                let paramString = sortedKeys.map(k => `${k}=${filteredParams[k]}`).join("&");

                // URL-encode the entire string
                const encodedParams = encodeURIComponent(paramString);

                // Compute HMAC-SHA256 with Response Key, base64 encoded
                const computedHmac = crypto
                    .createHmac("sha256", HDFC_RESPONSE_KEY)
                    .update(encodedParams)
                    .digest("base64");

                const receivedHmac = decodeURIComponent(signature);
                signatureValid = (decodeURIComponent(computedHmac) === receivedHmac);

                console.log(`[HDFC Test] Signature verification: ${signatureValid ? "PASSED ✅" : "FAILED ❌"}`);
            } catch (sigErr) {
                console.error("[HDFC Test] Signature verification error:", sigErr);
            }
        }

        // Step 2: ALWAYS call GET /orders/{order_id} to verify status server-to-server
        // (This is the authoritative check — signature alone is not sufficient)
        const statusRes = await fetch(`${HDFC_BASE_URL}/orders/${order_id}`, {
            method: "GET",
            headers: {
                "Authorization": getHdfcAuthHeader(),
                "Content-Type": "application/json",
                "x-merchantid": HDFC_MERCHANT_ID,
                "x-customerid": "status_check",
                "x-resellerid": "hdfc_reseller",
            },
        });

        if (!statusRes.ok) {
            const errText = await statusRes.text();
            console.error(`[HDFC Test] Order status API error (${statusRes.status}):`, errText);
            throw new Error(`HDFC status check failed: ${statusRes.status}`);
        }

        const orderData: any = await statusRes.json();
        console.log(`[HDFC Test] Order status response:`, JSON.stringify(orderData, null, 2));

        const hdfcStatus = orderData.status; // CHARGED, AUTHENTICATION_FAILED, etc.
        const txnId = orderData.txn_id || orderData.txn_uuid || order_id;
        const isCharged = hdfcStatus === "CHARGED";

        // Step 3: Find our test_payment record and update it
        const testRecord = await prisma.testPayment.findFirst({
            where: { razorpayOrderId: order_id },
        });

        if (!testRecord) {
            return res.status(404).json({ error: "Test payment record not found for this order" });
        }

        if (isCharged && !testRecord.verified) {
            // Payment successful — create booking!
            let createdBookingRef: string | null = null;
            try {
                createdBookingRef = await processHdfcTestBooking(testRecord, txnId);
            } catch (bookingErr) {
                console.error("[HDFC Test] Booking creation error:", bookingErr);
            }

            await prisma.testPayment.update({
                where: { id: testRecord.id },
                data: {
                    verified: true,
                    status: "success",
                    razorpayPaymentId: txnId, // Reusing column for HDFC txn ID
                    createdBookingRef: createdBookingRef || testRecord.createdBookingRef,
                },
            });

            console.log(`✅ [HDFC Test] Payment ${testRecord.paymentId} CHARGED! Booking: ${createdBookingRef}`);

            return res.json({
                verified: true,
                status: "success",
                hdfcStatus,
                txnId,
                paymentId: testRecord.paymentId,
                createdBookingRef,
                signatureValid,
            });
        } else if (isCharged && testRecord.verified) {
            // Already processed (idempotent)
            return res.json({
                verified: true,
                status: "success",
                hdfcStatus,
                txnId,
                paymentId: testRecord.paymentId,
                createdBookingRef: testRecord.createdBookingRef,
                signatureValid,
                note: "Already processed",
            });
        } else {
            // Not charged (failed, pending, etc.)
            const failStatus = ["AUTHENTICATION_FAILED", "AUTHORIZATION_FAILED", "JUSPAY_DECLINED"].includes(hdfcStatus)
                ? "failed" : "pending";

            await prisma.testPayment.update({
                where: { id: testRecord.id },
                data: { status: failStatus },
            });

            return res.json({
                verified: false,
                status: failStatus,
                hdfcStatus,
                paymentId: testRecord.paymentId,
                signatureValid,
            });
        }
    } catch (error: any) {
        console.error("[HDFC Test] Verify return error:", error);
        return res.status(500).json({ error: error.message || "Payment verification failed" });
    }
});

// ══════════════════════════════════════════════════════════════════════
// POST /api/payments/webhook/hdfc-test
// Receives HDFC SmartGateway webhook notifications
// Authenticated via Basic Auth (username:password configured in HDFC dashboard)
// ══════════════════════════════════════════════════════════════════════
router.post("/webhook/hdfc-test", async (req: Request, res: Response) => {
    try {
        // Step 1: Verify Basic Auth credentials
        const authHeader = req.headers["authorization"] || "";
        if (HDFC_WEBHOOK_USERNAME && HDFC_WEBHOOK_PASSWORD) {
            if (!authHeader.startsWith("Basic ")) {
                console.warn("[HDFC Webhook] Missing Basic Auth header");
                return res.status(401).json({ error: "Unauthorized" });
            }

            const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
            const [username, ...passwordParts] = decoded.split(":");
            const password = passwordParts.join(":"); // In case password contains colons

            if (username !== HDFC_WEBHOOK_USERNAME || password !== HDFC_WEBHOOK_PASSWORD) {
                console.warn(`[HDFC Webhook] Invalid credentials: ${username}`);
                return res.status(401).json({ error: "Invalid webhook credentials" });
            }
        }

        const eventName = req.body?.event_name;
        const orderContent = req.body?.content?.order;
        const orderId = orderContent?.order_id;

        console.log(`[HDFC Webhook] Received event: ${eventName} for order: ${orderId}`);

        if (!orderId) {
            return res.json({ status: "ok", note: "No order_id in payload" });
        }

        if (eventName === "ORDER_SUCCEEDED" || eventName === "TXN_CHARGED" || orderContent?.status === "CHARGED") {
            // Verify by calling GET /orders/{order_id}
            let hdfcVerifiedStatus = "CHARGED";
            let txnId = orderContent?.txn_id || orderContent?.txn_uuid || orderId;

            try {
                const statusRes = await fetch(`${HDFC_BASE_URL}/orders/${orderId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": getHdfcAuthHeader(),
                        "Content-Type": "application/json",
                        "x-merchantid": HDFC_MERCHANT_ID,
                        "x-customerid": "webhook_verify",
                        "x-resellerid": "hdfc_reseller",
                    },
                });

                if (statusRes.ok) {
                    const orderData: any = await statusRes.json();
                    hdfcVerifiedStatus = orderData.status;
                    txnId = orderData.txn_id || orderData.txn_uuid || txnId;
                    console.log(`[HDFC Webhook] Verified order status: ${hdfcVerifiedStatus}`);
                }
            } catch (verifyErr) {
                console.error("[HDFC Webhook] Status verification error (non-fatal):", verifyErr);
            }

            if (hdfcVerifiedStatus === "CHARGED") {
                const testRecord = await prisma.testPayment.findFirst({
                    where: { razorpayOrderId: orderId },
                });

                if (testRecord && !testRecord.verified) {
                    let createdBookingRef: string | null = null;
                    try {
                        createdBookingRef = await processHdfcTestBooking(testRecord, txnId);
                    } catch (bookingErr) {
                        console.error("[HDFC Webhook] Booking creation error:", bookingErr);
                    }

                    await prisma.testPayment.update({
                        where: { id: testRecord.id },
                        data: {
                            verified: true,
                            status: "success",
                            razorpayPaymentId: txnId,
                            createdBookingRef: createdBookingRef || testRecord.createdBookingRef,
                        },
                    });

                    console.log(`✅ [HDFC Webhook] Payment ${testRecord.paymentId} confirmed via webhook! Booking: ${createdBookingRef}`);
                } else if (testRecord?.verified) {
                    console.log(`[HDFC Webhook] Order ${orderId} already processed (idempotent skip).`);
                }
            }
        } else if (eventName === "ORDER_FAILED" || eventName === "TXN_FAILED") {
            const testRecord = await prisma.testPayment.findFirst({
                where: { razorpayOrderId: orderId },
            });
            if (testRecord && !testRecord.verified) {
                await prisma.testPayment.update({
                    where: { id: testRecord.id },
                    data: { status: "failed" },
                });
                console.log(`❌ [HDFC Webhook] Payment ${testRecord.paymentId} marked FAILED.`);
            }
        }

        // MUST return 200 immediately to prevent HDFC retries
        return res.json({ status: "ok" });
    } catch (error: any) {
        console.error("[HDFC Webhook] Processing error:", error);
        return res.status(500).json({ error: error.message || "Webhook handling failed" });
    }
});

export default router;
