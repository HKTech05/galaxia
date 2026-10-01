import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { authMiddleware, requireRole, AuthRequest } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /api/auth/chatbot-login
router.post("/chatbot-login", loginLimiter, async (req, res): Promise<any> => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        const user = await prisma.chatbotUser.findUnique({
            where: { username: username.toLowerCase().trim() },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const secret = process.env.JWT_SECRET || "fallback-secret";
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, type: "chatbot" },
            secret,
            { expiresIn: "30d" }
        );

        return res.json({
            token,
            user: {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                assignedNumbers: user.assignedNumbers,
            },
        });
    } catch (error: any) {
        console.error("Chatbot login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/auth/chatbot-me
router.get("/chatbot-me", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const admin = req.admin;
        if (!admin?.id) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await prisma.chatbotUser.findUnique({
            where: { id: admin.id },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: "User not found" });
        }

        return res.json({
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            assignedNumbers: user.assignedNumbers,
        });
    } catch (error: any) {
        console.error("Chatbot me error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/auth/chatbot-users (Settings list — owner only)
router.get("/chatbot-users", authMiddleware, requireRole("owner"), async (_req: AuthRequest, res: Response): Promise<any> => {
    try {
        const users = await prisma.chatbotUser.findMany({
            select: {
                username: true,
                displayName: true,
                role: true,
                assignedNumbers: true,
                isActive: true,
                plainPassword: true,
            },
            orderBy: { id: "asc" },
        });
        const mapped = users.map(u => ({
            username: u.username,
            displayName: u.displayName,
            role: u.role,
            assignedNumbers: u.assignedNumbers,
            isActive: u.isActive,
            password: u.plainPassword || "",
        }));
        return res.json(mapped);
    } catch (error: any) {
        console.error("Chatbot users list error:", error);
        return res.status(500).json({ error: error?.message || "Failed to fetch users" });
    }
});

// PATCH /api/auth/chatbot-users/:username (Settings — owner only)
router.patch("/chatbot-users/:username", authMiddleware, requireRole("owner"), async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const rawUsername = req.params.username;
        const targetUsername = (Array.isArray(rawUsername) ? rawUsername[0] : rawUsername)?.toLowerCase().trim();
        if (!targetUsername) {
            return res.status(400).json({ error: "Username is required" });
        }
        const { password, newUsername, displayName, assignedNumbers, role, isActive } = req.body;

        const updateData: any = {};
        if (password && typeof password === "string" && password.trim()) {
            updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
            updateData.plainPassword = password.trim();
        }
        if (newUsername && typeof newUsername === "string" && newUsername.trim()) {
            updateData.username = newUsername.trim().toLowerCase();
        }
        if (displayName !== undefined && typeof displayName === "string") {
            updateData.displayName = displayName;
        }
        if (assignedNumbers !== undefined && Array.isArray(assignedNumbers)) {
            updateData.assignedNumbers = assignedNumbers;
        }
        if (role && typeof role === "string") {
            updateData.role = role;
        }
        if (typeof isActive === "boolean") {
            updateData.isActive = isActive;
        }

        const user = await prisma.chatbotUser.update({
            where: { username: targetUsername },
            data: updateData,
        });

        return res.json({
            success: true,
            user: {
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                assignedNumbers: user.assignedNumbers,
                isActive: user.isActive,
                password: user.plainPassword || "",
            },
        });
    } catch (error: any) {
        console.error("Chatbot user update error:", error);
        return res.status(500).json({ error: error?.message || "Failed to update user" });
    }
});

export default router;
