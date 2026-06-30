"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function FloatingCart() {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const refresh = useCallback(() => {
        try {
            const cart = JSON.parse(localStorage.getItem("ambrose_cart") || "[]");
            setTotalCount(cart.length);
        } catch { setTotalCount(0); }
    }, []);

    useEffect(() => { setMounted(true); refresh(); }, [refresh]);
    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener("storage", handler);
        window.addEventListener("cart-update", handler);
        return () => { window.removeEventListener("storage", handler); window.removeEventListener("cart-update", handler); };
    }, [refresh]);
    useEffect(() => { const id = setInterval(refresh, 2000); return () => clearInterval(id); }, [refresh]);

    // Hide on admin, chatbot, login, and booking pages (cart is already shown inline there)
    if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/chatbot") || pathname.startsWith("/login") || pathname.includes("/book") || pathname.startsWith("/customerquote") || pathname.startsWith("/hospitalityemenu"))) return null;
    if (!mounted || totalCount === 0) return null;

    const handleClick = () => {
        router.push("/staycation/ambrose/book-multi");
    };

    return (
        <>
            {/* Desktop: pill button on left with text */}
            <button
                onClick={handleClick}
                className="hidden sm:flex fixed bottom-6 left-6 z-[65] bg-gradient-to-r from-antique-gold to-dark-gold text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-antique-gold/30 transition-all duration-300 items-center gap-2 pl-4 pr-5 py-3 group"
            >
                <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                    <span className="absolute -top-2 -right-2 bg-white text-antique-gold text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{totalCount}</span>
                </div>
                <span className="font-inter font-semibold text-sm">View Cart</span>
            </button>

            {/* Mobile: circle icon-only button on RIGHT, above WhatsApp icon */}
            <button
                onClick={handleClick}
                className="flex sm:hidden fixed bottom-[88px] right-4 z-[65] bg-gradient-to-r from-antique-gold to-dark-gold text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-antique-gold/30 transition-all duration-300 items-center justify-center w-14 h-14"
            >
                <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                    <span className="absolute -top-2.5 -right-2.5 bg-white text-antique-gold text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{totalCount}</span>
                </div>
            </button>
        </>
    );
}
