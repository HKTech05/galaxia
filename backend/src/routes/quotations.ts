// ───────────────────────────────────────────────────────────────
//  Quotation API — Generate quotes, PDFs, and send via WhatsApp
// ───────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendWhatsAppMessage, sendWhatsAppDocument } from "../lib/whatsappService";
import { generateQuotationPDF } from "../lib/pdfService";

const router = Router();

// In-memory store for generated PDFs (cleared after 7 days)
const pdfStore = new Map<string, { buffer: Buffer; createdAt: number; data: any; pricing: any; bookingUrl: string }>();

// Clean up old PDFs every hour
setInterval(() => {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    for (const [id, entry] of pdfStore) {
        if (now - entry.createdAt > SEVEN_DAYS) pdfStore.delete(id);
    }
}, 60 * 60 * 1000);

// ── Pricing helpers (mirrors frontend StaycationPropertyPortal logic) ──

interface PricingEntry {
    weekday: number;
    weekend: number;
    saturday: number;
    extraAdult: number;
    kidsCharge: number;
    baseGuests: number;
}

async function fetchLivePricing(): Promise<Record<string, PricingEntry>> {
    const result: Record<string, PricingEntry> = {};
    const slugs = ["hill-view", "mount-view", "heavenly-villa", "la-paraiso", "amstel-nest", "ambrose"];

    for (const slug of slugs) {
        try {
            const property = await prisma.property.findFirst({
                where: { slug },
                include: {
                    pricing: { where: { isActive: true, overrideDate: null } },
                    subProperties: { include: { pricing: { where: { isActive: true, overrideDate: null } } } },
                },
            });
            if (!property) continue;

            const buildEntry = (rules: any[]): PricingEntry | null => {
                const wd = rules.find((r: any) => r.dayType === "weekday");
                const we = rules.find((r: any) => r.dayType === "weekend");
                const sa = rules.find((r: any) => r.dayType === "saturday");
                if (!wd && !we) return null;
                return {
                    weekday: wd ? Number(wd.basePrice) : (we ? Number(we.basePrice) : 0),
                    weekend: we ? Number(we.basePrice) : (wd ? Number(wd.basePrice) : 0),
                    saturday: sa ? Number(sa.basePrice) : (we ? Number(we.basePrice) : (wd ? Number(wd.basePrice) : 0)),
                    extraAdult: wd?.extraAdultPrice ? Number(wd.extraAdultPrice) : 1000,
                    kidsCharge: wd?.kidsCharge ? Number(wd.kidsCharge) : 500,
                    baseGuests: wd?.personsLabel ? parseInt(wd.personsLabel) || 2 : 2,
                };
            };

            const parentEntry = buildEntry(property.pricing);
            if (parentEntry) {
                result[property.name] = parentEntry;
            }

            for (const sp of property.subProperties) {
                const spEntry = buildEntry(sp.pricing);
                if (spEntry) {
                    result[`${property.name}/${sp.name.toUpperCase()}`] = spEntry;
                }
            }
        } catch (err) {
            console.warn(`[Quotation] Failed to fetch pricing for ${slug}:`, err);
        }
    }

    return result;
}

