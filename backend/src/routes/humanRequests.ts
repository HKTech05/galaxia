import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/human-requests — guest submits a "talk to human" request from the website chatbot
router.post("/", async (req, res) => {
    try {
        const { phone, source } = req.body;
        if (!phone || !source) {
            return res.status(400).json({ error: "Missing phone or source" });
        }
        const record = await prisma.humanRequest.create({
            data: { phone, source },
        });
        return res.status(201).json(record);
    } catch (error) {
        console.error("Create human request error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/human-requests — chatbot dashboard fetches requests (own auth via chatbot login)
router.get("/", async (req, res) => {
    try {
        const { status } = req.query;
        const where: any = {};
        if (status) where.status = status;
        const requests = await prisma.humanRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return res.json(requests);
    } catch (error) {
        console.error("List human requests error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/human-requests/:id — admin updates status
router.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { status } = req.body;
        const updated = await prisma.humanRequest.update({
            where: { id: parseInt(req.params.id as string) },
            data: { status },
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update human request error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
