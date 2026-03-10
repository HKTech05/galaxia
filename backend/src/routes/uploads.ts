import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { auditLog } from "../lib/logger";
import { encrypt, decrypt } from "../lib/encryption";
import { compressFile } from "../lib/compression";

const router = Router();

// S3 client configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.AWS_S3_BUCKET || "galaxia-uploads";

// Use memory storage — file bytes go straight to S3, never touch disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit (compression will shrink)
    fileFilter: (_req, file, cb) => {
        const allowed = [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only images, PDFs, and DOCX allowed."));
        }
    },
});

/**
 * Upload a buffer to S3 with server-side AES-256 encryption
 */
async function uploadToS3(buffer: Buffer, originalName: string, mimetype: string, folder: string = "guest-ids"): Promise<string> {
    const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(originalName)}`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimetype,
        ServerSideEncryption: "AES256",
    }));

    return `https://${BUCKET}.s3.${process.env.AWS_REGION || "eu-north-1"}.amazonaws.com/${uniqueKey}`;
}

/**
 * Delete a file from S3 by its URL
 */
async function deleteFromS3(fileUrl: string): Promise<void> {
    try {
        const url = new URL(fileUrl);
        const key = url.pathname.slice(1);
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (err) {
        console.error("[S3] Delete failed:", err);
    }
}

// ─── Guest ID Uploads (encrypted) ────────────────────────────────────────

// POST /api/uploads/guest-id — Upload guest ID to S3 (encrypted + compressed)
router.post("/guest-id", authMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { bookingId, ddBookingId } = req.body;

        // Compress before upload
        const { buffer, mimetype, fileName } = await compressFile(
            req.file.buffer, req.file.mimetype, req.file.originalname
        );

        // Upload to S3 with server-side encryption
        const fileUrl = await uploadToS3(buffer, fileName, mimetype, "guest-ids");

        // Encrypt file metadata in DB
        const encryptedUrl = encrypt(fileUrl);
        const encryptedName = encrypt(fileName);

        const guestId = await prisma.guestId.create({
            data: {
                bookingId: bookingId ? parseInt(bookingId) : null,
                ddBookingId: ddBookingId ? parseInt(ddBookingId) : null,
                fileUrl: encryptedUrl,
                fileName: encryptedName,
                fileType: mimetype,
                uploadedBy: req.admin!.id,
            },
        });

        auditLog({ adminId: req.admin!.id, action: "file_upload", entityType: "guest_id", entityId: guestId.id });

        return res.status(201).json({
            ...guestId,
            fileUrl,
            fileName,
        });
    } catch (error) {
        console.error("Upload guest ID error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/uploads/guest-id/:id
router.delete("/guest-id/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const guestId = await prisma.guestId.findUnique({
            where: { id: parseInt(req.params.id as string) },
        });

        if (!guestId) {
            return res.status(404).json({ error: "Guest ID not found" });
        }

        const realUrl = decrypt(guestId.fileUrl);
        if (realUrl.startsWith("https://")) {
            await deleteFromS3(realUrl);
        }

        await prisma.guestId.delete({ where: { id: guestId.id } });

        auditLog({ adminId: req.admin!.id, action: "file_delete", entityType: "guest_id", entityId: guestId.id });

        return res.json({ success: true });
    } catch (error) {
        console.error("Delete guest ID error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/uploads/guest-id/:id/download
router.get("/guest-id/:id/download", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const guestId = await prisma.guestId.findUnique({
            where: { id: parseInt(req.params.id as string) },
        });

        if (!guestId) {
            return res.status(404).json({ error: "Guest ID not found" });
        }

        const realUrl = decrypt(guestId.fileUrl);
        const url = new URL(realUrl);
        const key = url.pathname.slice(1);

        const s3Response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

        const fileName = decrypt(guestId.fileName || "document");
        res.setHeader("Content-Type", guestId.fileType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

        const stream = s3Response.Body as any;
        stream.pipe(res);
    } catch (error) {
        console.error("Download guest ID error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── Property Image Uploads ──────────────────────────────────────────────

// POST /api/uploads/property-image — Upload property image to S3 (compressed)
router.post("/property-image", authMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { propertyId, subPropertyId } = req.body;
        if (!propertyId && !subPropertyId) {
            return res.status(400).json({ error: "propertyId or subPropertyId required" });
        }

        // Compress image
        const { buffer, mimetype, fileName } = await compressFile(
            req.file.buffer, req.file.mimetype, req.file.originalname
        );

        // Upload to S3
        const fileUrl = await uploadToS3(buffer, fileName, mimetype, "property-images");

        // Add URL to property's images JSON array
        if (propertyId) {
            const property = await prisma.property.findUnique({ where: { id: parseInt(propertyId) } });
            const currentImages: string[] = (property?.images as string[]) || [];
            currentImages.push(fileUrl);
            await prisma.property.update({
                where: { id: parseInt(propertyId) },
                data: { images: currentImages },
            });
        } else if (subPropertyId) {
            // SubProperty uses single imageUrl, not images array
            await prisma.subProperty.update({
                where: { id: parseInt(subPropertyId) },
                data: { imageUrl: fileUrl },
            });
        }

        auditLog({ adminId: req.admin!.id, action: "image_upload", entityType: "property", entityId: parseInt(propertyId || subPropertyId) });

        return res.status(201).json({ url: fileUrl, fileName });
    } catch (error) {
        console.error("Upload property image error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/uploads/property-image — Remove property image from S3 + DB
router.delete("/property-image", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { propertyId, subPropertyId, imageUrl } = req.body;
        if (!imageUrl || (!propertyId && !subPropertyId)) {
            return res.status(400).json({ error: "imageUrl and propertyId/subPropertyId required" });
        }

        // Delete from S3
        await deleteFromS3(imageUrl);

        // Remove from images JSON array
        if (propertyId) {
            const property = await prisma.property.findUnique({ where: { id: parseInt(propertyId) } });
            const currentImages: string[] = (property?.images as string[]) || [];
            const updated = currentImages.filter(url => url !== imageUrl);
            await prisma.property.update({
                where: { id: parseInt(propertyId) },
                data: { images: updated },
            });
        } else if (subPropertyId) {
            // SubProperty uses single imageUrl field
            await prisma.subProperty.update({
                where: { id: parseInt(subPropertyId) },
                data: { imageUrl: null },
            });
        }

        auditLog({ adminId: req.admin!.id, action: "image_delete", entityType: "property", entityId: parseInt(propertyId || subPropertyId) });

        return res.json({ success: true });
    } catch (error) {
        console.error("Delete property image error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ─── General Image Upload (screens, banners, etc.) ──────────────────────

// POST /api/uploads/general — Upload any website image (compressed)
router.post("/general", authMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { category } = req.body; // e.g. "screens", "banners", "celebrations"
        const folder = `website-images/${category || "general"}`;

        // Compress image
        const { buffer, mimetype, fileName } = await compressFile(
            req.file.buffer, req.file.mimetype, req.file.originalname
        );

        // Upload to S3
        const fileUrl = await uploadToS3(buffer, fileName, mimetype, folder);

        auditLog({ adminId: req.admin!.id, action: "image_upload", entityType: "website_image", details: { category, fileName } });

        return res.status(201).json({ url: fileUrl, fileName });
    } catch (error) {
        console.error("General upload error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
