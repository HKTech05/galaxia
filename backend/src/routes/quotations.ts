// ───────────────────────────────────────────────────────────────
//  Quotation API — Generate quotes, PDFs, and send via WhatsApp
//  Supports multi-villa quotations (Amstel Nest units, Ambrose villas)
// ───────────────────────────────────────────────────────────────

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendWhatsAppMessage, sendWhatsAppDocument } from "../lib/whatsappService";
import { generateQuotationPDF } from "../lib/pdfService";

const router = Router();

// Clean up old PDFs older than 7 days every hour
setInterval(async () => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await prisma.quotation.deleteMany({
            where: {
                createdAt: {
                    lt: sevenDaysAgo
                }
            }
        });
    } catch (err) {
        console.error("[Quotation] Cleanup error:", err);
    }
}, 60 * 60 * 1000);

// ── Pricing helpers ──

interface PricingEntry {
    weekday: number; weekend: number; saturday: number;
    extraAdult: number; kidsCharge: number; baseGuests: number;
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
            if (parentEntry) result[property.name] = parentEntry;

            for (const sp of property.subProperties) {
                const spEntry = buildEntry(sp.pricing);
                if (spEntry) result[`${property.name}/${sp.name.toUpperCase()}`] = spEntry;
            }
        } catch (err) {
            console.warn(`[Quotation] Failed to fetch pricing for ${slug}:`, err);
        }
    }
    return result;
}

