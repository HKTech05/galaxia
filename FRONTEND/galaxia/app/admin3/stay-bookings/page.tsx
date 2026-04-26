"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, X, IndianRupee, CalendarDays, Users, Phone, Mail, Film, Trash2, Pencil } from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

interface StayBooking {
    id: number;
    bookingRef: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    propertyName: string;
    subPropertyName: string | null;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    kids: number;
    pets: number;
    numCottages: number;
    totalAmount: number;
    advanceAmount: number;
    balanceAmount: number;
    securityDeposit: number;
    status: string;
    source: string;
    bookedAt: string;
    nightlyRate: number;
    basePrice: number;
    extraPersonCharge: number;
    extraAdultCharge: number;
    extraKidsCharge: number;
    gstAmount: number;
    discountAmount: number;
    advancePaid: boolean;
    advanceMethod: string | null;
    balanceCollected: boolean;
    balanceMethod: string | null;
    depositCollected: boolean;
    depositMethod: string | null;
    couponCode: string | null;
    extraGuests: any[];
    addons: any[] | null;
    foodBills: any[] | null;
    isDd?: boolean;
    startHour?: number;
    durationHours?: number;
}

const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-50 border-emerald-200 text-emerald-700",
    checked_in: "bg-blue-50 border-blue-200 text-blue-700",
    checked_out: "bg-slate-100 border-slate-300 text-slate-600",
    completed: "bg-slate-100 border-slate-300 text-slate-600",
    cancelled: "bg-red-50 border-red-200 text-red-700",
    no_show: "bg-amber-50 border-amber-200 text-amber-700",
};

const statusIcons: Record<string, any> = {
    confirmed: CheckCircle,
    checked_in: Clock,
    checked_out: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    no_show: AlertCircle,
};

