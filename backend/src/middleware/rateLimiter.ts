import rateLimit from "express-rate-limit";

/** Strict rate limiter for login endpoint: 5 attempts per 15 minutes per IP */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});

/** General API rate limiter: 1000 requests per minute per IP */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    message: { error: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});
