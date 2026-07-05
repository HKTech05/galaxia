import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Helper to get local date string YYYY-MM-DD in IST
function getLocalDateStr(date: Date = new Date()) {
    const local = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return local.toISOString().split("T")[0];
}

// GET /api/meal-counters — Get counts for a date (defaults to today)
router.get("/", authMiddleware, async (req, res) => {
    try {
        const dateStr = (req.query.date as string) || getLocalDateStr();
        
        let counter = await prisma.mealCounter.findUnique({
            where: { date: dateStr }
        });
        
        if (!counter) {
            counter = await prisma.mealCounter.create({
                data: {
                    date: dateStr,
                    breakfast: 0,
                    lunch: 0,
                    dinner: 0
                }
            });
        }
        
        return res.json(counter);
    } catch (err: any) {
        console.error("Error in GET /meal-counters:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/meal-counters/update — Update meal counts
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { date, breakfast, lunch, dinner } = req.body;
        const dateStr = date || getLocalDateStr();
        
        const counter = await prisma.mealCounter.upsert({
            where: { date: dateStr },
            update: {
                breakfast: breakfast !== undefined ? parseInt(breakfast) : undefined,
                lunch: lunch !== undefined ? parseInt(lunch) : undefined,
                dinner: dinner !== undefined ? parseInt(dinner) : undefined
            },
            create: {
                date: dateStr,
                breakfast: breakfast !== undefined ? parseInt(breakfast) : 0,
                lunch: lunch !== undefined ? parseInt(lunch) : 0,
                dinner: dinner !== undefined ? parseInt(dinner) : 0
            }
        });
        
        return res.json({ success: true, counter });
    } catch (err: any) {
        console.error("Error in POST /meal-counters/update:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
