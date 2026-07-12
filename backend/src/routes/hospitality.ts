import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { sendWhatsAppTemplateMessage } from "../lib/whatsappService";
import { decrypt } from "../lib/encryption";
import { sendOrderDeletionNotification } from "../lib/emailService";
import { generateMenuPDF, generateStockPDF } from "../lib/pdfService";
import fs from "fs";
import path from "path";

const router = Router();

const isProduction = process.env.NODE_ENV === "production" || fs.existsSync("/home/ec2-user");
const MENU_FILE_PATH = isProduction
    ? "/home/ec2-user/menu_items.json"
    : path.join(__dirname, "../../../menu_items.json");

const DEFAULT_MENU_ITEMS = [
    { id: "water", name: "Water", price: 30, category: "Normal", stock: 90, tracked: true, costPrice: 10 },
    { id: "fresh_lime_soda", name: "Fresh lime soda", price: 170, category: "Normal", stock: 100, tracked: false, costPrice: 40 },
    { id: "fresh_lime_water", name: "Fresh Lime Water", price: 120, category: "Normal", stock: 99, tracked: false, costPrice: 25 },
    { id: "lemon_ice_tea", name: "Lemon Ice tea", price: 100, category: "Normal", stock: 100, tracked: false, costPrice: 25 },
    { id: "sprite", name: "Sprite", price: 70, category: "Normal", stock: 100, tracked: true, costPrice: 30 },
    { id: "sprite_tin", name: "Sprite Tin", price: 150, category: "Normal", stock: 100, tracked: true, costPrice: 40 },
    { id: "thums_up", name: "Thums Up", price: 70, category: "Normal", stock: 99, tracked: true, costPrice: 30 },
    { id: "special_mocktail", name: "Special Mocktail", price: 1500, category: "Normal", stock: 100, tracked: true, costPrice: 400 },
    { id: "redbull", name: "Red Bull", price: 220, category: "Normal", stock: 100, tracked: true, costPrice: 100 },
    { id: "hell_energy", name: "Hell Energy", price: 110, category: "Normal", stock: 100, tracked: true, costPrice: 60 },
    { id: "jimys_cocktail", name: "Jimy's Cocktail", price: 200, category: "Normal", stock: 100, tracked: true, costPrice: 400 },
    { id: "tea", name: "Tea", price: 40, category: "High Tea", stock: 98, tracked: false, costPrice: 10 },
    { id: "coffee", name: "Coffee", price: 44, category: "High Tea", stock: 96, tracked: false, costPrice: 12 },
    { id: "milk", name: "Milk", price: 50, category: "High Tea", stock: 100, tracked: false, costPrice: 15 },
    { id: "black_coffee", name: "Black coffee", price: 40, category: "High Tea", stock: 98, tracked: false, costPrice: 8 },
    { id: "cold_coffee", name: "Cold Coffee", price: 90, category: "High Tea", stock: 100, tracked: false, costPrice: 25 },
    { id: "cold_coffee_vanilla", name: "Cold Coffee with Vanilla", price: 250, category: "High Tea", stock: 100, tracked: false, costPrice: 50 },
    { id: "plain_maggie", name: "Plain Maggie", price: 190, category: "High Tea", stock: 97, tracked: false, costPrice: 40 },
    { id: "masala_maggie", name: "Masala Maggie", price: 220, category: "High Tea", stock: 100, tracked: false, costPrice: 50 },
    { id: "vegetable_masala_maggie", name: "Vegetable Masala Maggie", price: 250, category: "High Tea", stock: 100, tracked: false, costPrice: 60 },
    { id: "salty_french_fries", name: "Salty French Fries", price: 220, category: "High Tea", stock: 100, tracked: false, costPrice: 50 },
    { id: "peri_peri_french_fries", name: "Peri peri French Fries", price: 250, category: "High Tea", stock: 100, tracked: false, costPrice: 60 },
    { id: "cheese_french_fries", name: "Cheese French Fries", price: 280, category: "High Tea", stock: 100, tracked: false, costPrice: 70 },
    { id: "kanda_bhaji", name: "Kanda Bhaji", price: 210, category: "High Tea", stock: 100, tracked: false, costPrice: 40 },
    { id: "aloo_bhaji", name: "Aloo Bhaji", price: 210, category: "High Tea", stock: 100, tracked: false, costPrice: 50 },
    { id: "corn_bhaji", name: "Corn Bhaji", price: 210, category: "High Tea", stock: 100, tracked: false, costPrice: 45 },
    { id: "mix_bhaji", name: "Mix Bhaji", price: 280, category: "High Tea", stock: 100, tracked: false, costPrice: 70 },
    { id: "veg_toast_sandwich", name: "Veg toast sandwich", price: 210, category: "High Tea", stock: 100, tracked: false, costPrice: 50 },
    { id: "cheese_toast_sandwich", name: "Cheese Toast Sandwich", price: 210, category: "High Tea", stock: 100, tracked: false, costPrice: 55 },
    { id: "cheese_chilly_toast", name: "Cheese Chilly Toast", price: 260, category: "High Tea", stock: 100, tracked: false, costPrice: 65 },
    { id: "garlic_bread", name: "Garlic bread (4pcs)", price: 180, category: "High Tea", stock: 99, tracked: false, costPrice: 40 },
    { id: "khichiya_papad", name: "Khichiya papad", price: 100, category: "Timepass", stock: 100, tracked: false, costPrice: 30 },
    { id: "khichiya_fried", name: "Khichiya fried papad", price: 120, category: "Timepass", stock: 100, tracked: false, costPrice: 35 },
    { id: "khichiya_masala_jain", name: "Khichiya masala papad jain", price: 160, category: "Timepass", stock: 100, tracked: false, costPrice: 45 },
    { id: "khichiya_masala_regular", name: "Khichiya masala papad regular", price: 160, category: "Timepass", stock: 100, tracked: false, costPrice: 45 },
    { id: "khichiya_cheese_masala", name: "Khichiya cheese masala papad", price: 180, category: "Timepass", stock: 100, tracked: false, costPrice: 55 },
    { id: "channa_masala_jain", name: "Channa masala ( jain )", price: 160, category: "Timepass", stock: 100, tracked: false, costPrice: 40 },
    { id: "channa_masala_regular", name: "Channa masala ( Regular )", price: 160, category: "Timepass", stock: 99, tracked: false, costPrice: 40 },
    { id: "peanut_masala", name: "Peanut masala", price: 150, category: "Timepass", stock: 100, tracked: false, costPrice: 35 },
    { id: "chakna_special", name: "Chakna Special", price: 260, category: "Timepass", stock: 100, tracked: false, costPrice: 80 },
    { id: "paneer_chilly_dry", name: "Paneer chilly dry", price: 280, category: "Timepass", stock: 99, tracked: false, costPrice: 90 },
    { id: "chinese_bhel", name: "Chinese bhel", price: 210, category: "Timepass", stock: 100, costPrice: 60, tracked: true },
    { id: "coca_cola_tin", name: "Coca Cola tin", price: 150, category: "Timepass", stock: 100, costPrice: 40, tracked: true },
    { id: "nimboos_masala_soda", name: "NIMBOOS MASALA SODA", price: 120, category: "Timepass", stock: 100, costPrice: 30, tracked: true },
    { id: "makkai_butta", name: "Makkai butta", price: 100, category: "Timepass", stock: 100, costPrice: 25, tracked: true }
];

