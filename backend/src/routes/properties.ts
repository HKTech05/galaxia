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

// GET /api/properties/all-nested — Admin: list properties with nested sub-properties + DD data
router.get("/all-nested", authMiddleware, requireRole("owner", "developer", "manager"), async (_req, res) => {
    try {
        const properties = await prisma.property.findMany({
            orderBy: { displayOrder: "asc" },
            include: {
                subProperties: {
                    orderBy: { displayOrder: "asc" },
                    include: { pricing: { where: { isActive: true }, orderBy: { dayType: "asc" } } },
                },
                pricing: { where: { isActive: true }, orderBy: { dayType: "asc" } },
            },
        });

        // Fetch DD screens and packages separately
        const ddScreens = await prisma.ddScreen.findMany({ orderBy: { displayOrder: "asc" } });
        const ddPackages = await prisma.ddPackage.findMany({
            where: { isActive: true },
            include: { pricing: { orderBy: { hours: "asc" } } },
        });

        // Attach DD data to the Digital Diaries property
        const enriched = properties.map(p => {
            if (p.slug === "digital-diaries") {
                return { ...p, ddScreens, ddPackages };
            }
            return p;
        });

        return res.json(enriched);
    } catch (error) {
        console.error("Properties nested list error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/sub/:id/toggle — Toggle sub-property active status
router.patch("/sub/:id/toggle", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const sp = await prisma.subProperty.findUnique({ where: { id } });
        if (!sp) return res.status(404).json({ error: "Sub-property not found" });
        const updated = await prisma.subProperty.update({
            where: { id },
            data: { isActive: !sp.isActive },
        });
        return res.json(updated);
    } catch (error) {
        console.error("Toggle sub-property error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/sub/:id/unit-count — Update sub-property unitCount
router.patch("/sub/:id/unit-count", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { unitCount } = req.body;
        if (unitCount === undefined || unitCount < 0) return res.status(400).json({ error: "Valid unitCount required" });
        const updated = await prisma.subProperty.update({
            where: { id },
            data: { unitCount: parseInt(unitCount) },
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update unit count error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/sub/:id/pricing — Update/create sub-property pricing
router.patch("/sub/:id/pricing", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const subId = parseInt(req.params.id as string);
        const { weekday, weekend, saturday, extraGuest } = req.body;
        const sp = await prisma.subProperty.findUnique({ where: { id: subId } });
        if (!sp) return res.status(404).json({ error: "Sub-property not found" });

        for (const [dayType, price] of [["weekday", weekday], ["weekend", weekend], ["saturday", saturday]] as [string, number | undefined][]) {
            if (price === undefined) continue;
            const existing = await prisma.propertyPricing.findFirst({
                where: { subPropertyId: subId, dayType, overrideDate: null, isActive: true },
            });
            if (existing) {
                await prisma.propertyPricing.update({
                    where: { id: existing.id },
                    data: { basePrice: price, ...(extraGuest !== undefined ? { extraAdultPrice: extraGuest } : {}) },
                });
            } else {
                await prisma.propertyPricing.create({
                    data: { subPropertyId: subId, propertyId: sp.propertyId, dayType, basePrice: price, extraAdultPrice: extraGuest || 0 },
                });
            }
        }
        if (extraGuest !== undefined && weekday === undefined && weekend === undefined && saturday === undefined) {
            await prisma.propertyPricing.updateMany({
                where: { subPropertyId: subId, overrideDate: null, isActive: true },
                data: { extraAdultPrice: extraGuest },
            });
        }
        return res.json({ success: true });
    } catch (error) {
        console.error("Sub-property pricing error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/properties/sub/:id/date-pricing — Date override for sub-property
router.post("/sub/:id/date-pricing", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const subId = parseInt(req.params.id as string);
        const { date, price } = req.body;
        if (!date || !price) return res.status(400).json({ error: "date and price required" });
        const overrideDate = new Date(date); overrideDate.setUTCHours(0, 0, 0, 0);
        const existing = await prisma.propertyPricing.findFirst({ where: { subPropertyId: subId, overrideDate, isActive: true } });
        if (existing) {
            await prisma.propertyPricing.update({ where: { id: existing.id }, data: { basePrice: parseInt(price) } });
        } else {
            const dow = overrideDate.getUTCDay();
            const dayType = dow === 6 ? "saturday" : (dow === 0 || dow === 5) ? "weekend" : "weekday";
            const sp = await prisma.subProperty.findUnique({ where: { id: subId } });
            await prisma.propertyPricing.create({
                data: { subPropertyId: subId, propertyId: sp?.propertyId, dayType, basePrice: parseInt(price), overrideDate, specialLabel: `Override ${date}` },
            });
        }
        return res.json({ success: true, message: `Price ₹${price} set for ${date}` });
    } catch (error) {
        console.error("Sub date pricing error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/:id/pricing — Update property pricing
router.patch("/:id/pricing", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { weekday, weekend, saturday, extraGuest } = req.body;
        
        const updates = [];
        if (weekday !== undefined) {
            updates.push(prisma.propertyPricing.updateMany({
                where: { propertyId: id, subPropertyId: null, dayType: "weekday", isActive: true, overrideDate: null },
                data: { basePrice: weekday, ...(extraGuest !== undefined ? { extraAdultPrice: extraGuest } : {}) },
            }));
        }
        if (weekend !== undefined) {
            updates.push(prisma.propertyPricing.updateMany({
                where: { propertyId: id, subPropertyId: null, dayType: "weekend", isActive: true, overrideDate: null },
                data: { basePrice: weekend, ...(extraGuest !== undefined ? { extraAdultPrice: extraGuest } : {}) },
            }));
        }
        if (saturday !== undefined) {
            updates.push(prisma.propertyPricing.updateMany({
                where: { propertyId: id, subPropertyId: null, dayType: "saturday", isActive: true, overrideDate: null },
                data: { basePrice: saturday, ...(extraGuest !== undefined ? { extraAdultPrice: extraGuest } : {}) },
            }));
        }
        
        await Promise.all(updates);
        return res.json({ success: true });
    } catch (error) {
        console.error("Update pricing error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/properties/:id/date-pricing — Set price for a specific date
router.post("/:id/date-pricing", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const propertyId = parseInt(req.params.id as string);
        const { date, price } = req.body;
        if (!date || !price) return res.status(400).json({ error: "date and price required" });

        const overrideDate = new Date(date);
        overrideDate.setUTCHours(0, 0, 0, 0);

        // Check if override already exists for this date
        const existing = await prisma.propertyPricing.findFirst({
            where: { propertyId, overrideDate, isActive: true },
        });

        if (existing) {
            await prisma.propertyPricing.update({
                where: { id: existing.id },
                data: { basePrice: parseInt(price) },
            });
        } else {
            // Determine day type from the date
            const dow = overrideDate.getUTCDay();
            const dayType = dow === 6 ? "saturday" : (dow === 0 || dow === 5) ? "weekend" : "weekday";
            await prisma.propertyPricing.create({
                data: {
                    propertyId,
                    dayType,
                    basePrice: parseInt(price),
                    overrideDate,
                    specialLabel: `Override ${date}`,
                },
            });
        }

        return res.json({ success: true, message: `Price set to ₹${price} for ${date}` });
    } catch (error) {
        console.error("Date pricing error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/dd-screen/:id/toggle — Toggle DD screen active status
router.patch("/dd-screen/:id/toggle", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const screen = await prisma.ddScreen.findUnique({ where: { id } });
        if (!screen) return res.status(404).json({ error: "Screen not found" });
        const updated = await prisma.ddScreen.update({
            where: { id },
            data: { isActive: !screen.isActive },
        });
        return res.json(updated);
    } catch (error) {
        console.error("Toggle DD screen error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/dd-package-pricing/:id — Update DD package pricing row
router.patch("/dd-package-pricing/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { weekdayPrice, weekendPrice, weekdayDiscount, weekendDiscount } = req.body;
        const data: any = {};
        if (weekdayPrice !== undefined) data.weekdayPrice = parseInt(weekdayPrice);
        if (weekendPrice !== undefined) data.weekendPrice = parseInt(weekendPrice);
        if (weekdayDiscount !== undefined) data.weekdayDiscount = parseInt(weekdayDiscount);
        if (weekendDiscount !== undefined) data.weekendDiscount = parseInt(weekendDiscount);
        const updated = await prisma.ddPackagePricing.update({ where: { id }, data });
        return res.json(updated);
    } catch (error) {
        console.error("Update DD pricing error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/properties/dd-override-test — debug endpoint
router.get("/dd-override-test", (req, res) => {
    console.log("DD override test endpoint hit");
    return res.json({ ok: true, message: "DD override route is reachable" });
});

// POST /api/properties/dd-override — Create/update DD pricing override for a date
router.post("/dd-override", authMiddleware, requireRole("owner", "developer", "manager"), async (req: AuthRequest, res) => {
    try {
        console.log("DD Override request received:", JSON.stringify(req.body));
        const { pricingId, date, price } = req.body;
        if (!pricingId || !date || price === undefined) return res.status(400).json({ error: "pricingId, date and price required" });
        const overrideDate = new Date(date);
        overrideDate.setUTCHours(0, 0, 0, 0);
        const override = await prisma.ddPricingOverride.upsert({
            where: { pricingId_overrideDate: { pricingId: parseInt(pricingId), overrideDate } },
            update: { price: parseInt(price) },
            create: { pricingId: parseInt(pricingId), overrideDate, price: parseInt(price) },
        });
        return res.json({ success: true, message: `DD override set to ₹${price} for ${date}`, override });
    } catch (error) {
        console.error("DD override error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/dd-package/:id — Update DD package (extra person price, addon pricing)
router.patch("/dd-package/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const { extraPersonPrice, addonPricing, extraHourRate } = req.body;
        const data: any = {};
        if (extraPersonPrice !== undefined) data.extraPersonPrice = parseInt(extraPersonPrice);
        if (addonPricing !== undefined) data.addonPricing = addonPricing;
        if (extraHourRate !== undefined) data.extraHourRate = parseInt(extraHourRate);
        const updated = await prisma.ddPackage.update({ where: { id }, data });
        return res.json(updated);
    } catch (error) {
        console.error("Update DD package error:", error);
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
        if (req.body.securityDeposit !== undefined) data.securityDeposit = parseInt(req.body.securityDeposit);

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
                pricing: { where: { isActive: true }, orderBy: { dayType: "asc" } },
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
                pricing: { where: { isActive: true, subPropertyId: null } },
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
                pricing: { where: { isActive: true, subPropertyId: null } },
                subProperties: {
                    select: { id: true, isActive: true, name: true, slug: true },
                }
            }
        });
        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        const month = req.query.month as string;
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
                status: { notIn: ["cancelled", "no_show", "transferred"] },
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

        // Parent-level pricing (non-override rows)
        const parentPricing = property.pricing.filter(p => !p.overrideDate);
        const weekdayPricing = parentPricing.find(p => p.dayType === 'weekday');
        const weekendPricing = parentPricing.find(p => p.dayType === 'weekend');
        const saturdayPricing = parentPricing.find(p => p.dayType === 'saturday');

        // Date overrides (property-level)
        const overrideRows = property.pricing.filter(p => p.overrideDate);
        const dateOverrides: Record<string, number> = {};
        for (const o of overrideRows) {
            if (o.overrideDate) {
                const key = o.overrideDate.toISOString().split('T')[0];
                dateOverrides[key] = o.basePrice;
            }
        }

        // Sub-property pricing
        const subPropertyPricing: Record<number, any> = {};
        if (property.subProperties.length > 0) {
            const subIds = property.subProperties.map(sp => sp.id);
            const subPricing = await prisma.propertyPricing.findMany({
                where: { subPropertyId: { in: subIds }, isActive: true },
            });
            for (const sp of property.subProperties) {
                const spPricing = subPricing.filter(p => p.subPropertyId === sp.id);
                const spBase = spPricing.filter(p => !p.overrideDate);
                const spOverrides = spPricing.filter(p => p.overrideDate);
                const spWd = spBase.find(p => p.dayType === 'weekday');
                const spWe = spBase.find(p => p.dayType === 'weekend');
                const spSa = spBase.find(p => p.dayType === 'saturday');
                const spDateOverrides: Record<string, number> = {};
                for (const o of spOverrides) {
                    if (o.overrideDate) {
                        const key = o.overrideDate.toISOString().split('T')[0];
                        spDateOverrides[key] = o.basePrice;
                    }
                }
                subPropertyPricing[sp.id] = {
                    weekday: spWd ? { price: spWd.basePrice.toString(), extraAdult: spWd.extraAdultPrice, personsLabel: spWd.personsLabel } : null,
                    weekend: spWe ? { price: spWe.basePrice.toString(), extraAdult: spWe.extraAdultPrice, personsLabel: spWe.personsLabel } : null,
                    saturday: spSa ? { price: spSa.basePrice.toString(), extraAdult: spSa.extraAdultPrice, personsLabel: spSa.personsLabel } : null,
                    dateOverrides: spDateOverrides,
                };
            }
        }

        res.json({
            isActive: property.isActive,
            pricing: {
                weekday: weekdayPricing ? { price: weekdayPricing.basePrice.toString(), extraAdult: weekdayPricing.extraAdultPrice, personsLabel: weekdayPricing.personsLabel } : null,
                weekend: weekendPricing ? { price: weekendPricing.basePrice.toString(), extraAdult: weekendPricing.extraAdultPrice, personsLabel: weekendPricing.personsLabel } : null,
                saturday: saturdayPricing ? { price: saturdayPricing.basePrice.toString(), extraAdult: saturdayPricing.extraAdultPrice, personsLabel: saturdayPricing.personsLabel } : null,
                all: parentPricing,
                dateOverrides,
            },
            subPropertyPricing,
            subProperties: property.subProperties,
            bookings,
            blocked: blocked,
            configuration: property.configuration || {},
        });
    } catch (error) {
        console.error("Availability error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/properties/:id — Update property configuration (celebration addon toggle, etc.)
router.patch("/:id", authMiddleware, requireRole("owner", "developer", "manager"), async (req: any, res: any) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid property ID" });

        const { configuration } = req.body;
        if (configuration === undefined) {
            return res.status(400).json({ error: "No configuration provided" });
        }

        const updated = await prisma.property.update({
            where: { id },
            data: { configuration: configuration },
        });

        return res.json({ success: true, configuration: updated.configuration });
    } catch (error) {
        console.error("Property config update error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

