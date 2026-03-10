import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/dd/screens
router.get("/screens", async (_req, res) => {
    try {
        const screens = await prisma.ddScreen.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
        });
        return res.json(screens);
    } catch (error) {
        console.error("DD Screens error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/dd/packages
router.get("/packages", async (_req, res) => {
    try {
        const packages = await prisma.ddPackage.findMany({
            where: { isActive: true },
            include: {
                pricing: true,
            },
        });
        return res.json(packages);
    } catch (error) {
        console.error("DD Packages error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/dd/availability/:date — Slots for a specific date across all screens
router.get("/availability/:date", async (req, res) => {
    try {
        const date = new Date(req.params.date);

        // Get all bookings for this date
        const bookings = await prisma.ddBooking.findMany({
            where: {
                bookingDate: date,
                status: { notIn: ["cancelled", "no_show"] },
            },
            select: {
                screenId: true,
                startHour: true,
                durationHours: true,
                customerName: true,
                status: true,
                isMaintenance: true,
            },
        });

        // Get blocked date entries
        const blocked = await prisma.blockedDate.findMany({
            where: {
                screenId: { not: null },
                blockedDate: date,
            },
        });

        return res.json({ bookings, blocked });
    } catch (error) {
        console.error("DD Availability error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
