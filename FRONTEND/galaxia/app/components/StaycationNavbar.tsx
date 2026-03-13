"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const propertyLinks = [
    { name: "Hill View", href: "/staycation/hill-view" },
    { name: "Mount View", href: "/staycation/mount-view" },
    { name: "Euphoria", href: "/staycation/euphoria" },
    { name: "La Paraiso", href: "/staycation/la-paraiso" },
    { name: "Amstel Nest", href: "/staycation/amstel-nest" },
    { name: "Ambrose", href: "/staycation/ambrose" },
];

const menuItems = [
    { name: "About Us", href: "/staycation/about" },
    { name: "Sightseeing", href: "/staycation/sightseeing" },
    { name: "Contact Us", href: "/staycation/contact" },
    { name: "Reviews", href: "/staycation/reviews" },
];

export default function StaycationNavbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Navbar stays visible on all pages including booking

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 glass-light">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    {/* Left: Home icon + Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Removed Home Icon from here */}
                        <Link href="/staycation" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center">
                                <span className="text-white font-cinzel font-bold text-xs">G</span>
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="font-cinzel text-base sm:text-lg font-semibold text-gold-gradient">GALAXIA</span>
                                <span className="text-[8px] font-inter text-text-muted tracking-[0.2em] uppercase">Staycation</span>
                            </div>
                        </Link>
                    </div>

                    {/* Center: Property links (desktop only) */}
                    <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
                        {propertyLinks.map((link, i) => (
                            <span key={link.href} className="flex items-center">
                                <Link
                                    href={link.href}
                                    className={`text-[11px] tracking-wide uppercase px-2.5 xl:px-3 py-1.5 rounded transition-all duration-300 font-inter whitespace-nowrap ${pathname === link.href || pathname?.startsWith(link.href + "/")
                                        ? "text-antique-gold bg-antique-gold/8 font-medium"
                                        : "text-text-secondary hover:text-antique-gold"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                                {i < propertyLinks.length - 1 && (
                                    <span className="text-border-medium text-[10px] mx-0.5">|</span>
                                )}
                            </span>
                        ))}
                    </div>

                    {/* Right: User + Hamburger */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link href="/" className="w-8 h-8 rounded-full border border-border-light flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group" title="Back to Galaxia Home">
                            <svg className="w-4 h-4 text-text-muted group-hover:text-antique-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        router.push("/dashboard?source=staycation");
                                    }
                                }
                            }}
                            className="w-8 h-8 rounded-full border border-border-light flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group"
                        >
                            <svg className="w-4 h-4 text-text-secondary group-hover:text-antique-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="w-8 h-8 rounded-full border border-border-light flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group relative"
                            aria-label="Toggle menu"
                        >
                            <div className="w-3.5 h-3.5 relative">
                                <span className={`absolute left-0 w-full h-[1.5px] bg-text-secondary group-hover:bg-antique-gold transition-all duration-300 ease-in-out origin-center ${menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
                                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1.5px] bg-text-secondary group-hover:bg-antique-gold transition-all duration-200 ease-in-out ${menuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"}`} />
                                <span className={`absolute left-0 w-full h-[1.5px] bg-text-secondary group-hover:bg-antique-gold transition-all duration-300 ease-in-out origin-center ${menuOpen ? "bottom-1/2 translate-y-1/2 -rotate-45" : "bottom-0"}`} />
                            </div>
                        </button>
                    </div>
                </div>
            </nav>

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

            {/* Overlay — always rendered, visibility toggled via opacity + pointer-events */}
            <div
                className={`fixed inset-0 z-[55] bg-black/20 transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setMenuOpen(false)}
            />

            {/* Side menu drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-80 z-[60] bg-white shadow-2xl border-l border-border-light transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="p-6 pt-16 h-full overflow-y-auto">
                    <button
                        onClick={() => setMenuOpen(false)}
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-text-muted hover:text-antique-gold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Properties section (mobile only — hidden on lg) */}
                    <div className="lg:hidden mb-6">
                        <p className="text-text-muted text-[10px] font-inter uppercase tracking-[0.2em] mb-3 px-3">Properties</p>
                        <div className="space-y-0.5">
                            {propertyLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`block py-2.5 px-3 rounded-lg transition-all duration-300 font-cinzel text-sm tracking-wider ${pathname === link.href
                                        ? "text-antique-gold bg-antique-gold/5 font-medium"
                                        : "text-text-primary hover:text-antique-gold hover:bg-antique-gold/5"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                        <div className="my-5 border-t border-border-light" />
                    </div>

                    {/* Regular pages */}
                    <div>
                        <p className="text-text-muted text-[10px] font-inter uppercase tracking-[0.2em] mb-3 px-3">Explore</p>
                        <div className="space-y-0.5">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="block py-2.5 px-3 text-text-primary hover:text-antique-gold hover:bg-antique-gold/5 rounded-lg transition-all duration-300 font-cinzel text-sm tracking-wider"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Social links at bottom */}
                    <div className="mt-10 pt-6 border-t border-border-light">
                        <p className="text-text-muted text-[10px] font-inter tracking-[0.2em] uppercase mb-3 px-3">Follow Us</p>
                        <div className="flex gap-2 px-3">
                            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-border-light flex items-center justify-center text-text-muted hover:text-antique-gold hover:border-antique-gold transition-all duration-300">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </a>
                            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-border-light flex items-center justify-center text-text-muted hover:text-antique-gold hover:border-antique-gold transition-all duration-300">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
