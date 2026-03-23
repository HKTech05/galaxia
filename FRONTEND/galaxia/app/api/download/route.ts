import { NextRequest, NextResponse } from "next/server";

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
        
        let ext = "pdf"; // Default to pdf
        const contentType = response.headers.get("content-type") || blob.type || "";
        
        if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
        else if (contentType.includes("png")) ext = "png";
        else if (url.toLowerCase().includes(".jpg") || url.toLowerCase().includes(".jpeg")) ext = "jpg";
        else if (url.toLowerCase().includes(".png")) ext = "png";

        // Generate a clean filename without spaces
        const safeName = name.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
        const filename = `${safeName}.${ext}`;

        const headers = new Headers();
        headers.set("Content-Type", contentType || "application/octet-stream");
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);

        return new NextResponse(blob, { status: 200, headers });
    } catch (error) {
        console.error("Download proxy error:", error);
        return new NextResponse("Error processing download", { status: 500 });
    }
}
