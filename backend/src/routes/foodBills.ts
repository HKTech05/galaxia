import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Helper: find DD employee
async function getDdEmployee() {
    const ddProperty = await prisma.property.findFirst({ where: { slug: "digital-diaries" } });
    if (!ddProperty) return null;
    return prisma.employee.findFirst({ where: { propertyId: ddProperty.id, isActive: true } });
}

// POST /api/food-bills — Create a new food bill
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { date, ddBookingId, guestName, screenName, satkarAmount, satkarPaymentMethod, paymentMethod, upiProofUrl, upiProofKey, satkarUpiProofUrl, satkarUpiProofKey } = req.body;

        if (!date || !guestName || !screenName || !satkarAmount || !paymentMethod) {
            return res.status(400).json({ error: "date, guestName, screenName, satkarAmount, paymentMethod required" });
        }

        const satkarAmt = parseInt(satkarAmount);
        const guestBillAmount = Math.round(satkarAmt * 1.25); // 25% markup
        const satkarMethod = satkarPaymentMethod || "cash";

        const foodBill = await prisma.foodBill.create({
            data: {
                date: new Date(date),
                ddBookingId: ddBookingId ? parseInt(ddBookingId) : null,
                guestName,
                screenName,
                satkarAmount: satkarAmt,
                guestBillAmount,
                satkarPaymentMethod: satkarMethod,
                paymentMethod,
                upiProofUrl: upiProofUrl || null,
                upiProofKey: upiProofKey || null,
                satkarUpiProofUrl: satkarUpiProofUrl || null,
                satkarUpiProofKey: satkarUpiProofKey || null,
                createdBy: req.admin!.id,
            },
        });

        const ddEmployee = await getDdEmployee();
        if (ddEmployee) {
            // ── Satkar side (payment OUT) ──
            // Cash paid to Satkar → log as cash expense in Cash Management
            if (satkarMethod === "cash") {
                await prisma.cashTransaction.create({
                    data: {
                        employeeId: ddEmployee.id,
                        bookingRef: `FB-${foodBill.id}-SAT`,
                        guestName: `Satkar (${guestName})`,
                        amount: satkarAmt,
                        transactionType: "food_expense",
                        note: `Paid to Satkar for ${guestName} (${screenName}) — ₹${satkarAmt}`,
                    },
                });
                // Satkar cash expense reduces employee cash
                await prisma.employee.update({
                    where: { id: ddEmployee.id },
                    data: { cashCollected: { decrement: satkarAmt } },
                });
            }
            // UPI paid to Satkar → proof stored in FoodBill record only, not in UPI management

            // ── Guest side (collection IN) ──
            if (paymentMethod === "cash") {
                // Guest paid cash → log cash collection
                await prisma.cashTransaction.create({
                    data: {
                        employeeId: ddEmployee.id,
                        bookingRef: `FB-${foodBill.id}-GUEST`,
                        guestName,
                        amount: guestBillAmount,
                        transactionType: "food_collection",
                        note: `Food bill collection from ${guestName} (${screenName}) — ₹${guestBillAmount}`,
                    },
                });
                await prisma.employee.update({
                    where: { id: ddEmployee.id },
                    data: { cashCollected: { increment: guestBillAmount } },
                });
            }

            if (paymentMethod === "upi") {
                // Guest paid UPI → log to UPI management
                await prisma.upiPayment.create({
                    data: {
                        employeeId: ddEmployee.id,
                        bookingRef: `FB-${foodBill.id}-GUEST`,
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

// DELETE /api/food-bills/:id — Delete a food bill (reverse all logs)
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const bill = await prisma.foodBill.findUnique({ where: { id } });
        if (!bill) return res.status(404).json({ error: "Food bill not found" });

        const ddEmployee = await getDdEmployee();
        if (ddEmployee) {
            // Reverse Satkar cash expense
            if (bill.satkarPaymentMethod === "cash") {
                await prisma.cashTransaction.deleteMany({
                    where: { bookingRef: `FB-${id}-SAT`, employeeId: ddEmployee.id },
                });
                await prisma.employee.update({
                    where: { id: ddEmployee.id },
                    data: { cashCollected: { increment: bill.satkarAmount } },
                });
            }

            // Satkar UPI — proof stored in food_bills only, nothing to reverse

            // Reverse Guest cash collection
            if (bill.paymentMethod === "cash") {
                await prisma.cashTransaction.deleteMany({
                    where: { bookingRef: `FB-${id}-GUEST`, employeeId: ddEmployee.id },
                });
                await prisma.employee.update({
                    where: { id: ddEmployee.id },
                    data: { cashCollected: { decrement: bill.guestBillAmount } },
                });
            }

            // Reverse Guest UPI
            if (bill.paymentMethod === "upi") {
                await prisma.upiPayment.deleteMany({
                    where: { bookingRef: `FB-${id}-GUEST` },
                });
            }
        }

        await prisma.foodBill.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete food bill error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
