// ───────────────────────────────────────────────────────────────
//  WhatsApp Service — Send booking confirmations via chatbot
//
//  Each module has its own chatbot number:
//  - Digital Diaries → DD_WHATSAPP_PHONE_NUMBER_ID / DD_WHATSAPP_TOKEN
//  - Staycation 1    → STAY1_WHATSAPP_PHONE_NUMBER_ID / STAY1_WHATSAPP_TOKEN
//  - Staycation 2    → STAY2_WHATSAPP_PHONE_NUMBER_ID / STAY2_WHATSAPP_TOKEN
//
//  Template will be provided later. For now, uses text messages.
// ───────────────────────────────────────────────────────────────

export type ChatbotId = "dd" | "stay1" | "stay2";

interface ChatbotConfig {
    token: string;
    phoneNumberId: string;
}

/**
 * Get the chatbot config for a given module.
 * Falls back to the global OTP WhatsApp creds if module-specific ones aren't set.
 */
function getChatbotConfig(chatbot: ChatbotId): ChatbotConfig | null {
    const envMap: Record<ChatbotId, { tokenKey: string; phoneKey: string }> = {
        dd:    { tokenKey: "DD_WHATSAPP_TOKEN",    phoneKey: "DD_WHATSAPP_PHONE_NUMBER_ID" },
        stay1: { tokenKey: "STAY1_WHATSAPP_TOKEN", phoneKey: "STAY1_WHATSAPP_PHONE_NUMBER_ID" },
        stay2: { tokenKey: "STAY2_WHATSAPP_TOKEN", phoneKey: "STAY2_WHATSAPP_PHONE_NUMBER_ID" },
    };

    const keys = envMap[chatbot];
    const token = process.env[keys.tokenKey] || process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env[keys.phoneKey] || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.warn(`[WhatsApp:${chatbot}] Missing credentials — skipping`);
        return null;
    }

    return { token, phoneNumberId };
}

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, "");
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

/**
 * Send a text message via a specific chatbot's WhatsApp number.
 * After sending, logs the message to the chatbot DB (chat_sessions / chat_messages)
 * so it appears in the chatbot dashboard.
 */
export async function sendWhatsAppMessage(chatbot: ChatbotId, phone: string, message: string, addBookedTag: boolean = false): Promise<boolean> {
    const config = getChatbotConfig(chatbot);
    if (!config) return false;

    const waPhone = normalizePhone(phone);
    const bare = waPhone.startsWith("+") ? waPhone.substring(1) : waPhone;

    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: bare,
                type: "text",
                text: { body: message },
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`[WhatsApp:${chatbot}] Send failed:`, res.status, errBody);
            return false;
        }

        const data: any = await res.json();
        console.log(`[WhatsApp:${chatbot}] Message sent to ${bare}:`, data.messages?.[0]?.id);

        // ── Log confirmation to chatbot DB ──
        try {
            await logConfirmationToChat(config.phoneNumberId, bare, message, addBookedTag);
        } catch (dbErr: any) {
            console.warn(`[WhatsApp:${chatbot}] Failed to log to chat DB:`, dbErr.message);
        }

        return true;
    } catch (err: any) {
        console.error(`[WhatsApp:${chatbot}] Error:`, err.message);
        return false;
    }
}

/**
 * Send a document (e.g. PDF) via a specific chatbot's WhatsApp number.
 * The document must be publicly accessible via URL.
 */
export async function sendWhatsAppDocument(
    chatbot: ChatbotId,
    phone: string,
    documentUrl: string,
    filename: string,
    caption?: string
): Promise<boolean> {
    const config = getChatbotConfig(chatbot);
    if (!config) return false;

    const waPhone = normalizePhone(phone);
    const bare = waPhone.startsWith("+") ? waPhone.substring(1) : waPhone;

    try {
        const body: any = {
            messaging_product: "whatsapp",
            to: bare,
            type: "document",
            document: {
                link: documentUrl,
                filename,
            },
        };
        if (caption) body.document.caption = caption;

        const res = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`[WhatsApp:${chatbot}] Document send failed:`, res.status, errBody);
            return false;
        }

        const data: any = await res.json();
        console.log(`[WhatsApp:${chatbot}] Document sent to ${bare}:`, data.messages?.[0]?.id);

        try {
            await logConfirmationToChat(config.phoneNumberId, bare, `[PDF] ${filename}${caption ? ': ' + caption : ''}`, false);
        } catch (dbErr: any) {
            console.warn(`[WhatsApp:${chatbot}] Failed to log doc to chat DB:`, dbErr.message);
        }

        return true;
    } catch (err: any) {
        console.error(`[WhatsApp:${chatbot}] Document error:`, err.message);
        return false;
    }
}

