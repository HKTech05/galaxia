import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// ───────────────────────────────────────────────────────────────
//  Color Palette
// ───────────────────────────────────────────────────────────────
const GOLD = "#C4A265";
const NAVY = "#1a1a2e";
const TEXT_DARK = "#1a1a2e";
const TEXT_MED = "#555555";
const BORDER = "#e8e5dd";
const DD_ROSE = "#e8a0b4";
const DD_BG = "#1e0f18";

const fmtCurrency = (v: number) => `Rs.${(v || 0).toLocaleString("en-IN")}`;

const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

const fmtShortDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

const formatHour = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${period}`;
};

// ───────────────────────────────────────────────────────────────
//  Shared PDF Helpers
// ───────────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string, isDD = false) {
    // Navy header background
    doc.rect(0, 0, doc.page.width, isDD ? 110 : 100).fill(NAVY);

    if (isDD) {
        // DD logo
        try {
            const logoPath = path.join(__dirname, "../../public/logos/digital-diaries.png");
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, doc.page.width / 2 - 15, 12, { width: 30, height: 30 });
            }
        } catch (_) { /* logo not found, skip */ }

        // DIGITAL DIARIES — large
        doc.fontSize(22).fill(GOLD).font("Helvetica-Bold");
        doc.text("DIGITAL DIARIES", 0, 48, { align: "center", width: doc.page.width, characterSpacing: 2 });

        // Gold divider
        const cx = doc.page.width / 2;
        doc.moveTo(cx - 30, 74).lineTo(cx + 30, 74).strokeColor(GOLD).lineWidth(1).stroke();

        // GALAXIA — small
        doc.fontSize(8).fill(GOLD).font("Helvetica");
        doc.text("GALAXIA", 0, 82, { align: "center", width: doc.page.width, characterSpacing: 3 });
    } else {
        // GALAXIA
        doc.fontSize(28).fill(GOLD).font("Helvetica-Bold");
        doc.text("GALAXIA", 0, 30, { align: "center", width: doc.page.width });

        // Gold divider
        const cx = doc.page.width / 2;
        doc.moveTo(cx - 30, 62).lineTo(cx + 30, 62).strokeColor(GOLD).lineWidth(1).stroke();

        // Subtitle
        doc.fontSize(8).fill(GOLD).font("Helvetica");
        doc.text(subtitle.toUpperCase(), 0, 70, { align: "center", width: doc.page.width, characterSpacing: 3 });
    }
}

function drawRow(doc: PDFKit.PDFDocument, label: string, value: string, y: number, opts?: { bold?: boolean; color?: string }) {
    const leftX = 50;
    const rightX = doc.page.width - 50;
    const valColor = opts?.color || TEXT_DARK;

    doc.fontSize(10).fill(TEXT_MED).font("Helvetica").text(label, leftX, y);
    doc.fontSize(10).fill(valColor).font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
        .text(value, leftX, y, { width: rightX - leftX, align: "right" });

    return y + 18;
}

function drawPaymentRow(doc: PDFKit.PDFDocument, label: string, value: string, y: number, opts?: { bold?: boolean; color?: string }) {
    const pageRight = doc.page.width - 50;
    const labelAreaRight = 420;
    const valueAreaLeft = 425;
    const valColor = opts?.color || TEXT_DARK;

    // Label — right-aligned in left portion
    doc.fontSize(10).fill(TEXT_MED).font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
        .text(label, 50, y, { width: labelAreaRight - 50, align: "right" });
    // Value — right-aligned at far right
    doc.fontSize(10).fill(valColor).font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
        .text(value, valueAreaLeft, y, { width: pageRight - valueAreaLeft, align: "right" });

    return y + 18;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number, color: string = GOLD) {
    doc.fontSize(8).fill(color).font("Helvetica-Bold")
        .text(title.toUpperCase(), 50, y, { characterSpacing: 2 });
    return y + 18;
}

function drawDivider(doc: PDFKit.PDFDocument, y: number) {
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(BORDER).lineWidth(0.5).stroke();
    return y + 8;
}

function drawInfoBlock(doc: PDFKit.PDFDocument, title: string, items: string[], y: number, color: string = GOLD) {
    const pageBottom = doc.page.height - 100; // leave room for footer
    // Estimate total height needed: title(16) + items(~16 each) + buffer
    const estimatedHeight = 16 + items.length * 18 + 10;
    if (y + estimatedHeight > pageBottom) {
        doc.addPage();
        y = 50;
    }

    // Section title
    doc.fontSize(8).fill(color).font("Helvetica-Bold")
        .text(title.toUpperCase(), 60, y, { characterSpacing: 2 });
    y += 16;

    for (let i = 0; i < items.length; i++) {
        // Check if we need a page break before this item
        if (y + 18 > pageBottom) {
            doc.addPage();
            y = 50;
        }
        doc.fontSize(9).fill(TEXT_MED).font("Helvetica")
            .text(`${i + 1}. ${items[i]}`, 60, y, { width: doc.page.width - 120 });
        y += 16;
    }
    return y;
}

function drawFooter(doc: PDFKit.PDFDocument, y: number, location: string, isDD = false) {
    // Always place footer at the bottom of the CURRENT page
    const footerY = doc.page.height - 80;
    doc.rect(0, footerY, doc.page.width, 80).fill(NAVY);

    if (isDD) {
        doc.fontSize(12).fill(GOLD).font("Helvetica-Bold")
            .text("DIGITAL DIARIES", 0, footerY + 12, { align: "center", width: doc.page.width, characterSpacing: 2 });

        doc.fontSize(7).fill("#888").font("Helvetica")
            .text("GALAXIA", 0, footerY + 30, { align: "center", width: doc.page.width, characterSpacing: 2 });
    } else {
        doc.fontSize(12).fill(GOLD).font("Helvetica-Bold")
            .text("GALAXIA", 0, footerY + 15, { align: "center", width: doc.page.width, characterSpacing: 3 });
    }

    doc.fontSize(7).fill("#666").font("Helvetica")
        .text(location, 0, footerY + (isDD ? 42 : 35), { align: "center", width: doc.page.width });

    doc.fontSize(7).fill("#666").font("Helvetica")
        .text("www.galaxiaresorts.com | This is an automated booking voucher.", 0, footerY + (isDD ? 55 : 48), { align: "center", width: doc.page.width });
}

// ───────────────────────────────────────────────────────────────
//  DD Booking PDF
// ───────────────────────────────────────────────────────────────
export function generateDDBookingPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 0 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const screenName = (booking.screen?.name || "Digital Diaries Screen").replace(/\s*\([^)]*\)/g, "").trim();
        const packageName = booking.package?.name || "Experience";
        const bookingDate = fmtDate(booking.bookingDate);
        const bookedOn = fmtShortDate(booking.bookedAt || new Date());
        const startTime = formatHour(booking.startHour);
        const endTime = formatHour(booking.startHour + booking.durationHours);

        // Header
        drawHeader(doc, "Digital Diaries", true);

        // Confirmed badge
        let y = 130;
        doc.fontSize(9).fill(GOLD).font("Helvetica-Bold").text("BOOKING CONFIRMED", 50, y, { characterSpacing: 2 });
        y += 18;
        doc.fontSize(16).fill(TEXT_DARK).font("Helvetica").text(`Dear ${booking.customerName},`, 50, y);
        y += 22;
        doc.fontSize(10).fill(TEXT_MED).font("Helvetica")
            .text("Your private screening experience has been confirmed. Please find your booking details below.", 50, y, { width: doc.page.width - 100 });
        y += 36;

        // Card background
        const cardTop = y;
        // Reservation section
        y = drawSectionTitle(doc, "Reservation Details", y);
        y = drawRow(doc, "Booking Reference", booking.bookingRef || "—", y, { bold: true, color: GOLD });
        y = drawRow(doc, "Booked On", bookedOn, y);
        y = drawDivider(doc, y);

        // Screening details
        y = drawSectionTitle(doc, "Screening Details", y);
        y = drawRow(doc, "Screen", screenName, y, { bold: true });
        y = drawRow(doc, "Package", packageName, y, { bold: true });
        y = drawRow(doc, "Date", bookingDate, y);
        y = drawRow(doc, "Time Slot", `${startTime} — ${endTime}`, y);
        y = drawRow(doc, "Duration", `${booking.durationHours} Hour${booking.durationHours > 1 ? "s" : ""}`, y);
        const guestsLabel = `${booking.numGuests} adult${booking.numGuests > 1 ? "s" : ""}${(booking as any).numKids > 0 ? `, ${(booking as any).numKids} child${(booking as any).numKids > 1 ? "ren" : ""}` : ""}`;
        y = drawRow(doc, "Guests", guestsLabel, y);
        if (booking.occasion) {
            y = drawRow(doc, "Occasion", booking.occasion, y);
        }
        if (booking.cakeMessage) {
            y = drawRow(doc, "Cake Message", `"${booking.cakeMessage}"`, y);
        }
        // Add-ons display (names only, no prices)
        if (booking.addons && Array.isArray(booking.addons) && booking.addons.length > 0) {
            const addonNames: string[] = [];
            for (const a of booking.addons) {
                if (a.addonType === 'balloons') addonNames.push('Balloons');
                else if (a.addonType === 'led_banner' || a.addonType === 'ledBanner') addonNames.push(`LED Banner (${a.addonValue || 'Happy Birthday'})`);
                else if (a.addonType === 'cake') addonNames.push('Cake');
            }
            if (addonNames.length > 0) {
                y = drawRow(doc, "Add-ons", addonNames.join(", "), y);
            }
        }
        y = drawDivider(doc, y);

        // Payment Summary
        y = drawSectionTitle(doc, "Payment Summary", y);
        y = drawPaymentRow(doc, "Base Price", fmtCurrency(booking.basePrice), y);
        if ((booking as any).extraAdultCharge > 0) {
            y = drawPaymentRow(doc, "Extra Adult Charge", fmtCurrency((booking as any).extraAdultCharge), y);
        }
        if ((booking as any).extraKidsCharge > 0) {
            y = drawPaymentRow(doc, "Extra Child Charge", fmtCurrency((booking as any).extraKidsCharge), y);
        }
        if (!(booking as any).extraAdultCharge && !(booking as any).extraKidsCharge && booking.extraPersonCharge > 0) {
            y = drawPaymentRow(doc, "Extra Person Charges", fmtCurrency(booking.extraPersonCharge), y);
        }
        if (booking.gstAmount > 0) {
            y = drawPaymentRow(doc, "GST", fmtCurrency(booking.gstAmount), y);
        }
        if (booking.discountAmount > 0) {
            y = drawPaymentRow(doc, "Coupon Discount", `- ${fmtCurrency(booking.discountAmount)}`, y, { color: "#16a34a" });
        }

        // Gold line before total
        doc.moveTo(250, y).lineTo(doc.page.width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
        y += 6;
        y = drawPaymentRow(doc, "Total Amount", fmtCurrency(booking.totalAmount), y, { bold: true, color: GOLD });
        y = drawDivider(doc, y);

        y = drawPaymentRow(doc, "Advance Paid", booking.amountPaid > 0 ? fmtCurrency(booking.amountPaid) : "Not yet paid", y,
            { color: booking.amountPaid > 0 ? "#16a34a" : TEXT_MED });
        y = drawPaymentRow(doc, "Balance Due at Venue", fmtCurrency(booking.amountToCollect || 0), y, { bold: true });
        y += 10;

        // Google Maps link
        doc.fontSize(10).fill(GOLD).font("Helvetica-Bold")
            .text("LOCATION: ", 50, y, { continued: true });
        doc.fontSize(10).fill(TEXT_MED).font("Helvetica")
            .text("Digital Diaries, Wadala, Mumbai", { link: "https://maps.app.goo.gl/VCu71cGbX4SbxqHLA" });
        y += 24;

        // Important Information
        y = drawInfoBlock(doc, "Important Information", [
            "Please carry a valid government-issued photo ID for verification at the venue.",
            "This booking is non-refundable. No cancellations, amendments, or date changes are permitted once confirmed.",
            "Please arrive 10 minutes before your scheduled time slot for a smooth check-in.",
            "The remaining balance must be paid at the venue prior to your screening.",
        ], y);

        // Footer
        drawFooter(doc, y, "Digital Diaries — Wadala, Mumbai, India", true);

        doc.end();
    });
}

// ───────────────────────────────────────────────────────────────
//  Staycation Booking PDF
// ───────────────────────────────────────────────────────────────
export function generateStaycationBookingPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 0 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const prop = booking.property || {};
        const sub = booking.subProperty;
        const propertyName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Galaxia Property");
        const location = prop.location || "Karjat, Maharashtra, India";
        const checkInTime = prop.checkInTime || "1:00 PM";
        const checkOutTime = prop.checkOutTime || "11:00 AM";
        const checkInDate = fmtDate(booking.checkInDate);
        const checkOutDate = fmtDate(booking.checkOutDate);
        const bookedOn = fmtShortDate(booking.bookedAt || new Date());
        const securityDeposit = booking.securityDeposit ? fmtCurrency(booking.securityDeposit) : null;

        // Header
        drawHeader(doc, "Premium Staycation Experience");

        let y = 120;
        doc.fontSize(9).fill(GOLD).font("Helvetica-Bold").text("BOOKING CONFIRMED", 50, y, { characterSpacing: 2 });
        y += 18;
        doc.fontSize(16).fill(TEXT_DARK).font("Helvetica").text(`Dear ${booking.customerName},`, 50, y);
        y += 22;
        doc.fontSize(10).fill(TEXT_MED).font("Helvetica")
            .text("Thank you for choosing Galaxia. Your reservation has been confirmed and we look forward to welcoming you.", 50, y, { width: doc.page.width - 100 });
        y += 36;

        // Customer Details
        y = drawSectionTitle(doc, "Customer Details", y);
        y = drawRow(doc, "Name", booking.customerName || "—", y, { bold: true });
        if (booking.customerPhone) y = drawRow(doc, "Phone", booking.customerPhone, y);
        if (booking.customerEmail) y = drawRow(doc, "Email", booking.customerEmail, y);
        // Extract food preference from addons
        let foodPreference = "";
        if (booking.addons && typeof booking.addons === "object") {
            const addonsArr = Array.isArray(booking.addons) ? booking.addons : [booking.addons];
            for (const a of addonsArr) {
                if (a && a.name === 'Food Preference' && a.foodType) foodPreference = a.foodType;
            }
        }
        if (foodPreference) y = drawRow(doc, "Food Preference", foodPreference, y);
        y = drawDivider(doc, y);

        // Reservation
        y = drawSectionTitle(doc, "Reservation Details", y);
        y = drawRow(doc, "Booking Reference", booking.bookingRef || "—", y, { bold: true, color: GOLD });
        y = drawRow(doc, "Booked On", bookedOn, y);
        y = drawDivider(doc, y);

        // Property
        y = drawSectionTitle(doc, "Property", y);
        y = drawRow(doc, "Venue", propertyName, y, { bold: true });
        y = drawRow(doc, "Location", location, y);
        y = drawDivider(doc, y);

        // Stay Details
        y = drawSectionTitle(doc, "Stay Details", y);
        y = drawRow(doc, "Check-in", `${checkInDate}  |  ${checkInTime}`, y);
        y = drawRow(doc, "Check-out", `${checkOutDate}  |  ${checkOutTime}`, y);
        y = drawRow(doc, "Duration", `${booking.numNights} Night${booking.numNights > 1 ? "s" : ""}`, y);
        const totalAdults = booking.numGuests;
        const totalKids = (booking as any).numKids || 0;
        const stayGuestsLabel = `${totalAdults} adult${totalAdults > 1 ? "s" : ""}${totalKids > 0 ? `, ${totalKids} child${totalKids > 1 ? "ren" : ""}` : ""}`;
        y = drawRow(doc, "Guests", stayGuestsLabel, y);
        if ((booking as any).numCottages > 1 || (booking as any).property?.slug === 'amstel-nest') {
            y = drawRow(doc, "Cottages", `${(booking as any).numCottages || 1}`, y);
        }
        y = drawDivider(doc, y);

        // Pricing Reconstruction Logic
        const calculatedRoomTotal = (booking.nightlyRate || 0) * (booking.numNights || 1) * (booking.numCottages || 1);
        const isHistoricalReceptionDiscounted = booking.source === "reception" && 
            booking.discountAmount > 0 && 
            booking.basePrice < calculatedRoomTotal;
        const displayBasePrice = isHistoricalReceptionDiscounted ? calculatedRoomTotal : (booking.basePrice || 0);

        const extraAdult = booking.extraAdultCharge || 0;
        const extraKids = booking.extraKidsCharge || 0;
        const extraPerson = booking.extraPersonCharge || 0;
        const petCharges = (booking.numPets || 0) * 600;

        let addonsTotal = 0;
        const displayAddons: { label: string; price: number }[] = [];
        if (booking.addons && typeof booking.addons === "object") {
            const addonsData = Array.isArray(booking.addons) ? booking.addons : [booking.addons];
            for (const a of addonsData) {
                if (a && a.name !== 'Food Preference' && a.price) {
                    const price = Number(a.price) || 0;
                    addonsTotal += price;
                    displayAddons.push({
                        label: a.occasion ? `${a.name} (${a.occasion})` : a.name,
                        price
                    });
                }
            }
        }

        const discountAmount = booking.discountAmount || 0;
        const taxes = booking.gstAmount || 0;
        const advanceAmount = booking.advanceAmount || 0;
        const balanceAmount = booking.balanceAmount || 0;

        // Reconstruct the correct Total Amount (pre-tax subtotal)
        // Mathematically guarantees Total + Taxes = Advance + Balance
        const displayTotalAmount = (advanceAmount + balanceAmount) - taxes;

        y = drawSectionTitle(doc, "Payment Summary", y);
        y = drawPaymentRow(doc, "Base Price", fmtCurrency(displayBasePrice), y, { bold: true });

        if (extraAdult > 0) {
            y = drawPaymentRow(doc, "Extra Adult Charge", fmtCurrency(extraAdult), y);
        }
        if (extraKids > 0) {
            y = drawPaymentRow(doc, "Extra Child Charge", fmtCurrency(extraKids), y);
        }
        if (!extraAdult && !extraKids && extraPerson > 0) {
            y = drawPaymentRow(doc, "Extra Person Charges", fmtCurrency(extraPerson), y);
        }
        if (petCharges > 0) {
            y = drawPaymentRow(doc, "Pet Charges", fmtCurrency(petCharges), y);
        }
        for (const addon of displayAddons) {
            y = drawPaymentRow(doc, addon.label, fmtCurrency(addon.price), y);
        }
        if (discountAmount > 0) {
            const discountLabel = (booking.couponId || booking.couponCode || booking.coupon) ? "Coupon Applied" : "Discount";
            y = drawPaymentRow(doc, discountLabel, `- ${fmtCurrency(discountAmount)}`, y, { color: "#16a34a" });
        }

        doc.moveTo(250, y).lineTo(doc.page.width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
        y += 6;
        y = drawPaymentRow(doc, "Total Amount", fmtCurrency(displayTotalAmount), y, { bold: true, color: GOLD });
        y = drawPaymentRow(doc, "Taxes", fmtCurrency(taxes), y);
        y = drawDivider(doc, y);

        y = drawPaymentRow(doc, "Advance Paid", booking.advancePaid ? fmtCurrency(advanceAmount) : "Not yet paid", y,
            { color: booking.advancePaid ? "#16a34a" : TEXT_MED });
        y = drawPaymentRow(doc, "Balance Due at Venue", fmtCurrency(balanceAmount), y, { bold: true });
        if (securityDeposit) {
            y = drawPaymentRow(doc, "Security Deposit - Pay at Venue", securityDeposit, y);
        }
        y += 10;

        // Food section
        if (prop.foodIncluded) {
            doc.fontSize(8).fill(GOLD).font("Helvetica-Bold")
                .text("MEALS INCLUDED", 50, y, { characterSpacing: 2 });
            y += 14;
            doc.fontSize(9).fill(TEXT_MED).font("Helvetica")
                .text(prop.foodDetails || "Complimentary meals included.", 60, y, { width: doc.page.width - 120 });
            y += 18;
        }

        // Google Maps
        if (prop.googleMapUrl) {
            doc.fontSize(10).fill(GOLD).font("Helvetica-Bold")
                .text("LOCATION: ", 50, y, { continued: true });
            doc.fontSize(10).fill("#2563eb").font("Helvetica")
                .text(location, { link: prop.googleMapUrl, underline: true });
            y += 24;
        }

        // Resort Booking Terms & Conditions — property-aware text
        const propSlug = (prop.slug || "").toLowerCase();
        const isAmbroseOrAmstel = propSlug === "ambrose" || propSlug === "amstel-nest";

        // Build structured T&C sections
        const tcSections: { title: string; items: string[] }[] = [
            {
                title: "Booking Policy",
                items: [
                    "All bookings are strictly non-transferable and non-refundable.",
                    "Date change requests are subject to availability and management approval only.",
                ],
            },
            {
                title: "Check-in / Check-out Policy",
                items: [
                    "Standard check-in and check-out timings must be followed.",
                    "Early check-in and late check-out are subject to availability and will be chargeable extra.",
                ],
            },
            {
                title: "Property Rules",
                items: [
                    "Free parking is available for in-house guests.",
                    ...(isAmbroseOrAmstel ? [] : ["Food and restaurant bills must be paid directly to the respective restaurant/vendor."]),
                    "Shifting or moving any furniture, appliances, or property items is strictly prohibited.",
                    "Guests are requested to maintain cleanliness and proper decorum within the premises.",
                    "Any damage caused to the property, furniture, appliances, or amenities will be chargeable to the guest.",
                ],
            },
            {
                title: "Electricity & Utilities",
                items: [
                    "Due to local area conditions, unpredictable power cuts may occur occasionally.",
                ],
            },
            {
                title: "Swimming Pool Rules",
                items: [
                    "Guests using the swimming pool must strictly follow all safety rules and instructions.",
                    "Children using the swimming pool must be accompanied by adults.",
                    "Management will not be responsible for any accident, injury, or loss caused due to negligence or violation of safety rules.",
                ],
            },
            {
                title: "Management Rights",
                items: [
                    "The management reserves the right to refuse admission or cancel bookings in case of misconduct, nuisance, illegal activities, or violation of property rules.",
                ],
            },
        ];

        // Render T&C block
        const pageBottom = doc.page.height - 100;
        // Estimate total height
        const totalTcItems = tcSections.reduce((sum, s) => sum + s.items.length + 1, 0);
        const estimatedHeight = 20 + totalTcItems * 14 + tcSections.length * 8;
        if (y + estimatedHeight > pageBottom) {
            doc.addPage();
            y = 50;
        }

        // Main title
        doc.fontSize(8).fill(GOLD).font("Helvetica-Bold")
            .text("RESORT BOOKING TERMS & CONDITIONS", 60, y, { characterSpacing: 2 });
        y += 18;

        for (const section of tcSections) {
            // Check page break
            if (y + 14 + section.items.length * 13 > pageBottom) {
                doc.addPage();
                y = 50;
            }
            // Section header
            doc.fontSize(9).fill(GOLD).font("Helvetica-Bold")
                .text(section.title, 60, y);
            y += 14;
            // Section items
            for (const item of section.items) {
                if (y + 14 > pageBottom) { doc.addPage(); y = 50; }
                doc.fontSize(8.5).fill(TEXT_MED).font("Helvetica")
                    .text(`•  ${item}`, 68, y, { width: doc.page.width - 136 });
                y += doc.heightOfString(`•  ${item}`, { width: doc.page.width - 136 }) + 3;
            }
            y += 4;
        }

        // Footer
        drawFooter(doc, y, location);

        doc.end();
    });
}

// ───────────────────────────────────────────────────────────────
//  Staycation Quotation PDF
// ───────────────────────────────────────────────────────────────
export function generateQuotationPDF(data: {
    quoteId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    propertyName: string;
    villaName?: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    kids: number;
    pets: number;
    regularCount?: number;
    jainCount?: number;
    decoration?: boolean;
    foodType?: string;
    villaQuantities?: any;
}, pricing: {
    nights: number;
    roomTotal: number;
    extraAdultCharge: number;
    extraKidsCharge: number;
    decorationCharge: number;
    subtotal: number;
    gstAmount: number;
    petCharge: number;
    totalAmount: number;
    nightlyRoomRate: number;
}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 0 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const propertyName = data.villaName
            ? `${data.villaName} — ${data.propertyName}`
            : data.propertyName;

        const checkInDate = fmtDate(data.checkIn + "T00:00:00");
        const checkOutDate = fmtDate(data.checkOut + "T00:00:00");
        const quoteDate = fmtShortDate(new Date());

        // Header
        drawHeader(doc, "Staycation Quotation");

        let y = 120;
        doc.fontSize(9).fill(GOLD).font("Helvetica-Bold").text("QUOTATION", 50, y, { characterSpacing: 2 });
        y += 18;
        doc.fontSize(16).fill(TEXT_DARK).font("Helvetica").text(`Dear ${data.customerName},`, 50, y);
        y += 22;
        doc.fontSize(10).fill(TEXT_MED).font("Helvetica")
            .text("Thank you for your interest in Galaxia. Please find your personalised quotation below.", 50, y, { width: doc.page.width - 100 });
        y += 36;

        // Quotation Details
        y = drawSectionTitle(doc, "Quotation Details", y);
        y = drawRow(doc, "Quote Reference", data.quoteId, y, { bold: true, color: GOLD });
        y = drawRow(doc, "Quote Date", quoteDate, y);
        y = drawDivider(doc, y);

        // Customer Details
        y = drawSectionTitle(doc, "Customer Details", y);
        y = drawRow(doc, "Name", data.customerName, y, { bold: true });
        if (data.customerPhone) y = drawRow(doc, "Phone", data.customerPhone, y);
        if (data.customerEmail) y = drawRow(doc, "Email", data.customerEmail, y);
        if (data.foodType) y = drawRow(doc, "Food Preference", data.foodType, y);
        y = drawDivider(doc, y);

        // Property
        y = drawSectionTitle(doc, "Property", y);
        y = drawRow(doc, "Venue", propertyName, y, { bold: true });
        y = drawRow(doc, "Location", "Karjat, Maharashtra, India", y);
        y = drawDivider(doc, y);

        // Stay Details
        y = drawSectionTitle(doc, "Stay Details", y);
        y = drawRow(doc, "Check-in", `${checkInDate}  |  1:00 PM`, y);
        y = drawRow(doc, "Check-out", `${checkOutDate}  |  11:00 AM`, y);
        y = drawRow(doc, "Duration", `${pricing.nights} Night${pricing.nights > 1 ? "s" : ""}`, y);
        const totalAdults = data.adults;
        const totalKids = data.kids || 0;
        const guestsLabel = `${totalAdults} adult${totalAdults > 1 ? "s" : ""}${totalKids > 0 ? `, ${totalKids} child${totalKids > 1 ? "ren" : ""}` : ""}`;
        y = drawRow(doc, "Guests", guestsLabel, y);
        if (data.pets > 0) y = drawRow(doc, "Pets", `${data.pets}`, y);
        // Multi-villa display
        if ((data as any).villaQuantities) {
            const vq = (data as any).villaQuantities;
            if (typeof vq === "object") {
                for (const [name, qty] of Object.entries(vq)) {
                    if ((qty as number) > 0) {
                        y = drawRow(doc, name, `× ${qty}`, y);
                    }
                }
            }
        }
        if (data.jainCount && data.jainCount > 0) y = drawRow(doc, "Jain Meals", `${data.jainCount}`, y);
        if (data.regularCount && data.regularCount > 0) y = drawRow(doc, "Regular Meals", `${data.regularCount}`, y);
        y = drawDivider(doc, y);

        // Payment Summary
        y = drawSectionTitle(doc, "Payment Summary", y);
        y = drawPaymentRow(doc, "Base Price", fmtCurrency(pricing.roomTotal + pricing.gstAmount), y, { bold: true });
        if (pricing.extraAdultCharge > 0) {
            y = drawPaymentRow(doc, "Extra Adult Charge", fmtCurrency(pricing.extraAdultCharge), y);
        }
        if (pricing.extraKidsCharge > 0) {
            y = drawPaymentRow(doc, "Extra Child Charge", fmtCurrency(pricing.extraKidsCharge), y);
        }
        if (pricing.decorationCharge > 0) {
            y = drawPaymentRow(doc, "Celebration Add-on", fmtCurrency(pricing.decorationCharge), y);
        }
        if (pricing.petCharge > 0) {
            y = drawPaymentRow(doc, "Pet Charges", fmtCurrency(pricing.petCharge), y);
        }

        // Gold line before total
        doc.moveTo(250, y).lineTo(doc.page.width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
        y += 6;
        y = drawPaymentRow(doc, "Total Amount", fmtCurrency(pricing.totalAmount), y, { bold: true, color: GOLD });
        y += 10;

        // Important Information
        y = drawInfoBlock(doc, "Terms & Conditions", [
            "This quotation is valid for 7 days from the date of issue.",
            "Prices are subject to change based on availability.",
            "This booking is non-refundable — no cancellations, amendments, or date changes are permitted once confirmed.",
            "80% payable online at booking. 20% payable at the venue.",
            "Check-in: 1:00 PM | Check-out: 11:00 AM",
            "Security deposit is collected at venue and refunded at checkout.",
        ], y);

        // Footer
        drawFooter(doc, y, "Karjat, Maharashtra, India");

        doc.end();
    });
}

