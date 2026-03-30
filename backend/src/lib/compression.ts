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
        .rotate()  // Auto-rotate based on EXIF orientation before stripping metadata
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
 * Aggressively compress guest ID proof images.
 * - Max dimension: 1200px (ID docs don't need full-res)
 * - Quality: 65% WebP (text stays perfectly readable, ~80-90% size saving)
 * - Strips all EXIF metadata
 * A typical 2MB phone photo compresses to ~100-200KB.
 */
export async function compressGuestId(
    buffer: Buffer,
    _mimetype: string
): Promise<{ buffer: Buffer; mimetype: string; extension: string }> {
    const compressed = await sharp(buffer)
        .rotate()  // Auto-rotate based on EXIF orientation
        .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 65, smartSubsample: true })
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
 * @param isGuestId — if true, uses aggressive compression for ID proofs
 */
export async function compressFile(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
    isGuestId: boolean = false
): Promise<{ buffer: Buffer; mimetype: string; fileName: string }> {
    const isImage = mimetype.startsWith("image/");

    if (isImage) {
        const compressor = isGuestId ? compressGuestId : compressImage;
        const { buffer: compressed, mimetype: newMime, extension } = await compressor(buffer, mimetype);
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
