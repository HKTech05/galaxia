import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import cognitoAuthRoutes from "./routes/cognitoAuth";
import propertyRoutes from "./routes/properties";
import ddRoutes from "./routes/dd";
import stayBookingRoutes from "./routes/stayBookings";
import ddBookingRoutes from "./routes/ddBookings";
import couponRoutes from "./routes/coupons";
import employeeRoutes from "./routes/employees";
import dashboardRoutes from "./routes/dashboard";
import notificationRoutes from "./routes/notifications";
import uploadRoutes from "./routes/uploads";
import userRoutes from "./routes/users";
import reviewRoutes from "./routes/reviews";
import { apiLimiter } from "./middleware/rateLimiter";

const app = express();
const PORT = process.env.PORT || 4000;

// trust proxy is required for express-rate-limit to work correctly behind AWS ALB/Vercel
app.set("trust proxy", 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
app.use("/api/properties", propertyRoutes);
app.use("/api/dd", ddRoutes);
app.use("/api/bookings/staycation", stayBookingRoutes);
app.use("/api/bookings/dd", ddBookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

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
});

export default app;
