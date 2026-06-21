import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { sendWhatsAppTemplateMessage } from "../lib/whatsappService";
import fs from "fs";
import path from "path";

const router = Router();

const MENU_FILE_PATH = path.join(__dirname, "../../../menu_items.json");

const DEFAULT_MENU_ITEMS = [
    // Normal Items
    { id: "water", name: "Water", price: 30, category: "Normal" },
    { id: "limbu_pani", name: "Limbu Pani", price: 50, category: "Normal" },
    { id: "limbu_soda", name: "Limbu Soda", price: 90, category: "Normal" },
    { id: "sprite", name: "Sprite", price: 70, category: "Normal" },
    { id: "thums_up", name: "Thums Up", price: 70, category: "Normal" },
    { id: "special_mocktail", name: "Special Mocktail", price: 1500, category: "Normal" },
    // High Tea Items
    { id: "tea", name: "Tea", price: 40, category: "High Tea" },
    { id: "coffee", name: "Coffee", price: 44, category: "High Tea" },
    { id: "milk", name: "Milk", price: 40, category: "High Tea" },
    { id: "maggi", name: "Maggi", price: 84, category: "High Tea" },
    { id: "fries", name: "French Fries", price: 147, category: "High Tea" },
    { id: "kanda_bhaji", name: "Kanda Bhaji", price: 147, category: "High Tea" },
    { id: "aloo_bhaji", name: "Aloo Bhaji", price: 147, category: "High Tea" },
    { id: "corn_bhaji", name: "Corn Bhaji", price: 147, category: "High Tea" },
    { id: "black_coffee", name: "Black Coffee", price: 35, category: "High Tea" },
    { id: "cold_coffee", name: "Cold Coffee", price: 90, category: "High Tea" },
    // Timepass Items
    { id: "khichiya_papad", name: "Khichiya papad", price: 100, category: "Timepass" },
    { id: "khichiya_fried", name: "Khichiya fried papad", price: 120, category: "Timepass" },
    { id: "khichiya_masala_jain", name: "Khichiya masala papad jain", price: 160, category: "Timepass" },
    { id: "khichiya_masala_regular", name: "Khichiya masala papad regular", price: 160, category: "Timepass" },
    { id: "khichiya_cheese_masala", name: "Khichiya cheese masala papad", price: 180, category: "Timepass" },
    { id: "channa_masala_jain", name: "Channa masala ( jain )", price: 160, category: "Timepass" },
    { id: "channa_masala_regular", name: "Channa masala ( Regular )", price: 160, category: "Timepass" },
    { id: "peanut_masala", name: "Peanut masala", price: 150, category: "Timepass" },
    { id: "chakna_special", name: "Chakna Special", price: 260, category: "Timepass" },
    { id: "paneer_chilly_dry", name: "Paneer chilly dry", price: 280, category: "Timepass" }
];

function getMenuItems() {
    try {
        if (fs.existsSync(MENU_FILE_PATH)) {
            const content = fs.readFileSync(MENU_FILE_PATH, "utf8");
            const items = JSON.parse(content);
            let updated = false;
            for (const defItem of DEFAULT_MENU_ITEMS) {
                if (!items.some((it: any) => it.id === defItem.id)) {
                    items.push(defItem);
                    updated = true;
                }
            }
            if (updated) {
                fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(items, null, 2), "utf8");
            }
            return items;
        }
    } catch (err) {
        console.error("Error reading/merging menu file:", err);
    }
    // Write default if it doesn't exist
    try {
        fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(DEFAULT_MENU_ITEMS, null, 2), "utf8");
    } catch (err) {
        console.error("Error writing default menu file:", err);
    }
    return DEFAULT_MENU_ITEMS;
}

