"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

/* ═══════════════════════════════════════════════════════
   /cart — Central Cart Page
   Shows all cart items across properties (Ambrose + Amstel Nest)
   Allows remove, view availability, and navigate to book
   ═══════════════════════════════════════════════════════ */

interface AmbroseCartItem {
    villaId: string;
    villaName: string;
    theme: string;
    weekdayPrice: string;
    weekendPrice: string;
    maxPersons: number;
}

interface AmstelCartItem {
    cottageId: string;
    unitCount: number;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CartPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [ambroseCart, setAmbroseCart] = useState<AmbroseCartItem[]>([]);
    const [amstelCart, setAmstelCart] = useState<AmstelCartItem[]>([]);
    // Shared date selection for Ambrose
    const [ambroseCheckIn, setAmbroseCheckIn] = useState<Date | null>(null);
    const [ambroseCheckOut, setAmbroseCheckOut] = useState<Date | null>(null);
    // Booked dates for each Ambrose villa
    const [ambroseBookedDates, setAmbroseBookedDates] = useState<Record<string, string[]>>({});

    const refresh = useCallback(() => {
        try {
            setAmbroseCart(JSON.parse(localStorage.getItem("ambrose_cart") || "[]"));
            setAmstelCart(JSON.parse(localStorage.getItem("amstel_cart") || "[]"));
        } catch {
            setAmbroseCart([]);
            setAmstelCart([]);
        }
    }, []);

    useEffect(() => { setMounted(true); refresh(); }, [refresh]);

    // Fetch booked dates for Ambrose villas
    useEffect(() => {
        if (ambroseCart.length === 0) return;
        (async () => {
            try {
                const res = await fetch("/api/bookings/staycation/booked-dates?propertySlug=ambrose");
                if (res.ok) {
                    const data = await res.json();
                    // data is { [villaSlug]: ["2026-03-27", ...] }
                    setAmbroseBookedDates(data);
                }
            } catch {}
        })();
    }, [ambroseCart.length]);

    const removeAmbrose = (villaId: string) => {
        const updated = ambroseCart.filter(c => c.villaId !== villaId);
        localStorage.setItem("ambrose_cart", JSON.stringify(updated));
        setAmbroseCart(updated);
        window.dispatchEvent(new Event("cart-update"));
    };

    const clearAmbroseCart = () => {
        localStorage.removeItem("ambrose_cart");
        setAmbroseCart([]);
        window.dispatchEvent(new Event("cart-update"));
    };

    const clearAmstelCart = () => {
        localStorage.removeItem("amstel_cart");
        setAmstelCart([]);
        window.dispatchEvent(new Event("cart-update"));
    };

    const handleAmbroseDatesChange = (ci: Date | null, co: Date | null) => {
        setAmbroseCheckIn(ci);
        setAmbroseCheckOut(co);
    };

