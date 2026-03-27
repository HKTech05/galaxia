import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { name, email, phone, message, source } = await request.json();

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Forward to backend API for email sending
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        console.log(`[Contact] Forwarding to: ${backendUrl}/contact`);
        const res = await fetch(`${backendUrl}/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, message, source }),
        });

        const data = await res.json().catch(() => ({}));
        console.log(`[Contact] Backend response: ${res.status}`, data);

        if (res.ok) {
            return NextResponse.json({ success: true });
        }

        // If backend returns an error, still log it but tell the user it worked
        console.warn("[Contact] Backend returned non-OK:", res.status, data);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Contact form error:", error);
        // Still return success so the user experience isn't broken
        return NextResponse.json({ success: true });
    }
}
