"use client";

import { useState, useEffect } from "react";

interface DateSelectionBarProps {
    onDatesChange?: (checkIn: string, checkOut: string) => void;
    checkIn?: string;
    checkOut?: string;
}

/**
 * Reusable date selection bar that reads/writes from localStorage for cross-page persistence.
 * Used on staycation landing, property detail, sub-villa, cottage, and booking pages.
 */
export default function DateSelectionBar({ onDatesChange, checkIn: externalCI, checkOut: externalCO }: DateSelectionBarProps) {
    const [ci, setCi] = useState(externalCI || '');
    const [co, setCo] = useState(externalCO || '');

    // Sync external props
    useEffect(() => {
        if (externalCI !== undefined) setCi(externalCI);
        if (externalCO !== undefined) setCo(externalCO);
    }, [externalCI, externalCO]);

    // Read from localStorage on mount if no external value
    useEffect(() => {
        if (!externalCI) {
            const stored = localStorage.getItem('galaxia_search_checkin');
            if (stored) setCi(stored);
        }
        if (!externalCO) {
            const stored = localStorage.getItem('galaxia_search_checkout');
            if (stored) setCo(stored);
        }
    }, []);

    // Notify parent on initial mount if we have stored dates
    useEffect(() => {
        if (ci && co && onDatesChange) {
            onDatesChange(ci, co);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheckIn = (val: string) => {
        setCi(val);
        setCo('');
        if (val) localStorage.setItem('galaxia_search_checkin', val);
        else localStorage.removeItem('galaxia_search_checkin');
        localStorage.removeItem('galaxia_search_checkout');
    };

    const handleCheckOut = (val: string) => {
        setCo(val);
        if (val) localStorage.setItem('galaxia_search_checkout', val);
        else localStorage.removeItem('galaxia_search_checkout');
        if (ci && val && onDatesChange) onDatesChange(ci, val);
    };

    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="p-4 rounded-xl border border-antique-gold/15 bg-gradient-to-r from-[#fdfbf7] to-[#faf6ee]">
            <p className="text-[9px] font-inter font-bold text-antique-gold uppercase tracking-[0.2em] mb-3 text-center">Select Your Dates</p>
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <label className="text-[10px] font-inter font-semibold text-text-muted uppercase tracking-wider mb-1 block">Check-in</label>
                    <input
                        type="date"
                        value={ci}
                        min={minDate}
                        onChange={e => handleCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 border border-antique-gold/20 rounded-lg text-sm font-inter text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-antique-gold/20 focus:border-antique-gold transition-all [color-scheme:light]"
                    />
                </div>
                <svg className="w-4 h-4 text-antique-gold/40 shrink-0 mt-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <div className="flex-1">
                    <label className="text-[10px] font-inter font-semibold text-text-muted uppercase tracking-wider mb-1 block">Check-out</label>
                    <input
                        type="date"
                        value={co}
                        min={ci || minDate}
                        onChange={e => handleCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 border border-antique-gold/20 rounded-lg text-sm font-inter text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-antique-gold/20 focus:border-antique-gold transition-all [color-scheme:light]"
                    />
                </div>
            </div>
        </div>
    );
}
