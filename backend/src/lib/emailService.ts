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
        <td style="${tdStyle} color: ${TEXT_MED}; font-size: 13px; letter-spacing: 0.3px;">${label}</td>
        <td style="${tdStyle} text-align: right; font-weight: ${valWeight}; color: ${valColor}; font-size: 14px; font-family: 'Times New Roman', Times, serif;">${value}</td>
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

    let displayAddons: { label: string; price: number }[] = [];
    let foodPreference = "";
    let transferFee = 0;
    if (booking.addons && typeof booking.addons === "object") {
        const addonsData = Array.isArray(booking.addons) ? booking.addons : [booking.addons];
        const foodPrefs: string[] = [];
        for (const a of addonsData) {
            if (a && a.transferInfo && a.transferInfo.fee) {
                transferFee = Number(a.transferInfo.fee) || 0;
            } else if (a && a.name === 'Food Preference' && a.foodType) {
                if (a.count !== undefined && a.count !== null && a.count > 0) {
                    foodPrefs.push(`${a.foodType} Veg: ${a.count}`);
                } else {
                    foodPrefs.push(a.foodType);
                }
            } else if (a && a.name && a.price) {
                displayAddons.push({
                    label: a.occasion ? `${a.name} (${a.occasion})` : a.name,
                    price: Number(a.price) || 0
                });
            }
        }
        if (foodPrefs.length > 0) {
            foodPreference = foodPrefs.join(", ");
        }
    }

    const discountAmount = booking.discountAmount || 0;
    const taxes = booking.gstAmount || 0;
    const advanceAmount = booking.advanceAmount || 0;
    const balanceAmount = booking.balanceAmount || 0;

    // Reconstruct the correct Total Amount (post-tax actual total booking amount)
    const displayTotalAmount = advanceAmount + balanceAmount;

    // Generate pricing rows dynamically in the exact requested sequence
    let pricingRowsHtml = "";
    pricingRowsHtml += paymentRow("Base Price", fmtCurrency(displayBasePrice), { bold: true });

    if (extraAdult > 0) {
        pricingRowsHtml += paymentRow("Extra Adult Charge", fmtCurrency(extraAdult));
    }
    if (extraKids > 0) {
        pricingRowsHtml += paymentRow("Extra Child Charge", fmtCurrency(extraKids));
    }
    if (!extraAdult && !extraKids && extraPerson > 0) {
        pricingRowsHtml += paymentRow("Extra Person Charges", fmtCurrency(extraPerson));
    }
    if (petCharges > 0) {
        pricingRowsHtml += paymentRow("Pet Charges", fmtCurrency(petCharges));
    }
    for (const addon of displayAddons) {
        pricingRowsHtml += paymentRow(addon.label, fmtCurrency(addon.price));
    }
    if (discountAmount > 0) {
        const discountLabel = (booking.couponId || booking.couponCode || booking.coupon) ? "Coupon Applied" : "Discount";
        pricingRowsHtml += paymentRow(discountLabel, `- ${fmtCurrency(discountAmount)}`, { color: "#16a34a" });
    }

    pricingRowsHtml += paymentRow("Taxes", fmtCurrency(taxes));
    if (transferFee > 0) {
        pricingRowsHtml += paymentRow("Transfer Fee", fmtCurrency(transferFee));
    }
    pricingRowsHtml += paymentRow("Total Amount", fmtCurrency(displayTotalAmount), { bold: true, color: GOLD, borderTop: true });
    pricingRowsHtml += divider();

    const advancePaid = booking.advancePaid ? fmtCurrency(advanceAmount) : "Not yet paid";
    const balanceDue = fmtCurrency(balanceAmount);
    const securityDeposit = booking.securityDeposit ? fmtCurrency(booking.securityDeposit) : null;
    const securityRefund = prop.securityRefund || "Refundable at checkout (subject to property condition)";

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
        <p style="margin: 0 0 6px; font-size: 13px; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">
            ${booking.source === "collab" ? "Collab Booking Confirmed" : "Booking Confirmed"}
        </p>
        <h2 style="margin: 0 0 4px; font-size: 22px; color: ${TEXT_DARK}; font-weight: 400;">Dear ${booking.customerName},</h2>
        <p style="margin: 0 0 20px; font-size: 14px; color: ${TEXT_MED}; line-height: 1.6;">
            ${booking.source === "collab"
                ? "We are excited to host you for this collaboration. Your collaboration booking has been confirmed and we look forward to welcoming you. Please find your details below."
                : "Thank you for choosing Galaxia. Your reservation has been confirmed and we look forward to welcoming you. Please find your complete booking details below."
            }
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
                ${(() => { const tA = booking.numGuests; const tK = (booking as any).numKids || 0; return row("Guests", `${tA} adult${tA > 1 ? "s" : ""}${tK > 0 ? `, ${tK} child${tK > 1 ? "ren" : ""}` : ""}`); })()}
                ${((booking as any).numCottages > 1 || (booking as any).property?.slug === 'amstel-nest') ? row("Cottages", `${(booking as any).numCottages || 1}`) : ""}
                ${divider()}
                ${sectionTitle("Payment Summary")}
                ${pricingRowsHtml}
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

        <!-- Transportation Note -->
        <div style="margin-top: 20px; padding: 18px 22px; background: #f0f4f8; border-radius: 8px; border-left: 3px solid #2563eb;">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #2563eb; letter-spacing: 2px; text-transform: uppercase;">Local Transportation & Rickshaw</p>
            <p style="margin: 0; font-size: 13px; color: ${TEXT_MED}; line-height: 1.6;">For local auto-rickshaw pre-booking and transportation assistance, please contact <strong>Mahesh</strong> at <a href="tel:+919284796472" style="color: #2563eb; text-decoration: underline; font-weight: 600;">+91 92847 96472</a>.</p>
        </div>

        ${mapsButton}

        <!-- Resort Booking Terms & Conditions -->
        <div style="margin-top: 28px; padding: 22px; background: white; border-radius: 10px; border: 1px solid ${BORDER};">
            <p style="margin: 0 0 16px; font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: 2px; text-transform: uppercase;">Resort Booking Terms & Conditions</p>
            ${(() => {
                const sections = [
                    {
                        title: "Check-in & Check-out",
                        items: [
                            "Standard check-in and check-out timings apply.",
                            "Early check-in and late check-out are subject to availability and will be chargeable.",
                        ],
                    },
                    {
                        title: "Parking",
                        items: [
                            "Complimentary parking is available for all in-house guests.",
                        ],
                    },
                    {
                        title: "Meals & Dining",
                        items: [
                            "Freshly prepared meals will be served during your stay.",
                            "On the final day of your stay, the menu will be decided by our chef based on the availability of fresh ingredients.",
                        ],
                    },
                    {
                        title: "Driver Accommodation",
                        items: [
                            "Driver accommodation will be provided in the reception/common area.",
                            "Charges: Rs. 1,500 per driver, which includes: Mattress, Meals, Basic accommodation.",
                        ],
                    },
                    {
                        title: "Swimming Pool Guidelines",
                        items: [
                            "Please use the indoor swimming pool responsibly and follow all safety instructions.",
                            "Children must always be accompanied and supervised by an adult.",
                            "As this is an indoor swimming pool, your safety is in your own hands. Please exercise caution while using the pool.",
                            "Management will not be responsible for any accident, injury, or loss resulting from negligence or failure to follow safety guidelines.",
                        ],
                    },
                    {
                        title: "Comfort & Safety",
                        items: [
                            "To avoid insects entering the villa, guests are requested to keep all doors and windows closed between 5:00 PM and 7:00 PM.",
                        ],
                    },
                    {
                        title: "Electricity & Utilities",
                        items: [
                            "Due to local area conditions, occasional and unpredictable power interruptions may occur.",
                        ],
                    },
                    {
                        title: "Property Care",
                        items: [
                            "Guests are requested to maintain cleanliness and proper decorum throughout their stay.",
                            "Shifting or moving any furniture, appliances, or property items without prior permission is strictly prohibited.",
                        ],
                    },
                    {
                        title: "Damages",
                        items: [
                            "Any damage caused to the property, furniture, appliances, fixtures, or amenities during the stay will be chargeable to the guest.",
                        ],
                    },
                    {
                        title: "Cancellation Policy",
                        items: [
                            "21 days or more before check-in: 10% deduction from the booking amount.",
                            "11–20 days before check-in: 50% of the booking amount will be retained.",
                            "Within 10 days of check-in: No refund will be applicable.",
                            "Bookings made for festival dates, long weekends, and peak season periods are strictly non-refundable.",
                        ],
                    },
                    {
                        title: "Management Rights",
                        items: [
                            "The management reserves the right to refuse admission or cancel bookings in cases involving: Misconduct, Public nuisance, Illegal activities, Violation of resort rules, Damage to property.",
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
        const subject = transferFee > 0
            ? `Booking Transferred & Confirmed | ${booking.bookingRef} — ${propertyName}`
            : (booking.source === "collab"
                ? `Collab Booking Confirmed | ${booking.bookingRef} — ${propertyName}`
                : `Booking Confirmed | ${booking.bookingRef} — ${propertyName}`);

        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: email,
            replyTo: REPLY_TO,
            subject,
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
                ${ddRow("Balance Due at Venue (Pay in Cash Only)", balanceDue, { bold: true })}
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
                    The remaining balance must be paid in Cash Only at the venue prior to your screening.
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

export async function sendOrderDeletionNotification(opts: {
    performedBy: string;
    role: string;
    actionType: "deletion" | "modification";
    villaName: string;
    category: string;
    details: string;
}): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;
    try {
        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: "admin@galaxiaresorts.com",
            replyTo: REPLY_TO,
            subject: `Order Deletion/Modification Alert: ${opts.villaName} (${opts.category})`,
            text: `Order Deletion / Modification Notification\n\nUser: ${opts.performedBy} (${opts.role})\nAction: ${opts.actionType.toUpperCase()}\nVilla/Screen: ${opts.villaName}\nCategory: ${opts.category}\n\nDetails of Change:\n${opts.details}\n\nTimestamp: ${new Date().toLocaleString("en-IN")}\n— Galaxia Operations System`,
        });
        console.log(`[Email] Deletion alert sent for ${opts.villaName}`);
    } catch (error) {
        console.error("[Email] Failed to send order deletion notification:", error);
    }
}

export async function sendBookingEditNotification(opts: {
    performedBy: string;
    username: string;
    bookingRef: string;
    customerName: string;
    propertyName: string;
    changedFields: Record<string, { before: any; after: any }>;
}): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;
    try {
        const changesText = Object.entries(opts.changedFields)
            .map(([field, delta]) => `  - ${field}: "${delta.before}" → "${delta.after}"`)
            .join("\n");

        const textContent = `Staycation Booking Modification Log Alert\n\nUser: ${opts.performedBy} (@${opts.username})\nBooking Reference: ${opts.bookingRef}\nCustomer Name: ${opts.customerName}\nProperty: ${opts.propertyName}\n\nLog of Changes Made:\n${changesText || "  (No field value diffs captured)"}\n\nTimestamp: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n— Galaxia Admin Security & Operations System`;

        await getResend()?.emails.send({
            from: FROM_EMAIL,
            to: "admin@galaxiaresorts.com",
            replyTo: REPLY_TO,
            subject: `Booking Edit Alert | ${opts.bookingRef} edited by ${opts.performedBy}`,
            text: textContent,
        });
        console.log(`[Email] Booking edit log email sent to admin@galaxiaresorts.com for ${opts.bookingRef}`);
    } catch (error) {
        console.error("[Email] Failed to send booking edit notification:", error);
    }
}

