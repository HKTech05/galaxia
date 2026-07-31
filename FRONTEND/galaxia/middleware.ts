import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── MAINTENANCE MODE ───────────────────────────────────────
// Set to `true` to block all public traffic and show the maintenance page.
// Set to `false` to restore normal operation.
// Verified ready for production deployment.
const MAINTENANCE_MODE = false;
// ─────────────────────────────────────────────────────────────

// Routes that should ALWAYS remain accessible, even during maintenance
const BYPASS_PREFIXES = [
    '/maintenance',
    '/admin3',
    '/login',
    '/api',
    '/_next',       // Next.js internal assets
    '/favicon',
    '/icon',
    '/apple-icon',
    '/privacy-policy',  // Google Play Store compliance — must always be accessible
    '/delete-account',  // Google Play Store compliance — must always be accessible
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── Maintenance gate ──────────────────────────────────
    if (MAINTENANCE_MODE) {
        const isBypassed = BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));

        if (!isBypassed) {
            return NextResponse.redirect(new URL('/maintenance', request.url));
        }
    }

    // ── Admin auth guard (always active) ──────────────────
    // Protect /admin3 routes only — chatbot pages handle their own auth via client-side localStorage
    if (pathname.startsWith('/admin3')) {
        // Check for the admin_token cookie set by /login
        const adminToken = request.cookies.get('admin_token');

        if (!adminToken?.value) {
            // No token found, redirect strictly to the admin login portal
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Accountant Role check: restrict access to /admin3/reports only
        try {
            const parts = adminToken.value.split('.');
            if (parts.length === 3) {
                const base64Url = parts[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                const payload = JSON.parse(jsonPayload);
                if (payload.role === 'accountant') {
                    if (!pathname.startsWith('/admin3/reports')) {
                        return NextResponse.redirect(new URL('/admin3/reports', request.url));
                    }
                }
            }
        } catch (err) {
            // Let normal validation proceed if decode fails
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except static files.
         * During maintenance this catches everything; normally only /admin3.
         */
        '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)',
    ],
};
