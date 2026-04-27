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
    // Section title
    doc.fontSize(8).fill(color).font("Helvetica-Bold")
        .text(title.toUpperCase(), 60, y, { characterSpacing: 2 });
    y += 16;

    for (let i = 0; i < items.length; i++) {
        doc.fontSize(9).fill(TEXT_MED).font("Helvetica")
            .text(`${i + 1}. ${items[i]}`, 60, y, { width: doc.page.width - 120 });
        y += 16;
    }
    return y;
}

function drawFooter(doc: PDFKit.PDFDocument, y: number, location: string, isDD = false) {
    // Footer bar
    const footerY = Math.max(y + 30, doc.page.height - 80);
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
        y = drawDivider(doc, y);

        // Payment Summary
        y = drawSectionTitle(doc, "Payment Summary", y);
        y = drawRow(doc, "Base Price", fmtCurrency(booking.basePrice), y);
        if ((booking as any).extraAdultCharge > 0) {
            y = drawRow(doc, "Extra Adult Charge", fmtCurrency((booking as any).extraAdultCharge), y);
        }
        if ((booking as any).extraKidsCharge > 0) {
            y = drawRow(doc, "Extra Child Charge", fmtCurrency((booking as any).extraKidsCharge), y);
        }
        if (!(booking as any).extraAdultCharge && !(booking as any).extraKidsCharge && booking.extraPersonCharge > 0) {
            y = drawRow(doc, "Extra Person Charges", fmtCurrency(booking.extraPersonCharge), y);
        }
        if (booking.gstAmount > 0) {
            y = drawRow(doc, "GST", fmtCurrency(booking.gstAmount), y);
        }
        if (booking.discountAmount > 0) {
            y = drawRow(doc, "Coupon Discount", `- ${fmtCurrency(booking.discountAmount)}`, y, { color: "#16a34a" });
        }

        // Gold line before total
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
        y += 6;
        y = drawRow(doc, "Total Amount", fmtCurrency(booking.totalAmount), y, { bold: true, color: GOLD });
        y = drawDivider(doc, y);

        y = drawRow(doc, "Advance Paid", booking.amountPaid > 0 ? fmtCurrency(booking.amountPaid) : "Not yet paid", y,
            { color: booking.amountPaid > 0 ? "#16a34a" : TEXT_MED });
        y = drawRow(doc, "Balance Due at Venue", fmtCurrency(booking.amountToCollect || 0), y, { bold: true });
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
        const stayGuestsLabel = `${booking.numGuests} adult${booking.numGuests > 1 ? "s" : ""}${(booking as any).numKids > 0 ? `, ${(booking as any).numKids} child${(booking as any).numKids > 1 ? "ren" : ""}` : ""}`;
        y = drawRow(doc, "Guests", stayGuestsLabel, y);
        if ((booking as any).numCottages > 1) {
            y = drawRow(doc, "Cottages", `${(booking as any).numCottages}`, y);
        }
        y = drawDivider(doc, y);

        // Payment Summary
        y = drawSectionTitle(doc, "Payment Summary", y);
        // Per-night breakdown
        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const avgPerNight = booking.numNights > 0 ? Math.round((booking.basePrice || 0) / booking.numNights) : (booking.nightlyRate || 0);
        if (booking.numNights > 0 && booking.checkInDate) {
            for (let i = 0; i < booking.numNights; i++) {
                const d = new Date(booking.checkInDate);
                d.setDate(d.getDate() + i);
                const dayName = DAY_NAMES[d.getDay()];
                y = drawRow(doc, dayName, fmtCurrency(avgPerNight), y);
            }
        } else {
            y = drawRow(doc, "Nightly Rate", `${fmtCurrency(booking.nightlyRate)} x ${booking.numNights} night${booking.numNights > 1 ? "s" : ""}`, y);
        }
        if ((booking as any).extraAdultCharge > 0) {
            y = drawRow(doc, "Extra Adult Charge", fmtCurrency((booking as any).extraAdultCharge), y);
        }
        if ((booking as any).extraKidsCharge > 0) {
            y = drawRow(doc, "Extra Child Charge", fmtCurrency((booking as any).extraKidsCharge), y);
        }
        if (!(booking as any).extraAdultCharge && !(booking as any).extraKidsCharge && booking.extraPersonCharge > 0) {
            y = drawRow(doc, "Extra Person Charges", fmtCurrency(booking.extraPersonCharge), y);
        }
        // Add-on line items (e.g. Celebration Package)
        if (booking.addons && typeof booking.addons === "object") {
            const addonsData = Array.isArray(booking.addons) ? booking.addons : [booking.addons];
            for (const a of addonsData) {
                if (a && a.name && a.price) {
                    const label = a.occasion ? `${a.name} (${a.occasion})` : a.name;
                    y = drawRow(doc, label, fmtCurrency(a.price), y);
                }
            }
        }
        y = drawRow(doc, "Base Amount", fmtCurrency(booking.basePrice), y);
        y = drawRow(doc, "GST", fmtCurrency(booking.gstAmount), y);
        if (booking.discountAmount > 0) {
            y = drawRow(doc, "Coupon Discount", `- ${fmtCurrency(booking.discountAmount)}`, y, { color: "#16a34a" });
        }

        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(GOLD).lineWidth(1.5).stroke();
        y += 6;
        y = drawRow(doc, "Total Amount", fmtCurrency(booking.totalAmount), y, { bold: true, color: GOLD });
        y = drawDivider(doc, y);

        y = drawRow(doc, "Advance Paid", booking.advancePaid ? fmtCurrency(booking.advanceAmount) : "Not yet paid", y,
            { color: booking.advancePaid ? "#16a34a" : TEXT_MED });
        y = drawRow(doc, "Balance Due at Venue", fmtCurrency(booking.balanceAmount || 0), y, { bold: true });
        if (securityDeposit) {
            y = drawRow(doc, "Security Deposit", securityDeposit, y);
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
            doc.fontSize(10).fill(TEXT_MED).font("Helvetica")
                .text(location, { link: prop.googleMapUrl });
            y += 24;
        }

        // Important Information
        const infoItems = [
            "Please carry a valid government-issued photo ID for all guests at check-in.",
            "Early check-in and late check-out are subject to availability.",
            "The balance amount and security deposit must be paid at the venue during check-in.",
            "This booking is non-refundable. No cancellations, amendments, or date changes are permitted once confirmed.",
        ];
        if (securityDeposit) {
            infoItems.push(`Security deposit of ${securityDeposit} is applicable and will be refunded per the property's refund timeline.`);
        }
        y = drawInfoBlock(doc, "Important Information", infoItems, y);

        // Footer
        drawFooter(doc, y, location);

        doc.end();
    });
}
