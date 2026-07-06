import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/employees — List employees
router.get("/", authMiddleware, requireRole("owner", "developer", "staycation_admin", "dd_admin"), async (req, res) => {
    try {
        const { propertyId } = req.query;
        const where: any = { isActive: true };
        if (propertyId) where.propertyId = parseInt(propertyId as string);

        const employees = await prisma.employee.findMany({
            where,
            include: { property: { select: { name: true, slug: true } } },
            orderBy: { createdAt: "asc" },
        });
        return res.json(employees);
    } catch (error) {
        console.error("List employees error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/employees/:id — Rename employee
router.patch("/:id", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const { name } = req.body;
        const employee = await prisma.employee.update({
            where: { id: parseInt(req.params.id as string) },
            data: { name },
        });
        return res.json(employee);
    } catch (error) {
        console.error("Rename employee error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/employees/:id/collect — Cash out (full or partial)
router.post("/:id/collect", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const employeeId = parseInt(req.params.id as string);
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        const { amount: requestedAmount, category } = req.body;
        
        let total = employee.cashCollected;
        if (category === "security_deposit") {
            total = employee.depositCollected;
        } else if (category === "rent") {
            total = employee.rentCollected;
        }

        const istNow = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        let noteCategoryTag = "";
        if (category === "security_deposit") {
            noteCategoryTag = " (Security Deposit)";
        } else if (category === "rent") {
            noteCategoryTag = " (Rent)";
        }

        // Support partial cashout if amount is provided
        const cashoutAmount = (requestedAmount && requestedAmount > 0 && requestedAmount <= total)
            ? requestedAmount
            : total;

        if (cashoutAmount > 0) {
            await prisma.cashTransaction.create({
                data: {
                    employeeId,
                    amount: cashoutAmount,
                    transactionType: "owner_pickup",
                    note: `Collected by owner${noteCategoryTag}${cashoutAmount < total ? ' (partial)' : ''} at ${istNow}`,
                },
            });
        }

        // Update the balance
        const updateData: any = {
            lastCollectedAt: new Date()
        };

        if (category === "security_deposit") {
            updateData.depositCollected = Math.max(0, employee.depositCollected - cashoutAmount);
            updateData.cashCollected = Math.max(0, employee.cashCollected - cashoutAmount);
        } else if (category === "rent") {
            updateData.rentCollected = Math.max(0, employee.rentCollected - cashoutAmount);
            updateData.cashCollected = Math.max(0, employee.cashCollected - cashoutAmount);
        } else {
            // General cashout
            updateData.cashCollected = Math.max(0, employee.cashCollected - cashoutAmount);
            updateData.rentCollected = Math.max(0, employee.rentCollected - cashoutAmount);
            updateData.depositCollected = 0;
        }

        const updated = await prisma.employee.update({
            where: { id: employeeId },
            data: updateData,
        });

        return res.json(updated);
    } catch (error) {
        console.error("Collect cash error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/employees/:id/transactions — Transaction history
router.get("/:id/transactions", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const transactions = await prisma.cashTransaction.findMany({
            where: { employeeId: parseInt(req.params.id as string) },
            orderBy: { createdAt: "desc" },
        });
        return res.json(transactions);
    } catch (error) {
        console.error("Employee transactions error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/employees/:empId/transactions/:txId — Delete a single cash transaction log
router.delete("/:empId/transactions/:txId", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const empId = parseInt(req.params.empId as string);
        const txId = parseInt(req.params.txId as string);

        const tx = await prisma.cashTransaction.findFirst({
            where: { id: txId, employeeId: empId },
        });
        if (!tx) return res.status(404).json({ error: "Transaction not found" });

        // Reverse the cash impact
        if (tx.transactionType === "collection") {
            await prisma.employee.update({
                where: { id: empId },
                data: { cashCollected: { decrement: tx.amount } },
            });
        } else if (tx.transactionType === "owner_pickup") {
            await prisma.employee.update({
                where: { id: empId },
                data: { cashCollected: { increment: tx.amount } },
            });
        }

        await prisma.cashTransaction.delete({ where: { id: txId } });
        return res.json({ success: true, message: `Transaction ${txId} deleted` });
    } catch (error) {
        console.error("Delete cash transaction error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
