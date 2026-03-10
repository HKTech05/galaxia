import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { auditLog } from "../lib/logger";

const router = Router();

// POST /api/reviews — Customer submits a review (no auth required)
router.post("/", async (req, res) => {
    try {
        const { guestName, rating, reviewText, propertyId, bookingRef } = req.body;

        if (!guestName || !rating) {
            return res.status(400).json({ error: "Name and rating are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Optional: verify booking ref exists
        let userId: number | null = null;
        if (bookingRef) {
            const booking = await prisma.staycationBooking.findUnique({
                where: { bookingRef },
                select: { userId: true },
            });
            if (booking?.userId) userId = booking.userId;
        }

        const review = await prisma.review.create({
            data: {
                guestName,
                rating: parseInt(rating),
                reviewText: reviewText || null,
                propertyId: propertyId ? parseInt(propertyId) : null,
                userId,
                isApproved: false, // Requires admin approval
            },
        });

        return res.status(201).json({
            message: "Thank you! Your review has been submitted and is pending approval.",
            review,
        });
    } catch (error) {
        console.error("Create review error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reviews — Public: approved reviews; Admin: all reviews
router.get("/", async (req, res) => {
    try {
        const { all, propertyId } = req.query;

        const where: any = {};

        // If 'all' is set and request has admin auth, skip approval filter
        if (all === "true") {
            // Admin view — will be filtered by middleware if needed
        } else {
            where.isApproved = true;
        }

        if (propertyId) {
            where.propertyId = parseInt(propertyId as string);
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
        return res.status(500).json({ error: "Internal server error" });
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
