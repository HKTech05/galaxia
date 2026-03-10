"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, ChevronRight, CheckCircle, XCircle, X, IndianRupee, Ban, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";

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
    advanceAmount: number;
    balanceAmount: number;
    advancePaid: boolean;
    advanceMethod: string;
    balancePaid: boolean;
    balanceMethod: string | null;
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

export default function Admin1BookingsPage() {
    const [bookings, setBookings] = useState<DDBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [screenFilter, setScreenFilter] = useState("All");

    // Modal state
    const [selectedBooking, setSelectedBooking] = useState<DDBooking | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

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
            await api.patch(`/bookings/dd/${booking.id}/payment`, {
                balancePaid: true,
                balanceMethod: method,
            });
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

    const filteredBookings = bookings.filter(b => {
        const matchesSearch =
            b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `#DD-${b.id}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || b.status === statusFilter.toLowerCase();
        const matchesScreen = screenFilter === "All" || b.screen?.name === screenFilter;
        return matchesSearch && matchesStatus && matchesScreen;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Schedule & Walk-ins</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage all Digital Diaries screen reservations directly.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search ID or Customer"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select
                            value={screenFilter}
                            onChange={(e) => setScreenFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 w-full appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="All">All Screens</option>
                            {screens.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        {["All", "Confirmed", "Cancelled"].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${statusFilter === status
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Screen Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time Slot</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Upfront (50%)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining (50%)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin mx-auto text-indigo-500" size={28} />
                                        <p className="text-sm text-slate-500 mt-2">Loading bookings…</p>
                                    </td>
                                </tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No bookings found.</td>
                                </tr>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-slate-800">#DD-{booking.id}</span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${booking.source === 'website' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                        {booking.source || "Walk-in"}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">{booking.customerName}</span>
                                                <span className="text-[11px] font-bold text-slate-400 mt-0.5">{booking.customerPhone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wide rounded border border-indigo-100">
                                                {booking.screen?.name || "—"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-800">{new Date(booking.bookingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                                <span className="text-xs font-medium text-slate-500">{formatSlot(booking.startHour, booking.durationHours)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-slate-800">₹{(booking.advanceAmount || 0).toLocaleString("en-IN")}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{booking.advanceMethod || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-slate-800">₹{(booking.balanceAmount || 0).toLocaleString("en-IN")}</span>
                                                {booking.balancePaid ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paid</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${booking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                                                }`}>
                                                {booking.status === 'confirmed' && <CheckCircle size={14} />}
                                                {booking.status === 'cancelled' && <XCircle size={14} />}
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => { setSelectedBooking(booking); setIsActionModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Booking Action Modal */}
            {isActionModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Manage Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">#DD-{selectedBooking.id} • {selectedBooking.customerName}</p>
                            </div>
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-slate-500">Total Status</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${selectedBooking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedBooking.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Remaining Amount</span>
                                    <span className="text-lg font-bold text-slate-800">₹{(selectedBooking.balanceAmount || 0).toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            {selectedBooking.status !== 'cancelled' && !selectedBooking.balancePaid ? (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-800">Collect Remaining 50%</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleCollectPayment(selectedBooking, "cash")}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl transition-colors border border-indigo-200 disabled:opacity-50"
                                        >
                                            <IndianRupee size={16} /> {actionLoading ? "..." : "Cash"}
                                        </button>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleCollectPayment(selectedBooking, "upi")}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <span className="font-bold text-xs bg-white text-indigo-600 px-1 rounded-sm">UPI</span> {actionLoading ? "..." : "Pay"}
                                        </button>
                                    </div>

                                    <div className="pt-4 mt-2 border-t border-slate-100">
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleCancelBooking(selectedBooking)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            <Ban size={16} /> Cancel Booking & Forfeit Deposit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        {selectedBooking.status === 'cancelled' ? <Ban className="text-red-400" size={24} /> : <CheckCircle className="text-emerald-500" size={24} />}
                                    </div>
                                    <h4 className="text-slate-800 font-bold">
                                        {selectedBooking.status === 'cancelled' ? 'Booking Cancelled' : 'Payment Complete'}
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium mt-1">No pending actions required for this booking.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
