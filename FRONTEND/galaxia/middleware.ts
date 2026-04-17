import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Protect /admin3 routes only — chatbot pages handle their own auth via client-side localStorage
    if (request.nextUrl.pathname.startsWith('/admin3')) {
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
    ],
};
