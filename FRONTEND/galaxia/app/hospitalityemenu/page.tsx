"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ClipboardList, Clock, Sparkles, Coffee, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: "Normal" | "High Tea" | "Timepass" | "Add-ons";
    stock?: number;
    hidden?: boolean;
    visible?: boolean;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
    // Normal Items
    { id: "water", name: "Water", price: 30, category: "Normal" },
    { id: "limbu_pani", name: "Limbu Pani", price: 50, category: "Normal" },
    { id: "limbu_soda", name: "Limbu Soda", price: 90, category: "Normal" },
    { id: "sprite", name: "Sprite", price: 70, category: "Normal" },
    { id: "thums_up", name: "Thums Up", price: 70, category: "Normal" },
    { id: "special_mocktail", name: "Special Mocktail", price: 1500, category: "Normal" },
    // High Tea Items
    { id: "tea", name: "Tea", price: 40, category: "High Tea" },
    { id: "coffee", name: "Coffee", price: 44, category: "High Tea" },
    { id: "milk", name: "Milk", price: 40, category: "High Tea" },
    { id: "maggi", name: "Maggi", price: 84, category: "High Tea" },
    { id: "fries", name: "French Fries", price: 147, category: "High Tea" },
    { id: "kanda_bhaji", name: "Kanda Bhaji", price: 147, category: "High Tea" },
    { id: "aloo_bhaji", name: "Aloo Bhaji", price: 147, category: "High Tea" },
    { id: "corn_bhaji", name: "Corn Bhaji", price: 147, category: "High Tea" },
    { id: "black_coffee", name: "Black Coffee", price: 35, category: "High Tea" },
    { id: "cold_coffee", name: "Cold Coffee", price: 90, category: "High Tea" },
    // Timepass Items
    { id: "khichiya_papad", name: "Khichiya papad", price: 100, category: "High Tea" },
    { id: "khichiya_fried", name: "Khichiya fried papad", price: 120, category: "High Tea" },
    { id: "khichiya_masala_jain", name: "Khichiya masala papad jain", price: 160, category: "High Tea" },
    { id: "khichiya_masala_regular", name: "Khichiya masala papad regular", price: 160, category: "High Tea" },
    { id: "khichiya_cheese_masala", name: "Khichiya cheese masala papad", price: 180, category: "High Tea" },
    { id: "channa_masala_jain", name: "Channa masala ( jain )", price: 160, category: "High Tea" },
    { id: "channa_masala_regular", name: "Channa masala ( Regular )", price: 160, category: "High Tea" },
    { id: "peanut_masala", name: "Peanut masala", price: 150, category: "High Tea" },
    { id: "chakna_special", name: "Chakna Special", price: 260, category: "High Tea" },
    { id: "paneer_chilly_dry", name: "Paneer chilly dry", price: 280, category: "High Tea" },
    // Add-ons Items
    { id: "mud_bath_1", name: "Mud Bath (1 Person)", price: 1500, category: "Add-ons" },
    { id: "mud_bath_2", name: "Mud Bath (2 Persons)", price: 2000, category: "Add-ons" },
    { id: "mud_bath_3", name: "Mud Bath (3 Persons)", price: 3000, category: "Add-ons" },
    { id: "celebration_decor", name: "Celebration decoration", price: 2000, category: "Add-ons" }
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
    { name: "Amstel Nest — Cottage 11", value: "Cottage 11" },
    { name: "Amstel Nest — Cottage 12", value: "Cottage 12" },
    { name: "Amstel Nest — Cottage 13", value: "Cottage 13" },
    { name: "Amstel Nest — Cottage 14", value: "Cottage 14" },
    { name: "Amstel Nest — Cottage 15", value: "Cottage 15" },
    { name: "Amstel Nest — Family Cottage", value: "Family Cottage" },
];

