"use client";

import { useState, useEffect } from "react";
import GoldDatePicker from "./GoldDatePicker";

interface DateSelectionBarProps {
    onDatesChange?: (checkIn: string, checkOut: string) => void;
    onCheckoutCleared?: () => void;
    checkIn?: string;
    checkOut?: string;
    /** Pass booked/fully-booked dates directly so the GoldDatePicker greys them out.
     *  This should be the SAME set used by the sibling AvailabilityCalendar for consistency. */
    disabledDates?: Set<string>;
}

/**
 * Reusable date selection bar that reads/writes from localStorage for cross-page persistence.
 * Uses the custom GoldDatePicker instead of native <input type="date">.
 * Accepts `disabledDates` prop from parent — does NOT fetch its own booked dates.
 */
export default function DateSelectionBar({ onDatesChange, onCheckoutCleared, checkIn: externalCI, checkOut: externalCO, disabledDates }: DateSelectionBarProps) {
    const [ci, setCi] = useState(externalCI || '');
    const [co, setCo] = useState(externalCO || '');
    const [rangeWarning, setRangeWarning] = useState('');

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

    /** Check if any stay night (checkIn → checkOut-1) falls on a booked date */
    const hasBookedDateInRange = (checkIn: string, checkOut: string): boolean => {
        if (!disabledDates || disabledDates.size === 0) return false;
        const ciDate = new Date(checkIn + 'T12:00:00');
        const coDate = new Date(checkOut + 'T12:00:00');
        // Iterate over stay nights: checkIn, checkIn+1, ..., checkOut-1
        for (let d = new Date(ciDate); d < coDate; d.setDate(d.getDate() + 1)) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (disabledDates.has(ds)) return true;
        }
        return false;
    };

    const handleCheckIn = (val: string) => {
        setCi(val);
        setCo('');
        setRangeWarning('');
        if (val) localStorage.setItem('galaxia_search_checkin', val);
        else localStorage.removeItem('galaxia_search_checkin');
        localStorage.removeItem('galaxia_search_checkout');
        onCheckoutCleared?.();
    };

    const handleCheckOut = (val: string) => {
        setRangeWarning('');
        // Validate: no booked dates between check-in and check-out
        if (ci && val && hasBookedDateInRange(ci, val)) {
            setCo('');
            localStorage.removeItem('galaxia_search_checkout');
            setRangeWarning('Some dates in this range are already booked. Please choose different dates.');
            onCheckoutCleared?.();
            return;
        }
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
                        disabledDates={disabledDates}
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
                        disabledDates={disabledDates}
                        isCheckoutPicker
                    />
                </div>
            </div>
            {rangeWarning && (
                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    <p className="text-xs font-inter text-red-700">{rangeWarning}</p>
                </div>
            )}
        </div>
    );
}
