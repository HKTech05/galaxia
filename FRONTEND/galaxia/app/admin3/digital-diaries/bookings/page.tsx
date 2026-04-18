"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, ChevronRight, CheckCircle, XCircle, X, IndianRupee, Ban, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../lib/api";

interface DDBooking {
    id: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    screen: { name: string } | null;
    package: { name: string } | null;
    bookingDate: string;
    startHour: number;
    durationHours: number;
    totalAmount: number;
    amountPaid: number;
    amountToCollect: number;
    paymentMethod: string;
    paymentStatus: string;
    source: string;
    status: string;
}

function formatSlot(startHour: number, durationHours: number): string {
    const fmt = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${hr}:00 ${period}`;
    };
    return `${fmt(startHour)} - ${fmt(startHour + durationHours)}`;
}

export default function Admin3DDBookingsPage() {
    const [bookings, setBookings] = useState<DDBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [screenFilter, setScreenFilter] = useState("All");
    const [sourceFilter, setSourceFilter] = useState("All");
    const [sortField, setSortField] = useState<"date" | "slot" | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedBooking, setSelectedBooking] = useState<DDBooking | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [detailBooking, setDetailBooking] = useState<DDBooking | null>(null);

    useEffect(() => { fetchBookings(); }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await api.get("/bookings/dd");
            setBookings(data);
        } catch (err) {
            console.error("Failed to fetch DD bookings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCollectPayment = async (booking: DDBooking, method: string) => {
        setActionLoading(true);
        try {
            await api.post(`/bookings/dd/${booking.id}/payment`, { amount: booking.amountToCollect, method: method });
            await fetchBookings();
            setIsActionModalOpen(false);
        } catch (err) {
            console.error("Payment error:", err);
            alert("Failed to record payment");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelBooking = async (booking: DDBooking) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        setActionLoading(true);
        try {
            await api.patch(`/bookings/dd/${booking.id}/status`, { status: "cancelled" });
            await fetchBookings();
            setIsActionModalOpen(false);
        } catch (err) {
            console.error("Cancel error:", err);
            alert("Failed to cancel booking");
        } finally {
            setActionLoading(false);
        }
    };

    const screens = [...new Set(bookings.map(b => b.screen?.name).filter(Boolean))];

    const toggleSort = (field: "date" | "slot") => {
        if (sortField === field) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const SortIcon = ({ field }: { field: "date" | "slot" }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 inline text-slate-400" />;
        return sortDir === "asc" ? <ArrowUp size={12} className="ml-1 inline text-indigo-500" /> : <ArrowDown size={12} className="ml-1 inline text-indigo-500" />;
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || `#DD-${b.id}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || b.status === statusFilter.toLowerCase();
        const matchesScreen = screenFilter === "All" || b.screen?.name === screenFilter;
        const matchesSource = sourceFilter === "All" || (sourceFilter === "Website" ? b.source === "website" : b.source === "reception");
        return matchesSearch && matchesStatus && matchesScreen && matchesSource;
    }).sort((a, b) => {
        if (!sortField) return 0;
        if (sortField === "date") {
            const da = new Date(a.bookingDate).getTime();
            const db = new Date(b.bookingDate).getTime();
            return sortDir === "asc" ? da - db : db - da;
        }
        if (sortField === "slot") {
            return sortDir === "asc" ? a.startHour - b.startHour : b.startHour - a.startHour;
        }
        return 0;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Digital Diaries Sub-Nav */}
            <div className="flex gap-6 border-b border-slate-200 pb-1 mb-2">
                <Link href="/admin3/digital-diaries" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors">
                    Daily Schedule
                </Link>
                <Link href="/admin3/digital-diaries/bookings" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest">
                    All Walk-ins & Bookings
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Walk-ins & Bookings</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage all Digital Diaries screen reservations.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search ID or Customer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all" />
                </div>
                <div className="grid grid-cols-1 md:flex md:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select value={screenFilter} onChange={(e) => setScreenFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 w-full appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                            <option value="All">All Screens</option>
                            {screens.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 w-full appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                            <option value="All">All Sources</option>
                            <option value="Website">Website</option>
                            <option value="Walk-in">Walk-in</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 w-full md:w-auto">
                        {["All", "Confirmed", "Cancelled"].map(status => (
                            <button key={status} onClick={() => setStatusFilter(status)}
                                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${statusFilter === status ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Screen</th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => toggleSort("date")} className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors">
                                        Date & Slot <SortIcon field="date" />
                                    </button>
                                </th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Upfront</th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining</th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                                <th className="px-3 md:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right hidden md:table-cell">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-3 md:px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={28} /><p className="text-sm text-slate-500 mt-2">Loading…</p></td></tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr><td colSpan={7} className="px-3 md:px-6 py-12 text-center text-slate-500 font-medium">No bookings found.</td></tr>
                            ) : filteredBookings.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setDetailBooking(b)}>
                                    <td className="px-3 md:px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-slate-800">#DD-{b.id}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${b.source === 'website' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{b.source || "Walk-in"}</span>
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">{b.customerName}</span>
                                            <span className="text-[11px] font-bold text-slate-400 mt-0.5">{b.customerPhone}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-4 hidden md:table-cell"><span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wide rounded border border-indigo-100">{(b.screen?.name || "—").replace(/\s*\(.*?\)/g, '')}</span></td>
                                    <td className="px-3 md:px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-bold text-slate-800">{new Date(b.bookingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            <span className="text-xs font-medium text-slate-500">{formatSlot(b.startHour, b.durationHours)}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-slate-800">₹{(b.amountPaid || 0).toLocaleString("en-IN")}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.paymentMethod || "—"}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-slate-800">₹{(b.amountToCollect || 0).toLocaleString("en-IN")}</span>
                                            {b.amountToCollect <= 0 ? <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paid</span> : <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-4 hidden md:table-cell">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${b.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                            {b.status === 'confirmed' && <CheckCircle size={14} />}
                                            {b.status === 'cancelled' && <XCircle size={14} />}
                                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-4 text-right hidden md:table-cell">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setIsActionModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            {isActionModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Manage Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">#DD-{selectedBooking.id} • {selectedBooking.customerName}</p>
                            </div>
                            <button onClick={() => setIsActionModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-slate-500">Status</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${selectedBooking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{selectedBooking.status}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Remaining</span>
                                    <span className="text-lg font-bold text-slate-800">₹{(selectedBooking.amountToCollect || 0).toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                            {selectedBooking.status !== 'cancelled' && selectedBooking.amountToCollect > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-800">Collect Remaining</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button disabled={actionLoading} onClick={() => handleCollectPayment(selectedBooking, "cash")} className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl border border-indigo-200 disabled:opacity-50">
                                            <IndianRupee size={16} /> {actionLoading ? "..." : "Cash"}
                                        </button>
                                        <button disabled={actionLoading} onClick={() => handleCollectPayment(selectedBooking, "upi")} className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50">
                                            <span className="font-bold text-xs bg-white text-indigo-600 px-1 rounded-sm">UPI</span> {actionLoading ? "..." : "Pay"}
                                        </button>
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-slate-100">
                                        <button disabled={actionLoading} onClick={() => handleCancelBooking(selectedBooking)} className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:bg-red-50 font-semibold rounded-xl disabled:opacity-50">
                                            <Ban size={16} /> Cancel Booking
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        {selectedBooking.status === 'cancelled' ? <Ban className="text-red-400" size={24} /> : <CheckCircle className="text-emerald-500" size={24} />}
                                    </div>
                                    <h4 className="text-slate-800 font-bold">{selectedBooking.status === 'cancelled' ? 'Cancelled' : 'Payment Complete'}</h4>
                                    <p className="text-sm text-slate-500 font-medium mt-1">No actions required.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal (click-to-view) */}
            {detailBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">Booking Details</h3>
                            <button onClick={() => setDetailBooking(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booking ID</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">DD-{String(detailBooking.id).padStart(4, '0')}-{String(detailBooking.id).padStart(3, '0')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{detailBooking.customerName}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{detailBooking.screen?.name || '—'} (Digital Diaries)</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{new Date(detailBooking.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slot</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{formatSlot(detailBooking.startHour, detailBooking.durationHours)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{detailBooking.source || 'Online'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Upfront (50%)</p>
                                    <p className="text-lg font-black text-emerald-800 mt-0.5">₹{(detailBooking.amountPaid || 0).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] font-medium text-emerald-600 mt-0.5">via {detailBooking.paymentMethod || '—'}</p>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Remaining (50%)</p>
                                    <p className="text-lg font-black text-amber-800 mt-0.5">₹{(detailBooking.amountToCollect || 0).toLocaleString('en-IN')}</p>
                                    <p className={`text-[10px] font-bold mt-0.5 ${detailBooking.amountToCollect <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{detailBooking.amountToCollect <= 0 ? 'Paid' : 'Pending'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${detailBooking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                    {detailBooking.status === 'confirmed' && <CheckCircle size={14} />}
                                    {detailBooking.status === 'cancelled' && <XCircle size={14} />}
                                    {detailBooking.status.charAt(0).toUpperCase() + detailBooking.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
