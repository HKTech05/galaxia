import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { sendWhatsAppTemplateMessage } from "../lib/whatsappService";

const router = Router();

// 1. Public Route: POST /api/hospitality/requests — Submit request from a guest villa e-menu
router.post("/requests", async (req, res) => {
    try {
        const { villaName, itemCategory, items } = req.body;

        if (!villaName || !itemCategory || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: "villaName, itemCategory, and items array are required" });
        }

        const now = new Date();
        // Set date to local midnight to match date comparison
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Find active booking for this villa today
        // A booking is active if today falls within [checkInDate, checkOutDate] and status is not cancelled
        const activeBooking = await prisma.staycationBooking.findFirst({
            where: {
                status: { in: ["confirmed", "checked_in"] },
                checkInDate: { lte: todayStart },
                checkOutDate: { gt: todayStart },
                OR: [
                    { assignedUnit: villaName },
                    { subProperty: { name: { equals: villaName, mode: "insensitive" } } }
                ]
            }
        });

        const request = await prisma.hospitalityRequest.create({
            data: {
                villaName,
                itemCategory,
                items: JSON.stringify(items),
                status: "pending",
                isBilled: false,
                bookingId: activeBooking ? activeBooking.id : null
            }
        });

        // Send WhatsApp notification to hospitality staff
        try {
            const recipientPhone = "8237309564";
            // Build items summary string: "2x Tea, 1x Maggi, 3x French Fries"
            const itemsSummary = items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
            // Calculate total
            const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
            // Format timestamp in IST
            const orderTime = now.toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                hour12: true, timeZone: "Asia/Kolkata"
            });

            const templateName = itemCategory === "High Tea"
                ? "hospitality_hightea_order"
                : "hospitality_housekeeping_order";

            await sendWhatsAppTemplateMessage(
                "otp",
                recipientPhone,
                templateName,
                [villaName, itemsSummary, String(total), orderTime]
            );
        } catch (waErr: any) {
            console.error("Hospitality WhatsApp notification failed:", waErr.message);
            // Don't fail the request if WhatsApp fails
        }

        return res.status(201).json({
            success: true,
            request,
            linkedBooking: activeBooking ? { id: activeBooking.id, guestName: activeBooking.customerName } : null
        });
    } catch (error) {
        console.error("Error creating hospitality request:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ───────────────────────────────────────────────────────────────
// Authenticated Routes below
// ───────────────────────────────────────────────────────────────
router.use(authMiddleware);

// 2. GET /api/hospitality/requests — Fetch hospitality requests (Normal or High Tea)
router.get("/requests", async (req: AuthRequest, res) => {
    try {
        const { category, status, bookingId, isBilled, date } = req.query;
        const where: any = {};

        if (category) {
            where.itemCategory = String(category);
        }
        if (status) {
            where.status = String(status);
        }
        if (bookingId) {
            const parsed = parseInt(String(bookingId));
            if (!isNaN(parsed)) where.bookingId = parsed;
        }
        if (isBilled !== undefined) {
            where.isBilled = isBilled === "true";
        }
        if (date) {
            const dateStr = String(date); // YYYY-MM-DD
            const start = new Date(`${dateStr}T00:00:00`);
            const end = new Date(`${dateStr}T23:59:59.999`);
            where.createdAt = { gte: start, lte: end };
        }

        const requests = await prisma.hospitalityRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                booking: {
                    select: {
                        id: true,
                        customerName: true,
                        bookingRef: true
                    }
                }
            }
        });

        // Parse items JSON back into object
        const parsedRequests = requests.map(req => ({
            ...req,
            items: JSON.parse(req.items as string)
        }));

        return res.json(parsedRequests);
    } catch (error) {
        console.error("Error fetching hospitality requests:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 3. PUT /api/hospitality/requests/:id — Mark a request status as done / fulfilled
router.put("/requests/:id", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { status } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid request ID" });
        }

        const existing = await prisma.hospitalityRequest.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Hospitality request not found" });
        }

        const updated = await prisma.hospitalityRequest.update({
            where: { id },
            data: {
                status: status || "fulfilled"
            }
        });

        return res.json({ success: true, request: updated });
    } catch (error) {
        console.error("Error updating hospitality request status:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 4. PUT /api/hospitality/requests/bill/:bookingId — Mark all pending requests for a booking as billed
router.put("/requests/bill/:bookingId", async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId as string);
        if (isNaN(bookingId)) {
            return res.status(400).json({ error: "Invalid booking ID" });
        }

        await prisma.hospitalityRequest.updateMany({
            where: {
                bookingId,
                status: "fulfilled",
                isBilled: false
            },
            data: {
                isBilled: true
            }
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Error marking requests as billed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
