import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
        // Generate a deterministic fallback for dev (NOT for production)
        return crypto.scryptSync(key || "galaxia-dev-key-change-in-production", "salt", 32);
    }
    // If key is hex-encoded (64 chars)
    if (key.length === 64) return Buffer.from(key, "hex");
    // Use scrypt to derive 32 bytes from arbitrary string
    return crypto.scryptSync(key, "galaxia-salt", 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex)
 */
export function encrypt(text: string): string {
    if (!text) return text;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:ciphertext (all hex)
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
    try {
        const parts = encryptedText.split(":");
        if (parts.length !== 3) return encryptedText; // Not encrypted, return as-is
        const [ivHex, tagHex, ciphertext] = parts;
        const key = getKey();
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch {
        // If decryption fails, the data might not be encrypted (legacy data)
        return encryptedText;
    }
}

/**
 * Check if a string appears to be encrypted (has the iv:tag:cipher format)
 */
export function isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(":");
    return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}
