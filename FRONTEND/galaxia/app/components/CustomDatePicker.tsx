"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export default function CustomDatePicker({ date, onDateChange }: { date: Date, onDateChange: (d: Date) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const [viewDate, setViewDate] = useState(new Date(date));
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setViewDate(new Date(date));
    }, [date]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const getDaysArray = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay(); // 0(Sun) to 6(Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(new Date(year, month, d));
        }
        while (days.length % 7 !== 0) {
            days.push(null);
        }
        return days;
    }, [viewDate]);

    const handleSelect = (d: Date) => {
        onDateChange(d);
        setIsOpen(false);
    };

    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    const isSelected = (d: Date) => {
        return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    };

    const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
        <div className="relative group" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-white shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                title="Select a specific date to jump to"
            >
                <CalendarIcon size={16} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="tabular-nums">
                    {date.getDate().toString().padStart(2, '0')}-{
                        (date.getMonth() + 1).toString().padStart(2, '0')
                    }-{date.getFullYear()}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-[100] w-[280px] animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={18} /></button>
                        <h3 className="text-sm font-bold text-slate-800">
                            {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
                        </h3>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronRight size={18} /></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {daysOfWeek.map(day => (
                            <div key={day} className="text-center text-[11px] font-bold text-slate-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {getDaysArray.map((d, i) => {
                            if (!d) return <div key={i} className="h-8" />;
                            const h = isSelected(d);
                            const t = isToday(d);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(d)}
                                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors mx-auto
                                        ${h ? 'bg-indigo-600 text-white shadow-md' :
                                            t ? 'bg-indigo-50 text-indigo-700 font-bold' :
                                                'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
                                    `}
                                >
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
                        <button
                            onClick={() => {
                                onDateChange(new Date());
                                setIsOpen(false);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
