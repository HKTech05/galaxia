"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const screenLinks = [
    { name: "Sandy Screen", href: "/celebration/movie-time/sandy-screen" },
    { name: "Cine Love", href: "/celebration/movie-time/cine-love" },
    { name: "Park N Watch", href: "/celebration/movie-time/park-n-watch" },
    { name: "Baywatch", href: "/celebration/movie-time/baywatch" },
];

export default function CelebrationNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-cel-bg/95 backdrop-blur-xl border-b border-cel-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3">
                    <img src="/logos/digital-diaries.png" alt="Digital Diaries" className="w-8 h-8 rounded-full object-cover" style={{ filter: "invert(1) brightness(0.85) sepia(1) hue-rotate(320deg) saturate(3)" }} />
                    <div className="flex flex-col">
                        <span className="font-cinzel text-lg font-semibold text-cel-text tracking-wider">GALAXIA</span>
                        <span className="font-inter text-[8px] tracking-[0.3em] uppercase text-rose-medium -mt-0.5">Digital Diaries</span>
                    </div>
                </Link>

                {/* Desktop Links */}
                <div className="hidden lg:flex items-center gap-1">
                    {screenLinks.map((link) => {
                        const isActive = pathname.includes(link.href.split("/").pop()!);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`font-inter text-xs uppercase tracking-wider px-3 py-2 transition-colors duration-300 ${isActive
                                    ? "text-rose-medium font-medium"
                                    : "text-cel-text-secondary hover:text-rose-light"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                    <span className="w-px h-4 bg-cel-border mx-2" />
                    <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-cel-text-secondary hover:text-rose-medium transition-colors px-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    </a>
                </div>

                {/* Profile + Hamburger */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-full border border-cel-border flex items-center justify-center hover:border-rose-medium transition-all group">
                        <svg className="w-4 h-4 text-cel-text-secondary group-hover:text-rose-medium transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </Link>
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            if (typeof window !== "undefined") {
                                if (!localStorage.getItem("galaxia_token")) {
                                    setShowAuthModal(true);
                                } else {
                                    router.push("/dashboard?source=celebration");
                                }
                            }
                        }}
                        className="w-9 h-9 rounded-full border border-cel-border flex items-center justify-center hover:border-rose-medium transition-all group"
                    >
                        <svg className="w-4 h-4 text-cel-text-secondary group-hover:text-rose-medium transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 flex items-center justify-center text-cel-text-secondary hover:text-rose-medium transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="lg:hidden border-t border-cel-border bg-cel-bg/98 backdrop-blur-xl">
                    <div className="px-4 py-4 space-y-1">
                        {screenLinks.map((link) => (
                            <Link key={link.name} href={link.href} onClick={() => setMobileOpen(false)}
                                className="block font-inter text-sm text-cel-text-secondary hover:text-rose-light py-2.5 px-3 rounded-lg hover:bg-cel-card transition-all">
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-3 border-t border-cel-border mt-3">
                            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-inter text-sm text-cel-text-secondary py-2.5 px-3">
                                <svg className="w-4 h-4 text-rose-medium" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                Follow on Instagram
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ChatGPT-style Dark Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 xs:p-10 relative transform transition-all">
                        <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <h2 className="font-inter text-[28px] font-semibold text-white mb-2 text-center tracking-tight">Log in or sign up</h2>
                        <p className="font-inter text-[15px] text-[#C5C5D2] text-center mb-8 px-2 font-normal">
                            Sign in to your account or create a new one to access your premium reservations.
                        </p>
                        
                        <div className="w-full space-y-3">
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (typeof window !== "undefined") {
                                        const redirectUri = `${window.location.origin}/auth/callback`;
                                        const currentUrl = window.location.pathname + window.location.search;
                                        const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/oauth2/authorize?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(currentUrl)}&identity_provider=Google`;
                                        window.location.href = cognitoUrl;
                                    }
                                }}
                                className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors border border-transparent hover:border-gray-200"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-[18px] h-[18px]" />
                                Continue with Google
                            </button>
                            
                            <div className="flex items-center gap-4 py-2 opacity-60">
                                <div className="h-[1px] bg-white/20 flex-1"></div>
                                <span className="text-white/80 font-inter text-xs uppercase tracking-wider">or</span>
                                <div className="h-[1px] bg-white/20 flex-1"></div>
                            </div>

                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (typeof window !== "undefined") {
                                        const redirectUri = `${window.location.origin}/auth/callback`;
                                        const currentUrl = window.location.pathname + window.location.search;
                                        const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/login?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(currentUrl)}`;
                                        window.location.href = cognitoUrl;
                                    }
                                }}
                                className="w-full bg-[#343541] outline outline-1 outline-[#565869] text-white hover:bg-[#40414F] flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors"
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Continue with Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
