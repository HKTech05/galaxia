import { NextRequest, NextResponse } from "next/server";

// Use Node.js runtime (not edge) for better multipart support
export const runtime = "nodejs";

// Disable Next.js body parser — we forward the raw body
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const backendUrl = "http://65.1.183.241:4000/api/uploads/guest-id-public";

        // Read the form data from the incoming request
        const formData = await req.formData();

        // Forward it to the backend
        const res = await fetch(backendUrl, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("Guest ID upload proxy error:", error);
        return NextResponse.json({ error: "Upload proxy failed" }, { status: 500 });
    }
}
