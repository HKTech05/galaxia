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
 */
export async function sendWhatsAppMessage(chatbot: ChatbotId, phone: string, message: string): Promise<boolean> {
    const config = getChatbotConfig(chatbot);
    if (!config) return false;

    const waPhone = normalizePhone(phone);
    const bare = waPhone.startsWith("+") ? waPhone.substring(1) : waPhone;

    try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
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
        return true;
    } catch (err: any) {
        console.error(`[WhatsApp:${chatbot}] Error:`, err.message);
        return false;
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

    return sendWhatsAppMessage("dd", phone, message);
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

    return sendWhatsAppMessage(chatbot, phone, message);
}
