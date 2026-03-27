"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AmstelCartItem { cottageId: string; cottageName: string; theme: string; weekdayPrice: string; weekendPrice: string; maxPersons: number; property: string; }
interface AmbroseCartItem { villaId: string; villaName: string; theme: string; weekdayPrice: string; weekendPrice: string; maxPersons: number; }

export default function FloatingCart() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [amstelItems, setAmstelItems] = useState<AmstelCartItem[]>([]);
    const [ambroseItems, setAmbroseItems] = useState<AmbroseCartItem[]>([]);

    const refresh = useCallback(() => {
        try { setAmstelItems(JSON.parse(localStorage.getItem("amstel_cart") || "[]")); } catch { setAmstelItems([]); }
        try { setAmbroseItems(JSON.parse(localStorage.getItem("ambrose_cart") || "[]")); } catch { setAmbroseItems([]); }
    }, []);

    useEffect(() => { setMounted(true); refresh(); }, [refresh]);
    // Refresh when storage changes (cross-tab or same-tab via custom event)
    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener("storage", handler);
        window.addEventListener("cart-update", handler);
        return () => { window.removeEventListener("storage", handler); window.removeEventListener("cart-update", handler); };
    }, [refresh]);

    // Also poll every 2 seconds to catch same-tab localStorage changes
    useEffect(() => {
        const id = setInterval(refresh, 2000);
        return () => clearInterval(id);
    }, [refresh]);

    const removeAmstel = (cottageId: string) => {
        const updated = amstelItems.filter(i => i.cottageId !== cottageId);
        localStorage.setItem("amstel_cart", JSON.stringify(updated));
        setAmstelItems(updated);
    };

    const removeAmbrose = (villaId: string) => {
        const updated = ambroseItems.filter(i => i.villaId !== villaId);
        localStorage.setItem("ambrose_cart", JSON.stringify(updated));
        setAmbroseItems(updated);
    };

    const totalCount = amstelItems.length + ambroseItems.length;

    // Hide on admin pages, login, chatbot pages
    if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/chatbot"))) return null;
    if (!mounted || totalCount === 0) return null;

    const isCelebration = pathname?.startsWith("/celebration");

    return (
        <>
            {/* Cart popup */}
            {isOpen && (
                <div className={`fixed bottom-24 left-4 sm:left-6 z-[65] w-[min(360px,calc(100vw-2rem))] ${isCelebration ? "bg-[#1A1A1A] border-[#2A2A2A] text-white" : "bg-white border-border-light text-text-primary"} rounded-2xl shadow-2xl border overflow-hidden animate-fade-in-up`}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-antique-gold to-dark-gold px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                            <span className="font-cinzel text-sm font-semibold">Your Cart ({totalCount})</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Items */}
                    <div className={`max-h-[50vh] overflow-y-auto p-4 space-y-3 ${isCelebration ? "bg-[#0D0D0D]" : "bg-soft-gray/20"}`}>
                        {/* Amstel Nest items */}
                        {amstelItems.map(item => (
                            <div key={`a-${item.cottageId}`} className={`${isCelebration ? "bg-[#1A1A1A] border-[#2A2A2A]" : "bg-white border-border-light"} rounded-xl border p-3.5 flex items-start gap-3`}>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="text-emerald-600 text-xs font-bold">AN</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-inter text-sm font-bold truncate">{item.cottageName}</p>
                                    <p className={`text-[11px] ${isCelebration ? "text-[#999]" : "text-text-muted"} font-inter`}>Amstel Nest · {item.theme}</p>
                                    <p className="text-xs font-inter font-medium text-antique-gold mt-1">From ₹{item.weekdayPrice}/night</p>
                                </div>
                                <button onClick={() => removeAmstel(item.cottageId)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}

                        {/* Ambrose items */}
                        {ambroseItems.map(item => (
                            <div key={`b-${item.villaId}`} className={`${isCelebration ? "bg-[#1A1A1A] border-[#2A2A2A]" : "bg-white border-border-light"} rounded-xl border p-3.5 flex items-start gap-3`}>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <span className="text-indigo-600 text-xs font-bold">AM</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-inter text-sm font-bold truncate">{item.villaName}</p>
                                    <p className={`text-[11px] ${isCelebration ? "text-[#999]" : "text-text-muted"} font-inter`}>Ambrose · {item.theme}</p>
                                    <p className="text-xs font-inter font-medium text-antique-gold mt-1">From ₹{item.weekdayPrice}/night</p>
                                </div>
                                <button onClick={() => removeAmbrose(item.villaId)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className={`p-4 border-t ${isCelebration ? "border-[#2A2A2A]" : "border-border-light"} space-y-2`}>
                        {amstelItems.length > 0 && (
                            <Link href={`/staycation/amstel-nest/${amstelItems[0].cottageId}/book`} onClick={() => setIsOpen(false)} className="block w-full bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter font-semibold text-sm py-3 rounded-xl text-center hover:shadow-lg transition-all">
                                Book Amstel Nest ({amstelItems.length} cottage{amstelItems.length > 1 ? "s" : ""})
                            </Link>
                        )}
                        {ambroseItems.length > 0 && (
                            <Link href="/staycation/ambrose/book-multi" onClick={() => setIsOpen(false)} className="block w-full bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter font-semibold text-sm py-3 rounded-xl text-center hover:shadow-lg transition-all">
                                Book Ambrose ({ambroseItems.length} villa{ambroseItems.length > 1 ? "s" : ""})
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Floating cart button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 left-4 sm:left-6 z-[65] bg-gradient-to-r from-antique-gold to-dark-gold text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-antique-gold/30 transition-all duration-300 flex items-center gap-2 pl-4 pr-5 py-3 group"
            >
                <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                    <span className="absolute -top-2 -right-2 bg-white text-antique-gold text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{totalCount}</span>
                </div>
                <span className="font-inter font-semibold text-sm">Cart</span>
            </button>
        </>
    );
}
