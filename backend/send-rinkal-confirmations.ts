import dotenv from "dotenv";
dotenv.config();

import prisma from "./src/lib/prisma";
import { generateStaycationBookingPDF } from "./src/lib/pdfService";
import { sendBookingConfirmation } from "./src/lib/emailService";
import { decrypt } from "./src/lib/encryption";
import { Resend } from "resend";

const FROM_EMAIL = "Galaxia <admin@galaxiaresorts.com>";
const REPLY_TO = "admin@galaxiaresorts.com";

async function main() {
    console.log("Loading bookings from database...");

    const b1 = await prisma.staycationBooking.findFirst({
        where: { bookingRef: "ST-20260530-001pq" },
        include: {
            property: { include: { pricing: true } },
            subProperty: { include: { pricing: true } },
            coupon: true
        }
    });

    const b2 = await prisma.staycationBooking.findFirst({
        where: { bookingRef: "ST-20260531-001rs" },
        include: {
            property: { include: { pricing: true } },
            subProperty: { include: { pricing: true } },
            coupon: true
        }
    });

    if (!b1 || !b2) {
        throw new Error("Could not find both bookings. Please run the segregation script first.");
    }

    const plainEmail = "rinkalsidhiya@gmail.com";
    const plainPhone = "+919920386696";

    // Initialize Resend
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not defined in the environment.");
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log(`Sending HTML confirmation emails to ${plainEmail}...`);
    // Send beautiful HTML confirmation emails to Rinkal
    await sendBookingConfirmation({
        ...b1,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });
    console.log("Booking 1 HTML confirmation sent.");

    await sendBookingConfirmation({
        ...b2,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });
    console.log("Booking 2 HTML confirmation sent.");

    // Generate PDFs
    console.log("Generating PDFs...");
    const pdfBuffer1 = await generateStaycationBookingPDF({
        ...b1,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });
    const pdfBuffer2 = await generateStaycationBookingPDF({
        ...b2,
        customerPhone: plainPhone,
        customerEmail: plainEmail
    });

    // Send PDF vouchers to Rinkal
    console.log(`Sending PDF vouchers to Rinkal (${plainEmail})...`);
    await resend.emails.send({
        from: FROM_EMAIL,
        to: plainEmail,
        replyTo: REPLY_TO,
        subject: `Booking Voucher | ${b1.bookingRef} — Ambrose`,
        html: `<p>Dear Rinkal Sidhiya,</p>
<p>Thank you for choosing Galaxia Resorts.</p>
<p>Please find attached the official booking voucher (PDF) for your upcoming stay from <strong>June 7 to June 8, 2026</strong> (Reference: <strong>${b1.bookingRef}</strong>).</p>
<p>We look forward to hosting you!</p>
<p>Warm regards,<br>Galaxia Team</p>`,
        attachments: [
            {
                filename: `Galaxia-${b1.bookingRef}.pdf`,
                content: pdfBuffer1,
            }
        ]
    });
    console.log("Booking 1 PDF sent to Rinkal.");

    await resend.emails.send({
        from: FROM_EMAIL,
        to: plainEmail,
        replyTo: REPLY_TO,
        subject: `Booking Voucher | ${b2.bookingRef} — Ambrose`,
        html: `<p>Dear Rinkal Sidhiya,</p>
<p>Thank you for choosing Galaxia Resorts.</p>
<p>Please find attached the official booking voucher (PDF) for your upcoming stay from <strong>June 6 to June 7, 2026</strong> (Reference: <strong>${b2.bookingRef}</strong>).</p>
<p>We look forward to hosting you!</p>
<p>Warm regards,<br>Galaxia Team</p>`,
        attachments: [
            {
                filename: `Galaxia-${b2.bookingRef}.pdf`,
                content: pdfBuffer2,
            }
        ]
    });
    console.log("Booking 2 PDF sent to Rinkal.");

    // Send PDF vouchers to bookings@galaxiaresorts.com
    console.log("Sending PDF vouchers to bookings@galaxiaresorts.com...");
    await resend.emails.send({
        from: FROM_EMAIL,
        to: "bookings@galaxiaresorts.com",
        replyTo: REPLY_TO,
        subject: `Segregated Booking Voucher | ${b1.bookingRef} — Rinkal Sidhiya`,
        html: `<p>Attached is the segregated booking voucher for Rinkal Sidhiya.</p>
<p><strong>Booking Ref:</strong> ${b1.bookingRef}<br>
<strong>Dates:</strong> June 7 to June 8, 2026</p>`,
        attachments: [
            {
                filename: `Galaxia-${b1.bookingRef}.pdf`,
                content: pdfBuffer1,
            }
        ]
    });
    console.log("Booking 1 PDF sent to bookings@galaxiaresorts.com.");

    await resend.emails.send({
        from: FROM_EMAIL,
        to: "bookings@galaxiaresorts.com",
        replyTo: REPLY_TO,
        subject: `Segregated Booking Voucher | ${b2.bookingRef} — Rinkal Sidhiya`,
        html: `<p>Attached is the segregated booking voucher for Rinkal Sidhiya.</p>
<p><strong>Booking Ref:</strong> ${b2.bookingRef}<br>
<strong>Dates:</strong> June 6 to June 7, 2026</p>`,
        attachments: [
            {
                filename: `Galaxia-${b2.bookingRef}.pdf`,
                content: pdfBuffer2,
            }
        ]
    });
    console.log("Booking 2 PDF sent to bookings@galaxiaresorts.com.");

    console.log("✅ All emails and PDF vouchers successfully sent!");
}

main().catch(console.error);
