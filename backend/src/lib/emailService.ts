import { Resend } from "resend";

// ───────────────────────────────────────────────────────────────
//  Resend Client — Domain verified: galaxiaresorts.com
//  Lazy-initialized to prevent crash if RESEND_API_KEY is missing
// ───────────────────────────────────────────────────────────────
let _resend: Resend | null = null;
function getResend(): Resend | null {
    if (!process.env.RESEND_API_KEY) return null;
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

const FROM_EMAIL = "Galaxia <admin@galaxiaresorts.com>";
const REPLY_TO = "admin@galaxiaresorts.com";

// ───────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────
const fmtCurrency = (v: number) => `₹${(v || 0).toLocaleString("en-IN")}`;

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

// ───────────────────────────────────────────────────────────────
//  Shared Styles
// ───────────────────────────────────────────────────────────────
const GOLD = "#C4A265";
const NAVY = "#1a1a2e";
const NAVY_LIGHT = "#16213e";
const WARM_BG = "#faf9f6";
const BORDER = "#e8e5dd";
const TEXT_DARK = "#1a1a2e";
const TEXT_MED = "#555";
const TEXT_LIGHT = "#888";

function row(label: string, value: string, opts?: { bold?: boolean; color?: string; borderTop?: boolean }) {
    const tdStyle = opts?.borderTop ? `border-top: 2px solid ${GOLD}; padding: 14px 0;` : "padding: 10px 0;";
    const valWeight = opts?.bold ? "700" : "500";
    const valColor = opts?.color || TEXT_DARK;
    return `<tr>
        <td style="${tdStyle} color: ${TEXT_MED}; font-size: 13px; letter-spacing: 0.3px;">${label}</td>
        <td style="${tdStyle} text-align: right; font-weight: ${valWeight}; color: ${valColor}; font-size: 14px; font-family: 'Times New Roman', Times, serif;">${value}</td>
    </tr>`;
}

function paymentRow(label: string, value: string, opts?: { bold?: boolean; color?: string; borderTop?: boolean }) {
    const tdStyle = opts?.borderTop ? `border-top: 2px solid ${GOLD}; padding: 14px 0;` : "padding: 10px 0;";
    const valWeight = opts?.bold ? "700" : "500";
    const valColor = opts?.color || TEXT_DARK;
    return `<tr>
        <td colspan="2" style="${tdStyle} text-align: right;">
            <span style="color: ${TEXT_MED}; font-size: 13px; letter-spacing: 0.3px; margin-right: 10px;">${label}</span>
            <span style="font-weight: ${valWeight}; color: ${valColor}; font-size: 14px; font-family: 'Times New Roman', Times, serif; display: inline-block; min-width: 80px; text-align: right;">${value}</span>
        </td>
    </tr>`;
}

function divider() {
    return `<tr><td colspan="2" style="padding: 0;"><div style="height: 1px; background: ${BORDER}; margin: 4px 0;"></div></td></tr>`;
}

function sectionTitle(title: string) {
    return `<tr><td colspan="2" style="padding: 18px 0 8px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">${title}</td></tr>`;
}

// ───────────────────────────────────────────────────────────────
//  Staycation Booking Confirmation
// ───────────────────────────────────────────────────────────────
export async function sendBookingConfirmation(booking: any): Promise<void> {
    if (!process.env.RESEND_API_KEY || !booking.customerEmail) return;

    const email = booking.customerEmail;
    const prop = booking.property || {};
    const sub = booking.subProperty;
    const propertyName = sub ? `${sub.name} — ${prop.name}` : (prop.name || "Galaxia Property");
    const location = prop.location || "Karjat, Maharashtra, India";
    const mapsLink = prop.googleMapUrl || "";
    const checkInTime = prop.checkInTime || "1:00 PM";
    const checkOutTime = prop.checkOutTime || "11:00 AM";

    const checkInDate = fmtDate(booking.checkInDate);
    const checkOutDate = fmtDate(booking.checkOutDate);
    const bookedOn = fmtShortDate(booking.bookedAt || new Date());

    const advancePaid = booking.advancePaid ? fmtCurrency(booking.advanceAmount) : "Not yet paid";
    const balanceDue = fmtCurrency(booking.balanceAmount || 0);
    const securityDeposit = booking.securityDeposit ? fmtCurrency(booking.securityDeposit) : null;
    const securityRefund = prop.securityRefund || "Refundable at checkout (subject to property condition)";

    const discountRow = booking.discountAmount > 0
        ? paymentRow("Coupon Discount", `- ${fmtCurrency(booking.discountAmount)}`, { color: "#16a34a" })
        : "";

    // Build add-on rows (e.g. Celebration Package ₹1,200)
    let addonRows = "";
    let foodPreference = "";
    if (booking.addons && typeof booking.addons === "object") {
        const addonsData = Array.isArray(booking.addons) ? booking.addons : [booking.addons];
        for (const a of addonsData) {
            if (a && a.name === 'Food Preference' && a.foodType) {
                foodPreference = a.foodType;
            } else if (a && a.name && a.price) {
                const label = a.occasion ? `${a.name} (${a.occasion})` : a.name;
                addonRows += paymentRow(label, fmtCurrency(a.price));
            }
        }
    }

    const foodSection = prop.foodIncluded
        ? `<div style="margin-top: 20px; padding: 18px 22px; background: #f5f0e6; border-radius: 8px; border-left: 3px solid ${GOLD};">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">Meals Included</p>
            <p style="margin: 0; font-size: 13px; color: ${TEXT_MED}; line-height: 1.6;">${prop.foodDetails || "Complimentary meals included with your stay."}${prop.foodType ? ` (${prop.foodType})` : ""}</p>
           </div>`
        : "";

    const mapsButton = mapsLink
        ? `<div style="text-align: center; margin-top: 24px;">
            <a href="${mapsLink}" target="_blank" style="display: inline-block; padding: 12px 32px; background: ${NAVY}; color: ${GOLD}; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 1px; border-radius: 6px; text-transform: uppercase;">View on Google Maps</a>
           </div>
           <div style="margin-top: 16px; padding: 14px 22px; background: #f5f0e6; border-radius: 8px; border-left: 3px solid ${GOLD};">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">How to Reach</p>
            <p style="margin: 0; font-size: 13px; color: ${TEXT_MED}; line-height: 1.6;">Nearest Station: Karjat (30-40 mins journey from station via auto/cab).<br>From Mumbai: Approximately 2 hours via Mumbai-Pune Expressway.</p>
           </div>`
        : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #ffffff;">
<div style="max-width: 640px; margin: 0 auto; font-family: 'Georgia', 'Times New Roman', serif; background: #e8e5dd;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT}); padding: 40px 32px; text-align: center;">
        <h1 style="margin: 0; color: ${GOLD}; font-size: 32px; letter-spacing: 6px; font-weight: 400;">GALAXIA</h1>
        <div style="width: 60px; height: 1px; background: ${GOLD}; margin: 12px auto;"></div>
        <p style="margin: 0; color: rgba(196,162,101,0.7); font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">Premium Staycation Experience</p>
    </div>

    <!-- Body -->
    <div style="background: ${WARM_BG}; padding: 40px 32px;">

        <!-- Greeting -->
        <p style="margin: 0 0 6px; font-size: 13px; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Booking Confirmed</p>
        <h2 style="margin: 0 0 4px; font-size: 22px; color: ${TEXT_DARK}; font-weight: 400;">Dear ${booking.customerName},</h2>
        <p style="margin: 0 0 20px; font-size: 14px; color: ${TEXT_MED}; line-height: 1.6;">
            Thank you for choosing Galaxia. Your reservation has been confirmed and we look forward to welcoming you. Please find your complete booking details below.
        </p>

        <!-- Customer Details -->
        <div style="margin-bottom: 24px; padding: 18px 22px; background: white; border-radius: 10px; border: 1px solid ${BORDER}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <table style="width: 100%; border-collapse: collapse;">
                ${sectionTitle("Customer Details")}
                ${row("Name", booking.customerName, { bold: true })}
                ${booking.customerPhone ? row("Phone", booking.customerPhone) : ""}
                ${booking.customerEmail ? row("Email", booking.customerEmail) : ""}
                ${foodPreference ? row("Food Preference", foodPreference) : ""}
            </table>
        </div>

        <!-- Booking Details Card -->
        <div style="background: white; border-radius: 10px; padding: 28px; border: 1px solid ${BORDER}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <table style="width: 100%; border-collapse: collapse;">
                ${sectionTitle("Reservation Details")}
                ${row("Booking Reference", booking.bookingRef, { bold: true })}
                ${row("Booked On", bookedOn)}
                ${divider()}
                ${sectionTitle("Property")}
                ${row("Venue", propertyName, { bold: true })}
                ${row("Location", mapsLink ? `<a href="${mapsLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${location}</a>` : location)}
                ${divider()}
                ${sectionTitle("Stay Details")}
                ${row("Check-in", `${checkInDate}  ·  ${checkInTime}`)}
                ${row("Check-out", `${checkOutDate}  ·  ${checkOutTime}`)}
                ${row("Duration", `${booking.numNights} Night${booking.numNights > 1 ? "s" : ""}`)}
                ${row("Guests", `${booking.numGuests} adult${booking.numGuests > 1 ? "s" : ""}${(booking as any).numKids > 0 ? `, ${(booking as any).numKids} child${(booking as any).numKids > 1 ? "ren" : ""}` : ""}`)}
                ${((booking as any).numCottages > 1 || (booking as any).property?.slug === 'amstel-nest') ? row("Cottages", `${(booking as any).numCottages || 1}`) : ""}
                ${divider()}
                ${sectionTitle("Payment Summary")}
                ${(() => {
                    // Compute room-only total (exclude extra charges and GST)
                    const storedExtraAdult = (booking as any).extraAdultCharge || 0;
                    const storedExtraKids = (booking as any).extraKidsCharge || 0;
                    const totalRoomPrice = Math.max(0, (booking.basePrice || 0) - storedExtraAdult - storedExtraKids);
                    return paymentRow("Total Room Price", fmtCurrency(totalRoomPrice), { bold: true });
                })()}
                ${(booking.gstAmount || 0) > 0 ? paymentRow("GST", fmtCurrency(booking.gstAmount)) : ""}
                ${(() => {
                    const storedExtraAdult = (booking as any).extraAdultCharge || 0;
                    const storedExtraKids = (booking as any).extraKidsCharge || 0;
                    let extraRows = '';
                    if (storedExtraAdult > 0) extraRows += paymentRow("Extra Adult Charge", fmtCurrency(storedExtraAdult));
                    if (storedExtraKids > 0) extraRows += paymentRow("Extra Child Charge", fmtCurrency(storedExtraKids));
                    if (!storedExtraAdult && !storedExtraKids && booking.extraPersonCharge > 0) {
                        extraRows += paymentRow("Extra Person Charges", fmtCurrency(booking.extraPersonCharge));
                    }
                    return extraRows;
                })()}
                ${addonRows}
                ${discountRow}
                ${paymentRow("Total Amount", fmtCurrency(booking.totalAmount), { bold: true, color: GOLD, borderTop: true })}
                ${divider()}
                ${paymentRow("Advance Paid", advancePaid, { color: booking.advancePaid ? "#16a34a" : TEXT_MED })}
                ${paymentRow("Balance Due at Venue", balanceDue, { bold: true })}
                ${securityDeposit ? paymentRow("Security Deposit - Pay at Venue", securityDeposit) : ""}
            </table>
        </div>

        ${foodSection}

        <!-- Security Deposit Note -->
        ${securityDeposit ? `
        <div style="margin-top: 20px; padding: 18px 22px; background: #f5f0e6; border-radius: 8px; border-left: 3px solid ${GOLD};">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">Security Deposit - Pay at Venue</p>
            <p style="margin: 0; font-size: 13px; color: ${TEXT_MED}; line-height: 1.6;">A security deposit of ${securityDeposit} is applicable and will be collected at the venue. ${securityRefund}</p>
        </div>` : ""}

        ${mapsButton}

        <!-- Resort Booking Terms & Conditions -->
        <div style="margin-top: 28px; padding: 22px; background: white; border-radius: 10px; border: 1px solid ${BORDER};">
            <p style="margin: 0 0 16px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">Resort Booking Terms & Conditions</p>
            ${(() => {
                const propSlug = (prop.slug || "").toLowerCase();
                const isAmbroseOrAmstel = propSlug === "ambrose" || propSlug === "amstel-nest";
                const sections = [
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
                return sections.map(s => `
                    <p style="margin: 12px 0 6px; font-size: 12px; font-weight: 700; color: ${GOLD};">${s.title}</p>
                    ${s.items.map(item => `<p style="margin: 0 0 4px; padding-left: 12px; font-size: 12px; color: ${TEXT_MED}; line-height: 1.5;">•&nbsp; ${item}</p>`).join('')}
                `).join('');
            })()}
        </div>

        <!-- Contact -->
        <div style="margin-top: 28px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 11px; color: ${TEXT_LIGHT}; letter-spacing: 1px; text-transform: uppercase;">Need assistance?</p>
            <p style="margin: 0; font-size: 13px; color: ${TEXT_MED};">
                <a href="https://www.galaxiaresorts.com" target="_blank" style="color: ${GOLD}; text-decoration: none; font-weight: 600;">www.galaxiaresorts.com</a>
            </p>
        </div>
    </div>

    <!-- Footer -->
    <div style="background: ${NAVY}; padding: 28px 32px; text-align: center;">
        <p style="margin: 0 0 4px; color: ${GOLD}; font-size: 14px; letter-spacing: 3px; font-weight: 400;">GALAXIA</p>
        <p style="margin: 0 0 12px; color: rgba(255,255,255,0.3); font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Premium Staycation Experience</p>
        <div style="width: 40px; height: 1px; background: rgba(196,162,101,0.3); margin: 0 auto 12px;"></div>
        <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px; line-height: 1.6;">
            ${location}<br>
            This is an automated confirmation. Please do not reply to this email.
        </p>
    </div>

</div>
</body>
</html>`;

    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: email,
            replyTo: REPLY_TO,
            subject: `Booking Confirmed | ${booking.bookingRef} — ${propertyName}`,
            html,
        });
        console.log(`[Email] Staycation confirmation sent to ${email}`);
    } catch (error) {
        console.error("[Email] Failed to send staycation confirmation:", error);
    }
}

// ───────────────────────────────────────────────────────────────
//  DD Booking Confirmation
// ───────────────────────────────────────────────────────────────
const DD_DARK = "#0d050a";
const DD_BG = "#1a0a14";
const DD_ROSE = "#e8a0b4";
const DD_ROSE_DIM = "#c97a90";
const DD_BORDER = "rgba(232,160,180,0.15)";

function ddRow(label: string, value: string, opts?: { bold?: boolean; color?: string; borderTop?: boolean }) {
    const tdStyle = opts?.borderTop ? `border-top: 2px solid ${DD_ROSE}; padding: 14px 0;` : "padding: 10px 0;";
    const valWeight = opts?.bold ? "700" : "500";
    const valColor = opts?.color || "white";
    return `<tr>
        <td style="${tdStyle} color: ${DD_ROSE_DIM}; font-size: 13px; letter-spacing: 0.3px;">${label}</td>
        <td style="${tdStyle} text-align: right; font-weight: ${valWeight}; color: ${valColor}; font-size: 14px;">${value}</td>
    </tr>`;
}

function ddDivider() {
    return `<tr><td colspan="2" style="padding: 0;"><div style="height: 1px; background: ${DD_BORDER}; margin: 4px 0;"></div></td></tr>`;
}

function ddSectionTitle(title: string) {
    return `<tr><td colspan="2" style="padding: 18px 0 8px; font-size: 11px; font-weight: 700; color: ${DD_ROSE}; letter-spacing: 2px; text-transform: uppercase;">${title}</td></tr>`;
}

export async function sendDDBookingConfirmation(booking: any): Promise<void> {
    if (!process.env.RESEND_API_KEY || !booking.customerEmail) return;

    const email = booking.customerEmail;
    const screenName = (booking.screen?.name || "Digital Diaries Screen").replace(/\s*\([^)]*\)/g, "").trim();
    const packageName = booking.package?.name || "Experience";
    const bookingDate = fmtDate(booking.bookingDate);
    const bookedOn = fmtShortDate(booking.bookedAt || new Date());

    const formatHour = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:00 ${period}`;
    };

    const startTime = formatHour(booking.startHour);
    const endTime = formatHour(booking.startHour + booking.durationHours);
    const advancePaid = booking.amountPaid > 0 ? fmtCurrency(booking.amountPaid) : "Not yet paid";
    const balanceDue = fmtCurrency(booking.amountToCollect || 0);

    const discountRow = booking.discountAmount > 0
        ? ddRow("Coupon Discount", `- ${fmtCurrency(booking.discountAmount)}`, { color: "#86efac" })
        : "";

    const occasionRow = booking.occasion
        ? ddRow("Occasion", booking.occasion)
        : "";

    const cakeRow = booking.cakeMessage
        ? ddRow("Cake Message", `"${booking.cakeMessage}"`)
        : "";

    const mapsButton = `<div style="text-align: center; margin-top: 24px;">
        <a href="https://maps.app.goo.gl/VCu71cGbX4SbxqHLA" target="_blank" style="display: inline-block; padding: 12px 32px; background: ${DD_ROSE}; color: ${DD_DARK}; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 1px; border-radius: 6px; text-transform: uppercase;">View on Google Maps</a>
       </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #ffffff;">
<div style="max-width: 640px; margin: 0 auto; font-family: 'Georgia', 'Times New Roman', serif; background: #1a0a14;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2d0a1e, ${DD_BG}); padding: 40px 32px; text-align: center;">
        <h1 style="margin: 0; color: ${DD_ROSE}; font-size: 32px; letter-spacing: 6px; font-weight: 400;">GALAXIA</h1>
        <div style="width: 60px; height: 1px; background: ${DD_ROSE}; margin: 12px auto;"></div>
        <p style="margin: 0; color: ${DD_ROSE_DIM}; font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">Digital Diaries</p>
    </div>

    <!-- Body -->
    <div style="background: ${DD_BG}; padding: 40px 32px;">

        <p style="margin: 0 0 6px; font-size: 13px; color: ${DD_ROSE}; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Booking Confirmed</p>
        <h2 style="margin: 0 0 4px; font-size: 22px; color: white; font-weight: 400;">Dear ${booking.customerName},</h2>
        <p style="margin: 0 0 28px; font-size: 14px; color: ${DD_ROSE_DIM}; line-height: 1.6;">
            Your private screening experience has been confirmed. We look forward to hosting you. Please find your booking details below.
        </p>

        <!-- Booking Card -->
        <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 28px; border: 1px solid ${DD_BORDER};">
            <table style="width: 100%; border-collapse: collapse;">
                ${ddSectionTitle("Reservation Details")}
                ${ddRow("Booking Reference", booking.bookingRef, { bold: true, color: DD_ROSE })}
                ${ddRow("Booked On", bookedOn)}
                ${ddDivider()}
                ${ddSectionTitle("Screening Details")}
                ${ddRow("Screen", screenName, { bold: true })}
                ${ddRow("Package", packageName, { bold: true })}
                ${ddRow("Date", bookingDate)}
                ${ddRow("Time Slot", `${startTime} — ${endTime}`)}
                ${ddRow("Duration", `${booking.durationHours} Hour${booking.durationHours > 1 ? "s" : ""}`)}
                ${ddRow("Guests", `${booking.numGuests} Guest${booking.numGuests > 1 ? "s" : ""}`)}
                ${occasionRow}
                ${cakeRow}
                ${(() => {
                    if (!booking.addons || !Array.isArray(booking.addons) || booking.addons.length === 0) return '';
                    const addonNames: string[] = [];
                    for (const a of booking.addons) {
                        if (a.addonType === 'balloons') addonNames.push('Balloons');
                        else if (a.addonType === 'led_banner' || a.addonType === 'ledBanner') addonNames.push(`LED Banner (${a.addonValue || 'Happy Birthday'})`);
                        else if (a.addonType === 'cake') addonNames.push('Cake');
                    }
                    if (addonNames.length === 0) return '';
                    return ddRow("Add-ons", addonNames.join(", "));
                })()}
                ${ddDivider()}
                ${ddSectionTitle("Payment Summary")}
                ${ddRow("Base Price", fmtCurrency(booking.basePrice))}
                ${booking.extraPersonCharge > 0 ? ddRow("Extra Person Charges", fmtCurrency(booking.extraPersonCharge)) : ""}
                ${booking.gstAmount > 0 ? ddRow("GST", fmtCurrency(booking.gstAmount)) : ""}
                ${discountRow}
                ${ddRow("Total Amount", fmtCurrency(booking.totalAmount), { bold: true, color: DD_ROSE, borderTop: true })}
                ${ddDivider()}
                ${ddRow("Advance Paid", advancePaid, { color: booking.amountPaid > 0 ? "#86efac" : DD_ROSE_DIM })}
                ${ddRow("Balance Due at Venue", balanceDue, { bold: true })}
            </table>
        </div>

        ${mapsButton}

        <!-- Important Info -->
        <div style="margin-top: 28px; padding: 22px; background: rgba(232,160,180,0.06); border-radius: 10px; border: 1px solid ${DD_BORDER};">
            <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; color: ${DD_ROSE}; letter-spacing: 2px; text-transform: uppercase;">Important Information</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; font-size: 13px; color: ${DD_ROSE_DIM}; line-height: 1.5;">
                    <span style="color: ${DD_ROSE}; font-weight: 700; margin-right: 8px;">1.</span>
                    Please carry a valid government-issued photo ID for verification at the venue.
                </td></tr>
                <tr><td style="padding: 6px 0; font-size: 13px; color: ${DD_ROSE_DIM}; line-height: 1.5;">
                    <span style="color: ${DD_ROSE}; font-weight: 700; margin-right: 8px;">2.</span>
                    This booking is non-refundable. No cancellations, amendments, or date changes are permitted once confirmed.
                </td></tr>
                <tr><td style="padding: 6px 0; font-size: 13px; color: ${DD_ROSE_DIM}; line-height: 1.5;">
                    <span style="color: ${DD_ROSE}; font-weight: 700; margin-right: 8px;">3.</span>
                    Please arrive 10 minutes before your scheduled time slot for a smooth check-in.
                </td></tr>
                <tr><td style="padding: 6px 0; font-size: 13px; color: ${DD_ROSE_DIM}; line-height: 1.5;">
                    <span style="color: ${DD_ROSE}; font-weight: 700; margin-right: 8px;">4.</span>
                    The remaining balance must be paid at the venue prior to your screening.
                </td></tr>
            </table>
        </div>

        <!-- Contact -->
        <div style="margin-top: 28px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 11px; color: ${DD_ROSE_DIM}; letter-spacing: 1px; text-transform: uppercase;">Need assistance?</p>
            <p style="margin: 0; font-size: 13px;">
                <a href="https://www.galaxiaresorts.com" target="_blank" style="color: ${DD_ROSE}; text-decoration: none; font-weight: 600;">www.galaxiaresorts.com</a>
            </p>
        </div>
    </div>

    <!-- Footer -->
    <div style="background: ${DD_DARK}; padding: 28px 32px; text-align: center;">
        <p style="margin: 0 0 4px; color: ${DD_ROSE}; font-size: 14px; letter-spacing: 3px; font-weight: 400;">GALAXIA</p>
        <p style="margin: 0 0 12px; color: rgba(255,255,255,0.3); font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Digital Diaries</p>
        <div style="width: 40px; height: 1px; background: rgba(232,160,180,0.3); margin: 0 auto 12px;"></div>
        <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px; line-height: 1.6;">
            Wadala, Mumbai, India<br>
            This is an automated confirmation. Please do not reply to this email.
        </p>
    </div>

</div>
</body>
</html>`;

    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: email,
            replyTo: REPLY_TO,
            subject: `Booking Confirmed | ${booking.bookingRef} — ${screenName} (${packageName})`,
            html,
        });
        console.log(`[Email] DD booking confirmation sent to ${email}`);
    } catch (error) {
        console.error("[Email] Failed to send DD confirmation:", error);
    }
}

