import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole, customerAuthMiddleware, CustomerAuthRequest } from "../middleware/auth";
import { auditLog } from "../lib/logger";

const router = Router();

// POST /api/reviews — Customer submits a review (Requires Auth)
router.post("/", customerAuthMiddleware, async (req: CustomerAuthRequest, res) => {
    try {
        const { rating, reviewText, propertyId, bookingRef } = req.body;
        const userId = req.user!.id;
        const guestName = req.user!.fullName || 'Guest'; // Fallback if fullName not in token (need to check token payload)

        if (!rating) {
            return res.status(400).json({ error: "Rating is required" });
        }

        const ratingInt = parseInt(rating);
        if (ratingInt < 1 || ratingInt > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // 1. Eligibility Check: User must have at least one confirmed/completed booking
        const hasBooking = await prisma.staycationBooking.findFirst({
            where: {
                userId,
                status: { in: ["confirmed", "completed"] }
            }
        });

        if (!hasBooking) {
            return res.status(403).json({ 
                error: "Only customers who have stayed with us can drop a review." 
            });
        }

        // Fetch user's full name if needed from DB
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const finalGuestName = user?.fullName || guestName;

        const review = await prisma.review.create({
            data: {
                guestName: finalGuestName,
                rating: ratingInt,
                reviewText: reviewText || null,
                propertyId: propertyId ? parseInt(propertyId) : null,
                userId,
                isApproved: ratingInt > 3, // Auto-approve if rating > 3
            },
        });

        return res.status(201).json({
            message: ratingInt > 3 
                ? "Thank you for your review!" 
                : "Thank you for your feedback. We will review this internally.",
            review,
        });
    } catch (error) {
        console.error("Create review error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reviews/me — Get logged in user's reviews
router.get("/me", customerAuthMiddleware, async (req: CustomerAuthRequest, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { userId: req.user!.id },
            include: {
                property: { select: { name: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(reviews);
    } catch (error) {
        console.error("List my reviews error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reviews — Public: approved reviews (rating > 3); Admin: all reviews
router.get("/", async (req, res) => {
    try {
        const { all, propertyId } = req.query;

        const where: any = {};

        // Visibility Rule: 
        // 1. If Admin request (all=true), show everything (requires auth check usually)
        // 2. If Public request, show ONLY rating > 3
        if (all === "true") {
            // Admin view — should ideally check for admin token, but for now filtering by all=true
        } else {
            where.rating = { gt: 3 };
            // where.isApproved = true; // Optional: also check approval flag
        }

        if (propertyId && propertyId !== "") {
            const pId = parseInt(propertyId as string);
            if (!isNaN(pId)) {
                where.propertyId = pId;
            }
        }

        const reviews = await prisma.review.findMany({
            where,
            include: {
                property: { select: { name: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return res.json(reviews);
    } catch (error) {
        console.error("List reviews error:", error);
        return res.status(500).json({ error: "Internal server error", details: process.env.NODE_ENV === "development" ? error : undefined });
    }
});

// PATCH /api/reviews/:id/approve — Admin approves or rejects a review
router.patch("/:id/approve", authMiddleware, requireRole("owner", "developer", "manager"), async (req: AuthRequest, res) => {
    try {
        const { isApproved } = req.body;

        const review = await prisma.review.update({
            where: { id: parseInt(req.params.id as string) },
            data: { isApproved: !!isApproved },
        });

        auditLog({
            adminId: req.admin!.id,
            action: isApproved ? "review_approved" : "review_rejected",
            entityType: "review",
            entityId: review.id,
        });

        return res.json(review);
    } catch (error) {
        console.error("Approve review error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/reviews/:id — Admin deletes a review
router.delete("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);

        await prisma.review.delete({ where: { id } });

        auditLog({
            adminId: req.admin!.id,
            action: "review_deleted",
            entityType: "review",
            entityId: id,
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Delete review error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