function calculateQuotePrice(data: {
    propertyName: string;
    villaName?: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    kids: number;
    pets: number;
    decoration: boolean;
}, livePricing: Record<string, PricingEntry>) {
    const start = new Date(data.checkIn + "T00:00:00");
    const end = new Date(data.checkOut + "T00:00:00");
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    let roomTotal = 0;
    let extraAdultTotal = 0;
    let extraKidsTotal = 0;

    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const day = currentDate.getDay();
        const isSaturday = day === 6;
        const isWeekend = day === 0 || day === 5 || day === 6;

        let basePrice = 0;
        let extraAdultPrice = 0;
        let kidsPrice = 0;
        let baseGuests = 2;

        // Key lookup (same as frontend)
        let liveKey = "";
        const prop = data.propertyName;
        if (prop.includes("Ambrose") && data.villaName) {
            liveKey = `Ambrose/${data.villaName.toUpperCase()}`;
        } else if (prop.includes("Amstel") && data.villaName) {
            liveKey = data.villaName.toLowerCase().includes("family")
                ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
        } else {
            for (const k of Object.keys(livePricing)) {
                if (prop.includes(k)) { liveKey = k; break; }
            }
        }

        let lp = livePricing[liveKey];
        if (!lp) {
            const upperKey = liveKey.toUpperCase();
            for (const [k, v] of Object.entries(livePricing)) {
                if (k.toUpperCase() === upperKey) { lp = v; break; }
            }
        }
        if (!lp && (prop.includes("Amstel") || prop.includes("Ambrose"))) {
            const parentKey = prop.includes("Amstel") ? "Amstel Nest" : "Ambrose";
            lp = livePricing[parentKey];
        }

        if (lp) {
            basePrice = isSaturday ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday;
            extraAdultPrice = lp.extraAdult;
            kidsPrice = lp.kidsCharge;
            baseGuests = lp.baseGuests;
        } else {
            // Hardcoded fallback
            if (prop.includes("Hill View")) { basePrice = isWeekend ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
            else if (prop.includes("Mount View")) { basePrice = isWeekend ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
            else if (prop.includes("Heavenly")) { basePrice = isWeekend ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
            else if (prop.includes("La Paraiso")) { basePrice = isWeekend ? 7500 : 4950; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWeekend ? 4 : 2; }
            else if (prop.includes("Amstel")) { basePrice = isWeekend ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; }
            else if (prop.includes("Ambrose")) { basePrice = isWeekend ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
        }

        roomTotal += basePrice;
        const extraAdults = Math.max(0, data.adults - baseGuests);
        const freeKidsSlots = Math.max(0, baseGuests - data.adults);
        const extraKids = Math.max(0, data.kids - freeKidsSlots);
        extraAdultTotal += extraAdults * extraAdultPrice;
        extraKidsTotal += extraKids * kidsPrice;
    }

    let subtotal = roomTotal + extraAdultTotal + extraKidsTotal;
    const DECORATION_PRICE = 1200;
    if (data.decoration) subtotal += DECORATION_PRICE;

    const baseAmount = Math.round(subtotal);
    const gstAmount = Math.round(baseAmount * 0.05);
    let finalTotal = baseAmount + gstAmount;
    finalTotal += data.pets * 600;
    finalTotal = Math.round(finalTotal / 10) * 10;

    return {
        nights,
        roomTotal: Math.round(roomTotal),
        extraAdultCharge: Math.round(extraAdultTotal),
        extraKidsCharge: Math.round(extraKidsTotal),
        decorationCharge: data.decoration ? DECORATION_PRICE : 0,
        subtotal: baseAmount,
        gstAmount,
        petCharge: data.pets * 600,
        totalAmount: finalTotal,
        nightlyRoomRate: Math.round(roomTotal / nights),
    };
}

// ── Build booking URL ──
function buildBookingUrl(data: {
    propertyName: string; villaName?: string;
    checkIn: string; checkOut: string;
    adults: number; kids: number; jainCount: number;
    quoteId: string;
}): string {
    const propertySlugMap: Record<string, string> = {
        "Hill View": "hill-view",
        "Mount View": "mount-view",
        "Heavenly Villa": "heavenly-villa",
        "La Paraiso": "la-paraiso",
        "Amstel Nest": "amstel-nest",
        "Ambrose": "ambrose",
    };

    const slug = propertySlugMap[data.propertyName] || data.propertyName.toLowerCase().replace(/\s+/g, "-");
    const isMultiCart = data.propertyName.includes("Amstel") || data.propertyName.includes("Ambrose");

    // For Amstel/Ambrose: link to property page (multi-cart flow), not /book
    // For other properties: link to /book page directly
    let bookingPath: string;
    if (isMultiCart) {
        bookingPath = `/staycation/${slug}`;
    } else {
        bookingPath = `/staycation/${slug}/book`;
    }

    const params = new URLSearchParams();
    params.set("checkIn", data.checkIn);
    params.set("checkOut", data.checkOut);
    if (data.adults > 2) params.set("adults", String(data.adults));
    if (data.kids > 0) params.set("kids", String(data.kids));
    if (data.jainCount > 0) params.set("foodType", "Jain");
    params.set("ref", data.quoteId);

    return `https://www.galaxiaresorts.com${bookingPath}?${params.toString()}`;
}

// ── Routes ──

// POST /api/quotations/generate — Generate quotation + PDF
router.post("/generate", async (req: Request, res: Response) => {
    try {
        const {
            customerName, customerPhone, customerEmail,
            propertyName, villaName,
            checkIn, checkOut,
            adults = 2, kids = 0, pets = 0,
            regularCount = 0, jainCount = 0,
            decoration = false,
        } = req.body;

        if (!customerName || !propertyName || !checkIn || !checkOut) {
            return res.status(400).json({ error: "Missing required fields: customerName, propertyName, checkIn, checkOut" });
        }

        const livePricing = await fetchLivePricing();
        const pricing = calculateQuotePrice({
            propertyName, villaName, checkIn, checkOut,
            adults, kids, pets, decoration,
        }, livePricing);

        const quoteId = `GQ-${Date.now().toString(36).toUpperCase()}`;

        const quoteData = {
            quoteId, customerName, customerPhone, customerEmail,
            propertyName, villaName, checkIn, checkOut,
            adults, kids, pets, regularCount, jainCount, decoration,
            foodType: jainCount > 0 ? "Jain" : "Regular",
        };

        // Use the shared pdfService template
        const pdfBuffer = await generateQuotationPDF(quoteData, pricing);

        const bookingUrl = buildBookingUrl({
            propertyName, villaName, checkIn, checkOut,
            adults, kids, jainCount, quoteId,
        });

        pdfStore.set(quoteId, { buffer: pdfBuffer, createdAt: Date.now(), data: quoteData, pricing, bookingUrl });

        const pdfUrl = `https://galaxiaresorts.com/api/quotations/${quoteId}/pdf`;

        res.json({
            quoteId,
            pricing,
            pdfUrl,
            bookingUrl,
        });
    } catch (err: any) {
        console.error("[Quotation] Generate error:", err);
        res.status(500).json({ error: err.message || "Failed to generate quotation" });
    }
});

// GET /api/quotations/:id/pdf — Serve generated PDF
router.get("/:id/pdf", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const entry = pdfStore.get(id);
    if (!entry) {
        return res.status(404).json({ error: "Quotation not found or expired" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Galaxia-Quotation-${id}.pdf"`);
    res.send(entry.buffer);
});

// GET /api/quotations/:id/download — Download PDF
router.get("/:id/download", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const entry = pdfStore.get(id);
    if (!entry) {
        return res.status(404).json({ error: "Quotation not found or expired" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Galaxia-Quotation-${id}.pdf"`);
    res.send(entry.buffer);
});

// POST /api/quotations/:id/send-whatsapp — Send PDF + booking link via WhatsApp
router.post("/:id/send-whatsapp", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const entry = pdfStore.get(id);
        if (!entry) {
            return res.status(404).json({ error: "Quotation not found or expired" });
        }

        // Always send to test number for now
        const targetPhone = "9653176436";

        const pdfUrl = `https://galaxiaresorts.com/api/quotations/${id}/pdf`;
        const quoteData = entry.data;
        const bookingUrl = entry.bookingUrl;

        // Use "stay1" chatbot — falls back to default OTP WhatsApp credentials
        const pdfSent = await sendWhatsAppDocument(
            "stay1",
            targetPhone,
            pdfUrl,
            `Galaxia-Quote-${id}.pdf`,
            `📋 Quotation for ${quoteData.customerName}\n${quoteData.propertyName}${quoteData.villaName ? ' — ' + quoteData.villaName : ''}\n${quoteData.checkIn} → ${quoteData.checkOut}`
        );

        const fmtCurrency = (n: number) => `Rs.${(n || 0).toLocaleString("en-IN")}`;

        const linkMessage = `🏡 *Galaxia Staycation Quote*

Hi ${quoteData.customerName}! Here's your personalised booking link:

📋 *Quote:* ${id}
🏠 *Property:* ${quoteData.propertyName}${quoteData.villaName ? ' — ' + quoteData.villaName : ''}
📅 *Dates:* ${quoteData.checkIn} → ${quoteData.checkOut}
👥 *Guests:* ${quoteData.adults} adults${quoteData.kids > 0 ? ', ' + quoteData.kids + ' kids' : ''}

💰 *Total:* ${fmtCurrency(entry.pricing.totalAmount)}

👉 *Book Now (pre-filled):*
${bookingUrl}

All details are pre-filled — just sign in and pay! 🎉

— _Galaxia Resorts_
www.galaxiaresorts.com`;

        const linkSent = await sendWhatsAppMessage("stay1", targetPhone, linkMessage, false);

        res.json({
            success: true,
            pdfSent,
            linkSent,
            sentTo: targetPhone,
        });
    } catch (err: any) {
        console.error("[Quotation] WhatsApp send error:", err);
        res.status(500).json({ error: err.message || "Failed to send WhatsApp" });
    }
});

export default router;