// ───────────────────────────────────────────────────────────────
//  Test Email (for verifying SMTP connection)
// ───────────────────────────────────────────────────────────────
export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            replyTo: REPLY_TO,
            subject: "Galaxia — Email Configuration Test",
            html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:640px;margin:0 auto;font-family:Georgia,serif;background:#e8e5dd;">
    <div style="background:linear-gradient(135deg,${NAVY},${NAVY_LIGHT});padding:40px 32px;text-align:center;">
        <h1 style="margin:0;color:${GOLD};font-size:32px;letter-spacing:6px;font-weight:400;">GALAXIA</h1>
        <div style="width:60px;height:1px;background:${GOLD};margin:12px auto;"></div>
    </div>
    <div style="background:${WARM_BG};padding:40px 32px;text-align:center;">
        <h2 style="margin:0 0 12px;color:${TEXT_DARK};font-size:20px;font-weight:400;">Email Configuration Verified</h2>
        <p style="margin:0;font-size:14px;color:${TEXT_MED};line-height:1.6;">
            Your email configuration is working correctly.<br>
            Booking confirmation emails are ready to send.
        </p>
        <p style="margin:20px 0 0;font-size:12px;color:${TEXT_LIGHT};">Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
    </div>
    <div style="background:${NAVY};padding:20px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;">Galaxia Resorts — Email Test</p>
    </div>
