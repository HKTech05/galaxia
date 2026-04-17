import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import archiver from "archiver";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// S3 client configuration (reuse same config as uploads.ts)
const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.AWS_S3_BUCKET || "galaxia-uploads";

// No file size limit for UPI proofs
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB generous limit
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only images allowed for UPI proofs."));
        }
    },
});

/**
 * Upload a buffer to S3
 */
async function uploadToS3(buffer: Buffer, originalName: string, mimetype: string): Promise<{ url: string; key: string }> {
    const uniqueKey = `upi-proofs/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(originalName)}`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimetype,
    }));

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION || "eu-north-1"}.amazonaws.com/${uniqueKey}`;
    return { url, key: uniqueKey };
}

// ─── POST /api/upi-payments/upload ─── Upload UPI proof image + create record
router.post("/upload", authMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { employeeId, propertySlug, bookingRef, guestName, amount, paymentType, note } = req.body;

        // Resolve employeeId: accept directly OR via propertySlug
        let resolvedEmployeeId = employeeId ? parseInt(employeeId) : null;
        if (!resolvedEmployeeId && propertySlug) {
            const prop = await prisma.property.findFirst({ where: { slug: propertySlug } });
            if (prop) {
                const emp = await prisma.employee.findFirst({ where: { propertyId: prop.id, isActive: true } });
                if (emp) resolvedEmployeeId = emp.id;
            }
        }

        if (!resolvedEmployeeId || !amount || !paymentType) {
            return res.status(400).json({ error: "employeeId (or propertySlug), amount, and paymentType are required" });
        }

        // Upload to S3
        const { url, key } = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);

        // Create UPI payment record
        const upiPayment = await prisma.upiPayment.create({
            data: {
                employeeId: resolvedEmployeeId,
                bookingRef: bookingRef || null,
                guestName: guestName || null,
                amount: parseInt(amount),
                paymentType,
                proofImageUrl: url,
                proofImageKey: key,
                note: note || `${paymentType === "deposit" ? "Security deposit" : "Balance"} — UPI`,
            },
        });

        return res.status(201).json(upiPayment);
    } catch (error) {
        console.error("UPI payment upload error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/upi-payments ─── List all UPI payments with employee+property info
router.get("/", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const payments = await prisma.upiPayment.findMany({
            include: {
                employee: {
                    include: { property: { select: { name: true, slug: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(payments);
    } catch (error) {
        console.error("List UPI payments error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/upi-payments/by-employee/:employeeId ─── UPI payments for a specific employee
router.get("/by-employee/:employeeId", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const payments = await prisma.upiPayment.findMany({
            where: { employeeId: parseInt(String(req.params.employeeId)) },
            orderBy: { createdAt: "desc" },
        });
        return res.json(payments);
    } catch (error) {
        console.error("Employee UPI payments error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/upi-payments/image/:id ─── Serve/proxy a single proof image
router.get("/image/:id", authMiddleware, async (req, res) => {
    try {
        const payment = await prisma.upiPayment.findUnique({
            where: { id: parseInt(String(req.params.id)) },
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });

        // If we have S3 key, stream from S3; otherwise redirect to URL
        if (payment.proofImageKey) {
            const s3Response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: payment.proofImageKey }));
            const ext = path.extname(payment.proofImageKey).toLowerCase();
            const mimeMap: Record<string, string> = {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp",
            };
            res.setHeader("Content-Type", mimeMap[ext] || "image/jpeg");
            res.setHeader("Content-Disposition", `inline; filename="upi-proof-${payment.id}${ext}"`);
            (s3Response.Body as any).pipe(res);
        } else {
            if (!payment.proofImageUrl) return res.status(404).json({ error: "No proof image available" });
            return res.redirect(payment.proofImageUrl);
        }
    } catch (error) {
        console.error("Serve UPI proof error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/upi-payments/download/:id ─── Download a single proof image
router.get("/download/:id", authMiddleware, async (req, res) => {
    try {
        const payment = await prisma.upiPayment.findUnique({
            where: { id: parseInt(String(req.params.id)) },
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });

        if (payment.proofImageKey) {
            const s3Response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: payment.proofImageKey }));
            const ext = path.extname(payment.proofImageKey).toLowerCase();
            const mimeMap: Record<string, string> = {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp",
            };
            res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="upi-proof-${payment.id}${ext}"`);
            (s3Response.Body as any).pipe(res);
        } else {
            if (!payment.proofImageUrl) return res.status(404).json({ error: "No proof image available" });
            return res.redirect(payment.proofImageUrl);
        }
    } catch (error) {
        console.error("Download UPI proof error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── GET /api/upi-payments/download-all/:employeeId ─── Download all proofs as ZIP
router.get("/download-all/:employeeId", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const employeeId = parseInt(String(req.params.employeeId));
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { property: { select: { name: true } } },
        });

        if (!employee) return res.status(404).json({ error: "Employee not found" });

        const payments = await prisma.upiPayment.findMany({
            where: { employeeId },
            orderBy: { createdAt: "desc" },
        });

        if (payments.length === 0) {
            return res.status(404).json({ error: "No UPI proofs found" });
        }

        const propertyName = employee.property?.name || "Property";
        const zipFileName = `${propertyName.replace(/\s+/g, "_")}_${employee.name.replace(/\s+/g, "_")}_UPI_Proofs.zip`;

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);

        const archive = archiver("zip", { zlib: { level: 5 } });
        archive.pipe(res);

        for (const payment of payments) {
            if (payment.proofImageKey) {
                try {
                    const s3Response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: payment.proofImageKey }));
                    const ext = path.extname(payment.proofImageKey) || ".jpg";
                    const date = new Date(payment.createdAt).toISOString().slice(0, 10);
                    const fileName = `${date}_${payment.paymentType}_Rs${payment.amount}_${payment.guestName || "Guest"}${ext}`;
                    archive.append(s3Response.Body as any, { name: fileName });
                } catch (err) {
                    console.error(`[ZIP] Failed to fetch S3 object for payment ${payment.id}:`, err);
                }
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error("Download all UPI proofs error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── DELETE /api/upi-payments/:id ─── Delete a single UPI payment log
router.delete("/:id", authMiddleware, requireRole("owner", "developer"), async (req, res) => {
    try {
        const id = parseInt(String(req.params.id));
        const payment = await prisma.upiPayment.findUnique({ where: { id } });
        if (!payment) return res.status(404).json({ error: "UPI payment not found" });

        await prisma.upiPayment.delete({ where: { id } });
        return res.json({ success: true, message: `UPI payment ${id} deleted` });
    } catch (error) {
        console.error("Delete UPI payment error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