export function getMenuItems() {
    let items: any[] = [];
    try {
        if (fs.existsSync(MENU_FILE_PATH)) {
            const content = fs.readFileSync(MENU_FILE_PATH, "utf8");
            items = JSON.parse(content);
        } else {
            // Check if local repo copy exists to copy it over
            const localRepoPath = path.join(__dirname, "../../../menu_items.json");
            if (fs.existsSync(localRepoPath)) {
                const content = fs.readFileSync(localRepoPath, "utf8");
                items = JSON.parse(content);
                fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(items, null, 2), "utf8");
            } else {
                items = JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
                fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(items, null, 2), "utf8");
            }
        }
    } catch (err) {
        console.error("Error reading menu file:", err);
        items = JSON.parse(JSON.stringify(DEFAULT_MENU_ITEMS));
    }

    return items;
}

export function deductItemStock(itemId: string, quantity: number): number {
    try {
        const menu = getMenuItems();
        const menuItem = menu.find((m: any) => m.id === itemId || m.name.toLowerCase() === itemId.toLowerCase());
        if (menuItem && typeof menuItem.stock === "number") {
            menuItem.stock = Math.max(0, menuItem.stock - quantity);
            fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menu, null, 2), "utf8");
            console.log(`[Inventory] Deducted ${quantity} of ${itemId}. Remaining stock: ${menuItem.stock}`);
            return menuItem.stock;
        }
    } catch (err) {
        console.error(`Failed to deduct inventory stock for ${itemId}:`, err);
    }
    return -1;
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

