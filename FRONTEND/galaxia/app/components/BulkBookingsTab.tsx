"use client";

import { useState, useEffect } from "react";
import { Users, CalendarDays, IndianRupee, CheckCircle, AlertTriangle, X } from "lucide-react";
import { api } from "../../lib/api";

export default function BulkBookingsTab() {
    const [bulkForm, setBulkForm] = useState({
        customerName: "",
        phone: "",
        email: "",
        checkIn: "",
        checkOut: "",
        numCottages: 1,
        cottageType: "standard" as "standard" | "family" | "mix",
        guestsPerCottage: 2,
        paymentMethod: "UPI" as "Cash" | "UPI" | "Online",
    });
    const [bulkHistory, setBulkHistory] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState("");
    const [bulkError, setBulkError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await api.get("/bookings/staycation");
                if (Array.isArray(data)) {
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

    const calculateBulkPrice = () => {
        if (!bulkForm.checkIn || !bulkForm.checkOut) return { perNight: 0, nights: 0, subtotal: 0, gst: 0, total: 0 };
        const start = new Date(bulkForm.checkIn);
        const end = new Date(bulkForm.checkOut);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
        let total = 0;
        for (let i = 0; i < nights; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const basePrice = isWeekend ? 6950 : 4950;
            const extraAdults = Math.max(0, bulkForm.guestsPerCottage - 2);
            total += (basePrice + extraAdults * 2000) * bulkForm.numCottages;
        }
        const gst = Math.round(total * 0.05);
        return { perNight: Math.round(total / nights), nights, subtotal: total, gst, total: total + gst };
    };

    const pricing = calculateBulkPrice();

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

            const perCottageSubtotal = Math.round(pricing.subtotal / bulkForm.numCottages);
            const perCottageGst = Math.round(pricing.gst / bulkForm.numCottages);
            const perCottageTotal = perCottageSubtotal + perCottageGst;

            for (let i = 0; i < bulkForm.numCottages; i++) {
                await api.post("/bookings/staycation", {
                    customerName: bulkForm.customerName,
                    customerPhone: bulkForm.phone,
                    customerEmail: bulkForm.email || undefined,
                    propertyId: amstelProp.id,
                    numGuests: bulkForm.guestsPerCottage,
                    checkInDate: bulkForm.checkIn,
                    checkOutDate: bulkForm.checkOut,
                    totalAmount: perCottageTotal,
                    advanceAmount: perCottageTotal,
                    balanceAmount: 0,
                    securityDeposit: 3000,
                    basePrice: perCottageSubtotal,
                    gstAmount: perCottageGst,
                    advancePaid: true,
                    advanceMethod: bulkForm.paymentMethod,
                    source: "admin-bulk",
                    notes: `Admin Bulk ${i + 1}/${bulkForm.numCottages}. ${bulkForm.cottageType}.`.trim(),
                });
            }
            setBulkSuccess(`Created ${bulkForm.numCottages} cottage booking(s) for ${bulkForm.customerName}!`);
            setBulkForm({ customerName: "", phone: "", email: "", checkIn: "", checkOut: "", numCottages: 1, cottageType: "standard", guestsPerCottage: 2, paymentMethod: "UPI" });
        } catch (err: any) {
            setBulkError(err?.message || "Failed to create bulk booking.");
        } finally {
            setIsSubmitting(false);
        }
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
                                <input type="tel" value={bulkForm.phone} onChange={e => setBulkForm({ ...bulkForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="9876543210" />
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Number of Cottages (1–15)</label>
                                <input type="number" min={1} max={15} value={bulkForm.numCottages} onChange={e => setBulkForm({ ...bulkForm, numCottages: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cottage Type</label>
                                <select value={bulkForm.cottageType} onChange={e => setBulkForm({ ...bulkForm, cottageType: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                    <option value="standard">Standard Cottage</option>
                                    <option value="family">Family Cottage</option>
                                    <option value="mix">Mix (Standard + Family)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Guests per Cottage</label>
                                <input type="number" min={1} max={6} value={bulkForm.guestsPerCottage} onChange={e => setBulkForm({ ...bulkForm, guestsPerCottage: Math.min(6, Math.max(1, parseInt(e.target.value) || 2)) })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
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
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Guests</p><p className="text-2xl font-black text-slate-800">{bulkForm.numCottages * bulkForm.guestsPerCottage}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nights</p><p className="text-2xl font-black text-slate-800">{pricing.nights || "-"}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Per Night</p><p className="text-lg font-black text-slate-800">{pricing.perNight > 0 ? `₹${pricing.perNight.toLocaleString("en-IN")}` : "-"}</p></div>
                            </div>
                        </div>
                        {pricing.subtotal > 0 && (
                            <div className="space-y-2.5 text-sm font-medium">
                                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-800">₹{pricing.subtotal.toLocaleString("en-IN")}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">GST (5%)</span><span className="text-slate-800">₹{pricing.gst.toLocaleString("en-IN")}</span></div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black"><span className="text-slate-800">Grand Total</span><span className="text-emerald-600">₹{pricing.total.toLocaleString("en-IN")}</span></div>
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-2">
                                    <p className="text-xs text-amber-700 font-bold">Per Cottage: ₹{Math.round(pricing.total / bulkForm.numCottages).toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-amber-600 mt-0.5">Security deposit: ₹3,000 per cottage (separate)</p>
                                </div>
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
