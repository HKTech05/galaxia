import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import cognitoAuthRoutes from "./routes/cognitoAuth";
import phoneAuthRoutes from "./routes/phoneAuth";
import propertyRoutes from "./routes/properties";
import ddRoutes from "./routes/dd";
import stayBookingRoutes from "./routes/stayBookings";
import ddBookingRoutes from "./routes/ddBookings";
import couponRoutes from "./routes/coupons";
import employeeRoutes from "./routes/employees";
import upiPaymentRoutes from "./routes/upiPayments";
import dashboardRoutes from "./routes/dashboard";
import notificationRoutes from "./routes/notifications";
import uploadRoutes from "./routes/uploads";
import siteImageRoutes from "./routes/siteImages";
import blockedDateRoutes from "./routes/blockedDates";
import userRoutes from "./routes/users";
import reviewRoutes from "./routes/reviews";
import paymentRoutes from "./routes/payments";
import humanRequestRoutes from "./routes/humanRequests";
import foodBillRoutes from "./routes/foodBills";
import ddExpenseRoutes from "./routes/ddExpenses";
import stayFoodBillRoutes from "./routes/stayFoodBills";
import { apiLimiter } from "./middleware/rateLimiter";
import { sendTestEmail, sendContactFormEmail } from "./lib/emailService";
import { authMiddleware, requireRole, AuthRequest } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 4000;

// trust proxy is required for express-rate-limit to work correctly behind AWS ALB/Vercel
app.set("trust proxy", true);

// Proxy /bot/* to the WhatsApp chatbot service on port 4001
// MUST be before express.json() so the raw body stream is forwarded intact
app.use("/bot", (req: express.Request, res: express.Response) => {
    const http = require("http");
    const targetPath = req.originalUrl.replace(/^\/bot/, "") || "/";
    console.log(`[Bot Proxy] ${req.method} ${targetPath}`);
    
    // Clean headers for proxy — remove hop-by-hop headers
    const fwdHeaders = { ...req.headers, host: "127.0.0.1:4001" };
    delete fwdHeaders["transfer-encoding"];
    
    const proxyReq = http.request({
        hostname: "127.0.0.1",
        port: 4001,
        path: targetPath,
        method: req.method,
        headers: fwdHeaders,
    }, (proxyRes: any) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", (err: any) => {
        console.error("[Bot Proxy] Error:", err.message);
        res.status(502).json({ error: "WhatsApp chatbot service unavailable" });
    });
    req.pipe(proxyReq, { end: true });
});

// Middleware
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://galaxia-dusky.vercel.app",
        "https://www.galaxiaresorts.com",
        "https://galaxiaresorts.com",
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting: 100 requests per minute per IP
app.use("/api", apiLimiter);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth/cognito", cognitoAuthRoutes);
app.use("/api/auth/phone", phoneAuthRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/dd", ddRoutes);
app.use("/api/bookings/staycation", stayBookingRoutes);
app.use("/api/bookings/dd", ddBookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/upi-payments", upiPaymentRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/site-images", siteImageRoutes);
app.use("/api/blocked-dates", blockedDateRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/human-requests", humanRequestRoutes);
app.use("/api/food-bills", foodBillRoutes);
app.use("/api/dd-expenses", ddExpenseRoutes);
app.use("/api/stay-food-bills", stayFoodBillRoutes);

// Test email route (owner/dev only)
app.post("/api/test-email", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: "Target email (to) is required" });
    const result = await sendTestEmail(to);
    return res.json(result);
});

// Contact form (public — no auth)
app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, phone, message, source, subject } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: "Missing required fields" });
        await sendContactFormEmail({ name, email, phone, message, source, subject });
        return res.json({ success: true });
    } catch (err: any) {
        console.error("Contact form error:", err);
        return res.json({ success: true }); // Don't break UX on email failure
    }
});



// 404
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err?.message || err, err?.stack || "");
    res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`🚀 Galaxia API running on http://localhost:${PORT}`);

    // Periodic cleanup of expired booking holds (every 2 minutes)
    setInterval(async () => {
        try {
            const { count } = await (await import("./lib/prisma")).default.bookingHold.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            if (count > 0) console.log(`[Hold Cleanup] Removed ${count} expired holds`);
        } catch (err) {
            console.error("[Hold Cleanup] Error:", err);
        }
    }, 2 * 60 * 1000);
});

export default app;
