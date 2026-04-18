"use client";

import { useState, useEffect, useCallback } from "react";
import { Ticket, Plus, Trash2, Eye, X, CalendarDays, Hash, Percent, Users, CheckCircle, Search, Mail, Phone } from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

interface Coupon {
    id: string;
    code: string;
    discount: string;
    maxUses: number;
    currentUses: number;
    expiryDate: string;
    expiryHours?: number | null;
    createdAt?: string;
}

interface UsageLog {
    bookingRef: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    usedAt: string;
    discountSaved: number;
}

export default function CouponsClient() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewUsage, setViewUsage] = useState<string | null>(null);

    // Create Form State
    const [newCoupon, setNewCoupon] = useState({
        code: "",
        discount: "",
        maxUses: "",
        expiryDate: ""
    });
    const [expiryType, setExpiryType] = useState<"date" | "hours">("date");
    const [expiryHours, setExpiryHours] = useState("");

    // Fetch coupons from API
    const fetchCoupons = useCallback(async () => {
        try {
            const data = await api.get("/coupons");
            // Map API response to match frontend interface
            const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
                id: String(c.id),
                code: c.code,
                discount: c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`,
                maxUses: c.maxUses,
                currentUses: c.currentUses || 0,
                expiryDate: new Date(c.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                expiryHours: c.expiryHours || null,
                createdAt: c.createdAt,
            }));
            setCoupons(mapped);
        } catch (err) {
            console.error("Failed to fetch coupons:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

    const handleCreateCoupon = async () => {
        if (!newCoupon.code || !newCoupon.discount || !newCoupon.maxUses) {
            alert("Please fill all required fields");
            return;
        }
        if (expiryType === "date" && !newCoupon.expiryDate) {
            alert("Please select an expiry date");
            return;
        }
        if (expiryType === "hours" && !expiryHours) {
            alert("Please enter expiry hours");
            return;
        }
        // Parse discount: "10%" → percentage/10, "₹500" or "500" → flat/500
        let discountType = "percentage";
        let discountValue = 0;
        const discStr = newCoupon.discount.trim();
        if (discStr.endsWith('%')) {
            discountType = "percentage";
            discountValue = parseFloat(discStr.replace('%', ''));
        } else {
            discountType = "flat";
            discountValue = parseFloat(discStr.replace('₹', '').replace(',', ''));
        }
        try {
            await api.post("/coupons", {
                code: newCoupon.code.toUpperCase(),
                discountType,
                discountValue,
                maxUses: parseInt(newCoupon.maxUses),
                expiryDate: expiryType === "date" ? newCoupon.expiryDate : undefined,
                expiryHours: expiryType === "hours" ? parseInt(expiryHours) : undefined,
            });
            await fetchCoupons();
            setIsCreateModalOpen(false);
            setNewCoupon({ code: "", discount: "", maxUses: "", expiryDate: "" });
            setExpiryHours("");
            setExpiryType("date");
        } catch (err) {
            console.error("Failed to create coupon:", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this coupon?")) {
            try {
                await api.delete(`/coupons/${id}`);
                await fetchCoupons();
            } catch (err) {
                console.error("Failed to delete coupon:", err);
            }
        }
    };

    const handleViewUsage = async (couponId: string) => {
        setViewUsage(couponId);
        try {
            const logs = await api.get(`/coupons/${couponId}/usage`);
            setUsageLogs(Array.isArray(logs) ? logs : []);
        } catch (err) {
            console.error("Failed to fetch usage logs:", err);
            setUsageLogs([]);
        }
    };

    const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="font-sans selection:bg-purple-200">
            <div className="max-w-7xl mx-auto py-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Ticket className="text-purple-600" size={32} />
                            Coupon Management
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Create, track, and manage discount codes for bookings.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <Plus size={18} />
                        Create Coupon
                    </button>
                </div>

                {/* Filters */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search coupons by code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-sm"
                    />
                </div>

                {/* Coupons List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Coupon Code</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Discount</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usage / Max</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCoupons.map((coupon) => {
                                    const isMaxedOut = coupon.currentUses >= coupon.maxUses;
                                    return (
                                        <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 font-bold uppercase tracking-wider text-sm">
                                                    {coupon.code}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-slate-700">{coupon.discount}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-sm font-bold ${isMaxedOut ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {coupon.currentUses} <span className="text-slate-400 font-medium">/ {coupon.maxUses}</span>
                                                    </div>
                                                    {isMaxedOut && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">EXHAUSTED</span>}
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 max-w-[120px]">
                                                    <div
                                                        className={`h-1.5 rounded-full ${isMaxedOut ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(100, (coupon.currentUses / coupon.maxUses) * 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {coupon.expiryHours ? (
                                                    <div>
                                                        <span className="text-sm font-medium text-purple-600">{coupon.expiryHours}h from creation</span>
                                                        {coupon.createdAt && (
                                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                                Expires: {new Date(new Date(coupon.createdAt).getTime() + coupon.expiryHours * 3600000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-600">{coupon.expiryDate}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewUsage(coupon.id)}
                                                        disabled={coupon.currentUses === 0}
                                                        className={`p-2 rounded-lg transition-colors ${coupon.currentUses > 0 ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'}`}
                                                        title="View Usage History"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(coupon.id)}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Coupon"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredCoupons.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                                            No coupons found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Coupon Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-visible animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Plus className="text-purple-600" size={20} /> Create New Coupon
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Coupon Code</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={newCoupon.code}
                                        onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 uppercase font-bold tracking-widest"
                                        placeholder="e.g. MONSOON30"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Discount Value</label>
                                    <div className="relative">
                                        <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={newCoupon.discount}
                                            onChange={e => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                            placeholder="10% or ₹500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Max Uses</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={newCoupon.maxUses}
                                            onChange={e => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                            placeholder="100"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Expiry Type</label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button type="button" onClick={() => setExpiryType("date")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${expiryType === 'date' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>By Date</button>
                                    <button type="button" onClick={() => setExpiryType("hours")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${expiryType === 'hours' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>By Hours</button>
                                </div>
                                {expiryType === "date" ? (
                                    <CustomDatePicker
                                        date={newCoupon.expiryDate ? new Date(newCoupon.expiryDate + 'T00:00:00') : new Date()}
                                        onDateChange={(d) => {
                                            const y = d.getFullYear();
                                            const m = String(d.getMonth() + 1).padStart(2, '0');
                                            const day = String(d.getDate()).padStart(2, '0');
                                            setNewCoupon({ ...newCoupon, expiryDate: `${y}-${m}-${day}` });
                                        }}
                                        openAbove
                                    />
                                ) : (
                                    <div className="relative">
                                        <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={expiryHours}
                                            onChange={e => setExpiryHours(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                            placeholder="e.g. 24 (hours from now)"
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCreateCoupon}
                                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} /> Generate Coupon
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Usage Modal */}
            {viewUsage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <Ticket className="text-indigo-600" size={20} /> Usage History
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                    Coupon Code: <span className="font-bold text-slate-700">{coupons.find(c => c.id === viewUsage)?.code}</span>
                                </p>
                            </div>
                            <button onClick={() => setViewUsage(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-3">
                                {usageLogs.length > 0 ? usageLogs.map((log, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-slate-800">{log.customerName}</p>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Saved</p>
                                                <p className="font-bold text-emerald-600">₹{log.discountSaved?.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                            {log.customerEmail && (
                                                <span className="flex items-center gap-1">
                                                    <Mail size={12} className="text-slate-400" />
                                                    {log.customerEmail}
                                                </span>
                                            )}
                                            {log.customerPhone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={12} className="text-slate-400" />
                                                    {log.customerPhone}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-400 mt-2">{log.bookingRef} • {new Date(log.usedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-500 font-medium">No usage records found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
