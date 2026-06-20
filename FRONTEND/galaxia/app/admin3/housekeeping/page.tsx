"use client";

import { useState, useEffect } from "react";
import { 
    ClipboardCheck, 
    Clock, 
    Check, 
    RefreshCw, 
    Calendar,
    User,
    AlertCircle,
    UserCheck,
    Coffee,
    X
} from "lucide-react";
import { api } from "../../../lib/api";

interface HospitalityRequest {
    id: number;
    villaName: string;
    itemCategory: string;
    items: { name: string; quantity: number; price: number }[];
    status: string;
    isBilled: boolean;
    bookingId: number | null;
    createdAt: string;
    booking?: {
        id: number;
        customerName: string;
        bookingRef: string;
    };
}

export default function HousekeepingPortalPage() {
    const [requests, setRequests] = useState<HospitalityRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userRole, setUserRole] = useState("");

    // Guest allocations/allotments states
    const [allocations, setAllocations] = useState<any[]>([]);
    const [loadingAllocations, setLoadingAllocations] = useState(false);
    const [allocationsError, setAllocationsError] = useState("");
    
    // Date filter: defaults to today (YYYY-MM-DD)
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });

    useEffect(() => {
        // Fetch current user details to check access
        api.get("/auth/me")
            .then(data => {
                setUserRole(data?.role || "");
            })
            .catch(err => {
                console.error("Error fetching user role:", err);
            });
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api.get<HospitalityRequest[]>(
                `/hospitality/requests?category=Normal&date=${selectedDate}`
            );
            if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch housekeeping requests.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllocations = async () => {
        setLoadingAllocations(true);
        setAllocationsError("");
        try {
            const data = await api.get<any[]>(
                `/hospitality/allocations?date=${selectedDate}`
            );
            if (Array.isArray(data)) {
                setAllocations(data);
            }
        } catch (err: any) {
            setAllocationsError(err.message || "Failed to fetch villa allotments.");
        } finally {
            setLoadingAllocations(false);
        }
    };

    const getStayStatus = (booking: any, targetDateStr: string) => {
        try {
            const ci = new Date(booking.checkInDate).toISOString().split("T")[0];
            const co = new Date(booking.checkOutDate).toISOString().split("T")[0];
            if (ci === targetDateStr) {
                return { label: "Check-In", bg: "bg-blue-50 text-blue-700 border-blue-100" };
            } else if (co === targetDateStr) {
                return { label: "Check-Out", bg: "bg-amber-50 text-amber-700 border-amber-100" };
            } else {
                return { label: "Stayover", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
            }
        } catch (e) {
            return { label: "Stayover", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        }
    };

    useEffect(() => {
        if (userRole) {
            fetchRequests();
            fetchAllocations();
        }
    }, [selectedDate, userRole]);

    const handleFulfilRequest = async (id: number) => {
        try {
            const res = await api.put<{ success: boolean }>(`/hospitality/requests/${id}`, {
                status: "fulfilled"
            });
            if (res.success) {
                // Update local state
                setRequests(prev => 
                    prev.map(r => r.id === id ? { ...r, status: "fulfilled" } : r)
                );
            }
        } catch (err: any) {
            alert(err.message || "Failed to update request status.");
        }
    };

    if (userRole && userRole !== "housekeeping" && userRole !== "owner" && userRole !== "developer") {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
                <p className="text-slate-400 text-sm">
                    Only Housekeeping staff, Owners, or Developers can access this page.
                </p>
            </div>
        );
    }

    const pendingRequests = requests.filter(r => r.status === "pending");
    const fulfilledRequests = requests.filter(r => r.status === "fulfilled");

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                            <ClipboardCheck size={36} className="text-blue-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Housekeeping Portal</h1>
                            <p className="text-blue-200 text-xs sm:text-sm font-medium mt-1">
                                Manage daily in-villa requests, check guest details, and mark requests as done.
                            </p>
                        </div>
                    </div>
                    
                    {/* Date picker */}
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-2.5 rounded-xl border border-white/5 self-start md:self-auto">
                        <Calendar size={18} className="text-blue-300" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-xs sm:text-sm font-semibold tracking-wide font-mono text-blue-100 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Villa Allotments Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardCheck size={20} className="text-indigo-600" />
                        Villa Allotments ({selectedDate})
                    </h2>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {allocations.length} Active Guests
                    </span>
                </div>

                {loadingAllocations ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                        <p className="text-xs font-semibold">Loading allotments...</p>
                    </div>
                ) : allocationsError ? (
                    <div className="text-red-500 text-xs font-semibold p-3 bg-red-50 rounded-xl flex items-center gap-2">
                        <AlertCircle size={14} />
                        {allocationsError}
                    </div>
                ) : allocations.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-xs font-medium">
                        No guest allotments for this day.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Villa / Cottage</th>
                                    <th className="py-2.5 px-3">Guest Name</th>
                                    <th className="py-2.5 px-3">Booking Ref</th>
                                    <th className="py-2.5 px-3">Stay Dates</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                                {allocations.map((alloc) => {
                                    const statusInfo = getStayStatus(alloc, selectedDate);
                                    const unitName = alloc.assignedUnit || alloc.subPropertyName || alloc.propertyName || "Not Assigned";
                                    return (
                                        <tr key={alloc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-3 font-bold text-slate-800">{unitName}</td>
                                            <td className="py-3 px-3 font-semibold text-slate-700">{alloc.customerName}</td>
                                            <td className="py-3 px-3 font-mono font-medium text-slate-400">{alloc.bookingRef}</td>
                                            <td className="py-3 px-3 text-slate-500 font-medium">
                                                {new Date(alloc.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {new Date(alloc.checkOutDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.bg}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Main view grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Pending Requests Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Clock size={20} className="text-blue-600" />
                                Pending Requests
                            </h2>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                                {pendingRequests.length} Pending
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <RefreshCw size={36} className="animate-spin text-blue-600" />
                                <p className="text-sm font-semibold tracking-wide">Loading requests...</p>
                            </div>
                        ) : pendingRequests.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                <Check size={36} className="text-emerald-500 mx-auto mb-2" />
                                <p className="font-semibold text-sm text-slate-700">All caught up!</p>
                                <p className="text-xs mt-1">No pending housekeeping requests for this day.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((req) => (
                                    <div key={req.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4 hover:shadow-sm transition-shadow">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                                            <div>
                                                <h3 className="text-base font-extrabold text-slate-800">
                                                    {req.villaName}
                                                </h3>
                                                {req.booking ? (
                                                    <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                        <User size={12} />
                                                        {req.booking.customerName} ({req.booking.bookingRef})
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                                                        <AlertCircle size={12} />
                                                        No active booking found today
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-slate-400 self-start sm:self-auto bg-slate-200/50 px-2 py-0.5 rounded">
                                                {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested Items</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {req.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-lg px-3 py-2 shadow-sm">
                                                        <span className="font-semibold text-slate-700">{item.name}</span>
                                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                                            × {item.quantity}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                onClick={() => handleFulfilRequest(req.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-100 hover:shadow"
                                            >
                                                <Check size={14} className="stroke-[3px]" />
                                                Mark as Done
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Fulfilled Requests Column */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <UserCheck size={18} className="text-slate-500" />
                                Fulfilled Requests
                            </h2>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {fulfilledRequests.length} Done
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                <RefreshCw size={16} className="animate-spin text-slate-400" />
                                <span className="text-xs font-semibold">Loading...</span>
                            </div>
                        ) : fulfilledRequests.length === 0 ? (
                            <p className="text-center py-8 text-slate-400 text-xs font-medium">
                                No fulfilled requests yet for this day.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                                {fulfilledRequests.map((req) => (
                                    <div key={req.id} className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-200/50 pb-1.5">
                                            <span className="text-slate-700 font-bold text-xs">{req.villaName}</span>
                                            <span>
                                                {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {req.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-medium">
                                                    <span>{item.name}</span>
                                                    <span className="font-mono text-slate-400 font-bold">×{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                                            <span className="font-bold flex items-center gap-1">
                                                <Check size={10} className="stroke-[3px]" />
                                                Fulfilled
                                            </span>
                                            {req.isBilled ? (
                                                <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Billed</span>
                                            ) : (
                                                <span className="text-slate-400 font-semibold">Unbilled</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
