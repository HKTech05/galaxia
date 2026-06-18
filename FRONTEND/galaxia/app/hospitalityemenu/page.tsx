"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ClipboardList, Clock, Sparkles, Coffee, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: "Normal" | "High Tea";
}

const MENU_ITEMS: MenuItem[] = [
    // Normal Items
    { id: "water", name: "Mineral Water Bottle", price: 50, category: "Normal" },
    { id: "coke", name: "Coca Cola 250ml", price: 60, category: "Normal" },
    { id: "sprite", name: "Sprite 250ml", price: 60, category: "Normal" },
    { id: "soda", name: "Soda Bottle", price: 40, category: "Normal" },
    // High Tea Items
    { id: "sandwich", name: "Veg Sandwich", price: 150, category: "High Tea" },
    { id: "pakoda", name: "Paneer Pakoda", price: 180, category: "High Tea" },
    { id: "fries", name: "French Fries", price: 120, category: "High Tea" },
    { id: "tea", name: "Hot Tea/Chai", price: 40, category: "High Tea" },
    { id: "coffee", name: "Hot Coffee", price: 60, category: "High Tea" },
];

const VILLAS_LIST = [
    // Ambrose
    { name: "Ambrose — TAKE-1", value: "TAKE-1" },
    { name: "Ambrose — ALTA", value: "ALTA" },
    { name: "Ambrose — SANTORINI", value: "SANTORINI" },
    { name: "Ambrose — BAMBOOSA", value: "BAMBOOSA" },
    { name: "Ambrose — CYPRESS", value: "CYPRESS" },
    // Amstel Nest
    { name: "Amstel Nest — Cottage 1", value: "Cottage 1" },
    { name: "Amstel Nest — Cottage 2", value: "Cottage 2" },
    { name: "Amstel Nest — Cottage 3", value: "Cottage 3" },
    { name: "Amstel Nest — Cottage 4", value: "Cottage 4" },
    { name: "Amstel Nest — Cottage 5", value: "Cottage 5" },
    { name: "Amstel Nest — Cottage 6", value: "Cottage 6" },
    { name: "Amstel Nest — Cottage 7", value: "Cottage 7" },
    { name: "Amstel Nest — Cottage 8", value: "Cottage 8" },
    { name: "Amstel Nest — Cottage 9", value: "Cottage 9" },
    { name: "Amstel Nest — Cottage 10", value: "Cottage 10" },
    { name: "Amstel Nest — Cottage 11", value: "Cottage 11" },
    { name: "Amstel Nest — Cottage 12", value: "Cottage 12" },
    { name: "Amstel Nest — Cottage 13", value: "Cottage 13" },
    { name: "Amstel Nest — Cottage 14", value: "Cottage 14" },
    { name: "Amstel Nest — Family Cottage", value: "Family Cottage" },
];

