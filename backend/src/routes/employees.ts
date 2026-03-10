import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/employees — List employees
router.get("/", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
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

// POST /api/employees/:id/collect — Zero-out cash (owner pickup)
router.post("/:id/collect", authMiddleware, requireRole("owner", "developer"), async (req: AuthRequest, res) => {
    try {
        const employeeId = parseInt(req.params.id as string);
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        if (employee.cashCollected > 0) {
            // Log the owner pickup transaction
            await prisma.cashTransaction.create({
                data: {
                    employeeId,
                    amount: employee.cashCollected,
                    transactionType: "owner_pickup",
                    note: `Collected by owner at ${new Date().toLocaleString("en-IN")}`,
                },
            });
        }

        // Zero out the balance
        const updated = await prisma.employee.update({
            where: { id: employeeId },
            data: { cashCollected: 0, lastCollectedAt: new Date() },
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

export default router;