/**
 * Log a sent confirmation message to the chatbot's chat_sessions/chat_messages tables.
 * This ensures the confirmation shows up in the chatbot dashboard.
 */
async function logConfirmationToChat(phoneNumberId: string, customerPhone: string, message: string, addBookedTag: boolean) {
    const prisma = (await import("../lib/prisma")).default;
    const sessionId = `${phoneNumberId}_${customerPhone}`;

    // Check if session exists
    const existingSessions: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM chat_sessions WHERE session_id = $1`, sessionId
    );

    if (existingSessions.length > 0) {
        // Session exists — insert message and update last_message
        await prisma.$queryRawUnsafe(
            `INSERT INTO chat_messages (session_id, role, message, is_human) VALUES ($1, 'assistant', $2, false)`,
            sessionId, message
        );
        await prisma.$queryRawUnsafe(
            `UPDATE chat_sessions SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE session_id = $1`,
            sessionId, message.substring(0, 500)
        );

        // Add "booked" tag if not already present
        if (addBookedTag) {
            await prisma.$queryRawUnsafe(
                `UPDATE chat_sessions SET tags = COALESCE(tags, '[]'::jsonb) || '["booked"]'::jsonb, updated_at = NOW() WHERE session_id = $1 AND NOT (COALESCE(tags, '[]'::jsonb) @> '["booked"]'::jsonb)`,
                sessionId
            );
        }
    } else {
        // Create session + message
        const displayName = customerPhone.length === 12 && customerPhone.startsWith("91")
            ? `+${customerPhone.substring(0, 2)} ${customerPhone.substring(2, 7)} ${customerPhone.substring(7)}`
            : customerPhone;

        const tags = addBookedTag ? '["booked"]' : '[]';
        await prisma.$queryRawUnsafe(
            `INSERT INTO chat_sessions (session_id, customer_phone, display_name, phone_number_id, bot_type, platform, tags, last_message, last_message_at)
             VALUES ($1, $2, $3, $4, 'celebration', 'whatsapp', $5::jsonb, $6, NOW())`,
            sessionId, customerPhone, displayName, phoneNumberId, tags, message.substring(0, 500)
        );
        await prisma.$queryRawUnsafe(
            `INSERT INTO chat_messages (session_id, role, message, is_human) VALUES ($1, 'assistant', $2, false)`,
            sessionId, message
        );
    }
}

// ─── Convenience helpers (ready for template integration later) ───

export async function sendDDBookingConfirmation(phone: string, bookingRef: string, voucherUrl: string): Promise<boolean> {
    const message = `✅ *Booking Confirmed!*

Thank you for booking with Galaxia Digital Diaries.

📋 *Booking Ref:* ${bookingRef}

You can view or download your booking voucher here:
${voucherUrl}

We look forward to hosting you! 🎬

— _Galaxia Resorts_
www.galaxiaresorts.com`;

    return sendWhatsAppMessage("dd", phone, message, true);
}

export async function sendStaycationBookingConfirmation(
    chatbot: "stay1" | "stay2",
    phone: string,
    bookingRef: string,
    voucherUrl: string
): Promise<boolean> {
    const message = `✅ *Booking Confirmed!*

Thank you for booking with Galaxia.

📋 *Booking Ref:* ${bookingRef}

You can view or download your booking voucher here:
${voucherUrl}

We look forward to welcoming you! 🏡

— _Galaxia Resorts_
www.galaxiaresorts.com`;

    return sendWhatsAppMessage(chatbot, phone, message, true);
}