function EMenuContent() {
    const searchParams = useSearchParams();
    
    // Resolve initial villa from query param
    const queryVilla = searchParams.get("villa") || "";
    const isLockedVilla = !!queryVilla && VILLAS_LIST.some(v => v.value.toLowerCase() === queryVilla.toLowerCase());
    
    const initialVillaValue = useMemo(() => {
        if (isLockedVilla) {
            const match = VILLAS_LIST.find(v => v.value.toLowerCase() === queryVilla.toLowerCase());
            return match ? match.value : "";
        }
        return "";
    }, [queryVilla, isLockedVilla]);

    const [selectedVilla, setSelectedVilla] = useState(initialVillaValue);
    
    // Quantity selections: { itemId: quantity }
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    // High Tea unlock states
    const [highTeaUnlocked, setHighTeaUnlocked] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState("");

    // Submit states
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        if (initialVillaValue) {
            setSelectedVilla(initialVillaValue);
        }
    }, [initialVillaValue]);

    // Live countdown timer to 5:00 PM (17:00) local time
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const targetTime = new Date();
            targetTime.setHours(17, 0, 0, 0); // 5:00 PM

            if (now >= targetTime) {
                // High tea is unlocked
                setHighTeaUnlocked(true);
                setTimeRemaining("");
            } else {
                setHighTeaUnlocked(false);
                const diffMs = targetTime.getTime() - now.getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

                const hrsStr = String(diffHrs).padStart(2, "0");
                const minsStr = String(diffMins).padStart(2, "0");
                const secsStr = String(diffSecs).padStart(2, "0");

                setTimeRemaining(`${hrsStr}:${minsStr}:${secsStr}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleIncrement = (id: string) => {
        setQuantities(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
    };

    const handleDecrement = (id: string) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            if (current <= 1) {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            }
            return {
                ...prev,
                [id]: current - 1
            };
        });
    };

    const handleCheckboxToggle = (id: string) => {
        setQuantities(prev => {
            if (prev[id]) {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            } else {
                return {
                    ...prev,
                    [id]: 1
                };
            }
        });
    };

    const hasSelections = Object.keys(quantities).length > 0;

    const handleSubmit = async () => {
        if (!selectedVilla) {
            alert("Please select your Villa/Cottage first.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        try {
            // Group items into Normal and High Tea categories to submit separately
            const selectedItems = Object.entries(quantities).map(([itemId, qty]) => {
                const item = MENU_ITEMS.find(m => m.id === itemId);
                return {
                    name: item?.name || "",
                    quantity: qty,
                    price: item?.price || 0,
                    category: item?.category || "Normal"
                };
            });

            const normalPayload = selectedItems.filter(i => i.category === "Normal");
            const highTeaPayload = selectedItems.filter(i => i.category === "High Tea");

            // Post Normal request
            if (normalPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "Normal",
                        items: normalPayload
                    })
                });
                if (!res.ok) throw new Error("Failed to submit normal requests");
            }

            // Post High Tea request
            if (highTeaPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "High Tea",
                        items: highTeaPayload
                    })
                });
                if (!res.ok) throw new Error("Failed to submit high tea requests");
            }

            setSubmitSuccess(true);
            setQuantities({});
        } catch (err: any) {
            setSubmitError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const normalItems = MENU_ITEMS.filter(item => item.category === "Normal");
    const highTeaItems = MENU_ITEMS.filter(item => item.category === "High Tea");

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 to-amber-900 text-white p-6 sm:p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                        <Coffee className="text-amber-200" size={24} />
                        <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Galaxia Resorts</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">In-Villa Hospitality Menu</h1>
                    <p className="text-amber-100/80 text-xs sm:text-sm font-medium leading-relaxed">
                        Order refreshments or High Tea items directly to your villa. Charges will be automatically added to your food bill.
                    </p>
                </div>
            </div>

            {/* Villa Selector */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Your Villa / Cottage</label>
                {isLockedVilla ? (
                    <div className="bg-amber-50/50 border border-amber-200/50 text-amber-950 font-bold rounded-xl px-4 py-3.5 text-sm flex items-center justify-between">
                        <span>{VILLAS_LIST.find(v => v.value.toLowerCase() === queryVilla.toLowerCase())?.name || queryVilla}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200/50">Auto-Locked</span>
                    </div>
                ) : (
                    <select
                        value={selectedVilla}
                        onChange={(e) => setSelectedVilla(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    >
                        <option value="">Select your Villa / Cottage...</option>
                        {VILLAS_LIST.map((villa) => (
                            <option key={villa.value} value={villa.value}>{villa.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Normal refreshments section */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-50 pb-3 flex items-center gap-2">
                    <ClipboardList size={18} className="text-amber-600" />
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Beverages & Refreshments</h2>
                </div>

                <div className="divide-y divide-slate-100">
                    {normalItems.map(item => {
                        const isChecked = !!quantities[item.id];
                        const qty = quantities[item.id] || 0;
                        return (
                            <div key={item.id} className="flex items-center justify-between py-3.5">
                                <div className="flex items-center gap-3.5 flex-1">
                                    <label className="flex items-center cursor-pointer relative">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCheckboxToggle(item.id)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                            <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                        </div>
                                    </label>
                                    <div className="cursor-pointer" onClick={() => handleCheckboxToggle(item.id)}>
                                        <p className="font-semibold text-slate-800 text-sm sm:text-base">{item.name}</p>
                                        <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">₹{item.price}</p>
                                    </div>
                                </div>

                                {isChecked && (
                                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1 animate-in zoom-in-95 duration-100">
                                        <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                        <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                        <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* High Tea Menu */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coffee size={18} className="text-amber-600" />
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">High Tea Specials</h2>
                    </div>

                    {!highTeaUnlocked && timeRemaining && (
                        <div className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 font-mono">
                            <Clock size={12} className="animate-pulse" />
                            {timeRemaining}
                        </div>
                    )}
                </div>

                {/* Overlap overlay if locked */}
                {!highTeaUnlocked && (
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center">
                        <div className="bg-white/95 rounded-2xl shadow-xl border border-slate-100 p-5 max-w-xs space-y-2.5">
                            <Clock size={28} className="text-amber-600 mx-auto" />
                            <h3 className="text-sm font-bold text-slate-800">Locked Until 5:00 PM</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                High Tea specialties unlock automatically at 5:00 PM every day. Remaining time:
                            </p>
                            <div className="font-mono font-bold text-base text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                {timeRemaining || "00:00:00"}
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {highTeaItems.map(item => {
                        const isChecked = !!quantities[item.id];
                        const qty = quantities[item.id] || 0;
                        return (
                            <div key={item.id} className="flex items-center justify-between py-3.5">
                                <div className="flex items-center gap-3.5 flex-1">
                                    <label className="flex items-center cursor-pointer relative">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCheckboxToggle(item.id)}
                                            className="sr-only peer"
                                            disabled={!highTeaUnlocked}
                                        />
                                        <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                            <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                        </div>
                                    </label>
                                    <div className="cursor-pointer" onClick={() => highTeaUnlocked && handleCheckboxToggle(item.id)}>
                                        <p className="font-semibold text-slate-800 text-sm sm:text-base">{item.name}</p>
                                        <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">₹{item.price}</p>
                                    </div>
                                </div>

                                {isChecked && (
                                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1">
                                        <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">-</button>
                                        <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                        <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">+</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {submitError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} />
                    {submitError}
                </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedVilla || !hasSelections || submitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm py-4 rounded-xl shadow-md shadow-amber-100 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            Submitting request...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Submit Order
                        </>
                    )}
                </button>
            </div>

            {/* Success Modal */}
            {submitSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                            <Check size={28} className="stroke-[3px]" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            Request Submitted!
                        </h3>
                        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block mx-auto mb-4 border border-emerald-100">
                            Order Received Successfully
                        </p>

                        <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            Your refreshments request has been sent to our hospitality desk. The items will be served shortly.
                        </p>

                        <button
                            onClick={() => setSubmitSuccess(false)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-colors border border-slate-200/50"
                        >
                            Submit Another Request
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HospitalityEMenuPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <RefreshCw size={36} className="animate-spin text-amber-600" />
                    <p className="text-sm font-semibold tracking-wide">Loading menu...</p>
                </div>
            }>
                <EMenuContent />
            </Suspense>
        </div>
    );
}