// Calculate price for a single unit for the given dates
function calculateUnitPrice(
    propertyName: string, villaName: string | undefined,
    checkIn: string, checkOut: string,
    adults: number, kids: number, pets: number, decoration: boolean,
    livePricing: Record<string, PricingEntry>
) {
    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    let roomTotal = 0, extraAdultTotal = 0, extraKidsTotal = 0;

    for (let i = 0; i < nights; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const day = d.getDay();
        const isSat = day === 6;
        const isWe = day === 0 || day === 5 || day === 6;

        let basePrice = 0, extraAdultPrice = 0, kidsPrice = 0, baseGuests = 2;

        let resolvedProperty = propertyName;
        let resolvedVilla = villaName;
        if (propertyName.includes(" + ")) {
            const nameToResolve = villaName || propertyName;
            if (nameToResolve === "Standard Cottage" || nameToResolve === "Family Cottage") {
                resolvedProperty = "Amstel Nest";
                resolvedVilla = nameToResolve;
            } else if (["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"].includes(nameToResolve.toUpperCase())) {
                resolvedProperty = "Ambrose";
                resolvedVilla = nameToResolve;
            } else {
                resolvedProperty = nameToResolve;
                resolvedVilla = undefined;
            }
        }

        // Key lookup
        let liveKey = "";
        if (resolvedProperty.includes("Ambrose") && resolvedVilla) {
            liveKey = `Ambrose/${resolvedVilla.toUpperCase()}`;
        } else if (resolvedProperty.includes("Amstel") && resolvedVilla) {
            liveKey = resolvedVilla.toLowerCase().includes("family")
                ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
        } else {
            for (const k of Object.keys(livePricing)) {
                if (resolvedProperty.includes(k)) { liveKey = k; break; }
            }
        }

        let lp = livePricing[liveKey];
        if (!lp) {
            const upper = liveKey.toUpperCase();
            for (const [k, v] of Object.entries(livePricing)) {
                if (k.toUpperCase() === upper) { lp = v; break; }
            }
        }
        if (!lp && (resolvedProperty.includes("Amstel") || resolvedProperty.includes("Ambrose"))) {
            lp = livePricing[resolvedProperty.includes("Amstel") ? "Amstel Nest" : "Ambrose"];
        }

        if (lp) {
            basePrice = isSat ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday;
            extraAdultPrice = lp.extraAdult; kidsPrice = lp.kidsCharge; baseGuests = lp.baseGuests;
        } else {
            // Hardcoded fallback
            if (resolvedProperty.includes("Hill View")) { basePrice = isWe ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
            else if (resolvedProperty.includes("Mount View")) { basePrice = isWe ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
            else if (resolvedProperty.includes("Heavenly")) { basePrice = isWe ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
            else if (resolvedProperty.includes("La Paraiso")) { basePrice = isWe ? 7500 : 4950; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWe ? 4 : 2; }
            else if (resolvedProperty.includes("Amstel")) { basePrice = isWe ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; }
            else if (resolvedProperty.includes("Ambrose")) { basePrice = isWe ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
        }

        roomTotal += basePrice;
        const exA = Math.max(0, adults - baseGuests);
        const freeKids = Math.max(0, baseGuests - adults);
        const exK = Math.max(0, kids - freeKids);
        extraAdultTotal += exA * extraAdultPrice;
        extraKidsTotal += exK * kidsPrice;
    }

    return { nights, roomTotal, extraAdultTotal, extraKidsTotal };
}

// Full pricing calc — supports multi-villa via villaQuantities
function calculateQuotePrice(data: {
    propertyName: string;
    villaName?: string;
    villaQuantities?: Record<string, number>; // e.g. { "Standard Cottage": 3 } or { "TAKE-1": 1, "ALTA": 1 }
    checkIn: string; checkOut: string;
    adults: number; kids: number; pets: number; decoration: boolean;
}, livePricing: Record<string, PricingEntry>) {

    let totalRoomTotal = 0;
    let totalExtraAdult = 0;
    let totalExtraKids = 0;
    let nights = 0;
    let totalUnits = 0;

    if (data.villaQuantities && Object.keys(data.villaQuantities).length > 0) {
        // Multi-villa: calculate per villa type × quantity
        for (const [villaName, qty] of Object.entries(data.villaQuantities)) {
            if (qty <= 0) continue;
            const unit = calculateUnitPrice(
                data.propertyName, villaName,
                data.checkIn, data.checkOut,
                data.adults, data.kids, 0, false,
                livePricing
            );
            totalRoomTotal += unit.roomTotal * qty;
            totalExtraAdult += unit.extraAdultTotal * qty;
            totalExtraKids += unit.extraKidsTotal * qty;
            nights = unit.nights;
            totalUnits += qty;
        }
    } else {
        // Single villa/property
        const unit = calculateUnitPrice(
            data.propertyName, data.villaName,
            data.checkIn, data.checkOut,
            data.adults, data.kids, 0, false,
            livePricing
        );
        totalRoomTotal = unit.roomTotal;
        totalExtraAdult = unit.extraAdultTotal;
        totalExtraKids = unit.extraKidsTotal;
        nights = unit.nights;
        totalUnits = 1;
    }

    const DECORATION_PRICE = 1200;
    let subtotal = totalRoomTotal + totalExtraAdult + totalExtraKids;
    if (data.decoration) subtotal += DECORATION_PRICE;

    const baseAmount = Math.round(subtotal);
    const gstAmount = Math.round(baseAmount * 0.05);
    let finalTotal = baseAmount + gstAmount + data.pets * 600;
    finalTotal = Math.round(finalTotal / 10) * 10;

    return {
        nights,
        totalUnits,
        roomTotal: Math.round(totalRoomTotal),
        extraAdultCharge: Math.round(totalExtraAdult),
        extraKidsCharge: Math.round(totalExtraKids),
        decorationCharge: data.decoration ? DECORATION_PRICE : 0,
        subtotal: baseAmount,
        gstAmount,
        petCharge: data.pets * 600,
        totalAmount: finalTotal,
        nightlyRoomRate: nights > 0 ? Math.round(totalRoomTotal / nights) : 0,
    };
}

// ── Routes ──

// POST /api/quotations/generate
router.post("/generate", async (req: Request, res: Response) => {
    try {
        const {
            customerName, customerPhone, customerEmail,
            propertyName, villaName, villaQuantities,
            checkIn, checkOut,
            adults = 2, kids = 0, pets = 0,
            regularCount = 0, jainCount = 0,
            decoration = false,
        } = req.body;

        if (!customerName || !customerPhone || !propertyName || !checkIn || !checkOut) {
            return res.status(400).json({ error: "Missing required fields: customerName, customerPhone, propertyName, checkIn, checkOut" });
        }

        const livePricing = await fetchLivePricing();
        const pricing = calculateQuotePrice({
            propertyName, villaName, villaQuantities,
            checkIn, checkOut, adults, kids, pets, decoration,
        }, livePricing);

        const quoteId = `GQ-${Date.now().toString(36).toUpperCase()}`;

        const quoteData = {
            quoteId, customerName, customerPhone, customerEmail,
            propertyName, villaName, villaQuantities,
            checkIn, checkOut,
            adults, kids, pets, regularCount, jainCount, decoration,
            foodType: jainCount > 0 ? "Jain" : "Regular",
        };

        const pdfBuffer = await generateQuotationPDF(quoteData, pricing);

        const bookingUrl = `https://www.galaxiaresorts.com/customerquote?quoteId=${quoteId}`;

        await prisma.quotation.create({
            data: {
                quoteId,
                customerName,
                customerPhone,
                customerEmail: customerEmail || null,
                propertyName,
                checkIn,
                checkOut,
                data: quoteData as any,
                pricing: pricing as any,
                pdfBuffer,
                bookingUrl,
            }
        });

        res.json({ quoteId, pricing, pdfUrl: `https://galaxiaresorts.com/api/quotations/${quoteId}/pdf`, bookingUrl });
    } catch (err: any) {
        console.error("[Quotation] Generate error:", err);
        res.status(500).json({ error: err.message || "Failed to generate quotation" });
    }
});

// GET /api/quotations/:id/data — Return quote data for customer page (no auth needed)
router.get("/:id/data", async (req: Request, res: Response) => {
    try {
        const entry = await prisma.quotation.findUnique({
            where: { quoteId: req.params.id as string }
        });
        if (!entry) return res.status(404).json({ error: "Quotation not found or expired" });
        res.json({ data: entry.data, pricing: entry.pricing, bookingUrl: entry.bookingUrl });
    } catch (err: any) {
        console.error("[Quotation] Fetch data error:", err);
        res.status(500).json({ error: "Failed to fetch quotation" });
    }
});

// GET /api/quotations/:id/pdf
router.get("/:id/pdf", async (req: Request, res: Response) => {
    try {
        const entry = await prisma.quotation.findUnique({
            where: { quoteId: req.params.id as string }
        });
        if (!entry) return res.status(404).json({ error: "Quotation not found or expired" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Galaxia-Quotation-${req.params.id}.pdf"`);
        res.send(entry.pdfBuffer);
    } catch (err: any) {
        console.error("[Quotation] Fetch PDF error:", err);
        res.status(500).json({ error: "Failed to fetch quotation PDF" });
    }
});

// GET /api/quotations/:id/download
router.get("/:id/download", async (req: Request, res: Response) => {
    try {
        const entry = await prisma.quotation.findUnique({
            where: { quoteId: req.params.id as string }
        });
        if (!entry) return res.status(404).json({ error: "Quotation not found or expired" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Galaxia-Quotation-${req.params.id}.pdf"`);
        res.send(entry.pdfBuffer);
    } catch (err: any) {
        console.error("[Quotation] Download PDF error:", err);
        res.status(500).json({ error: "Failed to download quotation PDF" });
    }
});

// POST /api/quotations/:id/send-whatsapp
router.post("/:id/send-whatsapp", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const entry = await prisma.quotation.findUnique({
            where: { quoteId: id }
        });
        if (!entry) return res.status(404).json({ error: "Quotation not found or expired" });

        const targetPhone = "9653176436";
        const pdfUrl = `https://galaxiaresorts.com/api/quotations/${id}/pdf`;
        const q = entry.data as any;
        const pricing = entry.pricing as any;
        const fmtCurrency = (n: number) => `Rs.${(n || 0).toLocaleString("en-IN")}`;

        // Build villa summary for message
        let villaDesc = q.propertyName;
        if (q.villaQuantities && Object.keys(q.villaQuantities).length > 0) {
            const parts = Object.entries(q.villaQuantities)
                .filter(([, qty]) => (qty as number) > 0)
                .map(([name, qty]) => `${name} × ${qty}`);
            villaDesc += ` (${parts.join(", ")})`;
        } else if (q.villaName) {
            villaDesc += ` — ${q.villaName}`;
        }

        const pdfMessage = `Quotation for ${q.customerName}\n${villaDesc}\n${q.checkIn} to ${q.checkOut}\n\nView/Download PDF:\n${pdfUrl}`;
        const pdfSent = await sendWhatsAppMessage("stay1", targetPhone, pdfMessage, false);

        const totalAdults = q.adults;
        const totalKids = q.kids || 0;

        const linkMessage = `*Galaxia Staycation Quote*

Hi ${q.customerName}, here is your personalised booking link:

*Quote:* ${id}
*Property:* ${villaDesc}
*Dates:* ${q.checkIn} to ${q.checkOut}
*Guests:* ${totalAdults} adults${totalKids > 0 ? ', ' + totalKids + ' kids' : ''}

*Total:* ${fmtCurrency(pricing.totalAmount)}

*Book Now:*
${entry.bookingUrl}

-- Galaxia Resorts
www.galaxiaresorts.com`;

        const linkSent = await sendWhatsAppMessage("stay1", targetPhone, linkMessage, false);

        res.json({ success: true, pdfSent, linkSent, sentTo: targetPhone });
    } catch (err: any) {
        console.error("[Quotation] WhatsApp send error:", err);
        res.status(500).json({ error: err.message || "Failed to send WhatsApp" });
    }
});

export default router;
