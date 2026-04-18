"use client";

import { useState, useEffect } from "react";
import { IndianRupee, CheckCircle, Loader2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../lib/api";

export default function FoodBillingPage() {
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const [guestName, setGuestName] = useState("");
    const [screenName, setScreenName] = useState("");
    const [satkarAmount, setSatkarAmount] = useState("");
    const [satkarPaymentMethod, setSatkarPaymentMethod] = useState("cash");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [upiProofFile, setUpiProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Fetch DD bookings for selected date for the guest dropdown
    const [ddBookings, setDdBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

    useEffect(() => {
        if (!date) return;
        setLoadingBookings(true);
        api.get(`/bookings/dd?date=${date}`)
            .then(data => {
                if (Array.isArray(data)) {
                    setDdBookings(data.filter((b: any) => b.status === "confirmed"));
                }
            })
            .catch(() => {})
            .finally(() => setLoadingBookings(false));
    }, [date]);

    const guestBillAmount = satkarAmount ? Math.round(parseInt(satkarAmount) * 1.25) : 0;

    const handleSubmit = async () => {
        if (!guestName || !screenName || !satkarAmount) {
            alert("Please fill all required fields");
            return;
        }

        setSubmitting(true);
        try {
            let upiProofUrl = null;
            let upiProofKey = null;

            // Upload UPI proof if present
            if (paymentMethod === "upi" && upiProofFile) {
                const formData = new FormData();
                formData.append("file", upiProofFile);
                formData.append("category", "food-bill-upi");
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const uploadRes = await fetch("/api/uploads/upi-proof", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    upiProofUrl = uploadData.url;
                    upiProofKey = uploadData.key;
                }
            }

            // Find matching booking ID
            const matchingBooking = ddBookings.find(b =>
                b.customerName === guestName.split(" - ")[0] &&
                (b.screen?.name || "").includes(screenName)
            );

            await api.post("/food-bills", {
                date,
                ddBookingId: matchingBooking?.id || null,
                guestName: guestName.includes(" - ") ? guestName.split(" - ")[0] : guestName,
                screenName,
                satkarAmount: parseInt(satkarAmount),
                satkarPaymentMethod,
                paymentMethod,
                upiProofUrl,
                upiProofKey,
            });

            setSuccess(true);
            // Reset form
            setSatkarAmount("");
            setGuestName("");
            setScreenName("");
            setPaymentMethod("cash");
            setSatkarPaymentMethod("cash");
            setUpiProofFile(null);

            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert(err.message || "Failed to create food bill");
        } finally {
            setSubmitting(false);
        }
    };

    // Build guest options from bookings
    const guestOptions = ddBookings.map(b => ({
        label: `${b.customerName} — ${(b.screen?.name || "").replace(/\s*\(.*?\)/g, "")}`,
        name: b.customerName,
        screen: (b.screen?.name || "").replace(/\s*\(.*?\)/g, ""),
    }));

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Digital Diaries Sub-Nav */}
            <div className="flex gap-4 sm:gap-6 border-b border-slate-200 pb-1 mb-2 overflow-x-auto">
                <Link href="/admin3/digital-diaries" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Daily Schedule
                </Link>
                <Link href="/admin3/digital-diaries/bookings" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    All Walk-ins & Bookings
                </Link>
                <Link href="/admin3/digital-diaries/food-billing" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                    Create Food Bill
                </Link>
                <Link href="/admin3/digital-diaries/food-history" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Food Bill History
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <UtensilsCrossed className="text-orange-500" size={24} /> Create Food Bill
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Create a food bill for a DD guest. Guest bill is auto-calculated at Satkar + 25%.</p>
                </div>
            </div>

            {/* Success Banner */}
            {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
                    <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                    <p className="text-sm font-bold text-emerald-700">Food bill created successfully!</p>
                </div>
            )}

            {/* Form Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 max-w-2xl">
                <div className="space-y-6">
                    {/* Date Picker */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Guest Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Guest</label>
                        {loadingBookings ? (
                            <div className="flex items-center gap-2 text-slate-400 py-3"><Loader2 className="animate-spin" size={16} /> Loading bookings…</div>
                        ) : guestOptions.length > 0 ? (
                            <select
                                value={guestName}
                                onChange={e => {
                                    const val = e.target.value;
                                    setGuestName(val);
                                    const opt = guestOptions.find(o => o.label === val);
                                    if (opt) setScreenName(opt.screen);
                                }}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors bg-white"
                            >
                                <option value="">Select a guest</option>
                                {guestOptions.map((opt, i) => (
                                    <option key={i} value={opt.label}>{opt.label}</option>
                                ))}
                                <option value="__custom__">+ Enter manually</option>
                            </select>
                        ) : (
                            <p className="text-sm text-slate-400 font-medium py-2">No bookings for this date. Enter guest details manually below.</p>
                        )}
                        {(guestName === "__custom__" || guestOptions.length === 0) && (
                            <div className="mt-3 space-y-3">
                                <input
                                    type="text"
                                    value={guestName === "__custom__" ? "" : guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors"
                                    placeholder="Guest Name"
                                />
                                <select
                                    value={screenName}
                                    onChange={e => setScreenName(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors bg-white"
                                >
                                    <option value="">Select Screen</option>
                                    <option value="Park N Watch">Park N Watch</option>
                                    <option value="Cine Love">Cine Love</option>
                                    <option value="Sandy Screen">Sandy Screen</option>
                                    <option value="Baywatch">Baywatch</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Screen (auto-filled or manual) */}
                    {guestName && guestName !== "__custom__" && guestOptions.length > 0 && screenName && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Screen</label>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-bold text-indigo-700">
                                {screenName}
                            </div>
                        </div>
                    )}

                    {/* Satkar Amount */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Satkar Payment (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="number"
                                value={satkarAmount}
                                onChange={e => setSatkarAmount(e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none transition-colors"
                                placeholder="Enter amount paid to Satkar"
                            />
                        </div>
                    </div>

                    {/* Auto-calculated guest bill */}
                    {satkarAmount && parseInt(satkarAmount) > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Guest Bill (Satkar + 25%)</p>
                            <p className="text-2xl font-black text-emerald-800 flex items-center">
                                <IndianRupee size={20} className="mr-1" /> {guestBillAmount.toLocaleString("en-IN")}
                            </p>
                        </div>
                    )}

                    {/* Satkar Payment Method */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paid to Satkar via</label>
                        <div className="bg-slate-50 rounded-xl p-1 flex border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSatkarPaymentMethod("cash")}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${satkarPaymentMethod === "cash" ? "bg-white shadow text-red-700" : "text-slate-500"}`}
                            >
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setSatkarPaymentMethod("upi")}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${satkarPaymentMethod === "upi" ? "bg-white shadow text-purple-700" : "text-slate-500"}`}
                            >
                                UPI
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{satkarPaymentMethod === "cash" ? "Cash payment will be logged in Cash Management" : "UPI payment will be stored in records only"}</p>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Guest Payment Method</label>
                        <div className="bg-slate-50 rounded-xl p-1 flex border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("cash")}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${paymentMethod === "cash" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
                            >
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("upi")}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${paymentMethod === "upi" ? "bg-white shadow text-purple-700" : "text-slate-500"}`}
                            >
                                UPI
                            </button>
                        </div>
                    </div>

                    {/* UPI Proof Upload */}
                    {paymentMethod === "upi" && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">UPI Payment Proof</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setUpiProofFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="upi-proof-input"
                                />
                                <label htmlFor="upi-proof-input" className="cursor-pointer">
                                    {upiProofFile ? (
                                        <p className="text-sm font-bold text-indigo-600">{upiProofFile.name}</p>
                                    ) : (
                                        <p className="text-sm text-slate-400 font-medium">Click to upload screenshot</p>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !guestName || !screenName || !satkarAmount}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><Loader2 className="animate-spin" size={18} /> Creating…</>
                        ) : (
                            <><CheckCircle size={18} /> Create Food Bill</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
