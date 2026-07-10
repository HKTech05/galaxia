import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from "../lib/whatsappService";

const router = Router();

// Dictionary for fallback translation of common ingredients
const INGREDIENT_TRANSLATION_MAP: Record<string, string> = {
    potato: "बटाटा",
    tomato: "टोमॅटो",
    onion: "कांदा",
    garlic: "लसूण",
    ginger: "आले",
    rice: "तांदूळ",
    sugar: "साखर",
    salt: "मीठ",
    milk: "दूध",
    butter: "लोणी",
    coriander: "कोथिंबीर",
    paneer: "पनीर",
    cheese: "चीझ",
    bread: "ब्रेड",
    egg: "अंडे",
    chicken: "चिकन",
    mutton: "मटण",
    fish: "मासा",
    turmeric: "हळद",
    cumin: "जिरे",
    mustard: "मोहरी",
    pepper: "काळी मिरी",
    cardamom: "वेलची",
    clove: "लवंग",
    cinnamon: "दालचिनी",
    ghee: "तूप",
    curd: "दही",
    yogurt: "दही",
    flour: "पीठ",
    "wheat flour": "गव्हाचे पीठ",
    "cooking oil": "खाद्यतेल",
    oil: "तेल",
    "green chillies": "हिरवी मिरची",
    chili: "मिरची",
    lemon: "लिंबू",
    water: "पाणी",
    mint: "पुदीना",
};

/**
 * Translates an English ingredient name to Marathi.
 * First checks local dictionary, then tries MyMemory API, and falls back to English.
 */
