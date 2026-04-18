"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, X, IndianRupee, CalendarDays, Users, Phone, Mail, Film } from "lucide-react";
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
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<StayBooking | null>(null);
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
            if (dateFrom) params.set("startDate", dateFrom);
            if (dateTo) params.set("endDate", dateTo);
            
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
            }));
            setBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch stay bookings:", err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateFrom, dateTo]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    // Fetch DD bookings
    const fetchDdBookings = useCallback(async () => {
        try {
            setDdLoading(true);
            const params = new URLSearchParams();
            if (dateFrom) params.set('startDate', dateFrom);
            if (dateTo) params.set('endDate', dateTo);
            params.set('filterBy', 'bookedAt');
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
    }, [dateFrom, dateTo]);

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
                        onClick={() => { setViewTab(tab); setStatusFilter('All'); setDdSourceFilter('All'); }}
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

                {/* Row 2: Date pickers — full width on desktop */}
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <CustomDatePicker
                            date={dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date()}
                            onDateChange={(d) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setDateFrom(`${y}-${m}-${day}`);
                            }}
                            className="w-full"
                        />
                    </div>
                    <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                    <div className="flex-1">
                        <CustomDatePicker
                            date={dateTo ? new Date(dateTo + 'T00:00:00') : new Date()}
                            onDateChange={(d) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setDateTo(`${y}-${m}-${day}`);
                            }}
                            className="w-full"
                        />
                    </div>
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                            Clear
                        </button>
                    )}
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
                                                <span className="text-sm font-bold text-slate-800">{b.guests}</span>
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
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.guests} People</p>
                                    </div>
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
                                    {selectedBooking.extraPersonCharge > 0 && (
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

                            {/* Status */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[selectedBooking.status] || "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                    {(() => { const Icon = statusIcons[selectedBooking.status] || CheckCircle; return <Icon size={14} />; })()}
                                    {statusLabel(selectedBooking.status)}
                                </div>
                                <span className="text-xs text-slate-400 font-medium">DB ID: {selectedBooking.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
