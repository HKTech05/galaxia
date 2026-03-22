"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MoreVertical, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { api } from "../../../lib/api";

interface DDBooking {
    id: string;
    customer: string;
    phone: string;
    screen: string;
    date: string;
    slot: string;
    source: string;
    upfrontAmt: string;
    upfrontMode: string;
    remainingAmt: string;
    remainingStatus: string;
    status: string;
}

export default function Admin3BookingsPage() {
    const [ddBookings, setDdBookings] = useState<DDBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [screenFilter, setScreenFilter] = useState("All");

    const fetchBookings = useCallback(async () => {
        try {
            const data = await api.get("/bookings/dd");
            // Map API response to DDBooking interface
            const mapped = (Array.isArray(data) ? data : []).map((b: any) => {
                const startHr = b.startHour || 0;
                const endHr = startHr + (b.durationHours || 1);
                const fmtHour = (h: number) => {
                    const ampm = h >= 12 ? "PM" : "AM";
                    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
                    return `${hr}:00 ${ampm}`;
                };
                return {
                    id: b.bookingRef || `#DD-${b.id}`,
                    customer: b.customerName || "Unknown",
                    phone: b.customerPhone || "",
                    screen: b.screen?.name ? `${b.screen.name} (Digital Diaries)` : "Unknown",
                    date: b.bookingDate ? new Date(b.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    slot: `${fmtHour(startHr)} - ${fmtHour(endHr)}`,
                    source: b.source === "website" ? "Online" : "Walk-in",
                    upfrontAmt: `₹${(b.amountPaid || 0).toLocaleString('en-IN')}`,
                    upfrontMode: b.paymentMethod || "Online",
                    remainingAmt: `₹${(b.amountToCollect || 0).toLocaleString('en-IN')}`,
                    remainingStatus: (b.amountToCollect || 0) <= 0 ? "Paid" : "Pending",
                    status: b.status === "confirmed" ? "Confirmed" : b.status === "cancelled" ? "Cancelled" : b.status || "Confirmed",
                };
            });
            setDdBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch DD bookings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const filteredBookings = ddBookings.filter(b => {
        const matchesSearch = b.customer.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || b.status === statusFilter;
        const matchesScreen = screenFilter === "All" || b.screen === screenFilter;
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
                        placeholder="Search Time, ID, or Customer"
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
                            <option value="Cine Love">Cine Love</option>
                            <option value="Sandy Screen">Sandy Screen</option>
                            <option value="Park N Watch">Park N Watch</option>
                            <option value="Baywatch">Baywatch</option>
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
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No bookings found.</td>
                                </tr>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-slate-800">{booking.id}</span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${booking.source === 'Online' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                        {booking.source}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">{booking.customer}</span>
                                                <span className="text-[11px] font-bold text-slate-400 mt-0.5">{booking.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wide rounded border border-indigo-100">
                                                {booking.screen}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-800">{booking.date}</span>
                                                <span className="text-xs font-medium text-slate-500">{booking.slot}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-slate-800">{booking.upfrontAmt}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{booking.upfrontMode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-slate-800">{booking.remainingAmt}</span>
                                                {booking.remainingStatus === 'Pending' ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">{booking.remainingStatus}</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{booking.remainingStatus}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${booking.status === 'Confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                                                }`}>
                                                {booking.status === 'Confirmed' && <CheckCircle size={14} />}
                                                {booking.status === 'Cancelled' && <XCircle size={14} />}
                                                {booking.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
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
        </div>
    );
}
