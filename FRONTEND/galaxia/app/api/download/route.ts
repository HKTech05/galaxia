import { NextRequest, NextResponse } from "next/server";

const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
    gif: "image/gif",
    webp: "image/webp",
};

function detectExt(url: string, contentType: string): string {
    // 1. Try from the URL path first (most reliable)
    const urlPath = url.split("?")[0].split("#")[0];
    const match = urlPath.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
        const urlExt = match[1].toLowerCase();
        if (MIME_MAP[urlExt]) return urlExt === "jpeg" ? "jpg" : urlExt;
    }

    // 2. Fallback to Content-Type header
    const ct = contentType.toLowerCase();
    if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
    if (ct.includes("png")) return "png";
    if (ct.includes("gif")) return "gif";
    if (ct.includes("webp")) return "webp";
    if (ct.includes("pdf")) return "pdf";

    return "pdf"; // safe default
}

export async function GET(req: NextRequest) {
    let url = req.nextUrl.searchParams.get("url");
    const name = req.nextUrl.searchParams.get("name") || "Menu-Download";

    if (!url) {
        return new NextResponse("Missing file URL", { status: 400 });
    }

    // Resolve relative paths (e.g. /menus/file.pdf) to absolute URLs
    if (url.startsWith("/")) {
        const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "https://www.galaxiaresorts.com";
        url = `${siteOrigin}${url}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch file from remote source");

        const blob = await response.blob();
        const contentType = response.headers.get("content-type") || blob.type || "";
        const ext = detectExt(url, contentType);

        // Generate a clean filename
        const safeName = name.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
        const filename = `${safeName}.${ext}`;

        // Use the correct MIME type for the response
        const responseMime = MIME_MAP[ext] || contentType || "application/octet-stream";

        const headers = new Headers();
        headers.set("Content-Type", responseMime);
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);

        return new NextResponse(blob, { status: 200, headers });
    } catch (error) {
        console.error("Download proxy error:", error);
        return new NextResponse("Error processing download", { status: 500 });
    }
}