async function translateEnglishToMarathi(text: string): Promise<string> {
    const trimmed = text.trim();
    const normalized = trimmed.toLowerCase();

    // Check local lookup dictionary
    if (INGREDIENT_TRANSLATION_MAP[normalized]) {
        return INGREDIENT_TRANSLATION_MAP[normalized];
    }

    // Try MyMemory translation API
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|mr`;
        const response = await fetch(url);
        if (response.ok) {
            const data: any = await response.json();
            const translatedText = data?.responseData?.translatedText;
            if (translatedText && !translatedText.includes("MYMEMORY WARNING")) {
                // If it successfully translated to something new (not matching original or error warnings)
                if (translatedText.trim().toLowerCase() !== normalized) {
                    return translatedText.trim();
                }
            }
        }
    } catch (error) {
        console.error("MyMemory translation API failed:", error);
    }

    // Fallback to original English name if all else fails
    return trimmed;
}



// ───────────────────────────────────────────────────────────────
//  Authenticated Routes
// ───────────────────────────────────────────────────────────────
router.use(authMiddleware);
router.use(requireRole("chef", "owner", "developer"));

// GET /api/chef/ingredients — List all ingredients
router.get("/ingredients", async (req: AuthRequest, res) => {
    try {
        const ingredients = await prisma.ingredient.findMany({
            orderBy: { nameEn: "asc" }
        });
        return res.json(ingredients);
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/chef/ingredients — Add a new ingredient (auto-translates nameEn to Hindi)
router.post("/ingredients", async (req: AuthRequest, res) => {
    try {
        const { nameEn, category, unit } = req.body;
        if (!nameEn || typeof nameEn !== "string" || nameEn.trim() === "") {
            return res.status(400).json({ error: "Ingredient English name is required" });
        }

        const cleanEn = nameEn.trim();
        
        // Prevent duplicate english name (case-insensitive)
        const existing = await prisma.ingredient.findFirst({
            where: {
                nameEn: {
                    equals: cleanEn,
                    mode: "insensitive"
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: "Ingredient already exists" });
        }

        // Auto-translate nameEn to Marathi
        const nameHi = await translateEnglishToMarathi(cleanEn);

        const newIngredient = await prisma.ingredient.create({
            data: {
                nameEn: cleanEn,
                nameHi: nameHi,
                category: category || "Dairy",
                unit: unit || "kg"
            }
        });

        // Log the action
        await prisma.chefLog.create({
            data: {
                adminId: req.admin!.id,
                actionType: "add_ingredient",
                details: JSON.stringify({ nameEn: cleanEn, nameHi, category, unit })
            }
        });

        return res.status(201).json(newIngredient);
    } catch (error) {
        console.error("Error adding ingredient:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/chef/ingredients/:id — Delete an ingredient (Owner/Developer only)
router.delete("/ingredients/:id", requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ingredient ID" });
        }

        const existing = await prisma.ingredient.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Ingredient not found" });
        }

        await prisma.ingredient.delete({
            where: { id }
        });

        // Log the action
        await prisma.chefLog.create({
            data: {
                adminId: req.admin!.id,
                actionType: "delete_ingredient",
                details: JSON.stringify({ nameEn: existing.nameEn, nameHi: existing.nameHi })
            }
        });

        return res.json({ success: true, message: "Ingredient deleted successfully" });
    } catch (error) {
        console.error("Error deleting ingredient:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/chef/logs — Fetch chef logs
router.get("/logs", requireRole("owner", "developer", "chef", "sub-admin", "housekeeping", "staycation_admin"), async (req: AuthRequest, res) => {
    try {
        const logs = await prisma.chefLog.findMany({
            include: {
                admin: {
                    select: {
                        username: true,
                        displayName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.json(logs);
    } catch (error) {
        console.error("Error fetching chef logs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/chef/submit — Submit checklist (generates daily list PDF, logs it, and sends download link to WhatsApp)
router.post("/submit", async (req: AuthRequest, res) => {
    try {
        const { ingredients, date } = req.body;
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: "Ingredients list cannot be empty" });
        }

        const submitDate = date ? new Date(date) : new Date();
        const baseUrl = process.env.FRONTEND_URL || "https://www.galaxiaresorts.com";

        // Group ingredients by category
        const groups: Record<string, typeof ingredients> = {};
        for (const ing of ingredients) {
            const cat = ing.category || "Dairy";
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(ing);
        }

        const dateStr = submitDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        // Supplier map (loads from env variables or falls back to supplier phone numbers)
        const defaultSupplierPhone = process.env.CHEF_SUPPLIER_PHONE || process.env.CHEF_PHONE || "8983173033";
        const CATEGORY_SUPPLIER_MAP: Record<string, string> = {
            "Dairy": process.env.CHEF_DAIRY_PHONE || "8983173033",
            "Kirayana": process.env.CHEF_KIRAYANA_PHONE || "8983173033",
            "Kiryana": process.env.CHEF_KIRAYANA_PHONE || "8983173033",
            "Shak Shabji": process.env.CHEF_SHAK_SHABJI_PHONE || process.env.CHEF_VEG_PHONE || "9511636741",
            "Shaak Sabj": process.env.CHEF_SHAK_SHABJI_PHONE || process.env.CHEF_VEG_PHONE || "9511636741"
        };

        const results = [];

        // For each category, create separate logs, PDFs, and route to specific WhatsApp supplier & managers
        for (const [categoryName, categoryIngredients] of Object.entries(groups)) {
            // Write SUBMIT_ORDER log to database
            const log = await prisma.chefLog.create({
                data: {
                    adminId: req.admin!.id,
                    actionType: "submit_order",
                    details: JSON.stringify({
                        date: submitDate.toISOString().split("T")[0],
                        category: categoryName,
                        ingredients: categoryIngredients
                    })
                }
            });

            const itemsList = categoryIngredients
                .map((ing: any) => {
                    if (ing.unit === "cold_drink") {
                        return ing.quantity;
                    }
                    return `${ing.nameEn} (${ing.nameHi}) - ${ing.quantity}`;
                })
                .join(", ");

            const recipientPhone = CATEGORY_SUPPLIER_MAP[categoryName] || defaultSupplierPhone;
            const dateAndCategory = `${dateStr} (${categoryName})`;
            
            // Send template to supplier and managers (Ranjit: 7355630009, Devidas: 9923500208)
            const recipients = Array.from(new Set([recipientPhone, "7355630009", "9923500208"]));
            let waSuccess = false;
            for (const phone of recipients) {
                try {
                    const ok = await sendWhatsAppTemplateMessage(
                        "otp",
                        phone,
                        "kitchen_checklist_ready_v2",
                        [dateAndCategory, itemsList]
                    );
                    if (phone === recipientPhone) waSuccess = ok;
                } catch (err: any) {
                    console.error(`WhatsApp ingredient checklist failed for ${phone}:`, err.message);
                }
            }

            results.push({
                category: categoryName,
                logId: log.id,
                whatsAppSent: waSuccess
            });
        }

        return res.json({
            success: true,
            results,
            // Provide fallback values matching the original keys for backward compatibility
            logId: results[0]?.logId,
            whatsAppSent: results[0]?.whatsAppSent,
            message: "Kitchen checklist submitted and order sent successfully."
        });
    } catch (error: any) {
        console.error("Error submitting chef order:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