    // Check conflicts for Ambrose villas on selected dates
    const getAmbroseConflicts = useCallback(() => {
        if (!ambroseCheckIn || !ambroseCheckOut) return {};
        const conflicts: Record<string, string[]> = {};
        const nights = Math.ceil((ambroseCheckOut.getTime() - ambroseCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        for (const item of ambroseCart) {
            const villaBooked = ambroseBookedDates[item.villaId] || ambroseBookedDates[item.villaName?.toLowerCase()?.replace(/\s+/g, "-")] || [];
            const conflictDates: string[] = [];
            for (let i = 0; i < nights; i++) {
                const d = new Date(ambroseCheckIn);
                d.setDate(d.getDate() + i);
                const ds = d.toISOString().split("T")[0];
                if (villaBooked.includes(ds)) conflictDates.push(ds);
            }
            if (conflictDates.length > 0) conflicts[item.villaId] = conflictDates;
        }
        return conflicts;
    }, [ambroseCheckIn, ambroseCheckOut, ambroseCart, ambroseBookedDates]);

    const ambroseConflicts = getAmbroseConflicts();
    const hasAmbroseConflicts = Object.keys(ambroseConflicts).length > 0;

    const ambroseNights = ambroseCheckIn && ambroseCheckOut ?
        Math.ceil((ambroseCheckOut.getTime() - ambroseCheckIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const getVillaTotal = (item: AmbroseCartItem) => {
        if (!ambroseCheckIn || ambroseNights <= 0) return 0;
        let total = 0;
        for (let i = 0; i < ambroseNights; i++) {
            const d = new Date(ambroseCheckIn);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            total += parseInt((isWeekend ? item.weekendPrice : item.weekdayPrice).replace(/,/g, ""));
        }
        return total;
    };

    const ambroseSubtotal = ambroseCart.reduce((s, item) => s + getVillaTotal(item), 0);
    const ambroseGST = Math.round(ambroseSubtotal * 0.05);
    const ambroseTotal = ambroseSubtotal + ambroseGST;

    const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const formatDateShort = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    const proceedAmbrose = () => {
        if (!ambroseCheckIn || !ambroseCheckOut) return;
        const ciStr = ambroseCheckIn.toISOString().split("T")[0];
        const coStr = ambroseCheckOut.toISOString().split("T")[0];
        router.push(`/staycation/ambrose/book-multi?checkIn=${ciStr}&checkOut=${coStr}`);
    };

    const proceedAmstelNest = () => {
        router.push("/staycation/amstel-nest/standard-cottage/book");
    };

    const isEmpty = ambroseCart.length === 0 && amstelCart.length === 0;

    if (!mounted) return null;

    return (
        <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
            {/* Nav */}
            <header style={{ background: "#1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Link href="/staycation" style={{ color: "#c5a55a", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, textDecoration: "none" }}>
                    GALAXIA<span style={{ fontSize: 10, fontWeight: 400, letterSpacing: 2, marginLeft: 8, color: "#999" }}>STAYCATION</span>
                </Link>
                <Link href="/staycation" style={{ color: "#c5a55a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                    ← Continue Browsing
                </Link>
            </header>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
                    Your Cart
                </h1>
                <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>
                    Review your selections, choose dates, and proceed to book.
                </p>

                {isEmpty ? (
                    <div style={{ textAlign: "center", padding: "80px 20px", background: "white", borderRadius: 16, border: "1px solid #eee" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a1a2e", fontSize: 22, marginBottom: 8 }}>Your cart is empty</h2>
                        <p style={{ color: "#888", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                            Browse our properties and add villas to your cart to start planning your getaway.
                        </p>
                        <Link href="/staycation" style={{ display: "inline-block", background: "linear-gradient(135deg, #c5a55a, #a3843f)", color: "white", padding: "12px 32px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                            Browse Properties
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* ═══ AMBROSE SECTION ═══ */}
                        {ambroseCart.length > 0 && (
                            <section style={{ marginBottom: 40 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#1a1a2e" }}>
                                        Ambrose — {ambroseCart.length} Villa{ambroseCart.length > 1 ? "s" : ""}
                                    </h2>
                                    <button onClick={clearAmbroseCart} style={{ color: "#dc2626", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                                        Clear All
                                    </button>
                                </div>

                                {/* Villas */}
                                <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                                    {ambroseCart.map(item => {
                                        const conflict = ambroseConflicts[item.villaId];
                                        const villaTotal = getVillaTotal(item);
                                        return (
                                            <div key={item.villaId} style={{ background: "white", border: conflict ? "2px solid #fbbf24" : "1px solid #eee", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#f5f0e6", color: "#a3843f", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.theme}</span>
                                                    </div>
                                                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
                                                        {item.villaName}
                                                    </h3>
                                                    <p style={{ fontSize: 13, color: "#888" }}>
                                                        ₹{item.weekdayPrice}/weekday · ₹{item.weekendPrice}/weekend · Max {item.maxPersons} guests
                                                    </p>
                                                    {villaTotal > 0 && (
                                                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginTop: 4 }}>
                                                            {formatPrice(villaTotal)} <span style={{ fontWeight: 400, color: "#888" }}>for {ambroseNights} night{ambroseNights > 1 ? "s" : ""}</span>
                                                        </p>
                                                    )}
                                                    {conflict && (
                                                        <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, fontSize: 12, color: "#92400e", fontWeight: 500 }}>
                                                            ⚠️ <strong>{item.villaName}</strong> is booked on: {conflict.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })).join(", ")}
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => removeAmbrose(item.villaId)} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                                                    🗑️ Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Date Selection */}
                                <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 24, marginBottom: 20 }}>
                                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Select Dates</h3>
                                    <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>All Ambrose villas share the same dates.</p>
                                    <AvailabilityCalendar
                                        propertySlug="ambrose"
                                        onDatesChange={handleAmbroseDatesChange}
                                    />
                                </div>

                                {/* Summary & Proceed */}
                                {ambroseCheckIn && ambroseCheckOut && ambroseNights > 0 && (
                                    <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
                                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#1a1a2e", marginBottom: 16 }}>Booking Summary</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 }}>
                                            <span>Dates</span>
                                            <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{formatDateShort(ambroseCheckIn)} → {formatDateShort(ambroseCheckOut)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 }}>
                                            <span>Subtotal ({ambroseCart.length} villa{ambroseCart.length > 1 ? "s" : ""})</span>
                                            <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{formatPrice(ambroseSubtotal)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 }}>
                                            <span>GST (5%)</span>
                                            <span>{formatPrice(ambroseGST)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "#1a1a2e", borderTop: "2px solid #f0ebe1", paddingTop: 12, marginTop: 8 }}>
                                            <span>Grand Total</span>
                                            <span style={{ color: "#a3843f" }}>{formatPrice(ambroseTotal)}</span>
                                        </div>
                                        {hasAmbroseConflicts && (
                                            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                                                ⚠️ Some villas have booking conflicts on selected dates. Please remove conflicting villas or choose different dates.
                                            </div>
                                        )}
                                        <button
                                            onClick={proceedAmbrose}
                                            disabled={hasAmbroseConflicts}
                                            style={{
                                                width: "100%", marginTop: 16, padding: "14px 24px",
                                                background: hasAmbroseConflicts ? "#d1d5db" : "linear-gradient(135deg, #c5a55a, #a3843f)",
                                                color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                                                cursor: hasAmbroseConflicts ? "not-allowed" : "pointer",
                                                fontFamily: "'Inter', sans-serif"
                                            }}
                                        >
                                            Proceed to Details →
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ═══ AMSTEL NEST SECTION ═══ */}
                        {amstelCart.length > 0 && (
                            <section style={{ marginBottom: 40 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#1a1a2e" }}>
                                        Amstel Nest — {amstelCart[0]?.unitCount || 1} Unit{(amstelCart[0]?.unitCount || 1) > 1 ? "s" : ""}
                                    </h2>
                                    <button onClick={clearAmstelCart} style={{ color: "#dc2626", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                                        Clear
                                    </button>
                                </div>
                                <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
                                    <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
                                        Amsterdam-inspired cottages with private pool. Select dates and availability on the booking page.
                                    </p>
                                    <button
                                        onClick={proceedAmstelNest}
                                        style={{
                                            width: "100%", padding: "14px 24px",
                                            background: "linear-gradient(135deg, #c5a55a, #a3843f)",
                                            color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                                            cursor: "pointer", fontFamily: "'Inter', sans-serif"
                                        }}
                                    >
                                        Select Dates & Book →
                                    </button>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
