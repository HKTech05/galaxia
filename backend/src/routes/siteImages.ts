import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { compressFile } from "../lib/compression";

const router = Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.AWS_S3_BUCKET || "galaxia-uploads";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only image files (JPG, PNG, WebP, GIF, AVIF) are allowed."));
    },
});

async function uploadToS3(buffer: Buffer, originalName: string, mimetype: string, folder: string): Promise<string> {
    const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(originalName)}`;
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimetype,
        ACL: "public-read",
    }));
    return `https://${BUCKET}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${uniqueKey}`;
}

// GET /api/site-images — list all, grouped by section
router.get("/", async (_req, res) => {
    try {
        const images = await prisma.siteImage.findMany({ orderBy: [{ section: "asc" }, { displayOrder: "asc" }] });
        // Group by section
        const grouped: Record<string, typeof images> = {};
        images.forEach(img => {
            if (!grouped[img.section]) grouped[img.section] = [];
            grouped[img.section].push(img);
        });
        return res.json(grouped);
    } catch (error) {
        console.error("List site images error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/site-images — upload image to a section
router.post("/", authMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { section } = req.body;
        if (!section) return res.status(400).json({ error: "Section is required" });

        // Compress to WebP
        const { buffer, mimetype, fileName } = await compressFile(req.file.buffer, req.file.mimetype, req.file.originalname);
        const folder = `website-images/${section}`;
        const fileUrl = await uploadToS3(buffer, fileName, mimetype, folder);

        // Get next display order
        const maxOrder = await prisma.siteImage.findFirst({
            where: { section },
            orderBy: { displayOrder: "desc" },
            select: { displayOrder: true },
        });

        const image = await prisma.siteImage.create({
            data: {
                section,
                url: fileUrl,
                displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
            },
        });

        return res.status(201).json(image);
    } catch (error) {
        console.error("Upload site image error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/site-images/:id
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const image = await prisma.siteImage.findUnique({ where: { id } });
        if (!image) return res.status(404).json({ error: "Image not found" });

        // Try delete from S3 (best-effort)
        try {
            const url = new URL(image.url);
            const key = url.pathname.slice(1); // remove leading /
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        } catch (s3Err) {
            console.warn("S3 delete failed (non-blocking):", s3Err);
        }

        await prisma.siteImage.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete site image error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
