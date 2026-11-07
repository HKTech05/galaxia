import { NextRequest, NextResponse } from "next/server";

/**
 * HDFC SmartGateway POST Return Handler
 * 
 * After 3DS authentication, HDFC SmartGateway submits the payment result
 * back to the return_url via an HTTP POST (auto-submitted HTML form).
 * 
 * Next.js page routes only handle GET requests, so this route handler
 * intercepts the POST, extracts all form fields, and redirects (303)
 * to /testpayment/callback as a GET request with query strings.
 * 
 * The callback page.tsx then picks up the query params via useSearchParams()
 * and triggers the server-to-server verification flow.
 */
export async function POST(request: NextRequest) {
    try {
        // HDFC sends form-encoded data (application/x-www-form-urlencoded)
        let params = new URLSearchParams();

        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            formData.forEach((value, key) => {
                params.set(key, String(value));
            });
        } else if (contentType.includes("application/json")) {
            const body = await request.json();
            Object.entries(body).forEach(([key, value]) => {
                params.set(key, String(value));
            });
        } else {
            // Try form data first, fall back to text parsing
            try {
                const formData = await request.formData();
                formData.forEach((value, key) => {
                    params.set(key, String(value));
                });
            } catch {
                const text = await request.text();
                params = new URLSearchParams(text);
            }
        }

        // 303 See Other — forces browser to follow up with GET (not POST)
        const redirectUrl = new URL("/testpayment/callback", request.url);
        redirectUrl.search = params.toString();

        console.log("[HDFC Return Route] POST received, redirecting to GET:", redirectUrl.toString());

        return NextResponse.redirect(redirectUrl, 303);
    } catch (error) {
        console.error("[HDFC Return Route] Error processing POST:", error);

        // Last resort: redirect to callback with error flag
        const redirectUrl = new URL("/testpayment/callback", request.url);
        redirectUrl.searchParams.set("error", "Failed to parse HDFC payment response");

        return NextResponse.redirect(redirectUrl, 303);
    }
}

// Also handle GET in case HDFC ever does a GET redirect here
export async function GET(request: NextRequest) {
    const redirectUrl = new URL("/testpayment/callback", request.url);
    redirectUrl.search = request.nextUrl.search;

    return NextResponse.redirect(redirectUrl, 303);
}
