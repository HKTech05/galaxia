"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, CalendarDays, IndianRupee, CheckCircle, AlertTriangle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

interface SubProperty {
    id: number;
    name: string;
    slug: string;
}

export default function BulkBookingsTab() {
    const [bulkForm, setBulkForm] = useState({
        customerName: "",
        phone: "",
        email: "",
        checkIn: "",
        checkOut: "",
        numCottages: "" as any,
        cottageType: "standard" as "standard" | "family" | "mix",
        totalAdults: "" as any,
        numKids: "" as any,
        numRegularVeg: "" as any,
        numJainVeg: "" as any,
        paymentMethod: "UPI" as "Cash" | "UPI" | "Online",
    });
    const [bulkHistory, setBulkHistory] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState("");
    const [bulkError, setBulkError] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);

    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    // Custom split state
    const [customSplitMode, setCustomSplitMode] = useState(false);
    const [customPrepaid, setCustomPrepaid] = useState("");
    const [customBalance, setCustomBalance] = useState("");

    // Sub-property data for cottage type filtering
    const [subProperties, setSubProperties] = useState<SubProperty[]>([]);
    const [amstelPropertyId, setAmstelPropertyId] = useState<number | null>(null);
    const [allBookings, setAllBookings] = useState<any[]>([]);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Fetch sub-properties and bookings
    useEffect(() => {
        (async () => {
            try {
                const props = await api.get("/properties");
                const amstel = props.find((p: any) => p.slug === "amstel-nest" || p.name?.includes("Amstel"));
                if (amstel) {
                    setAmstelPropertyId(amstel.id);
                    setSubProperties(amstel.subProperties || []);
                }
            } catch {}
        })();
    }, []);

    // Fetch bookings data
    useEffect(() => {
        (async () => {
            try {
                const data = await api.get("/bookings/staycation");
                if (Array.isArray(data)) {
                    setAllBookings(data);
                    // Build history
                    const groups: Record<string, any[]> = {};
                    for (const b of data) {
                        if (b.property?.name?.includes("Amstel") && (b.source === "bulk" || b.source === "admin-bulk")) {
                            const key = `${b.customerName}-${b.checkInDate}`;
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(b);
                        }
                    }
                    setBulkHistory(
                        Object.entries(groups).map(([key, bookings]) => ({
                            key,
                            customerName: bookings[0].customerName,
                            phone: bookings[0].customerPhone,
                            checkIn: bookings[0].checkInDate,
                            checkOut: bookings[0].checkOutDate,
                            cottages: bookings.length,
                            totalGuests: bookings.reduce((s: number, b: any) => s + (b.numGuests || 0), 0),
                            totalAmount: bookings.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
                            status: bookings[0].status,
                            createdAt: bookings[0].createdAt,
                        })).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    );
                }
            } catch {}
        })();
    }, [bulkSuccess]);

    // Filter sub-properties by cottage type
    const getSubPropertyIds = (type: string): number[] => {
        if (type === "standard") {
            return subProperties.filter(sp => sp.name.toLowerCase().includes("standard")).map(sp => sp.id);
        }
        if (type === "family") {
            return subProperties.filter(sp => sp.name.toLowerCase().includes("family")).map(sp => sp.id);
        }
        // mix: return all
        return subProperties.map(sp => sp.id);
    };

    // Calendar occupancy data
    const calendarData = useMemo(() => {
        if (!amstelPropertyId) return {};
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const occupancy: Record<string, number> = {};

        // Filter Amstel Nest bookings that are active
        const amstelBookings = allBookings.filter(b =>
            b.propertyId === amstelPropertyId &&
            b.status !== "cancelled" && b.status !== "no_show"
        );

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let count = 0;
            for (const b of amstelBookings) {
                const checkIn = new Date(b.checkInDate);
                const checkOut = new Date(b.checkOutDate);
                // Booking covers this day if checkIn <= date < checkOut
                if (checkIn <= date && date < checkOut) {
                    count++;
                }
            }
            occupancy[dateStr] = count;
        }
        return occupancy;
    }, [allBookings, calendarMonth, amstelPropertyId]);

    const calculateBulkPrice = () => {
        if (!bulkForm.checkIn || !bulkForm.checkOut) return { perNight: 0, nights: 0, subtotal: 0, gst: 0, total: 0 };
        const start = new Date(bulkForm.checkIn);
        const end = new Date(bulkForm.checkOut);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
        const adults = parseInt(bulkForm.totalAdults) || 0;
        const kids = parseInt(bulkForm.numKids) || 0;
        let total = 0;
        for (let i = 0; i < nights; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const basePrice = isWeekend ? 6950 : 4950;
            const extraAdults = Math.max(0, adults - 2 * (bulkForm.numCottages || 1));
            total += basePrice * (bulkForm.numCottages || 1) + extraAdults * 2000 + kids * 1000;
        }
        const gst = Math.round(total * 0.05);
        return { perNight: Math.round(total / nights), nights, subtotal: total, gst, total: total + gst };
    };

    const pricing = calculateBulkPrice();

    // Coupon discount calculation
    let couponDiscount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === "percentage") {
            couponDiscount = Math.round(pricing.subtotal * appliedCoupon.discountValue / 100);
        } else {
            couponDiscount = Number(appliedCoupon.discountValue);
        }
    }

    const handleBulkSubmit = async () => {
        if (!bulkForm.customerName || !bulkForm.phone || !bulkForm.checkIn || !bulkForm.checkOut) {
            setBulkError("Please fill all required fields.");
            return;
        }
        setIsSubmitting(true);
        setBulkError("");
        setBulkSuccess("");
        try {
            const props = await api.get("/properties");
            const amstelProp = props.find((p: any) => p.slug === "amstel-nest" || p.name?.includes("Amstel"));
            if (!amstelProp) throw new Error("Amstel Nest property not found");

            // Get eligible sub-property IDs based on cottage type
            const eligibleIds = getSubPropertyIds(bulkForm.cottageType);
            if (eligibleIds.length === 0) throw new Error("No cottages available for selected type");
            // For standard cottages: unitCount=14 but eligibleIds has only 1 record.
            // The backend handles capacity checks, so we just need to pass the correct sub-property ID.
            const targetSubPropertyId = eligibleIds[0]; // Use the first matching sub-property record

            const totalDiscount = discountAmount + couponDiscount;
            const discountedTotal = pricing.total - totalDiscount;
            const finalTotal = Math.max(0, discountedTotal);
            const perCottageTotal = Math.round(finalTotal / bulkForm.numCottages);
            const perCottageGst = Math.round(pricing.gst / bulkForm.numCottages);
            const perCottageBase = perCottageTotal - perCottageGst;

            for (let i = 0; i < bulkForm.numCottages; i++) {
                await api.post("/bookings/staycation", {
                    customerName: bulkForm.customerName,
                    customerPhone: bulkForm.phone,
                    customerEmail: bulkForm.email || undefined,
                    propertyId: amstelProp.id,
                    subPropertyId: bulkForm.cottageType === "mix" ? eligibleIds[Math.min(i, eligibleIds.length - 1)] : targetSubPropertyId,
                    numGuests: parseInt(bulkForm.totalAdults) || 2,
                    numKids: parseInt(bulkForm.numKids) || 0,
                    checkInDate: bulkForm.checkIn,
                    checkOutDate: bulkForm.checkOut,
                    totalAmount: perCottageTotal,
                    advanceAmount: customSplitMode ? parseInt(customPrepaid || '0') : perCottageTotal,
                    balanceAmount: customSplitMode ? Math.round(parseInt(customBalance || '0') / bulkForm.numCottages) : 0,
                    securityDeposit: 3000,
                    basePrice: perCottageBase,
                    gstAmount: perCottageGst,
                    advancePaid: true,
                    advanceMethod: bulkForm.paymentMethod,
                    source: "admin-bulk",
                    couponCode: appliedCoupon?.code || null,
                    notes: `Admin Bulk ${i + 1}/${bulkForm.numCottages}. ${bulkForm.cottageType}.`.trim(),
                    addons: [
                        ...(parseInt(bulkForm.numRegularVeg) > 0 ? [{ name: 'Food Preference', foodType: 'Regular', count: parseInt(bulkForm.numRegularVeg) }] : []),
                        ...(parseInt(bulkForm.numJainVeg) > 0 ? [{ name: 'Food Preference', foodType: 'Jain', count: parseInt(bulkForm.numJainVeg) }] : []),
                    ].length > 0 ? [
                        ...(parseInt(bulkForm.numRegularVeg) > 0 ? [{ name: 'Food Preference', foodType: 'Regular', count: parseInt(bulkForm.numRegularVeg) }] : []),
                        ...(parseInt(bulkForm.numJainVeg) > 0 ? [{ name: 'Food Preference', foodType: 'Jain', count: parseInt(bulkForm.numJainVeg) }] : []),
                    ] : null,
                });
            }
            const totalDiscApplied = discountAmount + couponDiscount;
            setBulkSuccess(`Created ${bulkForm.numCottages} ${bulkForm.cottageType} cottage booking(s) for ${bulkForm.customerName}! ${totalDiscApplied > 0 ? `(₹${totalDiscApplied.toLocaleString('en-IN')} discount applied)` : ""}`);
            setBulkForm({ customerName: "", phone: "", email: "", checkIn: "", checkOut: "", numCottages: "" as any, cottageType: "standard", totalAdults: "" as any, numKids: "" as any, numRegularVeg: "" as any, numJainVeg: "" as any, paymentMethod: "UPI" });
            setDiscountAmount(0);
            setCouponCode("");
            setAppliedCoupon(null);
            setCouponError("");
            setCustomSplitMode(false);
            setCustomPrepaid("");
            setCustomBalance("");
        } catch (err: any) {
            setBulkError(err?.message || "Failed to create bulk booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calendar rendering
    const renderCalendar = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalCapacity = 15;

        const weeks: (number | null)[][] = [];
        let week: (number | null)[] = new Array(firstDayOfWeek).fill(null);

        for (let day = 1; day <= daysInMonth; day++) {
            week.push(day);
            if (week.length === 7) {
                weeks.push(week);
                week = [];
            }
        }
        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            weeks.push(week);
        }

        return (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                    <button
                        onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
                    </h3>
                    <button
                        onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="p-1.5">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1">
                            {week.map((day, di) => {
                                if (!day) return <div key={di} className="aspect-square" />;
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const booked = calendarData[dateStr] || 0;
                                const vacant = totalCapacity - booked;
                                const isToday = new Date(year, month, day).getTime() === today.getTime();
                                const isPast = new Date(year, month, day) < today;

                                // Color coding
                                let bgColor = "bg-emerald-50 border-emerald-100"; // all vacant
                                let textColor = "text-emerald-700";
                                let badgeColor = "text-emerald-600";
                                if (booked > 0 && booked < totalCapacity) {
                                    if (booked >= 10) {
                                        bgColor = "bg-amber-50 border-amber-100";
                                        textColor = "text-amber-800";
                                        badgeColor = "text-amber-600";
                                    } else {
                                        bgColor = "bg-sky-50 border-sky-100";
                                        textColor = "text-sky-800";
                                        badgeColor = "text-sky-600";
                                    }
                                }
                                if (booked >= totalCapacity) {
                                    bgColor = "bg-red-50 border-red-100";
                                    textColor = "text-red-700";
                                    badgeColor = "text-red-500";
                                }
                                if (isPast) {
                                    bgColor = "bg-slate-50 border-slate-100";
                                    textColor = "text-slate-400";
                                    badgeColor = "text-slate-400";
                                }

                                return (
                                    <div
                                        key={di}
                                        className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all ${bgColor} ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                                    >
                                        <span className={`text-xs font-bold ${textColor}`}>{day}</span>
                                        {!isPast && (
                                            <span className={`text-[9px] font-bold ${badgeColor} leading-none`}>
                                                {booked}/{totalCapacity}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> All Vacant</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sky-100 border border-sky-200" /> Partially</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Mostly Full</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Full</div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Amstel Nest — Bulk Bookings</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Create multiple cottage bookings for groups, corporates, and events.</p>
            </div>

            {bulkSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-800">{bulkSuccess}</p>
                    <button onClick={() => setBulkSuccess("")} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={16} /></button>
                </div>
            )}
            {bulkError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle size={18} className="text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-800">{bulkError}</p>
                    <button onClick={() => setBulkError("")} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
                </div>
            )}

            {/* Occupancy Calendar */}
            {renderCalendar()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-indigo-600" /> Guest Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Customer Name *</label>
                                <input type="text" value={bulkForm.customerName} onChange={e => setBulkForm({ ...bulkForm, customerName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone *</label>
                                <input type="text" inputMode="tel" value={bulkForm.phone} onChange={e => setBulkForm({ ...bulkForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="9876543210" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                                <input type="email" value={bulkForm.email} onChange={e => setBulkForm({ ...bulkForm, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="guest@email.com" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><CalendarDays size={16} className="text-indigo-600" /> Stay Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Check-in Date *</label>
                                <input type="date" value={bulkForm.checkIn} onChange={e => setBulkForm({ ...bulkForm, checkIn: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Check-out Date *</label>
                                <input type="date" value={bulkForm.checkOut} onChange={e => setBulkForm({ ...bulkForm, checkOut: e.target.value })} min={bulkForm.checkIn} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Number of Cottages</label>
                                <input type="text" inputMode="numeric" value={bulkForm.numCottages} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setBulkForm({ ...bulkForm, numCottages: val === '' ? '' as any : parseInt(val) });
                                }} placeholder="e.g. 3" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cottage Type</label>
                                <select value={bulkForm.cottageType} onChange={e => {
                                    const type = e.target.value as any;
                                    const maxCottages = type === "family" ? 1 : type === "standard" ? 14 : 15;
                                    setBulkForm({ ...bulkForm, cottageType: type, numCottages: Math.min(bulkForm.numCottages, maxCottages) });
                                }} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                    <option value="standard">Standard Cottage (14 units)</option>
                                    <option value="family">Family Cottage (1 unit)</option>
                                    <option value="mix">Mix (Standard + Family)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Total No. of Adults</label>
                                <input type="text" inputMode="numeric" value={bulkForm.totalAdults} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setBulkForm({ ...bulkForm, totalAdults: val });
                                }} placeholder="e.g. 4" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">No. of Kids</label>
                                <input type="text" inputMode="numeric" value={bulkForm.numKids} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setBulkForm({ ...bulkForm, numKids: val });
                                }} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">No. of Regular (Veg)</label>
                                <input type="text" inputMode="numeric" value={bulkForm.numRegularVeg} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setBulkForm({ ...bulkForm, numRegularVeg: val });
                                }} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">No. of Jain (Veg)</label>
                                <input type="text" inputMode="numeric" value={bulkForm.numJainVeg} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setBulkForm({ ...bulkForm, numJainVeg: val });
                                }} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Method</label>
                                <select value={bulkForm.paymentMethod} onChange={e => setBulkForm({ ...bulkForm, paymentMethod: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Online">Online Transfer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Price Calculator */}
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-6">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-5"><IndianRupee size={16} className="text-emerald-600" /> Price Calculator</h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cottages</p><p className="text-2xl font-black text-slate-800">{bulkForm.numCottages}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Guests</p><p className="text-2xl font-black text-slate-800">{(parseInt(bulkForm.totalAdults) || 0) + (parseInt(bulkForm.numKids) || 0)}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nights</p><p className="text-2xl font-black text-slate-800">{pricing.nights || "-"}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Per Night</p><p className="text-lg font-black text-slate-800">{pricing.perNight > 0 ? `₹${pricing.perNight.toLocaleString("en-IN")}` : "-"}</p></div>
                            </div>
                        </div>
                        {pricing.subtotal > 0 && (
                            <div className="space-y-2.5 text-sm font-medium">
                                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-800">₹{pricing.subtotal.toLocaleString("en-IN")}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">GST (5%)</span><span className="text-slate-800">₹{pricing.gst.toLocaleString("en-IN")}</span></div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black"><span className="text-slate-800">Grand Total</span><span className="text-emerald-600">₹{pricing.total.toLocaleString("en-IN")}</span></div>

                                {/* Coupon Code */}
                                <div className="border border-dashed border-emerald-200 rounded-xl p-3 bg-emerald-50/50 mt-3">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 block">🎟 Coupon Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                            placeholder="Enter code"
                                            disabled={!!appliedCoupon}
                                            className="flex-1 pl-3 pr-2 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white disabled:opacity-50"
                                        />
                                        {appliedCoupon ? (
                                            <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); setCouponError(""); }} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">Remove</button>
                                        ) : (
                                            <button
                                                disabled={couponLoading || !couponCode.trim()}
                                                onClick={async () => {
                                                    if (!couponCode.trim()) return;
                                                    setCouponLoading(true);
                                                    setCouponError("");
                                                    try {
                                                        const result = await api.post("/coupons/validate", { code: couponCode });
                                                        if (result && result.valid) {
                                                            setAppliedCoupon({ code: result.code, discountType: result.discountType, discountValue: Number(result.discountValue) });
                                                        } else {
                                                            setCouponError("Invalid or expired coupon");
                                                        }
                                                    } catch (err: any) {
                                                        setCouponError(err?.message || "Invalid coupon");
                                                    } finally { setCouponLoading(false); }
                                                }}
                                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                            >{couponLoading ? "..." : "Apply"}</button>
                                        )}
                                    </div>
                                    {couponError && <p className="text-[10px] text-red-500 font-medium mt-1">{couponError}</p>}
                                    {appliedCoupon && (
                                        <p className="text-[10px] text-emerald-700 font-bold mt-1">✅ "{appliedCoupon.code}" — {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`} (−₹{couponDiscount.toLocaleString('en-IN')})</p>
                                    )}
                                </div>

                                {/* Discount Option */}
                                <div className="border border-dashed border-purple-200 rounded-xl p-3 bg-purple-50/50 mt-3">
                                    <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 block">Admin Discount (₹)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={discountAmount || ""}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                                    setDiscountAmount(Math.min(val, pricing.total));
                                                }}
                                                placeholder="0"
                                                className="w-full pl-8 pr-3 py-2 border border-purple-200 rounded-lg text-sm font-bold text-purple-800 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white"
                                            />
                                        </div>
                                        {discountAmount > 0 && (
                                            <button onClick={() => setDiscountAmount(0)} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Discounted Total */}
                                {(discountAmount > 0 || couponDiscount > 0) && (
                                    <div className="flex justify-between text-base font-black pt-1">
                                        <span className="text-purple-700">After Discount</span>
                                        <span className="text-purple-600">₹{Math.max(0, pricing.total - discountAmount - couponDiscount).toLocaleString("en-IN")}</span>
                                    </div>
                                )}

                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-2">
                                    <p className="text-xs text-amber-700 font-bold">Per Cottage: ₹{Math.round(Math.max(0, pricing.total - discountAmount - couponDiscount) / bulkForm.numCottages).toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-amber-600 mt-0.5">Security deposit: ₹3,000 per cottage (separate)</p>
                                </div>

                                {/* Payment Split Mode */}
                                <div className="mt-3">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Split</label>
                                    <div className="bg-slate-50 rounded-lg p-1 flex">
                                        <button type="button" onClick={() => { setCustomSplitMode(false); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!customSplitMode ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Full Payment</button>
                                        <button type="button" onClick={() => { setCustomSplitMode(true); const finalTotal = Math.max(0, pricing.total - discountAmount - couponDiscount); setCustomPrepaid(String(finalTotal)); setCustomBalance('0'); }} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customSplitMode ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Custom Split</button>
                                    </div>
                                </div>
                                {customSplitMode && (
                                    <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prepaid (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                                                value={customPrepaid}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setCustomPrepaid(val);
                                                    const prepaidNum = parseInt(val || '0');
                                                    const finalTotal = Math.max(0, pricing.total - discountAmount - couponDiscount);
                                                    setCustomBalance(String(Math.max(0, finalTotal - prepaidNum)));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Balance (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                                                value={customBalance}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || !bulkForm.customerName || !bulkForm.phone || !bulkForm.checkIn || !bulkForm.checkOut}
                            className="w-full mt-5 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<>{bulkForm.numCottages > 1 ? `Create ${bulkForm.numCottages} Bookings` : "Create Booking"}</>)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Booking History */}
            {bulkHistory.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Recent Bulk Bookings</h3>
                    <div className="space-y-3">
                        {bulkHistory.slice(0, 10).map((group) => (
                            <div key={group.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{group.customerName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {group.cottages} cottage{group.cottages > 1 ? "s" : ""} · {group.totalGuests} guests · {new Date(group.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → {new Date(group.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">₹{group.totalAmount.toLocaleString("en-IN")}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${group.status === "confirmed" ? "bg-amber-50 text-amber-700" : group.status === "checked_in" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{group.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
