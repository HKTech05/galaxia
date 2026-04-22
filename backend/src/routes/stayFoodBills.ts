import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/stay-food-bills — Create a staycation food bill
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { bookingId, description, amount, paymentMethod, upiProofUrl, upiProofKey } = req.body;

        if (!bookingId || !description || !amount || !paymentMethod) {
            return res.status(400).json({ error: "bookingId, description, amount, paymentMethod required" });
        }

        const parsedBookingId = parseInt(String(bookingId));
        const parsedAmount = parseInt(String(amount));
        if (isNaN(parsedBookingId) || isNaN(parsedAmount)) {
            return res.status(400).json({ error: "Invalid bookingId or amount" });
        }

        // Verify booking exists
        const booking = await prisma.staycationBooking.findUnique({
            where: { id: parsedBookingId },
            include: { property: true },
        });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        // Create food bill
        const foodBill = await prisma.staycationFoodBill.create({
            data: {
                bookingId: parsedBookingId,
                description,
                amount: parsedAmount,
                paymentMethod,
                upiProofUrl: upiProofUrl || null,
                upiProofKey: upiProofKey || null,
                createdBy: req.admin!.id,
            },
        });

        // Track cash/UPI in the property's employee management
        const employee = await prisma.employee.findFirst({
            where: { propertyId: booking.propertyId, isActive: true },
        });

        if (employee) {
            if (paymentMethod === "cash") {
                await prisma.cashTransaction.create({
                    data: {
                        employeeId: employee.id,
                        bookingRef: booking.bookingRef,
                        guestName: booking.customerName,
                        amount: parsedAmount,
                        transactionType: "food_collection",
                        note: `Food bill: ${description} — ${booking.property?.name || "Property"}`,
                    },
                });
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { cashCollected: { increment: parsedAmount } },
                });
            }

            if (paymentMethod === "upi") {
                await prisma.upiPayment.create({
                    data: {
                        employeeId: employee.id,
                        bookingRef: booking.bookingRef,
                        guestName: booking.customerName,
                        amount: parsedAmount,
                        paymentType: "food_collection",
                        proofImageUrl: upiProofUrl || null,
                        proofImageKey: upiProofKey || null,
                        note: `Food bill: ${description} — ${booking.property?.name || "Property"}`,
                    },
                });
            }
        }

        return res.status(201).json(foodBill);
    } catch (error) {
        console.error("Create stay food bill error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/stay-food-bills?bookingId=X — Get food bills for a booking
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { bookingId } = req.query;
        const where: any = {};
        if (bookingId) {
            const parsed = parseInt(String(bookingId));
            if (!isNaN(parsed)) where.bookingId = parsed;
        }

        const bills = await prisma.staycationFoodBill.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { creator: { select: { displayName: true } } },
        });

        return res.json(bills);
    } catch (error) {
        console.error("List stay food bills error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/stay-food-bills/:id — Delete and reverse cash/UPI
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(String(req.params.id));
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const bill = await prisma.staycationFoodBill.findUnique({
            where: { id },
            include: { booking: { include: { property: true } } },
        });
        if (!bill) return res.status(404).json({ error: "Food bill not found" });

        const employee = await prisma.employee.findFirst({
            where: { propertyId: bill.booking.propertyId, isActive: true },
        });

        if (employee) {
            if (bill.paymentMethod === "cash") {
                await prisma.cashTransaction.deleteMany({
                    where: {
                        employeeId: employee.id,
                        bookingRef: bill.booking.bookingRef,
                        transactionType: "food_collection",
                        amount: bill.amount,
                        note: { contains: bill.description },
                    },
                });
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { cashCollected: { decrement: bill.amount } },
                });
            }

            if (bill.paymentMethod === "upi") {
                await prisma.upiPayment.deleteMany({
                    where: {
                        employeeId: employee.id,
                        bookingRef: bill.booking.bookingRef,
                        paymentType: "food_collection",
                        amount: bill.amount,
                    },
                });
            }
        }

        await prisma.staycationFoodBill.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete stay food bill error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