</div>
</body></html>`,
        });
        console.log(`[Email] Test email sent to ${toEmail}`);
        return { success: true };
    } catch (error: any) {
        console.error("[Email] Test email failed:", error);
        return { success: false, error: error?.message || "Unknown error" };
    }
}

// ───────────────────────────────────────────────────────────────
//  Contact Form Notification (to admin)
// ───────────────────────────────────────────────────────────────
export async function sendContactFormEmail(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: string; // "staycation" or "digital-diaries"
    subject?: string; // "General Inquiry", "Booking Assistance", etc.
}): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;

    const sourceLabel = data.source === "digital-diaries" ? "Digital Diaries" : "Staycation";
    const sourceBadge = data.source === "digital-diaries"
        ? `<span style="display:inline-block;padding:4px 12px;background:#2d0a1e;color:#e8a0b4;font-size:11px;font-weight:700;border-radius:4px;letter-spacing:1px;">${sourceLabel}</span>`
        : `<span style="display:inline-block;padding:4px 12px;background:${NAVY};color:${GOLD};font-size:11px;font-weight:700;border-radius:4px;letter-spacing:1px;">${sourceLabel}</span>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #ffffff;">
<div style="max-width: 640px; margin: 0 auto; font-family: 'Georgia', 'Times New Roman', serif; background: #e8e5dd;">

    <div style="background: linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT}); padding: 36px 32px; text-align: center;">
        <h1 style="margin: 0; color: ${GOLD}; font-size: 28px; letter-spacing: 6px; font-weight: 400;">GALAXIA</h1>
        <div style="width: 60px; height: 1px; background: ${GOLD}; margin: 12px auto;"></div>
        <p style="margin: 0; color: rgba(196,162,101,0.7); font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">Contact Form Submission</p>
    </div>

    <div style="background: ${WARM_BG}; padding: 36px 32px;">

        <div style="margin-bottom: 24px;">
            ${sourceBadge}
            <span style="margin-left: 8px; font-size: 12px; color: ${TEXT_LIGHT};">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
        </div>

        <div style="background: white; border-radius: 10px; padding: 24px; border: 1px solid ${BORDER}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <table style="width: 100%; border-collapse: collapse;">
                ${sectionTitle("Contact Details")}
                ${row("Name", data.name, { bold: true })}
                ${row("Email", data.email)}
                ${data.phone ? row("Phone", data.phone) : ""}
                ${divider()}
                ${sectionTitle("Message")}
            </table>
            <div style="padding: 12px 0; font-size: 14px; color: ${TEXT_DARK}; line-height: 1.7; white-space: pre-wrap;">${data.message}</div>
        </div>

        <div style="margin-top: 20px; text-align: center;">
            <a href="mailto:${data.email}" style="display: inline-block; padding: 12px 32px; background: ${NAVY}; color: ${GOLD}; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 1px; border-radius: 6px; text-transform: uppercase;">Reply to ${data.name}</a>
        </div>
    </div>

    <div style="background: ${NAVY}; padding: 20px 32px; text-align: center;">
        <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px;">This is an automated notification from the Galaxia website contact form.</p>
    </div>