// Download Menu PDF route
router.get("/menu/download-pdf", async (req, res) => {
    try {
        const menuItems = getMenuItems();
        const pdfBuffer = await generateMenuPDF(menuItems);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="Galaxia_Resorts_Menu.pdf"');
        return res.send(pdfBuffer);
    } catch (err: any) {
        console.error("Error generating menu PDF:", err);
        return res.status(500).json({ error: "Failed to generate menu PDF" });
    }
});

// Download Stock PDF route
router.get("/menu/download-stock-pdf", authMiddleware, async (req, res) => {
    try {
        const menuItems = getMenuItems();
        const pdfBuffer = await generateStockPDF(menuItems);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="Galaxia_Resorts_Stock.pdf"');
        return res.send(pdfBuffer);
    } catch (err: any) {
        console.error("Error generating stock PDF:", err);
        return res.status(500).json({ error: "Failed to generate stock PDF" });
    }
});

// Helper: Check if an item is a Chef prepared item (e.g. Fresh Lime Water, Fresh Lime Soda)
const isChefPreparedItem = (item: any) => {
    const name = (item?.name || item?.id || "").toLowerCase();
    return name.includes("lime");
};

// 1. Public Route: POST /api/hospitality/requests — Submit request from a guest villa e-menu
router.post("/requests", async (req, res) => {
    try {
        const { villaName, itemCategory, items, isOwnerMode } = req.body;

        if (!villaName || !itemCategory || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: "villaName, itemCategory, and items array are required" });
        }

        const now = new Date();
        // Set date to local midnight to match date comparison
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Auto-decrement stock for each ordered item
        try {
            const menu = getMenuItems();
            let menuChanged = false;
            
            for (const orderedItem of items) {
                // Find matching item in menu (by matching name or id)
                const menuItem = menu.find((m: any) => 
                    m.id === orderedItem.id || 
                    m.name.toLowerCase() === orderedItem.name.toLowerCase()
                );
                
                if (menuItem && typeof menuItem.stock === "number") {
                    menuItem.stock = Math.max(0, menuItem.stock - (orderedItem.quantity || 1));
                    menuChanged = true;
                }
            }
            
            if (menuChanged) {
                fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menu, null, 2), "utf8");
            }
        } catch (stockErr) {
            console.error("Failed to auto-decrement stock:", stockErr);
        }

        // If this is an Owner Mode order, return early so no request record is created in DB and no WhatsApp messages are sent
        if (isOwnerMode) {
            return res.status(201).json({
                success: true,
                isOwnerOrder: true,
                message: "Owner order processed — stock updated without routing to staff."
            });
        }

        // Find active booking for this villa today
        const activeBookings = await prisma.staycationBooking.findMany({
            where: {
                status: { in: ["confirmed", "checked_in"] },
                checkInDate: { lte: todayStart },
                checkOutDate: { gte: todayStart }
            },
            include: {
                subProperty: true
            }
        });

        const activeBooking = activeBookings.find(booking => {
            if (booking.assignedUnit) {
                const units = booking.assignedUnit.split(",").map(u => u.trim().toLowerCase());
                if (units.includes(villaName.toLowerCase())) return true;
            }
            if (booking.subProperty?.name.toLowerCase() === villaName.toLowerCase()) return true;
            return false;
        });

        const request = await prisma.hospitalityRequest.create({
            data: {
                villaName,
                itemCategory,
                items: items,
                status: "pending",
                isBilled: false,
                bookingId: activeBooking ? activeBooking.id : null
            }
        });

        // Send WhatsApp notification to hospitality staff & managers
        try {
            // Build items summary string joined by commas (Meta templates reject newlines)
            const itemsSummary = items.map((i: any) => {
                const commentText = i.comment && i.comment.trim() ? ` (${i.comment.trim().replace(/\s+/g, " ")})` : '';
                return `${i.quantity}x ${i.name}${commentText}`;
            }).join(", ");
            // Calculate total
            const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
            // Format timestamp in IST
            const orderTime = now.toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                hour12: true, timeZone: "Asia/Kolkata"
            });

            const isHighTea = itemCategory === "High Tea";
            const isTimepass = itemCategory === "Timepass";
            const hasChefItem = items.some((i: any) => isChefPreparedItem(i));
            const isChefOrder = isHighTea || isTimepass || hasChefItem;

            const templateName = isChefOrder
                ? "hospitality_hightea_order"
                : "hospitality_housekeeping_order";

            // Manager 1 (Ranjit): 7355630009, Manager 2 (Devidas): 9923500208, Chef: 9867677811
            const recipientPhones = isChefOrder
                ? ["7355630009", "9923500208", "9867677811"]
                : ["7355630009", "9923500208"];

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