export default function StayBookingsPage() {
    const [bookings, setBookings] = useState<StayBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [ddSourceFilter, setDdSourceFilter] = useState("All");
    const [propertyFilter, setPropertyFilter] = useState("All");
    const [bookedOnFrom, setBookedOnFrom] = useState("");
    const [bookedOnTo, setBookedOnTo] = useState("");
    const [datesFrom, setDatesFrom] = useState("");
    const [datesTo, setDatesTo] = useState("");
    const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<StayBooking | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<StayBooking | null>(null);
    const [editBooking, setEditBooking] = useState<StayBooking | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editSaving, setEditSaving] = useState(false);
    const [sortField, setSortField] = useState<"bookedAt" | "checkIn">("bookedAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [viewTab, setViewTab] = useState<"staycation" | "dd" | "all">("staycation");
    const [ddBookings, setDdBookings] = useState<StayBooking[]>([]);
    const [ddLoading, setDdLoading] = useState(false);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== "All") params.set("status", statusFilter.toLowerCase().replace(" ", "_"));
            // Booked On range filters by bookedAt on backend
            if (bookedOnFrom) params.set("bookedOnFrom", bookedOnFrom);
            if (bookedOnTo) params.set("bookedOnTo", bookedOnTo);
            // Dates range filters by checkInDate on backend
            if (datesFrom) params.set("startDate", datesFrom);
            if (datesTo) params.set("endDate", datesTo);
            
            const data = await api.get(`/bookings/staycation?${params.toString()}`);
            const mapped: StayBooking[] = (Array.isArray(data) ? data : []).map((b: any) => ({
                id: b.id,
                bookingRef: b.bookingRef || `ST-${b.id}`,
                customerName: b.customerName || "Unknown",
                customerPhone: b.customerPhone || "",
                customerEmail: b.customerEmail || null,
                propertyName: b.property?.name || "Unknown",
                subPropertyName: b.subProperty?.name || null,
                checkIn: b.checkInDate,
                checkOut: b.checkOutDate,
                nights: b.numNights || 1,
                guests: b.numGuests || 2,
                kids: b.numKids || 0,
                pets: b.numPets || 0,
                numCottages: b.numCottages || 1,
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.advanceAmount || 0,
                balanceAmount: b.balanceAmount || 0,
                securityDeposit: b.securityDeposit || 0,
                status: b.status || "confirmed",
                source: b.source || "website",
                bookedAt: b.bookedAt || b.createdAt,
                nightlyRate: b.nightlyRate || 0,
                basePrice: b.basePrice || 0,
                extraPersonCharge: b.extraPersonCharge || 0,
                extraAdultCharge: b.extraAdultCharge || 0,
                extraKidsCharge: b.extraKidsCharge || 0,
                gstAmount: b.gstAmount || 0,
                discountAmount: b.discountAmount || 0,
                advancePaid: b.advancePaid || false,
                advanceMethod: b.advanceMethod || null,
                balanceCollected: b.balanceCollected || false,
                balanceMethod: b.balanceMethod || null,
                depositCollected: b.depositCollected || false,
                depositMethod: b.depositMethod || null,
                couponCode: b.coupon?.code || null,
                extraGuests: b.extraGuests || [],
                addons: b.addons || null,
                foodBills: b.foodBills || null,
            }));
            setBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch stay bookings:", err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, bookedOnFrom, bookedOnTo, datesFrom, datesTo]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    // Fetch DD bookings
    const fetchDdBookings = useCallback(async () => {
        try {
            setDdLoading(true);
            const params = new URLSearchParams();
            if (bookedOnFrom) { params.set('startDate', bookedOnFrom); params.set('filterBy', 'bookedAt'); }
            if (bookedOnTo) { params.set('endDate', bookedOnTo); if (!bookedOnFrom) params.set('filterBy', 'bookedAt'); }
            if (datesFrom) { params.set('startDate', datesFrom); params.set('filterBy', 'bookingDate'); }
            if (datesTo) { params.set('endDate', datesTo); if (!datesFrom) params.set('filterBy', 'bookingDate'); }
            if (!bookedOnFrom && !bookedOnTo && !datesFrom && !datesTo) params.set('filterBy', 'bookedAt');
            const data = await api.get(`/bookings/dd?${params.toString()}`);
            const mapped: StayBooking[] = (Array.isArray(data) ? data : []).map((b: any) => ({
                id: b.id,
                bookingRef: b.bookingRef || `DD-${b.id}`,
                customerName: b.customerName || "Unknown",
                customerPhone: b.customerPhone || "",
                customerEmail: b.customerEmail || null,
                propertyName: `DD: ${(b.screen?.name || 'Unknown Screen').replace(/\s*\(.*?\)/g, '')}`,
                subPropertyName: b.package?.name || null,
                checkIn: b.bookingDate,
                checkOut: b.bookingDate,
                nights: 0,
                guests: b.numGuests || 1,
                kids: 0,
                pets: 0,
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.amountPaid || 0,
                balanceAmount: b.amountToCollect || 0,
                securityDeposit: 0,
                status: b.status || "confirmed",
                source: b.source || "website",
                bookedAt: b.bookedAt || b.createdAt,
                nightlyRate: 0,
                basePrice: b.basePrice || 0,
                extraPersonCharge: 0,
            extraAdultCharge: 0,
            extraKidsCharge: 0,
                gstAmount: b.gstAmount || 0,
                discountAmount: b.discountAmount || 0,
                advancePaid: (b.amountPaid || 0) > 0,
                advanceMethod: b.paymentMethod || null,
                balanceCollected: (b.amountToCollect || 0) <= 0,
                balanceMethod: null,
                depositCollected: false,
                depositMethod: null,
                couponCode: b.coupon?.code || null,
                extraGuests: [],
                addons: b.addons || null,
                foodBills: null,
                isDd: true,
                startHour: b.startHour,
                durationHours: b.durationHours,
            }));
            setDdBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch DD bookings:", err);
        } finally {
            setDdLoading(false);
        }
    }, [bookedOnFrom, bookedOnTo, datesFrom, datesTo]);

    useEffect(() => {
        if (viewTab === 'dd' || viewTab === 'all') fetchDdBookings();
    }, [viewTab, fetchDdBookings]);

    // Combine based on active tab
    const sourceBookings = viewTab === 'staycation' ? bookings : viewTab === 'dd' ? ddBookings : [...bookings, ...ddBookings];

    const filteredBookings = sourceBookings.filter(b => {
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase())
            || b.bookingRef.toLowerCase().includes(searchTerm.toLowerCase())
            || b.customerPhone.includes(searchTerm);
        const matchesProperty = propertyFilter === "All" || b.propertyName === propertyFilter;
        // DD tab uses both status filter AND source filter
        let matchesFilter = true;
        if (viewTab === 'dd') {
            // Status filter
            if (statusFilter !== 'All') matchesFilter = b.status === statusFilter.toLowerCase().replace(' ', '_');
            // Source filter
            if (matchesFilter && ddSourceFilter !== 'All') {
                if (ddSourceFilter === 'Website') matchesFilter = b.source === 'website';
                else if (ddSourceFilter === 'Walk-in') matchesFilter = b.source !== 'website';
            }
        } else if (viewTab === 'staycation') {
            matchesFilter = statusFilter === 'All' || b.status === statusFilter.toLowerCase().replace(' ', '_');
        } else {
            // 'all' tab
            matchesFilter = statusFilter === 'All' || b.status === statusFilter.toLowerCase().replace(' ', '_');
        }
        return matchesSearch && matchesProperty && matchesFilter;
    });

    const sortedBookings = [...filteredBookings].sort((a, b) => {
        let valA: number, valB: number;
        if (sortField === "bookedAt") {
            valA = new Date(a.bookedAt).getTime();
            valB = new Date(b.bookedAt).getTime();
        } else {
            valA = new Date(a.checkIn).getTime();
            valB = new Date(b.checkIn).getTime();
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
    });

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
    const formatSlot = (startHour: number, durationHours: number) => {
        const fmt = (h: number) => { const p = h >= 12 ? "PM" : "AM"; const hr = h > 12 ? h - 12 : h === 0 ? 12 : h; return `${hr}:00 ${p}`; };
        return `${fmt(startHour)} – ${fmt(startHour + durationHours)}`;
    };
    const formatDateTime = (d: string) => {
        if (!d) return "N/A";
        const dt = new Date(d);
        return `${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    };
    const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const properties = [...new Set(sourceBookings.map(b => b.propertyName))];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bookings</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">All bookings across all properties</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                {(["staycation", "dd", "all"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setViewTab(tab); setStatusFilter('All'); setDdSourceFilter('All'); setBookedOnFrom(''); setBookedOnTo(''); setDatesFrom(''); setDatesTo(''); }}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                            viewTab === tab
                                ? 'bg-white shadow text-purple-700'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab === 'staycation' ? 'Staycation' : tab === 'dd' ? 'Digital Diaries' : 'All'}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                {/* Row 1: Search bar — full width on desktop */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search name, ID, or phone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                </div>

                {/* Row 2: Booked On date range */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Booked On</p>
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                            <CustomDatePicker
                                date={bookedOnFrom ? new Date(bookedOnFrom + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setBookedOnFrom(`${y}-${m}-${day}`);
                                    setDatesFrom(''); setDatesTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                        <div className="flex-1">
                            <CustomDatePicker
                                date={bookedOnTo ? new Date(bookedOnTo + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setBookedOnTo(`${y}-${m}-${day}`);
                                    setDatesFrom(''); setDatesTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        {(bookedOnFrom || bookedOnTo) && (
                            <button
                                onClick={() => { setBookedOnFrom(''); setBookedOnTo(''); }}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 3: Dates (check-in/booking date) range */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-in Dates</p>
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                            <CustomDatePicker
                                date={datesFrom ? new Date(datesFrom + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setDatesFrom(`${y}-${m}-${day}`);
                                    setBookedOnFrom(''); setBookedOnTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                        <div className="flex-1">
                            <CustomDatePicker
                                date={datesTo ? new Date(datesTo + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setDatesTo(`${y}-${m}-${day}`);
                                    setBookedOnFrom(''); setBookedOnTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        {(datesFrom || datesTo) && (
                            <button
                                onClick={() => { setDatesFrom(''); setDatesTo(''); }}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 3: Property filter + Status pills — evenly spaced on desktop */}
                <div className="flex gap-3 items-center lg:justify-between">
                    <div className="relative flex-1 lg:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select
                            value={propertyFilter}
                            onChange={(e) => setPropertyFilter(e.target.value)}
                            className="w-full lg:w-auto pl-9 pr-8 py-2 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="All">All Properties</option>
                            {properties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                    </div>

                    {/* Filter pills — Status filter for all tabs */}
                    {(() => {
                        const filterOptions = viewTab === 'dd'
                            ? ["All", "Confirmed", "No Show", "Transferred", "Cancelled"]
                            : ["All", "Confirmed", "Checked In", "Checked Out", "Cancelled"];
                        return (
                            <>
                                <div className="relative flex-1 lg:hidden">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full py-2 px-3 pr-8 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        {filterOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                                </div>
                                <div className="hidden lg:flex flex-1 items-center bg-slate-100 rounded-lg p-1 gap-1 ml-3">
                                    {filterOptions.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setStatusFilter(opt)}
                                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap text-center ${statusFilter === opt
                                                ? "bg-white text-indigo-700 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </>
                        );
                    })()}

                    {/* DD Source dropdown — only shows for DD tab */}
                    {viewTab === 'dd' && (
                        <div className="relative flex-shrink-0 ml-3">
                            <select
                                value={ddSourceFilter}
                                onChange={(e) => setDdSourceFilter(e.target.value)}
                                className="pl-3 pr-8 py-2 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="All">All Sources</option>
                                <option value="Website">Website</option>
                                <option value="Walk-in">Walk-in</option>
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                        </div>
                    )}
                </div>
            </div>


            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Bookings", value: filteredBookings.length, color: "text-slate-800" },
                    { label: "Confirmed", value: filteredBookings.filter(b => b.status === "confirmed").length, color: "text-emerald-600" },
                    { label: "Total Revenue", value: formatPrice(filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0)), color: "text-indigo-600" },
                    { label: "Advance Collected", value: formatPrice(filteredBookings.reduce((sum, b) => sum + b.advanceAmount, 0)), color: "text-sky-600" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Property</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => { if (sortField === "bookedAt") { setSortDir(d => d === "asc" ? "desc" : "asc"); } else { setSortField("bookedAt"); setSortDir("desc"); } }} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        Booked On
                                        <span className={`text-[10px] ${sortField === "bookedAt" ? "text-indigo-600" : "text-slate-300"}`}>{sortField === "bookedAt" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}</span>
                                    </button>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => { if (sortField === "checkIn") { setSortDir(d => d === "asc" ? "desc" : "asc"); } else { setSortField("checkIn"); setSortDir("desc"); } }} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        Dates
                                        <span className={`text-[10px] ${sortField === "checkIn" ? "text-indigo-600" : "text-slate-300"}`}>{sortField === "checkIn" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}</span>
                                    </button>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Guests</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">Loading bookings...</td></tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">No bookings found.</td></tr>
                            ) : (
                                sortedBookings.map((b) => {
                                    const StatusIcon = statusIcons[b.status] || CheckCircle;
                                    return (
                                        <tr key={b.id} onClick={() => setSelectedBooking(b)} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-bold text-slate-800">{b.customerName}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${b.source === "website" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : b.source === "admin-bulk" || b.source === "bulk" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                                            {b.source === "website" ? "Online" : b.source === "admin-bulk" || b.source === "bulk" ? "Admin Bulk" : "Walk-in"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-400">{b.bookingRef}</span>
                                                    <span className="text-[11px] font-bold text-slate-400 mt-0.5">{b.customerPhone}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{b.propertyName}</span>
                                                {b.subPropertyName && (
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{b.subPropertyName}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-medium text-slate-700">{formatDateTime(b.bookedAt)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {b.isDd ? (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-800">{formatDate(b.checkIn)}</span>
                                                        <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{b.startHour !== undefined && b.durationHours !== undefined ? formatSlot(b.startHour, b.durationHours) : ""}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-800">{formatDate(b.checkIn)}</span>
                                                        <span className="text-slate-400 mx-1">→</span>
                                                        <span className="text-sm font-medium text-slate-600">{formatDate(b.checkOut)}</span>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{b.guests} adult{b.guests !== 1 ? 's' : ''}{b.kids > 0 && <span className="text-xs font-medium text-blue-600 ml-1">{b.kids} child{b.kids !== 1 ? 'ren' : ''}</span>}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{formatPrice(b.totalAmount)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[11px] font-bold text-emerald-600">Advance: {formatPrice(b.advanceAmount)}</span>
                                                    <span className="text-[11px] font-bold text-amber-600">Balance: {formatPrice(b.balanceAmount)}</span>
                                                    {b.securityDeposit > 0 && (
                                                        <span className="text-[11px] font-bold text-sky-600">Deposit: {formatPrice(b.securityDeposit)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[b.status] || "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                                    <StatusIcon size={14} />
                                                    {statusLabel(b.status)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Booking Details</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.bookingRef}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Customer Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Users size={14} className="text-indigo-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Name</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedBooking.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center"><Phone size={14} className="text-emerald-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Phone</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedBooking.customerPhone || "N/A"}</p>
                                        </div>
                                    </div>
                                    {selectedBooking.customerEmail && (
                                        <div className="flex items-center gap-3 min-w-0 col-span-2 sm:col-span-1">
                                            <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0"><Mail size={14} className="text-sky-600" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-slate-400 font-medium">Email</p>
                                                <p className="text-sm font-bold text-slate-800 truncate sm:break-all sm:whitespace-normal">{selectedBooking.customerEmail}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center"><CalendarDays size={14} className="text-amber-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Booked On</p>
                                            <p className="text-sm font-bold text-slate-800">{formatDateTime(selectedBooking.bookedAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stay / Booking Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{selectedBooking.isDd ? "Booking Information" : "Stay Information"}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Property</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.propertyName}</p>
                                        {selectedBooking.subPropertyName && <p className="text-xs text-slate-500">{selectedBooking.subPropertyName}</p>}
                                    </div>
                                    {selectedBooking.isDd ? (
                                        <>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Date</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkIn)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Time Slot</p>
                                                <p className="text-sm font-bold text-indigo-700">{selectedBooking.startHour !== undefined && selectedBooking.durationHours !== undefined ? formatSlot(selectedBooking.startHour, selectedBooking.durationHours) : "N/A"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Check-in</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkIn)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Check-out</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkOut)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Nights</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedBooking.nights}</p>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Guests</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.guests} adult{selectedBooking.guests !== 1 ? 's' : ''}{selectedBooking.kids > 0 && <span className="text-blue-600 ml-1">{selectedBooking.kids} child{selectedBooking.kids !== 1 ? 'ren' : ''}</span>}</p>
                                    </div>
                                    {selectedBooking.numCottages > 1 && (
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Cottages</p>
                                            <p className="text-sm font-bold text-amber-700">{selectedBooking.numCottages}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Source</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.source === "website" ? "Online Booking" : "Walk-in / Reception"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Breakdown */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing Breakdown</h4>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                                    {selectedBooking.basePrice > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Base Price</span>
                                        <span className="font-bold text-slate-800">{formatPrice(selectedBooking.basePrice)}</span>
                                    </div>
                                    )}
                                    {selectedBooking.extraAdultCharge > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Extra Adult Charge</span>
                                            <span className="font-bold text-slate-800">{formatPrice(selectedBooking.extraAdultCharge)}</span>
                                        </div>
                                    )}
                                    {selectedBooking.extraKidsCharge > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Extra Child Charge</span>
                                            <span className="font-bold text-slate-800">{formatPrice(selectedBooking.extraKidsCharge)}</span>
                                        </div>
                                    )}
                                    {!selectedBooking.extraAdultCharge && !selectedBooking.extraKidsCharge && selectedBooking.extraPersonCharge > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Extra Person Charge</span>
                                            <span className="font-bold text-slate-800">{formatPrice(selectedBooking.extraPersonCharge)}</span>
                                        </div>
                                    )}
                                    {selectedBooking.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-600">Discount {selectedBooking.couponCode ? `(${selectedBooking.couponCode})` : ""}</span>
                                            <span className="font-bold text-emerald-600">-{formatPrice(selectedBooking.discountAmount)}</span>
                                        </div>
                                    )}
                                    {selectedBooking.addons && Array.isArray(selectedBooking.addons) && selectedBooking.addons.length > 0 && selectedBooking.addons.map((addon: any, i: number) => (
                                        <div key={i}>
                                            {addon.name === 'Celebration Add-on' && (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-amber-700">{addon.name}</span>
                                                        <span className="font-bold text-amber-700">{formatPrice(addon.price || 0)}</span>
                                                    </div>
                                                    {addon.cakeMessage && <p className="text-xs text-slate-500 mt-0.5 ml-1">Cake: {addon.cakeMessage}</p>}
                                                    {addon.occasion && <p className="text-xs text-slate-500 ml-1">Occasion: {addon.occasion}</p>}
                                                </>
                                            )}
                                            {addon.name === 'Food Preference' && (
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className="text-emerald-700">Food Preference</span>
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${addon.foodType === 'Jain' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{addon.foodType} (Veg)</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {selectedBooking.gstAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">GST (5%)</span>
                                        <span className="font-bold text-slate-800">{formatPrice(selectedBooking.gstAmount)}</span>
                                    </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                        <span className="font-bold text-slate-800">Total Amount</span>
                                        <span className="font-black text-lg text-slate-900">{formatPrice(selectedBooking.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Status</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className={`p-3 rounded-lg border ${selectedBooking.advancePaid ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.advancePaid ? "text-emerald-600" : "text-amber-600"}`}>
                                            Advance {selectedBooking.advancePaid ? "✓ Paid" : "⏳ Pending"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.advanceAmount)}</p>
                                        {selectedBooking.advanceMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.advanceMethod}</p>}
                                    </div>
                                    <div className={`p-3 rounded-lg border ${selectedBooking.balanceCollected ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.balanceCollected ? "text-emerald-600" : "text-amber-600"}`}>
                                            Balance {selectedBooking.balanceCollected ? "✓ Collected" : "⏳ Pending"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.balanceAmount)}</p>
                                        {selectedBooking.balanceMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.balanceMethod}</p>}
                                    </div>
                                    {!selectedBooking.isDd && (
                                    <div className={`p-3 rounded-lg border ${selectedBooking.depositCollected ? "bg-emerald-50 border-emerald-100" : "bg-sky-50 border-sky-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.depositCollected ? "text-emerald-600" : "text-sky-600"}`}>
                                            Security Deposit {selectedBooking.depositCollected ? "✓ Collected" : "⏳ At Check-in"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.securityDeposit)}</p>
                                        {selectedBooking.depositMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.depositMethod}</p>}
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* Extra Guests */}
                            {selectedBooking.extraGuests && selectedBooking.extraGuests.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Extra Guests ({selectedBooking.extraGuests.length})</h4>
                                    <div className="space-y-2">
                                        {selectedBooking.extraGuests.map((eg: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-purple-600" />
                                                    <span className="text-sm font-bold text-slate-800">{eg.guestName}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-purple-600">+{formatPrice(eg.chargeAmount || 0)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase">{eg.paymentMethod}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Food Bills */}
                            {selectedBooking.foodBills && selectedBooking.foodBills.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Food Bills</h4>
                                    <div className="space-y-1.5">
                                        {selectedBooking.foodBills.map((fb: any, idx: number) => (
                                            <div key={idx} className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800">{fb.description}</p>
                                                    <p className="text-[10px] text-amber-600 mt-0.5">{fb.paymentMethod === 'upi' ? 'UPI' : 'Cash'}</p>
                                                </div>
                                                <p className="text-sm font-bold text-amber-800">₹{fb.amount.toLocaleString('en-IN')}</p>
                                            </div>
                                        ))}
                                        <div className="bg-amber-100 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                                            <p className="text-xs font-bold text-amber-900">Total Food Bills</p>
                                            <p className="text-sm font-black text-amber-900">₹{selectedBooking.foodBills.reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status + Delete */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[selectedBooking.status] || "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                    {(() => { const Icon = statusIcons[selectedBooking.status] || CheckCircle; return <Icon size={14} />; })()}
                                    {statusLabel(selectedBooking.status)}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 font-medium">DB ID: {selectedBooking.id}</span>
                                    <button
                                        onClick={() => {
                                            const b = selectedBooking;
                                            setEditForm({
                                                customerName: b.customerName,
                                                customerPhone: b.customerPhone,
                                                customerEmail: b.customerEmail || '',
                                                numGuests: b.guests,
                                                numKids: b.kids,
                                                numPets: b.pets || 0,
                                                numCottages: b.numCottages || 1,
                                                checkInDate: b.checkIn ? b.checkIn.split('T')[0] : '',
                                                checkOutDate: b.checkOut ? b.checkOut.split('T')[0] : '',
                                                nightlyRate: b.nightlyRate,
                                                basePrice: b.basePrice,
                                                extraPersonCharge: b.extraPersonCharge,
                                                gstAmount: b.gstAmount,
                                                totalAmount: b.totalAmount,
                                                advanceAmount: b.advanceAmount,
                                                balanceAmount: b.balanceAmount,
                                                securityDeposit: b.securityDeposit,
                                                status: b.status,
                                                source: b.source,
                                                addons: b.addons || [],
                                            });
                                            setEditBooking(b);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                    >
                                        <Pencil size={13} /> Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmBooking(selectedBooking)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmBooking && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirmBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Booking</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Are you sure you want to <strong className="text-red-600">permanently</strong> delete booking <strong>{deleteConfirmBooking.bookingRef}</strong>?
                            </p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                This will remove the booking from the database along with all associated cash logs, UPI logs, payment records, and financial data. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 p-4 pt-0">
                            <button
                                onClick={() => setDeleteConfirmBooking(null)}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleting(true);
                                    try {
                                        const isDd = deleteConfirmBooking.isDd;
                                        const endpoint = isDd
                                            ? `/bookings/dd/${deleteConfirmBooking.id}`
                                            : `/bookings/staycation/${deleteConfirmBooking.id}`;
                                        await api.delete(endpoint);
                                        setDeleteConfirmBooking(null);
                                        setSelectedBooking(null);
                                        // Refresh
                                        if (isDd) fetchDdBookings();
                                        else fetchBookings();
                                    } catch (err) {
                                        console.error("Delete failed:", err);
                                        alert("Failed to delete booking. Please try again.");
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Booking Modal */}
            {editBooking && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !editSaving && setEditBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Edit Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{editBooking.bookingRef}</p>
                            </div>
                            <button onClick={() => setEditBooking(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={editSaving}>
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Customer Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                                        <input type="text" value={editForm.customerName || ''} onChange={e => setEditForm({...editForm, customerName: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                                        <input type="text" value={editForm.customerPhone || ''} onChange={e => setEditForm({...editForm, customerPhone: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                                        <input type="text" value={editForm.customerEmail || ''} onChange={e => setEditForm({...editForm, customerEmail: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Stay Info */}
                            {!editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stay Information</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Check-in</label>
                                            <input type="date" value={editForm.checkInDate || ''} onChange={e => setEditForm({...editForm, checkInDate: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Check-out</label>
                                            <input type="date" value={editForm.checkOutDate || ''} onChange={e => setEditForm({...editForm, checkOutDate: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Guests</label>
                                            <input type="number" min={1} value={editForm.numGuests || ''} onChange={e => setEditForm({...editForm, numGuests: parseInt(e.target.value) || 0})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Kids</label>
                                            <input type="number" min={0} value={editForm.numKids || ''} onChange={e => setEditForm({...editForm, numKids: parseInt(e.target.value) || 0})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cottages (Amstel Nest only) */}
                            {editBooking && editBooking.propertyName?.includes('Amstel') && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cottages</h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Cottages</label>
                                        <input type="number" min={1} max={10} value={editForm.numCottages || 1} onChange={e => setEditForm({...editForm, numCottages: parseInt(e.target.value) || 1})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                </div>
                            )}

                            {/* Financial Details */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Financial Details</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {!editBooking.isDd && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Nightly Rate</label>
                                                <input type="number" value={editForm.nightlyRate ?? ''} onChange={e => setEditForm({...editForm, nightlyRate: parseFloat(e.target.value) || 0})}
                                                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Base Price</label>
                                                <input type="number" value={editForm.basePrice ?? ''} onChange={e => setEditForm({...editForm, basePrice: parseFloat(e.target.value) || 0})}
                                                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Extra Person</label>
                                                <input type="number" value={editForm.extraPersonCharge ?? ''} onChange={e => setEditForm({...editForm, extraPersonCharge: parseFloat(e.target.value) || 0})}
                                                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">GST Amount</label>
                                        <input type="number" value={editForm.gstAmount ?? ''} onChange={e => setEditForm({...editForm, gstAmount: parseFloat(e.target.value) || 0})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase">Total Amount</label>
                                        <input type="number" value={editForm.totalAmount ?? ''} onChange={e => setEditForm({...editForm, totalAmount: parseFloat(e.target.value) || 0})}
                                            className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-600 uppercase">Advance Paid</label>
                                        <input type="number" value={editForm.advanceAmount ?? ''} onChange={e => setEditForm({...editForm, advanceAmount: parseFloat(e.target.value) || 0})}
                                            className="w-full mt-1 px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-600 uppercase">Balance</label>
                                        <input type="number" value={editForm.balanceAmount ?? ''} onChange={e => setEditForm({...editForm, balanceAmount: parseFloat(e.target.value) || 0})}
                                            className="w-full mt-1 px-3 py-2 border border-amber-200 rounded-lg text-sm font-bold text-amber-700 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                                    </div>
                                    {!editBooking.isDd && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit</label>
                                            <input type="number" value={editForm.securityDeposit ?? ''} onChange={e => setEditForm({...editForm, securityDeposit: parseFloat(e.target.value) || 0})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status & Source */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status & Source</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                                        <select value={editForm.status || ''} onChange={e => setEditForm({...editForm, status: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                            <option value="confirmed">Confirmed</option>
                                            <option value="checked_in">Checked In</option>
                                            <option value="checked_out">Checked Out</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="no_show">No Show</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Source</label>
                                        <select value={editForm.source || ''} onChange={e => setEditForm({...editForm, source: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                            <option value="website">Website</option>
                                            <option value="reception">Reception</option>
                                            <option value="admin-bulk">Admin Bulk</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Addons — Staycation only, NOT DD */}
                            {!editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Add-ons</h4>
                                    {editForm.addons && editForm.addons.length > 0 ? (
                                        <div className="space-y-2">
                                            {editForm.addons.map((addon: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-purple-700">{addon.name || 'Add-on'}</span>
                                                        <button onClick={() => { const a = [...editForm.addons]; a.splice(idx, 1); setEditForm({...editForm, addons: a}); }}
                                                            className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                                                    </div>
                                                    {addon.name === 'Celebration Add-on' && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Price</label>
                                                                <input type="number" value={addon.price || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], price: parseInt(e.target.value) || 0}; setEditForm({...editForm, addons: a}); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Occasion</label>
                                                                <input type="text" value={addon.occasion || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], occasion: e.target.value}; setEditForm({...editForm, addons: a}); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Cake Msg</label>
                                                                <input type="text" value={addon.cakeMessage || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], cakeMessage: e.target.value}; setEditForm({...editForm, addons: a}); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No add-ons</p>
                                    )}
                                    <button onClick={() => setEditForm({...editForm, addons: [...(editForm.addons || []), { name: 'Celebration Add-on', price: 1200, occasion: '', cakeMessage: '' }]})}
                                        className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">+ Add Celebration Add-on</button>
                                </div>
                            )}
                        </div>

                        {/* Save / Cancel */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={() => setEditBooking(null)} disabled={editSaving}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button
                                disabled={editSaving}
                                onClick={async () => {
                                    setEditSaving(true);
                                    try {
                                        if (editBooking.isDd) {
                                            // DD booking edit — use DD endpoint
                                            await api.patch(`/bookings/dd/${editBooking.id}`, {
                                                customerName: editForm.customerName,
                                                customerPhone: editForm.customerPhone,
                                                customerEmail: editForm.customerEmail || null,
                                                numGuests: editForm.numGuests,
                                                totalAmount: editForm.totalAmount,
                                                amountPaid: editForm.advanceAmount,
                                                amountToCollect: editForm.balanceAmount,
                                                gstAmount: editForm.gstAmount,
                                                status: editForm.status,
                                                source: editForm.source,
                                            });
                                        } else {
                                            // Staycation booking edit
                                            await api.patch(`/bookings/staycation/${editBooking.id}`, {
                                                customerName: editForm.customerName,
                                                customerPhone: editForm.customerPhone,
                                                customerEmail: editForm.customerEmail || null,
                                                numGuests: editForm.numGuests,
                                                numKids: editForm.numKids,
                                                numPets: editForm.numPets,
                                                numCottages: editForm.numCottages,
                                                checkInDate: editForm.checkInDate,
                                                checkOutDate: editForm.checkOutDate,
                                                nightlyRate: editForm.nightlyRate,
                                                basePrice: editForm.basePrice,
                                                extraPersonCharge: editForm.extraPersonCharge,
                                                gstAmount: editForm.gstAmount,
                                                totalAmount: editForm.totalAmount,
                                                advanceAmount: editForm.advanceAmount,
                                                balanceAmount: editForm.balanceAmount,
                                                securityDeposit: editForm.securityDeposit,
                                                status: editForm.status,
                                                source: editForm.source,
                                                addons: editForm.addons && editForm.addons.length > 0 ? editForm.addons : null,
                                            });
                                        }
                                        setEditBooking(null);
                                        setSelectedBooking(null);
                                        if (editBooking.isDd) fetchDdBookings();
                                        else fetchBookings();
                                        alert('Booking updated successfully!');
                                    } catch (err) {
                                        console.error('Edit failed:', err);
                                        alert('Failed to update booking. Please try again.');
                                    } finally {
                                        setEditSaving(false);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
