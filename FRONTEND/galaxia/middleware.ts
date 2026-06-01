import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── MAINTENANCE MODE ───────────────────────────────────────
// Set to `true` to block all public traffic and show the maintenance page.
// Set to `false` to restore normal operation.
const MAINTENANCE_MODE = true;
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