// 2. GET /api/hospitality/requests — Fetch hospitality requests (Normal, High Tea, Timepass, or Prepared Food Deliveries)
router.get("/requests", async (req: AuthRequest, res) => {
    try {
        const { category, status, bookingId, isBilled, date, chefOnly, excludeChefItems, foodDeliveries } = req.query;
        const where: any = {};

        if (foodDeliveries === "true") {
            // Housekeeping food delivery section fetches requests marked as "prepared" by chef
            where.status = "prepared";
        } else {
            if (category) {
                where.itemCategory = String(category);
            }
            if (status) {
                where.status = String(status);
            }
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
                        bookingRef: true,
                        propertyId: true,
                        property: { select: { name: true } },
                        subProperty: { select: { name: true } }
                    }
                }
            }
        });

        // Parse items — handle both old stringified and new array format
        let parsedRequests = requests.map(req => {
            let parsedItems = req.items;
            if (typeof parsedItems === "string") {
                try { parsedItems = JSON.parse(parsedItems); } catch { parsedItems = []; }
            }
            return { ...req, items: parsedItems };
        });

        // Additional Chef vs Housekeeping item filtering & segregation
        if (category === "Normal") {
            if (chefOnly === "true") {
                // Chef portal Normal tab: filter items array to ONLY contain Chef items (Fresh Lime Water/Soda)
                parsedRequests = parsedRequests
                    .map(r => ({
                        ...r,
                        items: Array.isArray(r.items) ? r.items.filter((i: any) => isChefPreparedItem(i)) : []
                    }))
                    .filter(r => r.items.length > 0);
            } else if (excludeChefItems === "true") {
                // Housekeeping pending items: filter items array to ONLY contain non-Chef items (Water, Sprite, etc.)
                parsedRequests = parsedRequests
                    .map(r => ({
                        ...r,
                        items: Array.isArray(r.items) ? r.items.filter((i: any) => !isChefPreparedItem(i)) : []
                    }))
                    .filter(r => r.items.length > 0);
            }
        }

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

        const userRole = req.admin?.role || "";
        const cat = itemCategory || existing.itemCategory;
        
        // Restriction: Only chef/owner/dev can edit/modify items in active High Tea or Timepass requests
        if ((cat === "High Tea" || cat === "Timepass") && status !== "fulfilled") {
            if (userRole !== "chef" && userRole !== "owner" && userRole !== "developer") {
                return res.status(403).json({ error: "Only chef profile can modify active High Tea / Timepass requests." });
            }
        }

        const data: any = {};
        if (status !== undefined) data.status = status;
        if (villaName !== undefined) data.villaName = villaName;
        if (itemCategory !== undefined) data.itemCategory = itemCategory;
        if (items !== undefined) {
            data.items = items;
            
            // Send email if items were removed or reduced
            try {
                let existingItems: any[] = [];
                let newItemsList: any[] = items;
                if (typeof existing.items === "string") {
                    existingItems = JSON.parse(existing.items);
                } else if (Array.isArray(existing.items)) {
                    existingItems = existing.items as any[];
                }
                
                const removedDetails: string[] = [];
                existingItems.forEach((oldItem: any) => {
                    const matched = newItemsList.find((newItem: any) => newItem.name === oldItem.name);
                    if (!matched) {
                        removedDetails.push(`Removed item: ${oldItem.name} (Qty: ${oldItem.quantity})`);
                    } else if (matched.quantity < oldItem.quantity) {
                        removedDetails.push(`Reduced item: ${oldItem.name} from ${oldItem.quantity} to ${matched.quantity}`);
                    }
                });

                if (removedDetails.length > 0) {
                    sendOrderDeletionNotification({
                        performedBy: req.admin?.username || "Staff",
                        role: userRole,
                        actionType: "modification",
                        villaName: villaName || existing.villaName,
                        category: cat,
                        details: removedDetails.join("\n")
                    });

                    // Log to database chefLogs
                    await prisma.chefLog.create({
                        data: {
                            adminId: req.admin?.id,
                            actionType: "modify_request",
                            details: `Villa ${villaName || existing.villaName} (${cat}): ${removedDetails.join("\n")}`
                        }
                    });
                }
            } catch (err) {
                console.error("Error parsing items for email alert:", err);
            }

            // Re-calculate bookingId based on target villa
            const targetVilla = villaName || existing.villaName;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const activeBookings = await prisma.staycationBooking.findMany({
                where: {
                    status: { in: ["confirmed", "checked_in"] },
                    checkInDate: { lte: todayStart },
                    checkOutDate: { gte: todayStart }
                },
                include: {
                    subProperty: true
                }
            });

            const activeBooking = activeBookings.find(booking => {
                if (booking.assignedUnit) {
                    const units = booking.assignedUnit.split(",").map(u => u.trim().toLowerCase());
                    if (units.includes(targetVilla.toLowerCase())) return true;
                }
                if (booking.subProperty?.name.toLowerCase() === targetVilla.toLowerCase()) return true;
                return false;
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

// 5. GET /api/hospitality/allocations — Fetch active allocations (checked in with allotted villa) for a given date
router.get("/allocations", async (req: AuthRequest, res) => {
    try {
        const dateStr = req.query.date as string;
        const filterDate = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59, 999);

        // Only show allocations for Ambrose and Amstel Nest where checkin is complete and villa is allotted
        const bookings = await prisma.staycationBooking.findMany({
            where: {
                status: "checked_in",
                checkInDate: { lte: endOfDay },
                checkOutDate: { gte: startOfDay },
                property: {
                    slug: { in: ["ambrose", "amstel-nest"] }
                },
                assignedUnit: { not: null }
            },
            include: {
                subProperty: true
            }
        });

        const result = bookings
            .filter(b => b.assignedUnit && b.assignedUnit.trim() !== "" && b.assignedUnit !== "Standard Cottage")
            .map(b => ({
                bookingId: b.id,
                bookingRef: b.bookingRef,
                guestName: b.customerName,
                villaName: b.assignedUnit!,
                checkInDate: b.checkInDate,
                checkOutDate: b.checkOutDate,
                status: b.status
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

        const userRole = req.admin?.role || "";
        if ((existing.itemCategory === "High Tea" || existing.itemCategory === "Timepass") && existing.status !== "fulfilled") {
            if (userRole !== "chef" && userRole !== "owner" && userRole !== "developer") {
                return res.status(403).json({ error: "Only chef profile can cancel/delete active High Tea / Timepass requests." });
            }
        }

        // Send email alert on order deletion
        try {
            let itemDesc = "";
            if (typeof existing.items === "string") {
                const parsed = JSON.parse(existing.items);
                itemDesc = parsed.map((i: any) => `${i.name} (Qty: ${i.quantity})`).join(", ");
            } else if (Array.isArray(existing.items)) {
                itemDesc = (existing.items as any[]).map((i: any) => `${i.name} (Qty: ${i.quantity})`).join(", ");
            }
            sendOrderDeletionNotification({
                performedBy: req.admin?.username || "Staff",
                role: userRole,
                actionType: "deletion",
                villaName: existing.villaName,
                category: existing.itemCategory,
                details: `Entire order deleted. Items included: ${itemDesc}`
            });

            // Log to database chefLogs
            await prisma.chefLog.create({
                data: {
                    adminId: req.admin?.id,
                    actionType: "delete_request",
                    details: `Villa ${existing.villaName} (${existing.itemCategory}): Entire order deleted. Items included: ${itemDesc}`
                }
            });
        } catch (err) {
            console.error("Error constructing deletion email details:", err);
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

// 8. GET /api/hospitality/insights — Aggregated item order analytics
router.get("/insights", async (req: AuthRequest, res) => {
    try {
        const allRequests = await prisma.hospitalityRequest.findMany({
            where: { status: "fulfilled" },
            select: { items: true, itemCategory: true, createdAt: true, villaName: true }
        });

        const menu = getMenuItems();

        // Build per-item stats with costPrice from menu
        const itemStats: Record<string, {
            id: string; name: string; price: number; category: string;
            totalOrdered: number; totalRevenue: number; estimatedCost: number;
            orderDates: string[]; costPrice: number;
        }> = {};

        // Initialize from menu
        menu.forEach((item: any) => {
            itemStats[item.id] = {
                id: item.id, name: item.name, price: item.price, category: item.category,
                totalOrdered: 0, totalRevenue: 0, estimatedCost: 0, orderDates: [],
                costPrice: item.costPrice || 0
            };
        });

        // Aggregate from fulfilled requests
        let totalOrders = 0;
        let totalRevenue = 0;
        const categoryStats: Record<string, { orders: number; revenue: number; cost: number }> = {
            "Normal": { orders: 0, revenue: 0, cost: 0 },
            "High Tea": { orders: 0, revenue: 0, cost: 0 },
            "Timepass": { orders: 0, revenue: 0, cost: 0 }
        };

        for (const req of allRequests) {
            let parsedItems = req.items as any;
            // Handle double-stringified items from old data
            if (typeof parsedItems === "string") {
                try { parsedItems = JSON.parse(parsedItems); } catch { continue; }
            }
            if (!Array.isArray(parsedItems)) continue;
            totalOrders++;
            const dateStr = req.createdAt.toISOString().split("T")[0];

            for (const item of parsedItems) {
                const qty = item.quantity || 1;
                const itemId = item.id || item.name?.toLowerCase().replace(/\s+/g, "_");
                const price = item.price || 0;
                const revenue = price * qty;
                const menuCostPrice = itemStats[itemId]?.costPrice || 0;
                const cost = menuCostPrice * qty;

                if (!itemStats[itemId]) {
                    itemStats[itemId] = {
                        id: itemId, name: item.name || itemId, price, category: req.itemCategory || "Normal",
                        totalOrdered: 0, totalRevenue: 0, estimatedCost: 0, orderDates: [], costPrice: 0
                    };
                }

                itemStats[itemId].totalOrdered += qty;
                itemStats[itemId].totalRevenue += revenue;
                itemStats[itemId].estimatedCost += cost;
                if (!itemStats[itemId].orderDates.includes(dateStr)) {
                    itemStats[itemId].orderDates.push(dateStr);
                }

                totalRevenue += revenue;
                const cat = req.itemCategory || "Normal";
                if (categoryStats[cat]) {
                    categoryStats[cat].orders += qty;
                    categoryStats[cat].revenue += revenue;
                    categoryStats[cat].cost += cost;
                }
            }
        }

        const itemList = Object.values(itemStats)
            .filter(i => i.totalOrdered > 0)
            .sort((a, b) => b.totalOrdered - a.totalOrdered);

        const totalEstimatedCost = itemList.reduce((s, i) => s + i.estimatedCost, 0);

        return res.json({
            totalOrders,
            totalRevenue,
            totalEstimatedCost,
            totalProfit: totalRevenue - totalEstimatedCost,
            categoryStats,
            items: itemList,
            mostOrdered: itemList.slice(0, 5),
            leastOrdered: [...itemList].sort((a, b) => a.totalOrdered - b.totalOrdered).slice(0, 5),
        });
    } catch (error) {
        console.error("Error generating insights:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 9. PATCH /api/hospitality/allocations/:bookingId — Re-allot cottage & re-send WhatsApp notification (owner/developer only)
router.patch("/allocations/:bookingId", requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId as string);
        const { assignedUnit } = req.body;

        if (isNaN(bookingId)) {
            return res.status(400).json({ error: "Invalid booking ID" });
        }
        if (!assignedUnit || typeof assignedUnit !== "string" || !assignedUnit.trim()) {
            return res.status(400).json({ error: "assignedUnit is required" });
        }

        const existing = await prisma.staycationBooking.findUnique({
            where: { id: bookingId },
            include: { property: true }
        });
        if (!existing) {
            return res.status(404).json({ error: "Booking not found" });
        }

        // Update the assigned unit
        const updated = await prisma.staycationBooking.update({
            where: { id: bookingId },
            data: { assignedUnit: assignedUnit.trim() },
            include: { property: true, subProperty: true }
        });

        // Re-send the check-in WhatsApp notification with the new unit
        let whatsappSent = false;
        try {
            const guestPhone = decrypt(updated.customerPhone);
            const firstUnit = assignedUnit.trim().split(",")[0].trim();
            const slugifiedUnit = firstUnit.toLowerCase().replace(/\s+/g, "-");
            const menuUrl = `galaxiaresorts.com/hospitalityemenu/${slugifiedUnit}`;

            whatsappSent = await sendWhatsAppTemplateMessage(
                "otp",
                guestPhone,
                "hospitality_checkin_notification",
                [assignedUnit.trim(), menuUrl]
            );
        } catch (waErr: any) {
            console.error("Re-allotment WhatsApp notification failed:", waErr.message);
        }

        return res.json({
            success: true,
            booking: {
                bookingId: updated.id,
                bookingRef: updated.bookingRef,
                guestName: updated.customerName,
                villaName: updated.assignedUnit || updated.subProperty?.name || "Unassigned",
                checkInDate: updated.checkInDate,
                checkOutDate: updated.checkOutDate,
                status: updated.status
            },
            whatsappSent
        });
    } catch (error) {
        console.error("Error re-allotting cottage:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
