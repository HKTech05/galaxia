import nodemailer from "nodemailer";

// Create reusable transporter
// Supports Gmail SMTP, AWS SES, or any SMTP provider
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
    },
});

const FROM_EMAIL = process.env.SMTP_FROM || "Galaxia <bookings@galaxia.in>";

/**
 * Send staycation booking confirmation email
 */
export async function sendBookingConfirmation(booking: any): Promise<void> {
    if (!process.env.SMTP_USER || !booking.customerEmail) return;

    const email = booking.customerEmail;
    const checkIn = new Date(booking.checkInDate).toLocaleDateString("en-IN", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });
    const checkOut = new Date(booking.checkOutDate).toLocaleDateString("en-IN", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });

    const propertyName = booking.property?.name || "Galaxia Property";

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf9f6; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center;">
            <h1 style="color: #C4A265; margin: 0; font-size: 28px; letter-spacing: 2px;">GALAXIA</h1>
            <p style="color: #C4A265; margin: 4px 0 0; font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">Staycation</p>
        </div>
        <div style="padding: 32px;">
            <h2 style="color: #1a1a2e; margin: 0 0 8px;">Booking Confirmed ✓</h2>
            <p style="color: #666; margin: 0 0 24px;">Hi ${booking.customerName}, your staycation is booked!</p>
            
            <div style="background: white; border-radius: 10px; padding: 24px; border: 1px solid #e8e5dd;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Booking Ref</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e;">${booking.bookingRef}</td></tr>
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Property</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e;">${propertyName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Check-in</td><td style="padding: 8px 0; text-align: right; color: #1a1a2e;">${checkIn}</td></tr>
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Check-out</td><td style="padding: 8px 0; text-align: right; color: #1a1a2e;">${checkOut}</td></tr>
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Nights</td><td style="padding: 8px 0; text-align: right; color: #1a1a2e;">${booking.numNights}</td></tr>
                    <tr><td style="padding: 8px 0; color: #999; font-size: 13px;">Guests</td><td style="padding: 8px 0; text-align: right; color: #1a1a2e;">${booking.numGuests}</td></tr>
                    <tr style="border-top: 2px solid #C4A265;"><td style="padding: 12px 0; color: #1a1a2e; font-weight: 700;">Total Amount</td><td style="padding: 12px 0; text-align: right; font-weight: 700; color: #C4A265; font-size: 18px;">₹${(booking.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
                </table>
            </div>
            
            <div style="margin-top: 24px; padding: 16px; background: #f0ede5; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #666;"><strong>Important:</strong> Please carry a valid government ID at check-in. A refundable security deposit may be collected on arrival.</p>
            </div>
        </div>
        <div style="background: #1a1a2e; padding: 20px; text-align: center;">
            <p style="color: #888; margin: 0; font-size: 11px;">Galaxia Staycation — Karjat, Maharashtra, India</p>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: `Booking Confirmed — ${booking.bookingRef} | ${propertyName}`,
            html,
        });
        console.log(`[Email] Booking confirmation sent to ${email}`);
    } catch (error) {
        console.error("[Email] Failed to send booking confirmation:", error);
    }
}

/**
 * Send DD booking confirmation email
 */
export async function sendDDBookingConfirmation(booking: any): Promise<void> {
    if (!process.env.SMTP_USER || !booking.customerEmail) return;

    const email = booking.customerEmail;
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString("en-IN", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });

    const formatHour = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:00 ${period}`;
    };

    const screenName = booking.screen?.name || "Digital Diaries Screen";
    const packageName = booking.package?.name || "Experience";
    const startTime = formatHour(booking.startHour);
    const endTime = formatHour(booking.startHour + booking.durationHours);

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a0a14; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2d0a1e, #1a0a14); padding: 32px; text-align: center;">
            <h1 style="color: #e8a0b4; margin: 0; font-size: 28px; letter-spacing: 2px;">GALAXIA</h1>
            <p style="color: #c97a90; margin: 4px 0 0; font-size: 11px; letter-spacing: 4px; text-transform: uppercase;">Digital Diaries</p>
        </div>
        <div style="padding: 32px;">
            <h2 style="color: #e8a0b4; margin: 0 0 8px;">Booking Confirmed ✓</h2>
            <p style="color: #c97a90; margin: 0 0 24px;">Hi ${booking.customerName}, your screening is booked!</p>
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 24px; border: 1px solid rgba(232,160,180,0.2);">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Booking Ref</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #e8a0b4;">${booking.bookingRef}</td></tr>
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Package</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: white;">${packageName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Screen</td><td style="padding: 8px 0; text-align: right; color: white;">${screenName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Date</td><td style="padding: 8px 0; text-align: right; color: white;">${bookingDate}</td></tr>
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Time</td><td style="padding: 8px 0; text-align: right; color: white;">${startTime} – ${endTime}</td></tr>
                    <tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Guests</td><td style="padding: 8px 0; text-align: right; color: white;">${booking.numGuests}</td></tr>
                    ${booking.occasion ? `<tr><td style="padding: 8px 0; color: #c97a90; font-size: 13px;">Occasion</td><td style="padding: 8px 0; text-align: right; color: white;">${booking.occasion}</td></tr>` : ""}
                    <tr style="border-top: 2px solid #e8a0b4;"><td style="padding: 12px 0; color: white; font-weight: 700;">Total Amount</td><td style="padding: 12px 0; text-align: right; font-weight: 700; color: #e8a0b4; font-size: 18px;">₹${(booking.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
                </table>
            </div>
            
            <div style="margin-top: 24px; padding: 16px; background: rgba(232,160,180,0.1); border-radius: 8px;">
                <p style="margin: 0; font-size: 13px; color: #c97a90;"><strong>Important:</strong> Valid ID proof is required. No CCTV — complete privacy guaranteed.</p>
            </div>
        </div>
        <div style="background: #0d050a; padding: 20px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 11px;">Galaxia Digital Diaries — Wadala, Mumbai, India</p>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: `Booking Confirmed — ${booking.bookingRef} | ${packageName}`,
            html,
        });
        console.log(`[Email] DD booking confirmation sent to ${email}`);
    } catch (error) {
        console.error("[Email] Failed to send DD booking confirmation:", error);
    }
}
