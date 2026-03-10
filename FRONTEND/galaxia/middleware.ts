import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only protect /admin3 routes
    if (request.nextUrl.pathname.startsWith('/admin3')) {
        // Check for the admin_token cookie set by /admin-login
        const adminToken = request.cookies.get('admin_token');

        if (!adminToken?.value) {
            // No token found, redirect strictly to the admin login portal
            return NextResponse.redirect(new URL('/admin-login', request.url));
        }

        // Extremely secure implementations would cryptographically verify the JWT here.
        // For edge performance without external auth libraries, checking existence is sufficient
        // because the backend /api routes STILL strictly verify the JWT signature on every request anyway.
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        '/admin3/:path*',
    ],
};
