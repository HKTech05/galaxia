"use client";

import { useState, useRef, useEffect, useMemo } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface GoldDatePickerProps {
    value: string; // YYYY-MM-DD or ''
    onChange: (val: string) => void;
    min?: string;  // YYYY-MM-DD
    label?: string;
    placeholder?: string;
}

const toLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseDate = (s: string) => (s ? new Date(s + "T12:00:00") : null);

const formatDisplay = (s: string) => {
    if (!s) return "";
    const d = parseDate(s);
    if (!d) return "";
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

export default function GoldDatePicker({ value, onChange, min, label, placeholder }: GoldDatePickerProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = parseDate(value);
    const minDate = parseDate(min || toLocalDate(new Date()));

    const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : new Date().getMonth());
    const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : new Date().getFullYear());

    // Sync view to selected value
    useEffect(() => {
        if (selected) {
            setViewMonth(selected.getMonth());
            setViewYear(selected.getFullYear());
        }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const days = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const arr: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(d);
        return arr;
    }, [viewMonth, viewYear]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const isDisabled = (day: number) => {
        if (!minDate) return false;
        const d = new Date(viewYear, viewMonth, day);
        d.setHours(0, 0, 0, 0);
        const m = new Date(minDate);
        m.setHours(0, 0, 0, 0);
        return d < m;
    };

    const isToday = (day: number) => {
        const t = new Date();
        return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
    };

    const isSelected = (day: number) => {
        if (!selected) return false;
        return day === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();
    };

    const handleSelect = (day: number) => {
        if (isDisabled(day)) return;
        const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        onChange(ds);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setOpen(false);
    };

    const handleToday = () => {
        const t = new Date();
        const ds = toLocalDate(t);
        if (minDate && t < minDate) return;
        onChange(ds);
        setViewMonth(t.getMonth());
        setViewYear(t.getFullYear());
        setOpen(false);
    };

    // Can go back?
    const canGoPrev = (() => {
        if (!minDate) return true;
        const prevLast = new Date(viewYear, viewMonth, 0);
        return prevLast >= minDate;
    })();

    return (
        <div className="relative" ref={ref}>
            {/* Trigger input */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-antique-gold/25 rounded-lg bg-white hover:border-antique-gold/40 focus:outline-none focus:ring-2 focus:ring-antique-gold/15 focus:border-antique-gold transition-all text-left"
            >
                <svg className="w-4 h-4 text-antique-gold/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`flex-1 text-sm font-inter ${value ? "text-text-primary font-medium" : "text-text-muted"}`}>
                    {value ? formatDisplay(value) : (placeholder || "Select date")}
                </span>
                <svg className={`w-3.5 h-3.5 text-antique-gold/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown calendar */}
            {open && (
                <div className="absolute z-50 mt-1.5 left-0 right-0 min-w-[280px] bg-white border border-antique-gold/20 rounded-xl shadow-xl shadow-black/10 overflow-hidden animate-fade-in-up" style={{ animationDuration: "0.15s" }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-[#fdfbf7] to-[#faf6ee] border-b border-antique-gold/10">
                        <button
                            type="button"
                            onClick={prevMonth}
                            disabled={!canGoPrev}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-antique-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-sm font-inter font-semibold text-text-primary">
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-antique-gold/10 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Day names */}
                    <div className="grid grid-cols-7 px-2 pt-2">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-[10px] font-inter font-bold text-text-muted uppercase py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 px-2 pb-2 gap-0.5">
                        {days.map((day, i) => {
                            if (day === null) return <div key={`e-${i}`} />;
                            const disabled = isDisabled(day);
                            const sel = isSelected(day);
                            const today = isToday(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelect(day)}
                                    disabled={disabled}
                                    className={`
                                        w-full aspect-square flex items-center justify-center rounded-lg text-xs font-inter font-medium transition-all
                                        ${disabled ? "text-text-muted/40 cursor-not-allowed" : "hover:bg-antique-gold/10 cursor-pointer"}
                                        ${sel ? "bg-gradient-to-br from-antique-gold to-dark-gold text-white shadow-sm" : ""}
                                        ${today && !sel ? "ring-1 ring-antique-gold/40 text-antique-gold font-bold" : ""}
                                        ${!sel && !disabled && !today ? "text-text-primary" : ""}
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-antique-gold/10 bg-[#fdfbf7]">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-xs font-inter font-medium text-text-muted hover:text-antique-gold transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleToday}
                            className="text-xs font-inter font-semibold text-antique-gold hover:text-dark-gold transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
