import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { auditLog } from "../lib/logger";

const router = Router();

/* ─── In-memory OTP store ──────────────────────────────────── */

interface OtpRecord {
    otp: string;
    expiresAt: number;
    attempts: number;
}

interface RateRecord {
    count: number;
    windowStart: number;
}

const otpStore = new Map<string, OtpRecord>();
const rateStore = new Map<string, RateRecord>();

const OTP_TTL_MS = 5 * 60 * 1000;         // 5 minutes
const RATE_WINDOW_MS = 10 * 60 * 1000;     // 10 minutes
const MAX_OTPS_PER_WINDOW = 3;
const MAX_VERIFY_ATTEMPTS = 5;

// Periodic cleanup of expired OTPs (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of otpStore) {
        if (now > record.expiresAt) otpStore.delete(key);
    }
    for (const [key, record] of rateStore) {
        if (now > record.windowStart + RATE_WINDOW_MS) rateStore.delete(key);
    }
}, 5 * 60 * 1000);

/* ─── Helpers ──────────────────────────────────────────────── */

function generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function normalizePhone(phone: string): string {
    // Strip spaces, dashes, parens
    let cleaned = phone.replace(/[\s\-\(\)]/g, "");
    // Ensure +91 prefix
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith("+")) {
        if (cleaned.startsWith("91") && cleaned.length === 12) {
            cleaned = "+" + cleaned;
        } else {
            cleaned = "+91" + cleaned;
        }
    }
    return cleaned;
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.error("[WhatsApp OTP] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
        return false;
    }

    // Phone number for WhatsApp API should NOT have the leading +
    const waPhone = phone.startsWith("+") ? phone.substring(1) : phone;

    try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: waPhone,
                type: "template",
                template: {
                    name: "otp_login",
                    language: { code: "en" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: otp },
                            ],
                        },
                    ],
                },
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error("[WhatsApp OTP] Send failed:", res.status, errBody);
            return false;
        }

        const data: any = await res.json();
        console.log("[WhatsApp OTP] Sent successfully:", data.messages?.[0]?.id);
        return true;
    } catch (err: any) {
        console.error("[WhatsApp OTP] Error:", err.message);
        return false;
    }
}

/* ─── POST /api/auth/phone/send-otp ────────────────────────── */

router.post("/send-otp", async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const normalized = normalizePhone(phone);

        // Validate: must be 10 digits after +91
        if (!/^\+91\d{10}$/.test(normalized)) {
            return res.status(400).json({ error: "Please enter a valid 10-digit Indian phone number" });
        }

        // Rate limiting
        const now = Date.now();
        const rateKey = normalized;
        const rate = rateStore.get(rateKey);

        if (rate) {
            if (now - rate.windowStart < RATE_WINDOW_MS) {
                if (rate.count >= MAX_OTPS_PER_WINDOW) {
                    return res.status(429).json({
                        error: "Too many OTP requests. Please try again after 10 minutes.",
                    });
                }
                rate.count++;
            } else {
                // Reset window
                rateStore.set(rateKey, { count: 1, windowStart: now });
            }
        } else {
            rateStore.set(rateKey, { count: 1, windowStart: now });
        }

        // Generate & store OTP
        const otp = generateOtp();
        otpStore.set(normalized, {
            otp,
            expiresAt: now + OTP_TTL_MS,
            attempts: 0,
        });

        // Send via WhatsApp
        const sent = await sendWhatsAppOtp(normalized, otp);
        if (!sent) {
            return res.status(500).json({ error: "Failed to send OTP. Please try again." });
        }

        auditLog({
            action: "phone_otp_sent",
            entityType: "user",
            details: { phone: normalized },
        });

        return res.json({ success: true, message: "OTP sent via WhatsApp" });
    } catch (error: any) {
        console.error("[Phone Auth] send-otp error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* ─── POST /api/auth/phone/verify-otp ──────────────────────── */

router.post("/verify-otp", async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ error: "Phone and OTP are required" });
        }

        const normalized = normalizePhone(phone);
        const record = otpStore.get(normalized);

        if (!record) {
            return res.status(400).json({ error: "No OTP found. Please request a new one." });
        }

        // Check expiry
        if (Date.now() > record.expiresAt) {
            otpStore.delete(normalized);
            return res.status(400).json({ error: "OTP has expired. Please request a new one." });
        }

        // Check attempts
        if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
            otpStore.delete(normalized);
            return res.status(400).json({ error: "Too many incorrect attempts. Please request a new OTP." });
        }

        // Verify
        record.attempts++;
        if (record.otp !== otp.toString().trim()) {
            return res.status(400).json({
                error: "Incorrect OTP. Please try again.",
                attemptsRemaining: MAX_VERIFY_ATTEMPTS - record.attempts,
            });
        }

        // OTP is correct — clear it
        otpStore.delete(normalized);

        // Look up user by phone
        let user = await prisma.user.findFirst({ where: { phone: normalized } });
        let isNewUser = false;

        if (!user) {
            // Create new phone-only user
            user = await prisma.user.create({
                data: {
                    fullName: "Phone User",
                    phone: normalized,
                    email: null,
                    passwordHash: null,
                    isVerified: true,
                },
            });
            isNewUser = true;

            auditLog({
                action: "phone_register",
                entityType: "user",
                entityId: user.id,
                details: { phone: normalized },
            });
        } else {
            auditLog({
                action: "phone_login",
                entityType: "user",
                entityId: user.id,
                details: { phone: normalized },
            });
        }

        // Sign JWT (same payload as Cognito flow)
        const appToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                type: "customer",
            },
            process.env.JWT_SECRET || "fallback-secret",
            { expiresIn: "7d" }
        );

        return res.json({
            token: appToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
            },
            isNewUser,
        });
    } catch (error: any) {
        console.error("[Phone Auth] verify-otp error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* ─── PATCH /api/auth/phone/update-name ────────────────────── */

router.patch("/update-name", async (req: Request, res: Response) => {
    try {
        // Verify JWT from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
        } catch {
            return res.status(401).json({ error: "Invalid token" });
        }

        const { firstName, lastName } = req.body;
        if (!firstName || !firstName.trim()) {
            return res.status(400).json({ error: "First name is required" });
        }

        const fullName = lastName?.trim()
            ? `${firstName.trim()} ${lastName.trim()}`
            : firstName.trim();

        const user = await prisma.user.update({
            where: { id: decoded.id },
            data: { fullName },
        });

        auditLog({
            action: "phone_user_name_update",
            entityType: "user",
            entityId: user.id,
            details: { fullName },
        });

        return res.json({
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
            },
        });
    } catch (error: any) {
        console.error("[Phone Auth] update-name error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
