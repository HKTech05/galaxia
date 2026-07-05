import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Helper to get local date string YYYY-MM-DD in IST
function getLocalDateStr(date: Date = new Date()) {
    const local = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return local.toISOString().split("T")[0];
}

// Auto cleanup attendance photos older than 15 days to save storage/database space
async function cleanupOldPhotos() {
    try {
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        await prisma.staffAttendance.updateMany({
            where: {
                markedAt: { lt: fifteenDaysAgo },
                photoUrl: { not: null }
            },
            data: {
                photoUrl: null
            }
        });
    } catch (err) {
        console.error("Error cleaning up old attendance photos:", err);
    }
}

// GET /api/security/staff — Get all active staff members
router.get("/staff", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const staff = await prisma.securityStaff.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" }
        });
        return res.json(staff);
    } catch (err: any) {
        console.error("Error in GET /api/security/staff:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/security/staff — Create new staff member
router.post("/staff", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { name, role } = req.body;
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Staff name is required" });
        }

        const newStaff = await prisma.securityStaff.create({
            data: {
                name: name.trim(),
                role: role ? String(role).trim() : null,
                isActive: true
            }
        });

        return res.json({ success: true, staff: newStaff });
    } catch (err: any) {
        console.error("Error in POST /api/security/staff:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/security/staff/:id — Delete/Deactivate a staff member
router.delete("/staff/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(rawId as string);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid staff ID" });
        }

        // Soft delete by setting isActive: false
        await prisma.securityStaff.update({
            where: { id },
            data: { isActive: false }
        });

        return res.json({ success: true });
    } catch (err: any) {
        console.error("Error in DELETE /api/security/staff/:id:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/security/attendance — Get attendance records for a specific date
router.get("/attendance", authMiddleware, async (req: AuthRequest, res) => {
    try {
        // Trigger auto-deletion of photos older than 15 days
        cleanupOldPhotos();

        const dateStr = (req.query.date as string) || getLocalDateStr();

        const allStaff = await prisma.securityStaff.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "asc" }
        });

        const attendances = await prisma.staffAttendance.findMany({
            where: { date: dateStr }
        });

        const result = allStaff.map(s => {
            const att = attendances.find(a => a.staffId === s.id);
            return {
                ...s,
                attendance: att ? {
                    id: att.id,
                    status: att.status,
                    photoUrl: att.photoUrl,
                    markedAt: att.markedAt,
                    markedBy: att.markedBy
                } : null
            };
        });

        return res.json({
            date: dateStr,
            staff: result
        });
    } catch (err: any) {
        console.error("Error in GET /api/security/attendance:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/security/attendance — Mark or overwrite attendance for a staff member
router.post("/attendance", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { staffId, date, status, photoUrl } = req.body;
        const sId = parseInt(staffId);
        const dateStr = date || getLocalDateStr();

        // Ranjit profile restricted to today's date only
        if (req.admin?.username === "ranjit") {
            const todayStr = getLocalDateStr();
            if (dateStr !== todayStr) {
                return res.status(403).json({ error: "Ranjit profile is only permitted to mark attendance for today's date." });
            }
        }

        if (isNaN(sId)) {
            return res.status(400).json({ error: "Invalid staff ID" });
        }

        if (!status || !["present", "absent"].includes(status)) {
            return res.status(400).json({ error: "Status must be 'present' or 'absent'" });
        }

        const staffMember = await prisma.securityStaff.findUnique({
            where: { id: sId }
        });
        if (!staffMember) {
            return res.status(404).json({ error: "Staff member not found" });
        }

        const markedBy = req.admin?.username || req.admin?.role || "supervisor";

        const record = await prisma.staffAttendance.upsert({
            where: {
                date_staffId: {
                    date: dateStr,
                    staffId: sId
                }
            },
            update: {
                status,
                photoUrl: photoUrl !== undefined ? photoUrl : undefined,
                markedAt: new Date(),
                markedBy
            },
            create: {
                date: dateStr,
                staffId: sId,
                status,
                photoUrl: photoUrl || null,
                markedAt: new Date(),
                markedBy
            }
        });

        return res.json({ success: true, attendance: record });
    } catch (err: any) {
        console.error("Error in POST /api/security/attendance:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
