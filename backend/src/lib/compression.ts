import sharp from "sharp";

/**
 * Compress an image buffer to WebP format.
 * - Max dimension: 1920px (maintains aspect ratio)
 * - Quality: 85% (visually lossless)
 * - Strips EXIF metadata to save space
 * Returns { buffer, mimetype, extension }
 */
export async function compressImage(
    buffer: Buffer,
    _mimetype: string
): Promise<{ buffer: Buffer; mimetype: string; extension: string }> {
    const compressed = await sharp(buffer)
        .resize(1920, 1920, {
            fit: "inside",       // Never upscale, maintain aspect ratio
            withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

    return {
        buffer: compressed,
        mimetype: "image/webp",
        extension: ".webp",
    };
}

/**
 * Compress any uploaded file. Routes images through sharp,
 * passes non-image files through unchanged.
 */
export async function compressFile(
    buffer: Buffer,
    mimetype: string,
    originalName: string
): Promise<{ buffer: Buffer; mimetype: string; fileName: string }> {
    const isImage = mimetype.startsWith("image/");

    if (isImage) {
        const { buffer: compressed, mimetype: newMime, extension } = await compressImage(buffer, mimetype);
        // Replace extension with .webp
        const baseName = originalName.replace(/\.[^.]+$/, "");
        return {
            buffer: compressed,
            mimetype: newMime,
            fileName: `${baseName}${extension}`,
        };
    }

    // Non-image files pass through as-is
    return { buffer, mimetype, fileName: originalName };
}
