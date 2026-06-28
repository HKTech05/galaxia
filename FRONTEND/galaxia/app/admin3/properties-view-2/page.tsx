"use client";

import { useState, useEffect } from "react";
import { 
    Calendar, 
    Home, 
    Users, 
    Smartphone, 
    Coins, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    HelpCircle, 
    RefreshCw, 
    ArrowLeftRight,
    Search,
    Loader2
} from "lucide-react";
import { api } from "../../../lib/api";

interface Booking {
    id: number;
    bookingRef: string;
    customerName: string;
    numGuests: number;
    numKids: number;
    status: string;
    assignedUnit: string | null;
    checkInDate: string;
    checkOutDate: string;
    balanceAmount: number;
    securityDeposit: number;
    balanceCollected: boolean;
    balanceMethod: string | null;
    depositCollected: boolean;
    depositMethod: string | null;
    foodBills: Array<{
        amount: number;
        paymentMethod: string;
    }>;
    property?: { name: string } | null;
    subProperty?: { name: string } | null;
    propertyId?: number;
    subPropertyId?: number | null;
}

export default function PropertiesView2Page() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });

    const [propertyFilter, setPropertyFilter] = useState<"all" | "amstel">("all");
    const [modeFilter, setModeFilter] = useState<"checkin" | "checkout">("checkin");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    const [properties, setProperties] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get<{ properties: any[]; activeBookings: Booking[] }>(
                `/admin/dashboard/property-status?date=${selectedDate}`
            );
            setProperties(res?.properties || []);
            setBookings(res?.activeBookings || []);
        } catch (err) {
            console.error("Failed to fetch property status data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Format date helper
    const formatDisplayDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    // Filter bookings by date selection (check-in day or check-out day matches selected date)
    const filteredBookings = bookings.filter(b => {
        const checkInStr = b.checkInDate ? b.checkInDate.slice(0, 10) : "";
        const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
        
        if (modeFilter === "checkin") {
            return checkInStr === selectedDate;
        } else {
            return checkOutStr === selectedDate;
        }
    });

    // Helper to render payment method icons
    const renderPaymentIcon = (method: string | null | undefined, collected: boolean) => {
        if (!collected || !method) return <span className="text-slate-300 font-medium text-xs">—</span>;
        const normalized = method.toLowerCase();
        if (normalized.includes("upi") || normalized.includes("online")) {
            return (
                <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-bold text-[10px] uppercase">
                    <Smartphone size={10} className="stroke-[2.5px]" /> UPI
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold text-[10px] uppercase">
                <Coins size={10} className="stroke-[2.5px]" /> Cash
            </span>
        );
    };

    // Helper to render food bill payment info
    const renderFoodBillStatus = (billList: Array<{ amount: number; paymentMethod: string }> | undefined) => {
        if (!billList || billList.length === 0) return <span className="text-slate-300 font-medium text-xs">—</span>;
        const totalAmount = billList.reduce((sum, b) => sum + (b.amount || 0), 0);
        const upi = billList.some(b => b.paymentMethod?.toLowerCase().includes("upi"));
        return (
            <div className="flex flex-col items-end">
                <span className="text-xs font-black text-slate-800">₹{totalAmount}</span>
                <span className="mt-0.5">
                    {renderPaymentIcon(upi ? "UPI" : "Cash", true)}
                </span>
            </div>
        );
    };

    // Helper to render status tag
    const renderStatusBadge = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === "checked_in") {
            return (
                <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Checked In
                </span>
            );
        } else if (normalized === "checked_out") {
            return (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Checked Out
                </span>
            );
        } else if (normalized === "cancelled" || normalized === "canceled") {
            return (
                <span className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <XCircle size={10} /> Cancelled
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Clock size={10} /> Pending
            </span>
        );
    };

    // Build tabular rows based on requirements
    // Ambrose Villas first: V1, V2, V3, V4
    // Then rest of properties (unless filter is "amstel")
    const getPropertiesRows = () => {
        const rows: Array<{
            unitName: string;
            propertyName: string;
            booking: Booking | null;
        }> = [];

        // 1. Find Ambrose sub-properties/villas
        const ambroseProp = properties.find(p => p.name?.toLowerCase().includes("ambrose"));
        const ambroseVillas = ambroseProp ? (ambroseProp.subProperties || []) : [
            { id: 9991, name: "Villa 1" },
            { id: 9992, name: "Villa 2" },
            { id: 9993, name: "Villa 3" },
            { id: 9994, name: "Villa 4" }
        ];

        ambroseVillas.forEach((v: any) => {
            const booking = filteredBookings.find(b => 
                b.assignedUnit === v.name || 
                (b.property?.name?.toLowerCase().includes("ambrose") && b.assignedUnit === v.name)
            ) || null;
            
            if (propertyFilter === "all") {
                rows.push({
                    unitName: v.name,
                    propertyName: "Ambrose",
                    booking
                });
            }
        });

        // 2. Find Amstel Nest sub-properties/cottages
        const amstelProp = properties.find(p => p.name?.toLowerCase().includes("amstel"));
        const amstelCottages = amstelProp ? (amstelProp.subProperties || []) : [
            { id: 8881, name: "Cottage 1" },
            { id: 8882, name: "Cottage 2" },
            { id: 8883, name: "Cottage 3" },
            { id: 8884, name: "Cottage 4" }
        ];

        amstelCottages.forEach((c: any) => {
            const booking = filteredBookings.find(b => 
                b.assignedUnit === c.name || 
                (b.property?.name?.toLowerCase().includes("amstel") && b.assignedUnit === c.name)
            ) || null;
            
            rows.push({
                unitName: c.name,
                propertyName: "Amstel Nest",
                booking
            });
        });

        // 3. Find standalone or other properties
        if (propertyFilter === "all") {
            properties.forEach(p => {
                const nameLower = (p.name || "").toLowerCase();
                // Exclude Ambrose, Amstel Nest, and DD
                if (!nameLower.includes("ambrose") && !nameLower.includes("amstel") && !nameLower.includes("diaries") && !nameLower.includes("screen")) {
                    const booking = filteredBookings.find(b => 
                        b.propertyId === p.id && !b.subPropertyId
                    ) || null;

                    rows.push({
                        unitName: p.name,
                        propertyName: p.name,
                        booking
                    });
                }
            });
        }

        // Apply Search Filter if any
        if (searchTerm.trim() !== "") {
            const s = searchTerm.toLowerCase();
            return rows.filter(r => 
                r.unitName.toLowerCase().includes(s) ||
                r.propertyName.toLowerCase().includes(s) ||
                (r.booking && (
                    r.booking.customerName.toLowerCase().includes(s) ||
                    r.booking.bookingRef.toLowerCase().includes(s)
                ))
            );
        }

        return rows;
    };

    const displayRows = getPropertiesRows();

    return (
        <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Home className="text-indigo-600" size={24} /> Live Checkin Tracker 2
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Villa occupancy list sorted by Ambrose followed by remaining properties.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-800 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-100 transition-all uppercase tracking-wider"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Filters Dashboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Date Selector */}
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        />
                    </div>

                    {/* All vs Amstel Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setPropertyFilter("all")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                propertyFilter === "all"
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            All Properties
                        </button>
                        <button
                            onClick={() => setPropertyFilter("amstel")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                propertyFilter === "amstel"
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Amstel Nest
                        </button>
                    </div>

                    {/* Check-in vs Check-out Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setModeFilter("checkin")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                modeFilter === "checkin"
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Checkins
                        </button>
                        <button
                            onClick={() => setModeFilter("checkout")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                modeFilter === "checkout"
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Checkouts
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by villa or guest..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                </div>
            </div>

            {/* Tabular Layout */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Villa Allotted</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Property</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Checkin / Checkout</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">People</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Collected</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Deposit</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Food Bill</th>
                                <th className="px-4 md:px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin mx-auto text-indigo-500" size={28} />
                                        <p className="text-sm text-slate-500 mt-2">Loading check-in data...</p>
                                    </td>
                                </tr>
                            ) : displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No checkin records matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map((row, idx) => {
                                    const b = row.booking;
                                    return (
                                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${!b ? "bg-slate-50/20" : ""}`}>
                                            {/* Villa Allotted */}
                                            <td className="px-4 md:px-5 py-4">
                                                <span className="font-extrabold text-slate-800 text-sm">{row.unitName}</span>
                                            </td>

                                            {/* Property */}
                                            <td className="px-4 md:px-5 py-4">
                                                <span className="text-slate-500 font-semibold text-xs">{row.propertyName}</span>
                                            </td>

                                            {/* Check-in / Check-out Date */}
                                            <td className="px-4 md:px-5 py-4">
                                                {b ? (
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                        <span>{new Date(b.checkInDate).toLocaleDateString("en-IN", {day:"2-digit", month:"short"})}</span>
                                                        <ArrowLeftRight size={10} className="text-slate-400 shrink-0" />
                                                        <span>{new Date(b.checkOutDate).toLocaleDateString("en-IN", {day:"2-digit", month:"short"})}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Guest Name */}
                                            <td className="px-4 md:px-5 py-4">
                                                {b ? (
                                                    <div>
                                                        <p className="font-extrabold text-slate-800 text-xs">{b.customerName}</p>
                                                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{b.bookingRef}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-bold italic text-xs">Vacant</span>
                                                )}
                                            </td>

                                            {/* Number of People */}
                                            <td className="px-4 md:px-5 py-4 text-center">
                                                {b ? (
                                                    <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1">
                                                        <Users size={12} className="text-slate-400" />
                                                        {b.numGuests + b.numKids}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Balance Amount */}
                                            <td className="px-4 md:px-5 py-4 text-right">
                                                {b ? (
                                                    <span className="text-xs font-black text-slate-800">₹{(b.balanceAmount || 0).toLocaleString("en-IN")}</span>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Collected in UPI/Cash */}
                                            <td className="px-4 md:px-5 py-4 text-center">
                                                {b ? (
                                                    renderPaymentIcon(b.balanceMethod, b.balanceCollected)
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Deposit Collected */}
                                            <td className="px-4 md:px-5 py-4 text-center">
                                                {b ? (
                                                    <div className="flex flex-col items-center">
                                                        {b.securityDeposit > 0 ? (
                                                            <>
                                                                <span className="text-[10px] font-black text-slate-800">₹{b.securityDeposit}</span>
                                                                <span className="mt-0.5">
                                                                    {renderPaymentIcon(b.depositMethod, b.depositCollected)}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 text-[10px] font-bold">No Deposit</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Food Bill */}
                                            <td className="px-4 md:px-5 py-4 text-right">
                                                {b ? (
                                                    renderFoodBillStatus(b.foodBills)
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 md:px-5 py-4 text-center">
                                                {b ? (
                                                    renderStatusBadge(b.status)
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Vacant
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
