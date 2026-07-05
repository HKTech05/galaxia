"use client";

import { useState, useEffect } from "react";
import { 
    Home, 
    X,
    Loader2, 
    IndianRupee,
    ArrowLeftRight,
    Search,
    Download,
    AlertTriangle,
    UtensilsCrossed
} from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

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
        description: string;
        amount: number;
        paymentMethod: string;
    }>;
    property?: { name: string } | null;
    subProperty?: { name: string } | null;
    propertyId?: number;
    subPropertyId?: number | null;
    balanceUpiId?: number | null;
    depositUpiId?: number | null;
    refundUpiId?: number | null;
    depositRefunded: boolean;
    depositRefundMethod: string | null;
    totalAmount?: number;
    advanceAmount?: number;
    advanceMethod?: string | null;
    advancePaid?: boolean;
    upiPayments?: Array<{
        id: number;
        paymentType: string;
        amount: number;
    }>;
}

interface ChefLog {
    id: number;
    actionType: string;
    details: string;
    createdAt: string;
    admin?: {
        displayName: string;
        username: string;
    } | null;
}

export default function PropertiesView2Page() {
    const [propertyDate, setPropertyDate] = useState(new Date());
    const [propertyFilter, setPropertyFilter] = useState<"all" | "amstel">("all");
    const [modeFilter, setModeFilter] = useState<"checkin" | "checkout">("checkin");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    const [properties, setProperties] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [logs, setLogs] = useState<ChefLog[]>([]);
    
    // Preview modals state
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [selectedFoodBooking, setSelectedFoodBooking] = useState<Booking | null>(null);

    const fmtLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const fetchData = async () => {
        try {
            setLoading(true);
            const selectedDateStr = fmtLocalDate(propertyDate);
            const [res, logsData] = await Promise.all([
                api.get<{ properties: any[]; activeBookings: Booking[] }>(
                    `/admin/dashboard/property-status?date=${selectedDateStr}`
                ),
                api.get<ChefLog[]>("/chef/logs").catch(err => {
                    console.error("Failed to fetch chef logs:", err);
                    return [] as ChefLog[];
                })
            ]);
            setProperties(res?.properties || []);
            setBookings(res?.activeBookings || []);
            setLogs(logsData || []);
        } catch (err) {
            console.error("Failed to fetch property status data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [propertyDate]);

    // Format date string for API
    const selectedDateStr = fmtLocalDate(propertyDate);

    // Filter bookings by date selection (check-in day or check-out day matches selected date)
    const filteredBookings = bookings.filter(b => {
        const checkInStr = b.checkInDate ? b.checkInDate.slice(0, 10) : "";
        const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
        
        if (modeFilter === "checkin") {
            return checkInStr === selectedDateStr || (checkInStr < selectedDateStr && checkOutStr > selectedDateStr);
        } else {
            return checkOutStr === selectedDateStr;
        }
    });

    // Helper to fetch UPI proof image blob and preview
    const handleViewProof = async (logId: number) => {
        try {
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`/api/upi-payments/image/${logId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                alert("Failed to load proof image");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPreviewImageUrl(url);
        } catch (err) {
            console.error("Error showing proof:", err);
            alert("Failed to load proof image");
        }
    };

    // Helper to render status badge
    const renderStatusBadgeForBooking = (b: Booking) => {
        if (b.status === "checked_out") {
            return (
                <span className="inline-flex items-center bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Checked Out
                </span>
            );
        }
        if (modeFilter === "checkin") {
            const checkInToday = b.checkInDate ? b.checkInDate.slice(0, 10) === selectedDateStr : false;
            if (checkInToday) {
                if (b.status === "checked_in") {
                    return (
                        <span className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Checked In
                        </span>
                    );
                } else {
                    return (
                        <span className="inline-flex items-center bg-amber-50 border border-amber-100 text-amber-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Pending to Arrive
                        </span>
                    );
                }
            } else {
                return (
                    <span className="inline-flex items-center bg-red-50 border border-red-100 text-red-600 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Continue
                    </span>
                );
            }
        } else {
            if (b.status === "checked_out") {
                return (
                    <span className="inline-flex items-center bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Checked Out
                    </span>
                );
            } else {
                return (
                    <span className="inline-flex items-center bg-amber-50 border border-amber-100 text-amber-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pending checkout
                    </span>
                );
            }
        }
    };

    // Render Food Bill cell with clickable breakdown and click-to-view UPI proof if applicable
    const renderFoodBillStatus = (b: Booking) => {
        const billList = b.foodBills || [];
        if (billList.length === 0) return <span className="text-slate-300 font-medium text-xs">—</span>;
        
        const totalAmount = billList.reduce((sum, f) => sum + (f.amount || 0), 0);
        const upi = billList.some(f => f.paymentMethod?.toLowerCase().includes("upi"));
        const upiPaymentRecord = b.upiPayments?.find(u => u.paymentType === "food_collection");

        return (
            <div className="flex flex-col items-end">
                <button
                    onClick={() => setSelectedFoodBooking(b)}
                    className="text-xs font-black text-slate-800 hover:underline hover:text-indigo-600 transition-colors"
                >
                    ₹{totalAmount.toLocaleString("en-IN")}
                </button>
                <div className="mt-1">
                    {upi ? (
                        upiPaymentRecord ? (
                            <button
                                onClick={() => handleViewProof(upiPaymentRecord.id)}
                                className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors uppercase cursor-pointer"
                            >
                                UPI
                            </button>
                        ) : (
                            <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                                UPI
                            </span>
                        )
                    ) : (
                        <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                            CASH
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // Get audit logs matching the food modal booking's villa
    const getAuditLogsForBooking = (b: Booking) => {
        const villaName = (b.assignedUnit || b.subProperty?.name || "").toLowerCase();
        if (!villaName) return [];
        return logs.filter(log => {
            const details = log.details.toLowerCase();
            return (log.actionType === "modify_request" || log.actionType === "delete_request") && details.includes(villaName);
        });
    };

    // Build tabular rows based on requirements
    const getPropertiesRows = () => {
        const rows: Array<{
            unitName: string;
            propertyName: string;
            booking: Booking | null;
        }> = [];

        // Helper to match bookings for a specific unit
        const getUnitBooking = (unitName: string, propName: string) => {
            const matches = bookings.filter(b => {
                const bPropName = b.property?.name?.toLowerCase() || "";
                const isMatchingProp = propName.toLowerCase().includes("ambrose")
                    ? bPropName.includes("ambrose")
                    : propName.toLowerCase().includes("amstel")
                        ? bPropName.includes("amstel")
                        : bPropName.includes(propName.toLowerCase()) || propName.toLowerCase().includes(bPropName);

                if (!isMatchingProp) return false;
                
                // For Amstel/Ambrose, match unit name
                if (!b.assignedUnit) return false;
                const units = b.assignedUnit.split(", ").map(u => u.trim());
                if (!units.includes(unitName)) return false;

                return true;
            });

            if (matches.length === 0) return null;

            if (modeFilter === "checkin") {
                // Find booking staying today (not checkout-only)
                // checkout-only means checkOutDate is today and checkInDate is before today
                const active = matches.find(b => {
                    const checkInStr = b.checkInDate ? b.checkInDate.slice(0, 10) : "";
                    const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
                    const isCheckoutOnly = checkOutStr === selectedDateStr && checkInStr !== selectedDateStr;
                    return !isCheckoutOnly;
                });
                return active || null;
            } else {
                // Find booking checking out today
                const checkout = matches.find(b => {
                    const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
                    return checkOutStr === selectedDateStr;
                });
                return checkout || null;
            }
        };

        // Helper to match bookings for a standalone property
        const getStandaloneBooking = (propId: number) => {
            const matches = bookings.filter(b => b.propertyId === propId && !b.subPropertyId);
            if (matches.length === 0) return null;

            if (modeFilter === "checkin") {
                const active = matches.find(b => {
                    const checkInStr = b.checkInDate ? b.checkInDate.slice(0, 10) : "";
                    const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
                    const isCheckoutOnly = checkOutStr === selectedDateStr && checkInStr !== selectedDateStr;
                    return !isCheckoutOnly;
                });
                return active || null;
            } else {
                const checkout = matches.find(b => {
                    const checkOutStr = b.checkOutDate ? b.checkOutDate.slice(0, 10) : "";
                    return checkOutStr === selectedDateStr;
                });
                return checkout || null;
            }
        };

        // 1. Ambrose (only in "all" view)
        if (propertyFilter === "all") {
            const ambroseProp = properties.find(p => p.name?.toLowerCase().includes("ambrose"));
            const defaultAmbroseVillas = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"];
            const villasToUse = ambroseProp && ambroseProp.subProperties && ambroseProp.subProperties.length > 0
                ? ambroseProp.subProperties.map((v: any) => v.name)
                : defaultAmbroseVillas;

            villasToUse.forEach((vName: string) => {
                const booking = getUnitBooking(vName, "Ambrose");
                rows.push({
                    unitName: vName,
                    propertyName: "Ambrose",
                    booking
                });
            });
        }

        // 2. Amstel Nest (only in "amstel" view)
        if (propertyFilter === "amstel") {
            const amstelCottages = [
                ...Array.from({ length: 14 }, (_, i) => `Cottage ${i + 1}`),
                "Family Cottage"
            ];

            amstelCottages.forEach((cName: string) => {
                const booking = getUnitBooking(cName, "Amstel Nest");
                rows.push({
                    unitName: cName,
                    propertyName: "Amstel Nest",
                    booking
                });
            });
        }

        // 3. Standalone / other properties (only in "all" view)
        if (propertyFilter === "all") {
            properties.forEach(p => {
                const nameLower = (p.name || "").toLowerCase();
                // Exclude Ambrose, Amstel Nest, and DD
                if (!nameLower.includes("ambrose") && !nameLower.includes("amstel") && !nameLower.includes("diaries") && !nameLower.includes("screen")) {
                    const booking = getStandaloneBooking(p.id);
                    rows.push({
                        unitName: p.name,
                        propertyName: p.name,
                        booking
                    });
                }
            });
        }

        // Apply checkout filter: if mode is checkout, keep only rows with bookings
        let filteredRows = rows;
        if (modeFilter === "checkout") {
            filteredRows = rows.filter(r => r.booking !== null);
        }

        // Apply Search Filter if any
        if (searchTerm.trim() !== "") {
            const s = searchTerm.toLowerCase();
            return filteredRows.filter(r => 
                r.unitName.toLowerCase().includes(s) ||
                r.propertyName.toLowerCase().includes(s) ||
                (r.booking && (
                    r.booking.customerName.toLowerCase().includes(s) ||
                    r.booking.bookingRef.toLowerCase().includes(s)
                ))
            );
        }

        return filteredRows;
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
            </div>

            {/* Filters Dashboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Same datepicker style & CSS as properties-view */}
                    <div className="relative">
                        <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
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
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Villa Allotted</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Property</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Checkin - Checkout</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">People</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Advance Paid</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Deposit</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Deposit Refunded</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Food Bill</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin mx-auto text-indigo-500" size={28} />
                                        <p className="text-sm text-slate-500 mt-2">Loading check-in data...</p>
                                    </td>
                                </tr>
                            ) : displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No checkin records matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map((row, idx) => {
                                    const b = row.booking;
                                    
                                    // Robust UPI lookups
                                    const advanceUpi = b?.upiPayments?.find(u => u.paymentType === "advance") || b?.upiPayments?.find(u => u.amount === b?.advanceAmount);
                                    const balanceUpi = b?.upiPayments?.find(u => u.paymentType === "balance") || b?.upiPayments?.find(u => u.amount === b.balanceAmount);
                                    const depositUpi = b?.upiPayments?.find(u => u.paymentType === "deposit") || b?.upiPayments?.find(u => u.amount === b.securityDeposit);
                                    const refundUpi = b?.upiPayments?.find(u => u.paymentType === "deposit_refund") || b?.upiPayments?.find(u => u.amount === -b.securityDeposit || Math.abs(u.amount) === Math.abs(b.securityDeposit));

                                    const advanceUpiId = advanceUpi?.id || null;
                                    const balanceUpiId = balanceUpi?.id || b?.balanceUpiId || null;
                                    const depositUpiId = depositUpi?.id || b?.depositUpiId || null;
                                    const refundUpiId = refundUpi?.id || b?.refundUpiId || null;
                                    
                                    return (
                                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors border-b border-slate-100 ${!b ? "bg-slate-50/20" : ""}`}>
                                            {/* Villa Allotted */}
                                            <td className="px-5 py-4 align-middle">
                                                <span className="font-extrabold text-slate-800 text-sm">{row.unitName}</span>
                                            </td>

                                            {/* Property */}
                                            <td className="px-5 py-4 align-middle">
                                                <span className="text-slate-500 font-semibold text-xs">{row.propertyName}</span>
                                            </td>

                                            {/* Check-in / Check-out Date */}
                                            <td className="px-5 py-4 align-middle">
                                                {b ? (
                                                    <div className="text-[11px] font-bold text-slate-600">
                                                        {new Date(b.checkInDate).toLocaleDateString("en-IN", {day:"2-digit", month:"short"})} - {new Date(b.checkOutDate).toLocaleDateString("en-IN", {day:"2-digit", month:"short"})}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Guest Name */}
                                            <td className="px-5 py-4 align-middle">
                                                {b ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="font-extrabold text-slate-800 text-xs">{b.customerName}</p>
                                                            {modeFilter === "checkin" && b.checkInDate && b.checkInDate.slice(0, 10) !== selectedDateStr && (
                                                                <span className="text-[9px] text-red-600 bg-red-50 border border-red-100 font-extrabold px-1.5 py-0.25 rounded uppercase">
                                                                    Continue
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{b.bookingRef}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-bold italic text-xs">Vacant</span>
                                                )}
                                            </td>

                                            {/* Number of People */}
                                            <td className="px-5 py-4 align-middle text-center">
                                                {b ? (
                                                    <span className="text-xs font-bold text-slate-800">
                                                        {b.numGuests + b.numKids}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Total Amount */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    <span className="text-xs font-black text-slate-800">₹{(b.totalAmount || 0).toLocaleString("en-IN")}</span>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Advance Paid with Payment Method details */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-slate-800">₹{(b.advanceAmount || 0).toLocaleString("en-IN")}</span>
                                                        {b.advancePaid && b.advanceMethod && (
                                                            <div className="mt-1">
                                                                {b.advanceMethod.toLowerCase().includes("upi") ? (
                                                                    <button
                                                                        onClick={() => advanceUpiId ? handleViewProof(advanceUpiId) : alert("No proof image uploaded for this advance payment")}
                                                                        className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors uppercase cursor-pointer"
                                                                    >
                                                                        UPI
                                                                    </button>
                                                                ) : (
                                                                    <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                                                        CASH
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Balance Amount with Payment Method details */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-slate-800">₹{(b.balanceAmount || 0).toLocaleString("en-IN")}</span>
                                                        {b.balanceCollected && b.balanceMethod && (
                                                            <div className="mt-1">
                                                                {b.balanceMethod.toLowerCase().includes("upi") || b.balanceMethod.toLowerCase().includes("online") ? (
                                                                    <button
                                                                        onClick={() => balanceUpiId ? handleViewProof(balanceUpiId) : alert("No proof image uploaded for this balance payment")}
                                                                        className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors uppercase cursor-pointer"
                                                                    >
                                                                        UPI
                                                                    </button>
                                                                ) : (
                                                                    <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                                                        CASH
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Security Deposit with Payment Method details */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-slate-800">₹{(b.securityDeposit || 0).toLocaleString("en-IN")}</span>
                                                        {b.depositCollected && b.depositMethod && (
                                                            <div className="mt-1">
                                                                {b.depositMethod.toLowerCase().includes("upi") ? (
                                                                     <button
                                                                         onClick={() => depositUpiId ? handleViewProof(depositUpiId) : alert("No proof image uploaded for this deposit payment")}
                                                                         className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors uppercase cursor-pointer"
                                                                     >
                                                                         UPI
                                                                     </button>
                                                                ) : (
                                                                    <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                                                        CASH
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Deposit Refunded Column */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    b.depositRefunded ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-black text-slate-800">₹{(b.securityDeposit || 0).toLocaleString("en-IN")}</span>
                                                            {b.depositRefundMethod && (
                                                                <div className="mt-1">
                                                                    {b.depositRefundMethod.toLowerCase().includes("upi") ? (
                                                                        <button
                                                                            onClick={() => refundUpiId ? handleViewProof(refundUpiId) : alert("No proof image uploaded for this refund")}
                                                                            className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors uppercase cursor-pointer"
                                                                        >
                                                                            UPI
                                                                        </button>
                                                                    ) : (
                                                                        <span className="font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                                                            CASH
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 font-bold px-1.5 py-0.5 rounded uppercase">
                                                                Pending
                                                            </span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Food Bill with Payment details */}
                                            <td className="px-5 py-4 align-middle text-right">
                                                {b ? (
                                                    renderFoodBillStatus(b)
                                                ) : (
                                                    <span className="text-slate-300 font-semibold text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-5 py-4 align-middle text-center">
                                                {b ? (
                                                    renderStatusBadgeForBooking(b)
                                                ) : (
                                                    <span className="inline-flex items-center bg-slate-100 border border-slate-200 text-slate-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
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

            {/* Food Bill Breakdown Modal */}
            {selectedFoodBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <UtensilsCrossed className="text-amber-600" size={18} />
                                    Food Bill Breakdown
                                </h3>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">{selectedFoodBooking.bookingRef}</p>
                            </div>
                            <button onClick={() => setSelectedFoodBooking(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Summary Metadata */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest Name</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedFoodBooking.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Villa / Unit</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedFoodBooking.assignedUnit || "Unassigned"}</p>
                                </div>
                            </div>

                            {/* Itemized list parsed from bill descriptions */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items Billed</h4>
                                <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    {selectedFoodBooking.foodBills.map((bill, bIdx) => (
                                        <div key={bIdx} className="p-2 space-y-1 bg-slate-50/30">
                                            {bill.description.split(", ").map((item, idx) => (
                                                <div key={idx} className="flex justify-between p-2 text-xs font-semibold text-slate-700">
                                                    <span>{item.split(" (₹")[0]}</span>
                                                    <span className="text-emerald-700 font-bold">₹{item.split(" (₹")[1]?.replace(")", "") || ""}</span>
                                                </div>
                                            ))}
                                            <div className="text-right text-[10px] text-slate-400 font-bold px-2">
                                                Paid via {bill.paymentMethod}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Logs for Order Modifications / Deletions */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 text-red-600">
                                    <AlertTriangle size={14} className="text-red-500" />
                                    Order Audit / Modification History
                                </h4>
                                <div className="space-y-2">
                                    {getAuditLogsForBooking(selectedFoodBooking).length === 0 ? (
                                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200/50 text-center">
                                            No deletions or modifications logged for this villa's order history.
                                        </p>
                                    ) : (
                                        getAuditLogsForBooking(selectedFoodBooking).map(log => (
                                            <div key={log.id} className="bg-red-50/50 border border-red-100 rounded-xl p-3 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-red-700">
                                                    <span>{log.actionType === "delete_request" ? "Entire Order Deleted" : "Line Item Modified/Reduced"}</span>
                                                    <span className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                </div>
                                                <p className="text-[11px] font-semibold text-slate-700">{log.details.split("): ")[1] || log.details}</p>
                                                <p className="text-[9px] text-slate-400 font-bold text-right">— Performed by {log.admin?.displayName || "Staff"}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <div className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                                <span className="text-slate-500 text-xs font-semibold mr-1">Total Food Bill paid:</span>
                                ₹{selectedFoodBooking.foodBills.reduce((sum, f) => sum + (f.amount || 0), 0).toLocaleString("en-IN")}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Lightbox / Modal */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-slate-600 hover:text-red-500 transition-colors z-10"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="UPI Payment Proof"
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white"
                        />
                        <div className="mt-3 flex justify-center">
                            <button
                                onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = previewImageUrl;
                                    a.download = "upi-proof.jpg";
                                    a.click();
                                }}
                                className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Download size={16} /> Download Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
