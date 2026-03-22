import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const backendUrl = "http://65.1.183.241:4000/api/upi-payments/upload";

        const formData = await req.formData();

        // Forward admin token for auth
        const token = req.headers.get("authorization") || "";

        const res = await fetch(backendUrl, {
            method: "POST",
            body: formData,
            headers: {
                ...(token ? { Authorization: token } : {}),
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("UPI proof upload proxy error:", error);
        return NextResponse.json({ error: "Upload proxy failed" }, { status: 500 });
    }
}
