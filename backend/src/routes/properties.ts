import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/properties/all — Admin: list ALL properties (including inactive)
router.get("/all", authMiddleware, requireRole("owner", "developer", "manager"), async (_req, res) => {
    try {
        const properties = await prisma.property.findMany({
            orderBy: { displayOrder: "asc" },
            include: {
                subProperties: { orderBy: { displayOrder: "asc" } },
                pricing: { where: { isActive: true }, orderBy: { dayType: "asc" } },
            },
        });

        const flattened: any[] = [];
        for (const p of properties) {
            if (p.slug === "ambrose" || p.slug === "amstel-nest") {
                // Return sub-properties as flattened items
                for (const sp of p.subProperties) {
                    flattened.push({
                        ...p,
                        id: `sp-${sp.id}`,
                        realId: sp.id,
                        entityType: 'subProperty',
                        name: p.slug === 'ambrose' ? `${sp.name} (Ambrose)` : `${sp.name} (Amstelnest)`,
                        subProperties: [], // already flattened
                    });
                }
            } else {
                flattened.push({
                    ...p,
                    entityType: 'property',
                    realId: p.id,
                });
            }
        }

        // Add DD Screens
        const screens = await prisma.ddScreen.findMany({ orderBy: { displayOrder: "asc" } });
        for (const s of screens) {
            flattened.push({
                id: `dd-${s.id}`,
                realId: s.id,
                entityType: 'ddScreen',
                name: `${s.name} (Digital Diaries)`,
                slug: s.slug,
                type: 'dd',
                isActive: s.isActive,
                location: 'Karjat',
                image: s.imageUrl,
            });
        }

        return res.json(flattened);
    } catch (error) {
        console.error("Properties admin list error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.patch("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const idStr = req.params.id as string;
        const { isActive, weekdayPrice, weekendPrice, maxGuests, name, location } = req.body;
        
        // Handle flattened IDs: sp-ID or dd-ID or numeric
        if (idStr.startsWith("sp-")) {
            const realId = parseInt(idStr.replace("sp-", ""));
            const data: any = {};
            if (isActive !== undefined) data.isActive = isActive;
            if (name !== undefined) data.name = name;
            
            const sp = await prisma.subProperty.update({
                where: { id: realId },
                data
            });
            return res.json(sp);
        } else if (idStr.startsWith("dd-")) {
            const realId = parseInt(idStr.replace("dd-", ""));
            const data: any = {};
            if (isActive !== undefined) data.isActive = isActive;
            if (name !== undefined) data.name = name;
            
            const dd = await prisma.ddScreen.update({
                where: { id: realId },
                data
            });
            return res.json(dd);
        }

        const id = parseInt(idStr);
        const data: any = {};
        if (isActive !== undefined) data.isActive = isActive;
        if (weekdayPrice !== undefined) data.weekdayPrice = parseFloat(weekdayPrice);
        if (weekendPrice !== undefined) data.weekendPrice = parseFloat(weekendPrice);
        if (maxGuests !== undefined) data.maxGuests = parseInt(maxGuests);
        if (name !== undefined) data.name = name;
        if (location !== undefined) data.location = location;

        const property = await prisma.property.update({
            where: { id },
            data,
        });
        return res.json(property);
    } catch (error) {
        console.error("Update property error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/properties — List all properties
router.get("/", async (_req, res) => {
    try {
        const properties = await prisma.property.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
            include: {
                subProperties: {
                    where: { isActive: true },
                    orderBy: { displayOrder: "asc" },
                },
                amenities: { orderBy: { displayOrder: "asc" } },
            },
        });
        return res.json(properties);
    } catch (error) {
        console.error("Properties list error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/properties/:slug — Property detail
router.get("/:slug", async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { slug: req.params.slug },
            include: {
                subProperties: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
                amenities: { orderBy: { displayOrder: "asc" } },
                pricing: { where: { isActive: true } },
            },
        });
        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }
        return res.json(property);
    } catch (error) {
        console.error("Property detail error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/properties/:slug/availability?month=2026-03
router.get("/:slug/availability", async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { slug: req.params.slug },
            include: { 
                pricing: { where: { isActive: true } },
                subProperties: { select: { id: true, isActive: true } }
            }
        });
        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        const month = req.query.month as string; // e.g. "2026-03"
        let startDate: Date, endDate: Date;

        if (month) {
            startDate = new Date(`${month}-01`);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        } else {
            startDate = new Date();
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 2, 0);
        }

        // Get booked dates
        const bookings = await prisma.staycationBooking.findMany({
            where: {
                propertyId: property.id,
                status: { notIn: ["cancelled", "no_show"] },
                checkInDate: { lte: endDate },
                checkOutDate: { gte: startDate },
            },
            select: { checkInDate: true, checkOutDate: true, subPropertyId: true },
        });

        // Get blocked dates
        const blocked = await prisma.blockedDate.findMany({
            where: {
                propertyId: property.id,
                blockedDate: { gte: startDate, lte: endDate },
            },
        });

        const weekdayPricing = property.pricing.find(p => p.dayType === 'weekday');
        const weekendPricing = property.pricing.find(p => p.dayType === 'weekend');

        res.json({
            isActive: property.isActive,
            pricing: {
                weekday: weekdayPricing ? { price: weekdayPricing.basePrice.toString(), extraAdult: weekdayPricing.extraAdultPrice } : null,
                weekend: weekendPricing ? { price: weekendPricing.basePrice.toString(), extraAdult: weekendPricing.extraAdultPrice } : null,
                all: property.pricing
            },
            subProperties: property.subProperties,
            bookings,
            blocked: blockedDates
        });
    } catch (error) {
        console.error("Availability error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