export function EMenuContent({ overrideVilla, disableTimers, isOwnerMode }: { overrideVilla?: string; disableTimers?: boolean; isOwnerMode?: boolean }) {
    const searchParams = useSearchParams();
    
    // Resolve initial villa from query param or overrideVilla prop
    const rawVillaInput = overrideVilla || searchParams.get("villa") || "";
    
    // Match the villa using useMemo
    const match = useMemo(() => {
        if (!rawVillaInput) return null;
        const slug = rawVillaInput.toLowerCase().replace(/-/g, " ");
        return VILLAS_LIST.find(v => {
            const normalizedVal = v.value.toLowerCase().replace(/-/g, " ");
            return normalizedVal === slug || v.value.toLowerCase() === rawVillaInput.toLowerCase();
        });
    }, [rawVillaInput]);

    const isLockedVilla = !!match;
    const initialVillaValue = match ? match.value : "";

    const [selectedVilla, setSelectedVilla] = useState(initialVillaValue);
    
    // Dynamic menu state
    const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);

    useEffect(() => {
        api.get<MenuItem[]>("/hospitality/menu")
            .then(data => {
                if (Array.isArray(data)) {
                    setMenuItems(data);
                }
            })
            .catch(err => {
                console.error("Error fetching menu:", err);
            });
    }, []);

    // Active checked-in villas state
    const [activeVillas, setActiveVillas] = useState<string[]>([]);
    const [loadingActiveVillas, setLoadingActiveVillas] = useState(!isOwnerMode);

    const fetchActiveVillas = async () => {
        if (isOwnerMode) return;
        setLoadingActiveVillas(true);
        try {
            const res = await fetch("/api/hospitality/active-villas");
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.activeVillas)) {
                    setActiveVillas(data.activeVillas);
                }
            }
        } catch (err) {
            console.error("Error fetching active villas:", err);
        } finally {
            setLoadingActiveVillas(false);
        }
    };

    useEffect(() => {
        fetchActiveVillas();
    }, [isOwnerMode]);

    const normalizeVilla = (str: string) => (str || "").toLowerCase().replace(/[\s-_]/g, "");

    const isVillaCheckedIn = useMemo(() => {
        if (isOwnerMode) return true;
        if (!selectedVilla) return false;
        const normSelected = normalizeVilla(selectedVilla);
        return activeVillas.some(v => normalizeVilla(v) === normSelected);
    }, [selectedVilla, activeVillas, isOwnerMode]);

    // Quantity selections: { itemId: quantity }
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    // High Tea unlock states
    const [highTeaUnlocked, setHighTeaUnlocked] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState("");

    // Normal menu unlock states
    const [normalUnlocked, setNormalUnlocked] = useState(false);
    const [normalTimeRemaining, setNormalTimeRemaining] = useState("");

    // Timepass menu unlock states
    const [timepassUnlocked, setTimepassUnlocked] = useState(false);
    const [timepassTimeRemaining, setTimepassTimeRemaining] = useState("");
    // Comments state
    const [comments, setComments] = useState<Record<string, string>>({});

    const handleCommentChange = (id: string, text: string) => {
        setComments(prev => ({
            ...prev,
            [id]: text
        }));
    };

    // Add-on Mud Bath selection state: 1 | 2 | 3 persons
    const [mudBathPersons, setMudBathPersons] = useState<1 | 2 | 3>(1);

    const handleSelectMudBathPersons = (persons: 1 | 2 | 3) => {
        setMudBathPersons(persons);
        const newId = persons === 1 ? "mud_bath_1" : persons === 2 ? "mud_bath_2" : "mud_bath_3";
        const item = menuItems.find(m => m.id === newId);
        const currentStock = item && typeof item.stock === "number" ? item.stock : Infinity;
        if (currentStock <= 0) {
            alert("Sorry, this option is currently sold out!");
            return;
        }

        setQuantities(prev => {
            const existingQty = prev["mud_bath_1"] || prev["mud_bath_2"] || prev["mud_bath_3"] || 1;
            const updated = { ...prev };
            delete updated["mud_bath_1"];
            delete updated["mud_bath_2"];
            delete updated["mud_bath_3"];
            updated[newId] = existingQty;
            return updated;
        });
    };

    const handleToggleMudBath = () => {
        const targetId = mudBathPersons === 1 ? "mud_bath_1" : mudBathPersons === 2 ? "mud_bath_2" : "mud_bath_3";
        const item = menuItems.find(m => m.id === targetId);
        const currentStock = item && typeof item.stock === "number" ? item.stock : Infinity;

        setQuantities(prev => {
            const isChecked = !!(prev["mud_bath_1"] || prev["mud_bath_2"] || prev["mud_bath_3"]);
            const updated = { ...prev };
            delete updated["mud_bath_1"];
            delete updated["mud_bath_2"];
            delete updated["mud_bath_3"];
            if (!isChecked) {
                if (currentStock <= 0) {
                    alert("Sorry, this option is currently sold out!");
                    return prev;
                }
                updated[targetId] = 1;
            }
            return updated;
        });
    };

    const handleIncrementMudBath = () => {
        const targetId = mudBathPersons === 1 ? "mud_bath_1" : mudBathPersons === 2 ? "mud_bath_2" : "mud_bath_3";
        handleIncrement(targetId);
    };

    const handleDecrementMudBath = () => {
        const targetId = mudBathPersons === 1 ? "mud_bath_1" : mudBathPersons === 2 ? "mud_bath_2" : "mud_bath_3";
        handleDecrement(targetId);
    };

    const handleMudBathCommentChange = (text: string) => {
        setComments(prev => ({
            ...prev,
            mud_bath_1: text,
            mud_bath_2: text,
            mud_bath_3: text
        }));
    };

    // Submit states
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        if (initialVillaValue) {
            setSelectedVilla(initialVillaValue);
        }
    }, [initialVillaValue]);

    // Live countdown timer to High Tea (4:30 PM - 6:30 PM) and Normal Menu (8:30 AM - 12:00 AM Midnight) local time
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            
            // Check if timer should be temporarily bypassed for testing
            const TEMPORARILY_DISABLE_TIMER = false; // Set to false to enable actual timer logic

            if (TEMPORARILY_DISABLE_TIMER || disableTimers || isOwnerMode) {
                setHighTeaUnlocked(true);
                setTimeRemaining("");
                setNormalUnlocked(true);
                setNormalTimeRemaining("");
                setTimepassUnlocked(true);
                setTimepassTimeRemaining("");
                return;
            }

            // 1. High Tea Targets
            const startTarget = new Date();
            startTarget.setHours(16, 30, 0, 0); // 4:30 PM
            
            const endTarget = new Date();
            endTarget.setHours(18, 30, 0, 0); // 6:30 PM

            if (now >= startTarget && now <= endTarget) {
                setHighTeaUnlocked(true);
                setTimeRemaining("");
            } else {
                setHighTeaUnlocked(false);
                let nextStart = new Date(startTarget);
                if (now > endTarget) {
                    nextStart.setDate(nextStart.getDate() + 1);
                }
                const diffMs = nextStart.getTime() - now.getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

                const hrsStr = String(diffHrs).padStart(2, "0");
                const minsStr = String(diffMins).padStart(2, "0");
                const secsStr = String(diffSecs).padStart(2, "0");

                setTimeRemaining(`${hrsStr}:${minsStr}:${secsStr}`);
            }

            // 2. Normal refreshments targets
            const normalStart = new Date();
            normalStart.setHours(8, 30, 0, 0); // 8:30 AM
            
            const normalEnd = new Date();
            normalEnd.setHours(23, 59, 59, 999); // 12:00 AM Midnight

            if (now >= normalStart && now <= normalEnd) {
                setNormalUnlocked(true);
                setNormalTimeRemaining("");
            } else {
                setNormalUnlocked(false);
                let nextNormalStart = new Date(normalStart);
                if (now > normalEnd) {
                    nextNormalStart.setDate(nextNormalStart.getDate() + 1);
                }
                const diffMs = nextNormalStart.getTime() - now.getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

                const hrsStr = String(diffHrs).padStart(2, "0");
                const minsStr = String(diffMins).padStart(2, "0");
                const secsStr = String(diffSecs).padStart(2, "0");

                setNormalTimeRemaining(`${hrsStr}:${minsStr}:${secsStr}`);
            }

            // 3. Timepass Targets
            const timepassStart = new Date();
            timepassStart.setHours(16, 0, 0, 0); // 4:00 PM
            
            const timepassEnd = new Date();
            timepassEnd.setHours(22, 0, 0, 0); // 10:00 PM

            if (now >= timepassStart && now <= timepassEnd) {
                setTimepassUnlocked(true);
                setTimepassTimeRemaining("");
            } else {
                setTimepassUnlocked(false);
                let nextTimepassStart = new Date(timepassStart);
                if (now > timepassEnd) {
                    nextTimepassStart.setDate(nextTimepassStart.getDate() + 1);
                }
                const diffMs = nextTimepassStart.getTime() - now.getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

                const hrsStr = String(diffHrs).padStart(2, "0");
                const minsStr = String(diffMins).padStart(2, "0");
                const secsStr = String(diffSecs).padStart(2, "0");

                setTimepassTimeRemaining(`${hrsStr}:${minsStr}:${secsStr}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleIncrement = (id: string) => {
        const item = menuItems.find(m => m.id === id);
        const currentStock = item && typeof item.stock === "number" ? item.stock : Infinity;
        
        setQuantities(prev => {
            const currentQty = prev[id] || 0;
            if (currentQty >= currentStock) {
                alert(`Sorry, only ${currentStock} units of ${item?.name || "this item"} are available in stock.`);
                return prev;
            }
            return {
                ...prev,
                [id]: currentQty + 1
            };
        });
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
        const item = menuItems.find(m => m.id === id);
        const currentStock = item && typeof item.stock === "number" ? item.stock : Infinity;
        if (currentStock <= 0) {
            alert("Sorry, this item is sold out!");
            return;
        }

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

        if (!isVillaCheckedIn && !isOwnerMode) {
            alert("Complete your check-in in order to view this page and place orders.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        try {
            // Group items into Normal, High Tea, and Timepass categories to submit separately
            const selectedItems = Object.entries(quantities).map(([itemId, qty]) => {
                const item = menuItems.find(m => m.id === itemId);
                return {
                    name: item?.name || "",
                    quantity: qty,
                    price: isOwnerMode ? 0 : (item?.price || 0),
                    category: item?.category || "Normal",
                    comment: comments[itemId] || ""
                };
            });

            const isLimeItem = (i: any) => (i.name || "").toLowerCase().includes("lime") || i.id === "fresh_lime_soda" || i.id === "fresh_lime_water";

            const chefNormalPayload = selectedItems.filter(i => i.category === "Normal" && isLimeItem(i));
            const housekeepingNormalPayload = selectedItems.filter(i => i.category === "Normal" && !isLimeItem(i));
            const highTeaPayload = selectedItems.filter(i => i.category === "High Tea");
            const timepassPayload = selectedItems.filter(i => i.category === "Timepass");
            const addOnsPayload = selectedItems.filter(i => i.category === "Add-ons");

            // Post Housekeeping Normal request
            if (housekeepingNormalPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "Normal",
                        items: housekeepingNormalPayload,
                        isOwnerMode: !!isOwnerMode
                    })
                });
                if (!res.ok) throw new Error("Failed to submit normal housekeeping requests");
            }

            // Post Chef Normal request (Fresh Lime Water / Soda)
            if (chefNormalPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "Normal",
                        items: chefNormalPayload,
                        isOwnerMode: !!isOwnerMode
                    })
                });
                if (!res.ok) throw new Error("Failed to submit normal chef requests");
            }

            // Post High Tea request
            if (highTeaPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "High Tea",
                        items: highTeaPayload,
                        isOwnerMode: !!isOwnerMode
                    })
                });
                if (!res.ok) throw new Error("Failed to submit high tea requests");
            }

            // Post Timepass request
            if (timepassPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "Timepass",
                        items: timepassPayload,
                        isOwnerMode: !!isOwnerMode
                    })
                });
                if (!res.ok) throw new Error("Failed to submit timepass requests");
            }

            // Post Add-ons request (Mud bath, Celebration decoration, etc.)
            if (addOnsPayload.length > 0) {
                const res = await fetch("/api/hospitality/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        villaName: selectedVilla,
                        itemCategory: "Add-ons",
                        items: addOnsPayload,
                        isOwnerMode: !!isOwnerMode
                    })
                });
                if (!res.ok) throw new Error("Failed to submit Add-ons requests");
            }

            setSubmitSuccess(true);
            setQuantities({});
            setComments({});
        } catch (err: any) {
            setSubmitError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const isItemVisible = (item: MenuItem) => !item.hidden && item.visible !== false;

    const normalItems = menuItems.filter(item => item.category === "Normal" && isItemVisible(item));
    const highTeaItems = menuItems.filter(item => item.category === "High Tea" && isItemVisible(item));
    const timepassItems = menuItems.filter(item => item.category === "Timepass" && isItemVisible(item));
    const addOnItems = menuItems.filter(item => item.category === "Add-ons" && isItemVisible(item));

    const mb1 = menuItems.find(m => m.id === "mud_bath_1");
    const mb2 = menuItems.find(m => m.id === "mud_bath_2");
    const mb3 = menuItems.find(m => m.id === "mud_bath_3");
    const decorItem = menuItems.find(m => m.id === "celebration_decor");

    const activeMudBathId = mudBathPersons === 1 ? "mud_bath_1" : mudBathPersons === 2 ? "mud_bath_2" : "mud_bath_3";
    const isMudBathChecked = !!(quantities["mud_bath_1"] || quantities["mud_bath_2"] || quantities["mud_bath_3"]);
    const mudBathQty = quantities["mud_bath_1"] || quantities["mud_bath_2"] || quantities["mud_bath_3"] || 0;
    const mudBathItem = menuItems.find(m => m.id === activeMudBathId);
    const isMudBathSoldOut = typeof mudBathItem?.stock === "number" && mudBathItem.stock <= 0;

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
                    <div className="bg-amber-50/50 border border-amber-200/50 text-amber-950 font-bold rounded-xl px-4 py-3.5 text-sm text-center">
                        <span>{VILLAS_LIST.find(v => v.value === selectedVilla)?.name || selectedVilla}</span>
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

            {loadingActiveVillas ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-4">
                    <RefreshCw className="animate-spin text-amber-600 mx-auto" size={32} />
                    <p className="text-sm font-bold text-slate-700">Checking room check-in status...</p>
                    <p className="text-xs text-slate-400">Verifying your active stay details</p>
                </div>
            ) : !selectedVilla ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm space-y-3">
                    <AlertCircle className="text-amber-500 mx-auto" size={32} />
                    <h3 className="font-extrabold text-slate-800 text-base">Select Your Room / Cottage</h3>
                    <p className="text-xs text-slate-500">Please choose your assigned cottage above to view the in-villa menu.</p>
                </div>
            ) : !isVillaCheckedIn ? (
                <div className="bg-white border border-amber-200/60 rounded-3xl p-8 sm:p-10 text-center shadow-sm space-y-5 animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                        <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                            Complete your checkin in order to view this page
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                            This in-villa dining menu is operational only for guests currently checked in to <span className="font-bold text-amber-900">{VILLAS_LIST.find(v => v.value === selectedVilla)?.name || selectedVilla}</span>.
                        </p>
                        <p className="text-xs text-slate-400">
                            If you have just arrived, please complete your check-in with our front desk reception to activate your menu and start ordering.
                        </p>
                    </div>
                    <div className="pt-2 flex justify-center">
                        <button
                            onClick={fetchActiveVillas}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <RefreshCw size={14} />
                            Check Again / Refresh
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Normal refreshments section */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <ClipboardList size={18} className="text-amber-600" />
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Beverages & Refreshments</h2>
                        </div>
                        {normalUnlocked && (
                            <p className="text-[11px] text-slate-400 font-medium ml-6">
                                Orders can be served from 8:30 AM to 12:00 AM Midnight
                            </p>
                        )}
                    </div>

                    {!normalUnlocked && normalTimeRemaining && (
                        <div className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 font-mono">
                            <Clock size={12} className="animate-pulse" />
                            {normalTimeRemaining}
                        </div>
                    )}
                </div>

                {!normalUnlocked && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider">
                                <Clock size={14} className="text-amber-600 animate-pulse" />
                                Locked Until 8:30 AM
                            </h3>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                Housekeeping ordering unlocks automatically between 8:30 AM and 12:00 AM Midnight every day.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Remaining:</span>
                            <div className="font-mono font-black text-xs bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-sm min-w-[80px] text-center">
                                {normalTimeRemaining || "00:00:00"}
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {normalItems.map(item => {
                        const isChecked = !!quantities[item.id];
                        const qty = quantities[item.id] || 0;
                        const isSoldOut = typeof item.stock === "number" && item.stock <= 0;
                        return (
                            <div key={item.id} className={`py-3.5 transition-opacity duration-200 border-b border-slate-100 last:border-0 ${(!normalUnlocked || isSoldOut) ? "opacity-50 select-none" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3.5 flex-1">
                                        <label className="flex items-center cursor-pointer relative">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleCheckboxToggle(item.id)}
                                                className="sr-only peer"
                                                disabled={!normalUnlocked || isSoldOut}
                                            />
                                            <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                            </div>
                                        </label>
                                        <div className="cursor-pointer" onClick={() => normalUnlocked && !isSoldOut && handleCheckboxToggle(item.id)}>
                                            <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                {item.name}
                                                {isSoldOut && (
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                )}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">{isOwnerMode ? "Free" : `₹${item.price}`}</p>
                                        </div>
                                    </div>

                                    {isChecked && !isSoldOut && (
                                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1 animate-in zoom-in-95 duration-100">
                                            <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                            <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                            <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                        </div>
                                    )}
                                </div>
                                {isChecked && (
                                    <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                        <input
                                            type="text"
                                            placeholder="Add notes / item comments (e.g. No Sugar, Extra Spicy)..."
                                            value={comments[item.id] || ""}
                                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                            className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                        />
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
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <Coffee size={18} className="text-amber-600" />
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">High Tea Specials</h2>
                        </div>
                        {highTeaUnlocked && (
                            <p className="text-[11px] text-slate-400 font-medium ml-6">
                                Orders can be served from 4:30 PM to 6:30 PM
                            </p>
                        )}
                    </div>

                    {!highTeaUnlocked && timeRemaining && (
                        <div className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 font-mono">
                            <Clock size={12} className="animate-pulse" />
                            {timeRemaining}
                        </div>
                    )}
                </div>

                {!highTeaUnlocked && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider">
                                <Clock size={14} className="text-amber-600 animate-pulse" />
                                Locked Until 4:30 PM
                            </h3>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                High Tea specialties unlock automatically between 4:30 PM and 6:30 PM every day.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Remaining:</span>
                            <div className="font-mono font-black text-xs bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-sm min-w-[80px] text-center">
                                {timeRemaining || "00:00:00"}
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {highTeaItems.map(item => {
                        const isChecked = !!quantities[item.id];
                        const qty = quantities[item.id] || 0;
                        const isSoldOut = typeof item.stock === "number" && item.stock <= 0;
                        return (
                            <div key={item.id} className={`py-3.5 transition-opacity duration-200 border-b border-slate-100 last:border-0 ${(!highTeaUnlocked || isSoldOut) ? "opacity-50 select-none" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3.5 flex-1">
                                        <label className="flex items-center cursor-pointer relative">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleCheckboxToggle(item.id)}
                                                className="sr-only peer"
                                                disabled={!highTeaUnlocked || isSoldOut}
                                            />
                                            <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                            </div>
                                        </label>
                                        <div className="cursor-pointer" onClick={() => highTeaUnlocked && !isSoldOut && handleCheckboxToggle(item.id)}>
                                            <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                {item.name}
                                                {isSoldOut && (
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                )}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">{isOwnerMode ? "Free" : `₹${item.price}`}</p>
                                        </div>
                                    </div>

                                    {isChecked && !isSoldOut && (
                                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1">
                                            <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">-</button>
                                            <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                            <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">+</button>
                                        </div>
                                    )}
                                </div>
                                {isChecked && (
                                    <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                        <input
                                            type="text"
                                            placeholder="Add notes / item comments (e.g. No Sugar, Extra Spicy)..."
                                            value={comments[item.id] || ""}
                                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                            className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timepass Specials Menu */}
            {timepassItems.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <Coffee size={18} className="text-amber-600" />
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Timepass</h2>
                            </div>
                            {timepassUnlocked && (
                                <p className="text-[11px] text-slate-400 font-medium ml-6">
                                    Orders can be served from 4:00 PM to 10:00 PM
                                </p>
                            )}
                        </div>

                        {!timepassUnlocked && timepassTimeRemaining && (
                            <div className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 font-mono">
                                <Clock size={12} className="animate-pulse" />
                                {timepassTimeRemaining}
                            </div>
                        )}
                    </div>

                    {!timepassUnlocked && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 animate-in fade-in duration-200">
                            <div className="space-y-1">
                                <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider">
                                    <Clock size={14} className="text-amber-600 animate-pulse" />
                                    Locked Until 4:00 PM
                                </h3>
                                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                    Timepass menu unlocks automatically between 4:00 PM and 10:00 PM every day.
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Remaining:</span>
                                <div className="font-mono font-black text-xs bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-sm min-w-[80px] text-center">
                                    {timepassTimeRemaining || "00:00:00"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100">
                        {timepassItems.map(item => {
                            const isChecked = !!quantities[item.id];
                            const qty = quantities[item.id] || 0;
                            const isSoldOut = typeof item.stock === "number" && item.stock <= 0;
                            return (
                                <div key={item.id} className={`py-3.5 transition-opacity duration-200 border-b border-slate-100 last:border-0 ${(!timepassUnlocked || isSoldOut) ? "opacity-50 select-none" : ""}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5 flex-1">
                                            <label className="flex items-center cursor-pointer relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleCheckboxToggle(item.id)}
                                                    className="sr-only peer"
                                                    disabled={!timepassUnlocked || isSoldOut}
                                                />
                                                <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                    <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                                </div>
                                            </label>
                                            <div className="cursor-pointer" onClick={() => timepassUnlocked && !isSoldOut && handleCheckboxToggle(item.id)}>
                                                <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                    {item.name}
                                                    {isSoldOut && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                    )}
                                                </p>
                                                <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">{isOwnerMode ? "Free" : `₹${item.price}`}</p>
                                            </div>
                                        </div>

                                        {isChecked && !isSoldOut && (
                                            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1">
                                                <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">-</button>
                                                <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                                <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm">+</button>
                                            </div>
                                        )}
                                    </div>
                                    {isChecked && (
                                        <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                            <input
                                                type="text"
                                                placeholder="Add notes / item comments (e.g. No Sugar, Extra Spicy)..."
                                                value={comments[item.id] || ""}
                                                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                                className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add-ons Section */}
            {(addOnItems.length > 0 || isOwnerMode) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-amber-600" />
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add-ons</h2>
                            </div>
                            {normalUnlocked && (
                                <p className="text-[11px] text-slate-400 font-medium ml-6">
                                    Orders can be served from 8:30 AM to 12:00 AM Midnight
                                </p>
                            )}
                        </div>

                        {!normalUnlocked && normalTimeRemaining && (
                            <div className="bg-red-50 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 font-mono">
                                <Clock size={12} className="animate-pulse" />
                                {normalTimeRemaining}
                            </div>
                        )}
                    </div>

                    {!normalUnlocked && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 animate-in fade-in duration-200">
                            <div className="space-y-1">
                                <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider">
                                    <Clock size={14} className="text-amber-600 animate-pulse" />
                                    Locked Until 8:30 AM
                                </h3>
                                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                    Add-on requests unlock automatically between 8:30 AM and 12:00 AM Midnight every day.
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Remaining:</span>
                                <div className="font-mono font-black text-xs bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-sm min-w-[80px] text-center">
                                    {normalTimeRemaining || "00:00:00"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100">
                        {/* Mud Bath Option B Interactive Card */}
                        {(mb1 || mb2 || mb3) && (
                            <div className={`py-4 transition-opacity duration-200 border-b border-slate-100 ${(!normalUnlocked || isMudBathSoldOut) ? "opacity-50 select-none" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3.5 flex-1">
                                        <label className="flex items-center cursor-pointer relative mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isMudBathChecked}
                                                onChange={handleToggleMudBath}
                                                className="sr-only peer"
                                                disabled={!normalUnlocked || isMudBathSoldOut}
                                            />
                                            <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                            </div>
                                        </label>
                                        <div className="flex-1">
                                            <div className="cursor-pointer" onClick={() => normalUnlocked && !isMudBathSoldOut && handleToggleMudBath()}>
                                                <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                    Mud Bath
                                                    {isMudBathSoldOut && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                                    Rejuvenating natural therapeutic mud bath experience.
                                                </p>
                                            </div>

                                            {/* Person Option Pills */}
                                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => normalUnlocked && handleSelectMudBathPersons(1)}
                                                    disabled={!normalUnlocked}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                        mudBathPersons === 1 && isMudBathChecked
                                                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    1 Person • {isOwnerMode ? "Free" : `₹${mb1?.price ?? 1500}`}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => normalUnlocked && handleSelectMudBathPersons(2)}
                                                    disabled={!normalUnlocked}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                        mudBathPersons === 2 && isMudBathChecked
                                                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    2 Persons • {isOwnerMode ? "Free" : `₹${mb2?.price ?? 2000}`}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => normalUnlocked && handleSelectMudBathPersons(3)}
                                                    disabled={!normalUnlocked}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                        mudBathPersons === 3 && isMudBathChecked
                                                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                                    }`}
                                                >
                                                    3 Persons • {isOwnerMode ? "Free" : `₹${mb3?.price ?? 3000}`}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {isMudBathChecked && !isMudBathSoldOut && (
                                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1 animate-in zoom-in-95 duration-100 shrink-0">
                                            <button onClick={handleDecrementMudBath} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                            <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{mudBathQty}</span>
                                            <button onClick={handleIncrementMudBath} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                        </div>
                                    )}
                                </div>

                                {isMudBathChecked && (
                                    <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                        <input
                                            type="text"
                                            placeholder="Preferred time or notes (e.g. Tomorrow 10:00 AM)..."
                                            value={comments[activeMudBathId] || ""}
                                            onChange={(e) => handleMudBathCommentChange(e.target.value)}
                                            className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Celebration Decoration Item */}
                        {decorItem && (
                            <div className={`py-4 transition-opacity duration-200 border-b border-slate-100 last:border-0 ${(!normalUnlocked || (typeof decorItem.stock === "number" && decorItem.stock <= 0)) ? "opacity-50 select-none" : ""}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3.5 flex-1">
                                        <label className="flex items-center cursor-pointer relative">
                                            <input
                                                type="checkbox"
                                                checked={!!quantities[decorItem.id]}
                                                onChange={() => handleCheckboxToggle(decorItem.id)}
                                                className="sr-only peer"
                                                disabled={!normalUnlocked || (typeof decorItem.stock === "number" && decorItem.stock <= 0)}
                                            />
                                            <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                            </div>
                                        </label>
                                        <div className="cursor-pointer" onClick={() => normalUnlocked && !(typeof decorItem.stock === "number" && decorItem.stock <= 0) && handleCheckboxToggle(decorItem.id)}>
                                            <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                {decorItem.name}
                                                {typeof decorItem.stock === "number" && decorItem.stock <= 0 && (
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                )}
                                            </p>
                                            <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">{isOwnerMode ? "Free" : `₹${decorItem.price}`}</p>
                                        </div>
                                    </div>

                                    {!!quantities[decorItem.id] && !(typeof decorItem.stock === "number" && decorItem.stock <= 0) && (
                                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1 animate-in zoom-in-95 duration-100">
                                            <button onClick={() => handleDecrement(decorItem.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                            <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{quantities[decorItem.id] || 0}</span>
                                            <button onClick={() => handleIncrement(decorItem.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                        </div>
                                    )}
                                </div>
                                {!!quantities[decorItem.id] && (
                                    <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                        <input
                                            type="text"
                                            placeholder="Occasion or decoration instructions (e.g. Birthday, Anniversary setup on bed)..."
                                            value={comments[decorItem.id] || ""}
                                            onChange={(e) => handleCommentChange(decorItem.id, e.target.value)}
                                            className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Any other custom add-on items added via inventory */}
                        {addOnItems.filter(item => !item.id.startsWith("mud_bath_") && item.id !== "celebration_decor").map(item => {
                            const isChecked = !!quantities[item.id];
                            const qty = quantities[item.id] || 0;
                            const isSoldOut = typeof item.stock === "number" && item.stock <= 0;
                            return (
                                <div key={item.id} className={`py-3.5 transition-opacity duration-200 border-b border-slate-100 last:border-0 ${(!normalUnlocked || isSoldOut) ? "opacity-50 select-none" : ""}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5 flex-1">
                                            <label className="flex items-center cursor-pointer relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleCheckboxToggle(item.id)}
                                                    className="sr-only peer"
                                                    disabled={!normalUnlocked || isSoldOut}
                                                />
                                                <div className="w-5.5 h-5.5 bg-white border border-slate-300 rounded-md flex items-center justify-center peer-checked:bg-amber-600 peer-checked:border-amber-600 transition-all shadow-sm">
                                                    <Check size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform stroke-[3px]" />
                                                </div>
                                            </label>
                                            <div className="cursor-pointer" onClick={() => normalUnlocked && !isSoldOut && handleCheckboxToggle(item.id)}>
                                                <p className="font-semibold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                                    {item.name}
                                                    {isSoldOut && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                    )}
                                                </p>
                                                <p className="text-slate-400 font-bold text-xs font-mono mt-0.5">{isOwnerMode ? "Free" : `₹${item.price}`}</p>
                                            </div>
                                        </div>

                                        {isChecked && !isSoldOut && (
                                            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-1 animate-in zoom-in-95 duration-100">
                                                <button onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">-</button>
                                                <span className="w-6 text-center font-bold font-mono text-sm text-slate-800">{qty}</span>
                                                <button onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">+</button>
                                            </div>
                                        )}
                                    </div>
                                    {isChecked && (
                                        <div className="mt-2.5 pl-9 animate-in slide-in-from-top-1 duration-100">
                                            <input
                                                type="text"
                                                placeholder="Add notes / item comments..."
                                                value={comments[item.id] || ""}
                                                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                                className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
            </>
            )}

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

export default function HospitalityEMenuPage({ overrideVilla }: { overrideVilla?: string }) {
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <RefreshCw size={36} className="animate-spin text-amber-600" />
                    <p className="text-sm font-semibold tracking-wide">Loading menu...</p>
                </div>
            }>
                <EMenuContent overrideVilla={overrideVilla} />
            </Suspense>
        </div>
    );
}
