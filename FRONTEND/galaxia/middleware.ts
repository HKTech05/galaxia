import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Allow /chatbot login page through (it has its own client-side auth)
    if (request.nextUrl.pathname === '/chatbot') {
        return NextResponse.next();
    }

    // Protect /admin3 and /chatbot/dashboard routes
    if (request.nextUrl.pathname.startsWith('/admin3') || request.nextUrl.pathname.startsWith('/chatbot/')) {
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
        '/admin3/:path*',
        '/chatbot',
        '/chatbot/:path*',
    ],
};
