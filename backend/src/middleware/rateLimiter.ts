import rateLimit from "express-rate-limit";

/** Strict rate limiter for login endpoint: 5 attempts per 15 minutes per IP */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

/** General API rate limiter: 100 requests per minute per IP */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { error: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});
