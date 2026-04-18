import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/food-bills — Create a new food bill
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { date, ddBookingId, guestName, screenName, satkarAmount, paymentMethod, upiProofUrl, upiProofKey } = req.body;

        if (!date || !guestName || !screenName || !satkarAmount || !paymentMethod) {
            return res.status(400).json({ error: "date, guestName, screenName, satkarAmount, paymentMethod required" });
        }

        const satkarAmt = parseInt(satkarAmount);
        const guestBillAmount = Math.round(satkarAmt * 1.25); // 25% markup

        const foodBill = await prisma.foodBill.create({
            data: {
                date: new Date(date),
                ddBookingId: ddBookingId ? parseInt(ddBookingId) : null,
                guestName,
                screenName,
                satkarAmount: satkarAmt,
                guestBillAmount,
                paymentMethod,
                upiProofUrl: upiProofUrl || null,
                upiProofKey: upiProofKey || null,
                createdBy: req.admin!.id,
            },
        });

        // --- Cash flow logic ---
        // Find DD employee for cash/UPI logging
        const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
        if (ddProperty) {
            const ddEmployee = await prisma.employee.findFirst({
                where: { propertyId: ddProperty.id, isActive: true },
            });

            if (ddEmployee) {
                // 1. Satkar payment (cash only — UPI to satkar is just stored in DB, no UPI management entry)
                if (paymentMethod === "cash") {
                    // Guest paid cash → log cash collection for guest bill
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: ddEmployee.id,
                            bookingRef: `FB-${foodBill.id}`,
                            guestName,
                            amount: guestBillAmount,
                            transactionType: "food_collection",
                            note: `Food bill collection from ${guestName} (${screenName}) — Satkar: ₹${satkarAmt}, Guest: ₹${guestBillAmount}`,
                        },
                    });

                    // Update employee cash collected
                    await prisma.employee.update({
                        where: { id: ddEmployee.id },
                        data: { cashCollected: { increment: guestBillAmount } },
                    });
                }

                // 2. If guest paid UPI → log to UPI management
                if (paymentMethod === "upi") {
                    await prisma.upiPayment.create({
                        data: {
                            employeeId: ddEmployee.id,
                            bookingRef: `FB-${foodBill.id}`,
                            guestName,
                            amount: guestBillAmount,
                            paymentType: "food_collection",
                            proofImageUrl: upiProofUrl || null,
                            proofImageKey: upiProofKey || null,
                            note: `Food bill UPI from ${guestName} (${screenName})`,
                        },
                    });
                }
            }
        }

        return res.status(201).json(foodBill);
    } catch (error) {
        console.error("Create food bill error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/food-bills — List all food bills
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { search, startDate, endDate } = req.query;
        const where: any = {};

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        if (search) {
            where.OR = [
                { guestName: { contains: search as string, mode: "insensitive" } },
                { screenName: { contains: search as string, mode: "insensitive" } },
            ];
        }

        const bills = await prisma.foodBill.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                creator: { select: { displayName: true } },
            },
        });

        return res.json(bills);
    } catch (error) {
        console.error("List food bills error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/food-bills/summary — Aggregated financial summary
router.get("/summary", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where: any = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const agg = await prisma.foodBill.aggregate({
            where,
            _sum: { satkarAmount: true, guestBillAmount: true },
            _count: { id: true },
        });

        const totalSatkar = agg._sum.satkarAmount || 0;
        const totalCollected = agg._sum.guestBillAmount || 0;
        const netProfit = totalCollected - totalSatkar;

        return res.json({
            totalBills: agg._count.id,
            totalSatkar,
            totalCollected,
            netProfit,
        });
    } catch (error) {
        console.error("Food bill summary error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/food-bills/:id — Delete a food bill
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const bill = await prisma.foodBill.findUnique({ where: { id } });
        if (!bill) return res.status(404).json({ error: "Food bill not found" });

        // Reverse cash transaction if it was cash
        if (bill.paymentMethod === "cash") {
            const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
            if (ddProperty) {
                const ddEmployee = await prisma.employee.findFirst({
                    where: { propertyId: ddProperty.id, isActive: true },
                });
                if (ddEmployee) {
                    // Delete the cash transaction
                    await prisma.cashTransaction.deleteMany({
                        where: { bookingRef: `FB-${id}`, employeeId: ddEmployee.id },
                    });
                    // Reverse employee cash
                    await prisma.employee.update({
                        where: { id: ddEmployee.id },
                        data: { cashCollected: { decrement: bill.guestBillAmount } },
                    });
                }
            }
        }

        // Delete UPI payment record if UPI
        if (bill.paymentMethod === "upi") {
            await prisma.upiPayment.deleteMany({
                where: { bookingRef: `FB-${id}` },
            });
        }

        await prisma.foodBill.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete food bill error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
