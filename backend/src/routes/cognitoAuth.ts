import { Router } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import prisma from "../lib/prisma";
import { auditLog } from "../lib/logger";

const router = Router();

// ── Cognito Configuration ──────────────────────────────────────
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN!;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET; // optional
const COGNITO_REDIRECT_URI = process.env.COGNITO_REDIRECT_URI!;
const COGNITO_REGION = process.env.COGNITO_REGION || "ap-south-1";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const JWKS_URI = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

// JWKS client for verifying Cognito ID tokens
const jwks = jwksClient({
    jwksUri: JWKS_URI,
    cache: true,
    cacheMaxAge: 600000, // 10 min
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
    return new Promise((resolve, reject) => {
        jwks.getSigningKey(header.kid, (err, key) => {
            if (err) return reject(err);
            resolve(key!.getPublicKey());
        });
    });
}

function verifyCognitoToken(idToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            idToken,
            (header, callback) => {
                getSigningKey(header)
                    .then(key => callback(null, key))
                    .catch(err => callback(err));
            },
            {
                issuer: ISSUER,
                algorithms: ["RS256"],
            },
            (err, decoded) => {
                if (err) return reject(err);
                resolve(decoded);
            }
        );
    });
}

// ── POST /api/auth/cognito/callback ────────────────────────────
// Frontend sends { code, redirectUri } → we exchange for tokens → verify → upsert user → return app JWT
router.post("/callback", async (req, res) => {
    try {
        const { code, redirectUri } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Authorization code required" });
        }

        // Step 1: Exchange code for tokens. 
        // We must use the exact redirect_uri that was used by the frontend to initiate the login.
        const tokenUrl = `https://${COGNITO_DOMAIN}/oauth2/token`;
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: COGNITO_CLIENT_ID,
            redirect_uri: redirectUri || COGNITO_REDIRECT_URI,
        });

        const headers: Record<string, string> = {
            "Content-Type": "application/x-www-form-urlencoded",
        };

        // If client secret exists, add Basic auth header
        if (COGNITO_CLIENT_SECRET) {
            const credentials = Buffer.from(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`).toString("base64");
            headers["Authorization"] = `Basic ${credentials}`;
        }

        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers,
            body: params.toString(),
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error("Cognito token exchange failed:", tokenResponse.status, errorBody);
            return res.status(401).json({ error: "Token exchange failed", details: errorBody });
        }

        const tokens: any = await tokenResponse.json();
        const idToken = tokens.id_token;

        if (!idToken) {
            return res.status(401).json({ error: "No ID token received from Cognito" });
        }

        // Step 2: Verify the ID token JWT
        let claims: any;
        try {
            claims = await verifyCognitoToken(idToken);
        } catch (verifyErr: any) {
            console.error("JWT verification failed:", verifyErr.message);
            return res.status(401).json({ error: "Invalid ID token" });
        }

        const cognitoSub = claims.sub;
        const email = claims.email;
        const emailVerified = claims.email_verified;

        if (!cognitoSub) {
            return res.status(401).json({ error: "Missing sub claim in token" });
        }

        // Step 3: Upsert user in database
        // Using 'as any' because cognitoSub column requires DB migration to exist
        let user = await (prisma.user.findFirst as any)({ where: { cognitoSub } });

        if (!user && email) {
            // Check if user exists by email (pre-existing account without Cognito link)
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                // Link existing user to Cognito
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { cognitoSub, isVerified: emailVerified || false } as any,
                });
            }
        }

        if (!user) {
            // Create new user
            user = await prisma.user.create({
                data: {
                    cognitoSub,
                    email: email || null,
                    fullName: email ? email.split("@")[0] : "Guest",
                    phone: "",
                    isVerified: emailVerified || false,
                } as any,
            });
        }

        // Step 4: Sign our own app JWT
        const appToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                type: "customer",
            },
            process.env.JWT_SECRET || "fallback-secret",
            { expiresIn: "7d" }
        );

        auditLog({
            action: "customer_login",
            entityType: "user",
            entityId: user.id,
            details: { method: "cognito", email: user.email },
        });

        return res.json({
            token: appToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
            },
        });
    } catch (error: any) {
        console.error("Cognito callback error:", error?.message, error?.stack);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/auth/cognito/login-url — Returns the Cognito login URL
router.get("/login-url", (_req, res) => {
    const loginUrl = `https://${COGNITO_DOMAIN}/login?client_id=${COGNITO_CLIENT_ID}&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(COGNITO_REDIRECT_URI)}`;
    return res.json({ url: loginUrl });
});

export default router;