// Public Route: GET /api/hospitality/menu — Fetch all menu items
router.get("/menu", (req, res) => {
    try {
        const menu = getMenuItems();
        return res.json(menu);
    } catch (err) {
        return res.status(500).json({ error: "Failed to read menu items" });
    }
});

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
                checkOutDate: { gte: todayStart },
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
            // Build items summary string with comments on separate lines
            const itemsSummary = items.map((i: any) => {
                const commentText = i.comment && i.comment.trim() ? ` (${i.comment.trim()})` : '';
                return `${i.quantity}x ${i.name}${commentText}`;
            }).join("\n");
            // Calculate total
            const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
            // Format timestamp in IST
            const orderTime = now.toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                hour12: true, timeZone: "Asia/Kolkata"
            });

            const isHighTea = itemCategory === "High Tea";
            const isTimepass = itemCategory === "Timepass";
            const templateName = (isHighTea || isTimepass)
                ? "hospitality_hightea_order"
                : "hospitality_housekeeping_order";

            const recipientPhones = (isHighTea || isTimepass)
                ? ["7355630009", "9867677811"]
                : ["7355630009"];

            for (const recipientPhone of recipientPhones) {
                try {
                    await sendWhatsAppTemplateMessage(
                        "otp",
                        recipientPhone,
                        templateName,
                        [villaName, itemsSummary, String(total), orderTime]
                    );
                } catch (sendErr: any) {
                    console.error(`Hospitality WhatsApp failed for ${recipientPhone}:`, sendErr.message);
                }
            }
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

// 3. PUT /api/hospitality/requests/:id — Update request (status, villa, items)
router.put("/requests/:id", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { status, villaName, itemCategory, items } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid request ID" });
        }

        const existing = await prisma.hospitalityRequest.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Hospitality request not found" });
        }

        const data: any = {};
        if (status !== undefined) data.status = status;
        if (villaName !== undefined) data.villaName = villaName;
        if (itemCategory !== undefined) data.itemCategory = itemCategory;
        if (items !== undefined) {
            data.items = JSON.stringify(items);
            
            // Re-calculate bookingId based on target villa
            const targetVilla = villaName || existing.villaName;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const activeBooking = await prisma.staycationBooking.findFirst({
                where: {
                    status: { in: ["confirmed", "checked_in"] },
                    checkInDate: { lte: todayStart },
                    checkOutDate: { gte: todayStart },
                    OR: [
                        { assignedUnit: targetVilla },
                        { subProperty: { name: { equals: targetVilla, mode: "insensitive" } } }
                    ]
                }
            });
            data.bookingId = activeBooking ? activeBooking.id : null;
        }

        const updated = await prisma.hospitalityRequest.update({
            where: { id },
            data
        });

        return res.json({ success: true, request: updated });
    } catch (error) {
        console.error("Error updating hospitality request:", error);
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

// 5. GET /api/hospitality/allocations — Fetch active bookings/allocations for a given date
router.get("/allocations", async (req: AuthRequest, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: "Date parameter is required" });
        }

        const dateStr = String(date); // YYYY-MM-DD
        const targetDate = new Date(`${dateStr}T00:00:00`);

        const bookings = await prisma.staycationBooking.findMany({
            where: {
                status: "checked_in",
                checkInDate: { lte: targetDate },
                checkOutDate: { gte: targetDate }
            },
            include: {
                property: {
                    select: {
                        name: true
                    }
                },
                subProperty: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { propertyId: "asc" },
                { checkInDate: "asc" }
            ]
        });

        const result = bookings
            .filter(b => {
                const name = (b.property.name || "").toLowerCase();
                const isAmbroseOrAmstel = name.includes("ambrose") || name.includes("amstel");
                return isAmbroseOrAmstel && b.assignedUnit && b.assignedUnit.trim() !== "";
            })
            .map(b => ({
                id: b.id,
                bookingRef: b.bookingRef,
                customerName: b.customerName,
                checkInDate: b.checkInDate,
                checkOutDate: b.checkOutDate,
                assignedUnit: b.assignedUnit,
                status: b.status,
                propertyName: b.property.name,
                subPropertyName: b.subProperty?.name || null
            }));

        return res.json(result);
    } catch (error) {
        console.error("Error fetching hospitality allocations:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 6. DELETE /api/hospitality/requests/:id — Delete a hospitality request
router.delete("/requests/:id", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid request ID" });
        }

        const existing = await prisma.hospitalityRequest.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Hospitality request not found" });
        }

        await prisma.hospitalityRequest.delete({
            where: { id }
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Error deleting hospitality request:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 7. PUT /api/hospitality/menu — Update menu items list
router.put("/menu", async (req: AuthRequest, res) => {
    try {
        const { menuItems } = req.body;
        if (!menuItems || !Array.isArray(menuItems)) {
            return res.status(400).json({ error: "menuItems array is required" });
        }
        // Write to file
        fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menuItems, null, 2), "utf8");
        return res.json({ success: true, menuItems });
    } catch (err) {
        console.error("Error saving menu file:", err);
        return res.status(500).json({ error: "Failed to save menu items" });
    }
});

export default router;