</div>
</body>
</html>`;

    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: "admin@galaxiaresorts.com",
            replyTo: data.email,
            subject: `New Contact Form — ${data.name} (${sourceLabel})${data.subject ? ` — ${data.subject}` : ''}`,
            html,
        });
        console.log(`[Email] Contact form notification sent for ${data.name}`);
    } catch (error) {
        console.error("[Email] Failed to send contact form email:", error);
    }
}

// ───────────────────────────────────────────────────────────────
//  Owner Booking Notification — always send PDF to owner
//  This runs independently of the customer confirmation flow.
// ───────────────────────────────────────────────────────────────
const OWNER_EMAIL = "bookings@galaxiaresorts.com";

export async function sendOwnerBookingNotification(opts: {
    bookingRef: string;
    customerName: string;
    module: "staycation" | "digital-diaries";
    propertyName: string;
    pdfBuffer: Buffer;
}): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;

    const moduleLabel = opts.module === "digital-diaries" ? "Digital Diaries" : "Staycation";
    const filename = `Galaxia-${opts.bookingRef}.pdf`;

    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: OWNER_EMAIL,
            replyTo: REPLY_TO,
            subject: `New Booking | ${opts.bookingRef} — ${opts.customerName} (${moduleLabel})`,
            html: `<p>A new <strong>${moduleLabel}</strong> booking has been created.</p>
<p><strong>Booking Ref:</strong> ${opts.bookingRef}<br>
<strong>Customer:</strong> ${opts.customerName}<br>
<strong>Property:</strong> ${opts.propertyName}</p>
<p>The booking confirmation voucher is attached as a PDF.</p>
<p style="color:#888;font-size:12px;">— Galaxia Automated System</p>`,
            attachments: [
                {
                    filename,
                    content: opts.pdfBuffer,
                },
            ],
        });
        console.log(`[Email] Owner notification sent to ${OWNER_EMAIL} for ${opts.bookingRef}`);
    } catch (error) {
        console.error("[Email] Failed to send owner notification:", error);
    }
}
