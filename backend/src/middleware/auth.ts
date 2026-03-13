import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    admin?: {
        id: number;
        username: string;
        role: string;
    };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
        req.admin = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
        };
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

/** Restrict access to specific roles */
export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.admin) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
        if (!roles.includes(req.admin.role)) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }
        next();
    };
}

// ─── Customer Auth (Cognito users) ─────────────────────────────
export interface CustomerAuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        fullName?: string;
    };
}

export function customerAuthMiddleware(req: CustomerAuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
        if (decoded.type !== "customer") {
            res.status(401).json({ error: "Invalid token type" });
            return;
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            fullName: decoded.name || decoded.fullName,
        };
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

