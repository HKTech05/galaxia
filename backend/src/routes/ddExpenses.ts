import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/dd-expenses — Create a new expense
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { name, amount, paymentMethod } = req.body;

        if (!name || !amount || !paymentMethod) {
            return res.status(400).json({ error: "name, amount, paymentMethod required" });
        }

        const amt = parseInt(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        const method = paymentMethod.toLowerCase(); // "cash" or "upi"
        if (method !== "cash" && method !== "upi") {
            return res.status(400).json({ error: "paymentMethod must be 'cash' or 'upi'" });
        }

        // Create the expense record
        const expense = await prisma.ddExpense.create({
            data: {
                name,
                amount: amt,
                paymentMethod: method,
                createdBy: req.admin?.id || null,
            },
        });

        // If cash: create CashTransaction and decrement employee cashCollected
        if (method === "cash") {
            // Find the DD property employee
            const ddProperty = await prisma.property.findFirst({
                where: { slug: "digital-diaries" },
            });

            if (ddProperty) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: ddProperty.id, isActive: true },
                });

                if (employee) {
                    // Log cash transaction as expense
                    await prisma.cashTransaction.create({
                        data: {
                            employeeId: employee.id,
                            guestName: `Expense: ${name}`,
                            amount: amt,
                            transactionType: "expense",
                            note: `DD Expense — ${name} (₹${amt})`,
                        },
                    });

                    // Decrement employee cash collected
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { cashCollected: { decrement: amt } },
                    });
                }
            }
        }
        // If UPI: just stored in DB, no impact on UPI management

        return res.status(201).json(expense);
    } catch (error) {
        console.error("Create DD expense error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/dd-expenses — List expenses (most recent first)
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { limit } = req.query;
        const take = limit ? parseInt(limit as string) : 50;

        const expenses = await prisma.ddExpense.findMany({
            orderBy: { createdAt: "desc" },
            take,
            include: {
                creator: { select: { displayName: true } },
            },
        });

        return res.json(expenses);
    } catch (error) {
        console.error("List DD expenses error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/dd-expenses/:id — Delete expense and reverse cash impact
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(String(req.params.id));
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const expense = await prisma.ddExpense.findUnique({ where: { id } });
        if (!expense) return res.status(404).json({ error: "Expense not found" });

        // If it was a cash expense, reverse the cash impact
        if (expense.paymentMethod === "cash") {
            const ddProperty = await prisma.property.findFirst({
                where: { slug: "digital-diaries" },
            });

            if (ddProperty) {
                const employee = await prisma.employee.findFirst({
                    where: { propertyId: ddProperty.id, isActive: true },
                });

                if (employee) {
                    // Delete the matching cash transaction
                    await prisma.cashTransaction.deleteMany({
                        where: {
                            employeeId: employee.id,
                            guestName: `Expense: ${expense.name}`,
                            amount: expense.amount,
                            transactionType: "expense",
                        },
                    });

                    // Reverse the decrement — add the amount back
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { cashCollected: { increment: expense.amount } },
                    });
                }
            }
        }

        // Delete the expense record
        await prisma.ddExpense.delete({ where: { id } });

        return res.json({ success: true });
    } catch (error) {
        console.error("Delete DD expense error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
