import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimiter";
import { auditLog } from "../lib/logger";

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        const admin = await prisma.adminAccount.findUnique({ where: { username } });
        if (!admin || !admin.isActive) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) {
            auditLog({ action: "login_failure", entityType: "admin", details: { username, reason: "bad_password" } });
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login
        await prisma.adminAccount.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() },
        });

        const secret = process.env.JWT_SECRET || "fallback-secret";
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            secret,
            { expiresIn: "7d" }
        );

        return res.json({
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                displayName: admin.displayName,
                role: admin.role,
                avatarUrl: admin.avatarUrl,
            },
        });
    } catch (error: any) {
        auditLog({ action: "login_failure", entityType: "admin", details: { error: error?.message } });
        console.error("Login error:", error?.message, error?.stack);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/auth/login-guest
router.post("/login-guest", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            auditLog({ action: "login_failure", entityType: "user", details: { reason: "missing_credentials", email: email || "N/A" } });
            return res.status(400).json({ error: "Email and password required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            auditLog({ action: "login_failure", entityType: "user", details: { email, reason: "invalid_email_or_no_password" } });
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            auditLog({ action: "login_failure", entityType: "user", details: { email, reason: "bad_password" } });
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const secret = process.env.JWT_SECRET || "fallback-secret";
        const token = jwt.sign(
            { id: user.id, email: user.email, type: "customer" },
            secret,
            { expiresIn: "7d" }
        );

        auditLog({ action: "login_success", entityType: "user", entityId: user.id, details: { email: user.email } });
        return res.json({
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
            },
        });
    } catch (error: any) {
        auditLog({ action: "login_failure", entityType: "user", details: { error: error?.message, email: req.body?.email || "N/A" } });
        console.error("Guest login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/auth/register-guest
router.post("/register-guest", async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;
        if (!fullName || !phone) {
            auditLog({ action: "register_failure", entityType: "user", details: { reason: "missing_name_or_phone", email: email || "N/A" } });
            return res.status(400).json({ error: "Name and phone required" });
        }

        const existingUser = email
            ? await prisma.user.findUnique({ where: { email } })
            : null;
        if (existingUser) {
            auditLog({ action: "register_failure", entityType: "user", details: { email, reason: "email_already_registered" } });
            return res.status(409).json({ error: "Email already registered" });
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : null;

        const user = await prisma.user.create({
            data: { fullName, email, phone, passwordHash },
        });

        auditLog({ action: "register_success", entityType: "user", entityId: user.id, details: { email: user.email, fullName: user.fullName } });
        return res.status(201).json({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
        });
    } catch (error: any) {
        auditLog({ action: "register_failure", entityType: "user", details: { error: error?.message, email: req.body?.email || "N/A" } });
        console.error("Register error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const admin = await prisma.adminAccount.findUnique({
            where: { id: req.admin!.id },
            select: {
                id: true, username: true, displayName: true,
                role: true, avatarUrl: true, email: true,
            },
        });
        if (!admin) {
            auditLog({ action: "fetch_profile_failure", entityType: "admin", entityId: req.admin!.id, details: { reason: "admin_not_found" } });
            return res.status(404).json({ error: "Admin profile not found" });
        }
        auditLog({ action: "fetch_profile_success", entityType: "admin", entityId: req.admin!.id, details: { username: admin.username } });
        return res.json(admin);
    } catch (error: any) {
        auditLog({ action: "fetch_profile_failure", entityType: "admin", entityId: req.admin?.id, details: { error: error?.message } });
        console.error("Me error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/auth/profile — Update own profile
router.patch("/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { displayName, email } = req.body;
        if (!displayName && !email) {
            auditLog({ action: "update_profile_failure", entityType: "admin", entityId: req.admin!.id, details: { reason: "no_fields_to_update" } });
            return res.status(400).json({ error: "No fields provided for update" });
        }

        const updated = await prisma.adminAccount.update({
            where: { id: req.admin!.id },
            data: {
                ...(displayName && { displayName }),
                ...(email && { email }),
            },
            select: { id: true, username: true, displayName: true, email: true, role: true },
        });
        auditLog({ action: "update_profile_success", entityType: "admin", entityId: req.admin!.id, details: { updatedFields: { displayName, email } } });
        return res.json(updated);
    } catch (error: any) {
        console.error("Profile update error:", error?.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
