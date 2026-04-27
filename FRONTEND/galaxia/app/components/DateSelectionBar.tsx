"use client";

import { useState, useEffect } from "react";
import GoldDatePicker from "./GoldDatePicker";

interface DateSelectionBarProps {
    onDatesChange?: (checkIn: string, checkOut: string) => void;
    checkIn?: string;
    checkOut?: string;
    propertyId?: number | null;
    subPropertyId?: number | null;
}

/**
 * Reusable date selection bar that reads/writes from localStorage for cross-page persistence.
 * Uses the custom GoldDatePicker instead of native <input type="date">.
 * When propertyId is provided, fetches booked dates and disables them in the date picker.
 */
export default function DateSelectionBar({ onDatesChange, checkIn: externalCI, checkOut: externalCO, propertyId, subPropertyId }: DateSelectionBarProps) {
    const [ci, setCi] = useState(externalCI || '');
    const [co, setCo] = useState(externalCO || '');
    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

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

    // Fetch booked dates when propertyId is available
    useEffect(() => {
        if (!propertyId || propertyId <= 0) { setBookedDates(new Set()); return; }
        (async () => {
            try {
                // Fetch a wide range (next 12 months)
                const now = new Date();
                const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const endY = now.getFullYear() + 1;
                const endDate = `${endY}-${String(now.getMonth() + 1).padStart(2, '0')}-28`;
                const baseUrl = typeof window !== "undefined" ? "/api" : "http://localhost:4000/api";
                let url = `${baseUrl}/bookings/staycation/booked-dates?propertyId=${propertyId}&startDate=${startDate}&endDate=${endDate}`;
                if (subPropertyId) url += `&subPropertyId=${subPropertyId}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setBookedDates(new Set(data.dates || []));
                }
            } catch {
                // Silently fail
            }
        })();
    }, [propertyId, subPropertyId]);

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

    // Min for checkout: day after check-in
    const minCO = (() => {
        if (!ci) return minDate;
        const d = new Date(ci + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Only pass disabled dates if we have a propertyId (don't disable for Amstel Nest multi-unit etc)
    const disabledSet = bookedDates.size > 0 ? bookedDates : undefined;

    return (
        <div className="p-4 rounded-xl border border-antique-gold/20 bg-gradient-to-r from-[#fdfbf7] to-[#faf6ee] shadow-sm">
            <p className="text-[9px] font-inter font-bold text-antique-gold uppercase tracking-[0.2em] mb-3 text-center">Select Your Dates</p>
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <label className="text-[10px] font-inter font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Check-in</label>
                    <GoldDatePicker
                        value={ci}
                        onChange={handleCheckIn}
                        min={minDate}
                        placeholder="Select check-in"
                        disabledDates={disabledSet}
                    />
                </div>
                <svg className="w-4 h-4 text-antique-gold/50 shrink-0 mt-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <div className="flex-1">
                    <label className="text-[10px] font-inter font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Check-out</label>
                    <GoldDatePicker
                        value={co}
                        onChange={handleCheckOut}
                        min={minCO}
                        placeholder="Select check-out"
                        disabledDates={disabledSet}
                    />
                </div>
            </div>
        </div>
    );
}
