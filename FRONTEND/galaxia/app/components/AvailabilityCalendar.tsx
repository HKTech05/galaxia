"use client";

import { useState, useMemo, useEffect } from "react";

interface CalendarProps {
    propertyId?: number | null;
    propertySlug?: string;
    subPropertyId?: number | null;
    weekdayPrice?: string;
    weekendPrice?: string;
    saturdayPrice?: string;
    primeDatePrice?: string;
    dateOverrides?: Record<string, number>;
    onDatesChange?: (checkIn: Date | null, checkOut: Date | null, nightlyRate: number, nights: number) => void;
    compact?: boolean;
    initialCheckIn?: Date | null;
    initialCheckOut?: Date | null;
    isDisabled?: boolean;
    totalUnits?: number;
    hidePrice?: boolean; // Hide prices (for multi-villa bookings with different prices)
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatPrice = (price: string | number | undefined) => {
    if (!price) return "N/A";
    const num = typeof price === "string" ? parseInt(price.replace(/[^0-9]/g, '')) : price;
    return `₹${num.toLocaleString('en-IN')}`;
};

// Format date as YYYY-MM-DD using local time (avoids UTC timezone shift)
const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getDayPrice = (date: Date, weekdayPrice: string, weekendPrice: string, saturdayPrice?: string, primeDatePrice?: string, bookedDates?: Set<string>, dateOverrides?: Record<string, number>) => {
    const dateStr = toLocalDateStr(date);
    if (bookedDates?.has(dateStr)) {
        return { price: "Booked", numPrice: 0, type: "booked" as const };
    }

    // Check for date-specific override
    if (dateOverrides && dateOverrides[dateStr]) {
        const overridePrice = dateOverrides[dateStr];
        return { price: formatPrice(overridePrice), numPrice: overridePrice, type: "prime" as "weekday" | "weekend" | "prime" | "booked" };
    }

    const day = date.getDay();
    // Saturday = 6, Fri = 5 / Sun = 0
    const isSaturday = day === 6;
    const isWeekend = day === 0 || day === 5;
    const priceStr = isSaturday ? (saturdayPrice || weekendPrice) : isWeekend ? weekendPrice : weekdayPrice;
    const numPrice = parseInt(priceStr.replace(/[^0-9]/g, ''));

    return {
        price: formatPrice(priceStr),
        numPrice: numPrice,
        type: ((isSaturday || isWeekend) ? "weekend" : "weekday") as "weekday" | "weekend" | "prime" | "booked"
    };
};

const getMaintenancePrice = (date: Date) => {
    return { price: "Maintenance", numPrice: 0, type: "booked" as const };
};

export default function AvailabilityCalendar({ propertyId: propId, propertySlug, subPropertyId, weekdayPrice = "0", weekendPrice = "0", saturdayPrice, primeDatePrice, dateOverrides, onDatesChange, compact = false, initialCheckIn, initialCheckOut, isDisabled, totalUnits, hidePrice }: CalendarProps) {
    // Resolve slug to numeric ID if propertySlug is provided
    const [resolvedId, setResolvedId] = useState<number | null>(null);
    useEffect(() => {
        if (propId) { setResolvedId(propId); return; }
        if (!propertySlug) return;
        (async () => {
            try {
                const baseUrl = typeof window !== "undefined" ? "/api" : "http://localhost:4000/api";
                const res = await fetch(`${baseUrl}/properties`);
                if (res.ok) {
                    const props = await res.json();
                    const found = props.find((p: any) => p.slug === propertySlug);
                    if (found) setResolvedId(found.id);
                }
            } catch {}
        })();
    }, [propId, propertySlug]);
    const propertyId = resolvedId;
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(initialCheckIn ? initialCheckIn.getMonth() : today.getMonth());
    const [currentYear, setCurrentYear] = useState(initialCheckIn ? initialCheckIn.getFullYear() : today.getFullYear());
    const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn || null);
    const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut || null);
    const [selectingCheckOut, setSelectingCheckOut] = useState(false);
    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

    // Sync when parent updates initial dates (e.g. from localStorage load)
    useEffect(() => {
        if (initialCheckIn) {
            setCheckIn(initialCheckIn);
            setCurrentMonth(initialCheckIn.getMonth());
            setCurrentYear(initialCheckIn.getFullYear());
        }
        if (initialCheckOut) setCheckOut(initialCheckOut);
    }, [initialCheckIn?.getTime(), initialCheckOut?.getTime()]);

    // Fetch booked dates from API (only when we have a valid numeric property ID)
    // Also stores booking counts per date when totalUnits is provided
    const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
    useEffect(() => {
        if (!propertyId || propertyId <= 0) return;
        const fetchData = async () => {
            try {
                const startDate = toLocalDateStr(new Date(currentYear, currentMonth, 1));
                const endDate = toLocalDateStr(new Date(currentYear, currentMonth + 1, 0));
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                
                let url = `${baseUrl}/bookings/staycation/booked-dates?propertyId=${propertyId}&startDate=${startDate}&endDate=${endDate}`;
                if (subPropertyId) url += `&subPropertyId=${subPropertyId}`;
                
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setBookedDates(new Set(data.dates || []));
                    // If we have totalUnits, also get booking counts per date
                    if (totalUnits && data.dateCounts) {
                        setBookingCounts(data.dateCounts);
                    }
                }
            } catch {
                // Silently fail — calendar will show all dates as available
            }
        };
        fetchData();
        // Auto-refresh every 30s for multi-unit properties to keep counts current
        const interval = totalUnits && totalUnits > 1 ? setInterval(fetchData, 30000) : null;
        return () => { if (interval) clearInterval(interval); };
    }, [propertyId, subPropertyId, currentMonth, currentYear, totalUnits]);

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else setCurrentMonth(currentMonth - 1);
    };

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else setCurrentMonth(currentMonth + 1);
    };

    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const days: ({ date: Date; price: string; numPrice: number; type: "weekday" | "weekend" | "prime" | "booked" } | null)[] = [];

        for (let i = 0; i < firstDay; i++) days.push(null);

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const info = isDisabled ? getMaintenancePrice(date) : getDayPrice(date, weekdayPrice, weekendPrice, saturdayPrice, primeDatePrice, bookedDates, dateOverrides);
            days.push({ date, ...info });
        }

        return days;
    }, [currentMonth, currentYear, weekdayPrice, weekendPrice, saturdayPrice, primeDatePrice, bookedDates, dateOverrides]);

    const isPast = (date: Date) => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return date < t;
    };

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const isInRange = (date: Date) => {
        if (!checkIn || !checkOut) return false;
        return date > checkIn && date < checkOut;
    };

    const isSelected = (date: Date) => {
        if (checkIn && isSameDay(date, checkIn)) return true;
        if (checkOut && isSameDay(date, checkOut)) return true;
        return false;
    };

    const handleDayClick = (day: { date: Date; type: string; numPrice: number } | null) => {
        if (!day || isPast(day.date) || day.type === "booked") return;

        if (!selectingCheckOut || !checkIn) {
            // Selecting check-in
            setCheckIn(day.date);
            setCheckOut(null);
            setSelectingCheckOut(true);
        } else {
            // Selecting check-out
            if (day.date <= checkIn) {
                // If selected date is before check-in, reset
                setCheckIn(day.date);
                setCheckOut(null);
                setSelectingCheckOut(true);
            } else {
                // Check if any dates in the range (check-in to check-out) are booked
                const hasBookedInRange = (() => {
                    const d = new Date(checkIn);
                    d.setDate(d.getDate() + 1);
                    while (d < day.date) {
                        if (bookedDates.has(toLocalDateStr(d))) return true;
                        d.setDate(d.getDate() + 1);
                    }
                    return false;
                })();

                if (hasBookedInRange) {
                    // Can't select range over booked dates — reset to new check-in
                    setCheckIn(day.date);
                    setCheckOut(null);
                    setSelectingCheckOut(true);
                    return;
                }

                setCheckOut(day.date);
                setSelectingCheckOut(false);

                // Calculate total
                if (onDatesChange) {
                    const nights = Math.ceil((day.date.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                    // Average nightly rate based on first night
                    const firstNightInfo = getDayPrice(checkIn, weekdayPrice, weekendPrice, saturdayPrice, primeDatePrice, bookedDates);
                    onDatesChange(checkIn, day.date, firstNightInfo.numPrice, nights);
                }
            }
        }
    };

    const formatDateShort = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;

    return (
        <div className={`rounded-xl border border-border-light bg-white shadow-sm ${compact ? "p-3 sm:p-4" : "p-5 sm:p-6"}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-7 h-7 rounded-full border border-border-light flex items-center justify-center hover:border-antique-gold hover:text-antique-gold text-text-muted transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className={`font-cinzel font-semibold text-text-primary ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
                    {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <button onClick={nextMonth} className="w-7 h-7 rounded-full border border-border-light flex items-center justify-center hover:border-antique-gold hover:text-antique-gold text-text-muted transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            {/* Selected dates display */}
            {(checkIn || selectingCheckOut) && (
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-light">
                    <div className="flex-1 text-center">
                        <p className="text-[9px] font-inter text-text-muted uppercase tracking-wider">Check-in</p>
                        <p className={`font-inter text-xs font-medium ${checkIn ? "text-text-primary" : "text-text-muted"}`}>
                            {checkIn ? formatDateShort(checkIn) : "Select"}
                        </p>
                    </div>
                    <svg className="w-4 h-4 text-antique-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    <div className="flex-1 text-center">
                        <p className="text-[9px] font-inter text-text-muted uppercase tracking-wider">Check-out</p>
                        <p className={`font-inter text-xs font-medium ${checkOut ? "text-text-primary" : "text-text-muted"}`}>
                            {checkOut ? formatDateShort(checkOut) : (selectingCheckOut ? "Select" : "—")}
                        </p>
                    </div>
                </div>
            )}

            {/* Day names */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((d) => (
                    <div key={d} className={`text-center font-inter font-medium text-text-muted uppercase tracking-wider py-1 ${compact ? "text-[8px]" : "text-[10px] sm:text-xs"}`}>{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                    const selected = day && isSelected(day.date);
                    const inRange = day && isInRange(day.date);
                    const past = day && isPast(day.date);
                    const booked = day?.type === "booked";

                    return (
                        <div
                            key={i}
                            onClick={() => handleDayClick(day)}
                            className={`relative border-t border-border-light/50 ${compact ? "py-1 min-h-[40px]" : "py-1.5 sm:py-2 min-h-[52px] sm:min-h-[60px]"} ${day && !past && !booked ? "cursor-pointer hover:bg-antique-gold/5 transition-colors" : ""
                                } ${selected ? "!bg-antique-gold/15" : ""} ${inRange ? "bg-antique-gold/5" : ""}`}
                        >
                            {day && (
                                <div className={`text-center ${past ? "opacity-40" : ""}`}>
                                    <p className={`font-inter font-medium mb-0.5 ${compact ? "text-[10px]" : "text-xs sm:text-sm"} ${selected ? "text-antique-gold font-bold" :
                                        booked && !past ? "text-text-muted line-through" :
                                            day.type === "prime" ? "text-warning font-semibold" :
                                                "text-text-primary"
                                        }`}>
                                        {day.date.getDate()}
                                    </p>
                                    {/* Hide booked/count/price info for past dates */}
                                    {!past && (
                                        <>
                                    {booked ? (
                                        <span className={`font-inter ${day.price === 'Maintenance' ? 'text-amber-500' : 'text-red-400'} ${compact ? "text-[7px]" : "text-[8px] sm:text-[9px]"}`}>
                                            {day.price}
                                        </span>
                                    ) : (
                                        <>
                                            {totalUnits ? (() => {
                                                const dateStr = toLocalDateStr(day.date);
                                                const count = bookingCounts[dateStr] || 0;
                                                const avail = totalUnits - count;
                                                if (avail <= 0) return <span className="font-inter text-[7px] sm:text-[8px] text-red-500 font-bold block">Booked</span>;
                                                return (
                                                    <>
                                                        <span className={`font-inter text-[7px] sm:text-[8px] ${count >= 10 ? 'text-red-600' : count >= 5 ? 'text-amber-600' : 'text-emerald-600'} font-medium block`}>
                                                            {count > 0 ? `${count} booked` : '0'} / {totalUnits}
                                                        </span>
                                                        {!hidePrice && (
                                                            <span className={`font-inter ${compact ? "text-[7px]" : "text-[7px] sm:text-[8px]"} ${day.type === "prime" ? "text-warning" : day.type === "weekend" ? "text-antique-gold" : "text-text-muted"}`}>
                                                                {formatPrice(day.price)}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })() : (
                                                !hidePrice && (
                                                    <span className={`font-inter ${compact ? "text-[7px]" : "text-[8px] sm:text-[9px]"} ${day.type === "prime" ? "text-warning" :
                                                        day.type === "weekend" ? "text-antique-gold" :
                                                            "text-text-muted"
                                                        }`}>
                                                        {formatPrice(day.price)}
                                                    </span>
                                                )
                                            )}
                                        </>
                                    )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            {!compact && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 pt-4 border-t border-border-light">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                        <span className="text-[10px] font-inter text-text-muted">Weekday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-antique-gold" />
                        <span className="text-[10px] font-inter text-text-muted">Weekend</span>
                    </div>
                    {primeDatePrice && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                            <span className="text-[10px] font-inter text-text-muted">Prime</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                        <span className="text-[10px] font-inter text-text-muted">Booked</span>
                    </div>
                </div>
            )}
        </div>
    );
}
