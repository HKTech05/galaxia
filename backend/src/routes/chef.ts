import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { sendWhatsAppMessage } from "../lib/whatsappService";

const router = Router();

// Dictionary for fallback translation of common ingredients
const INGREDIENT_TRANSLATION_MAP: Record<string, string> = {
    potato: "आलू",
    tomato: "टमाटर",
    onion: "प्याज",
    garlic: "लहसुन",
    ginger: "अदरक",
    rice: "चावल",
    sugar: "चीनी",
    salt: "नमक",
    milk: "दूध",
    butter: "मक्खन",
    coriander: "धनिया",
    paneer: "पनीर",
    cheese: "पनीर/चीज़",
    bread: "ब्रेड",
    egg: "अंडा",
    chicken: "चिकन",
    mutton: "मटन",
    fish: "मछली",
    turmeric: "हल्दी",
    cumin: "जीरा",
    mustard: "सरसों",
    pepper: "काली मिर्च",
    cardamom: "इलायची",
    clove: "लौंग",
    cinnamon: "दालचीनी",
    ghee: "घी",
    curd: "दही",
    yogurt: "दही",
    flour: "आटा",
    "wheat flour": "गेहूं का आटा",
    "cooking oil": "तेल",
    oil: "तेल",
    "green chillies": "हरी मिर्च",
    chili: "मिर्च",
    lemon: "नींबू",
    water: "पानी",
    mint: "पुदीना",
};

/**
 * Translates an English ingredient name to Hindi.
 * First checks local dictionary, then tries MyMemory API, and falls back to English.
 */
async function translateEnglishToHindi(text: string): Promise<string> {
    const trimmed = text.trim();
    const normalized = trimmed.toLowerCase();

    // Check local lookup dictionary
    if (INGREDIENT_TRANSLATION_MAP[normalized]) {
        return INGREDIENT_TRANSLATION_MAP[normalized];
    }

    // Try MyMemory translation API
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|hi`;
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

        // Auto-translate nameEn to Hindi
        const nameHi = await translateEnglishToHindi(cleanEn);

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

// GET /api/chef/logs — Fetch chef logs (Owner/Developer only)
router.get("/logs", requireRole("owner", "developer"), async (req: AuthRequest, res) => {
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

        // Supplier map (for testing all are set to "9653176436")
        const CATEGORY_SUPPLIER_MAP: Record<string, string> = {
            "Dairy": "9653176436",
            "Kirayana": "9653176436",
            "Shak Shabji": "9653176436"
        };

        const results = [];

        // For each category, create separate logs, PDFs, and route to specific WhatsApp supplier
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
                .map((ing: any) => `${ing.nameEn} (${ing.nameHi}) - ${ing.quantity}`)
                .join("\n");

            const recipientPhone = CATEGORY_SUPPLIER_MAP[categoryName] || "9653176436";
            const waMessage = `*Galaxia Resorts — Kitchen Requirements*\n\nDaily ingredients checklist for *${dateStr} (${categoryName})*:\n\n${itemsList}`;

            const waSuccess = await sendWhatsAppMessage(
                "otp",
                recipientPhone,
                waMessage
            );

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
