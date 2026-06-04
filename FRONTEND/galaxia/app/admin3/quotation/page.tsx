"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import {
    ScrollText, Download, Send, CalendarDays, Users, User, Phone, Mail,
    Home, UtensilsCrossed, PartyPopper, PawPrint, IndianRupee, Loader2, Check, ChevronDown, Building2
} from "lucide-react";

// ── Correct property/villa mapping from database ──
const PROPERTIES = [
    { name: "Hill View", slug: "hill-view", type: "single" as const },
    { name: "Mount View", slug: "mount-view", type: "single" as const },
    { name: "Heavenly Villa", slug: "heavenly-villa", type: "single" as const },
    { name: "La Paraiso", slug: "la-paraiso", type: "single" as const },
    {
        name: "Amstel Nest", slug: "amstel-nest", type: "multi" as const,
        villas: [
            { name: "Standard Cottage", slug: "standard-cottage", unitCount: 14 },
            { name: "Family Cottage", slug: "family-cottage", unitCount: 1 },
        ],
    },
    {
        name: "Ambrose", slug: "ambrose", type: "multi" as const,
        villas: [
            { name: "TAKE-1", slug: "take-1", unitCount: 1 },
            { name: "ALTA", slug: "alta", unitCount: 1 },
            { name: "SANTORINI", slug: "santorini", unitCount: 1 },
            { name: "BAMBOOSA", slug: "bamboosa", unitCount: 1 },
            { name: "CYPRESS", slug: "cypress", unitCount: 1 },
        ],
    },
];

export default function QuotationPage() {
    // ── Form state ──
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [selectedProperty, setSelectedProperty] = useState("");
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [adults, setAdults] = useState(2);
    const [kids, setKids] = useState(0);
    const [pets, setPets] = useState(0);
    const [regularCount, setRegularCount] = useState(2);
    const [jainCount, setJainCount] = useState(0);
    const [decoration, setDecoration] = useState(false);

    useEffect(() => {
        setRegularCount(adults + kids);
        setJainCount(0);
    }, [adults, kids]);

    // Multi-villa state
    // For Amstel Nest: { "Standard Cottage": 0, "Family Cottage": 0 }
    // For Ambrose: { "TAKE-1": 0, "ALTA": 0, ... }
    const [villaQuantities, setVillaQuantities] = useState<Record<string, number>>({});

    // ── UI state ──
    const [pdfLoading, setPdfLoading] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [lastQuoteId, setLastQuoteId] = useState("");
    const [lastBookingUrl, setLastBookingUrl] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [pricing, setPricing] = useState<any>(null);
    const [livePricing, setLivePricing] = useState<Record<string, any>>({});
    const [quotationType, setQuotationType] = useState<"regular" | "multiple">("regular");
    // Multi-property selections: key = "PropertyName" or "PropertyName/VillaName", value = quantity
    const [multiSelections, setMultiSelections] = useState<Record<string, number>>({});

    const selectedProp = PROPERTIES.find(p => p.name === selectedProperty);
    const isMultiVilla = selectedProp?.type === "multi";

    // ── Reset villa quantities when property changes ──
    useEffect(() => {
        if (selectedProp?.type === "multi" && selectedProp.villas) {
            const init: Record<string, number> = {};
            for (const v of selectedProp.villas) init[v.name] = 0;
            setVillaQuantities(init);
        } else {
            setVillaQuantities({});
        }
    }, [selectedProperty]);

    // ── Fetch live pricing ──
    useEffect(() => {
        const slugs = ["hill-view", "mount-view", "heavenly-villa", "la-paraiso", "amstel-nest", "ambrose"];
        const result: Record<string, any> = {};
        Promise.all(slugs.map(async (slug) => {
            try {
                const data = await api.get(`/properties/${slug}/availability`);
                if (!data?.pricing) return;
                const mapName: Record<string, string> = {
                    "hill-view": "Hill View", "mount-view": "Mount View",
                    "heavenly-villa": "Heavenly Villa", "la-paraiso": "La Paraiso",
                    "amstel-nest": "Amstel Nest", "ambrose": "Ambrose",
                };
                const propName = mapName[slug] || slug;
                const buildEntry = (p: any) => {
                    if (!p?.weekday && !p?.weekend) return null;
                    const wd = p.weekday; const we = p.weekend; const sa = p.saturday;
                    return {
                        weekday: wd ? parseInt(wd.price) : (we ? parseInt(we.price) : 0),
                        weekend: we ? parseInt(we.price) : (wd ? parseInt(wd.price) : 0),
                        saturday: sa ? parseInt(sa.price) : (we ? parseInt(we.price) : (wd ? parseInt(wd.price) : 0)),
                        extraAdult: wd?.extraAdult || 1000, kidsCharge: wd?.kidsCharge || 500,
                        baseGuests: wd?.personsLabel ? parseInt(wd.personsLabel) || 2 : 2,
                    };
                };
                const parentEntry = buildEntry(data.pricing);
                if (parentEntry) result[propName] = parentEntry;
                if (data.subProperties && data.subPropertyPricing) {
                    for (const sp of data.subProperties) {
                        const spP = data.subPropertyPricing[sp.id];
                        if (spP) {
                            const spEntry = buildEntry(spP);
                            if (spEntry) result[`${propName}/${sp.name.toUpperCase()}`] = spEntry;
                        }
                    }
                }
            } catch { }
        })).then(() => setLivePricing(result));
    }, []);

    // ── Calculate price (client-side preview) ──
    const calculatePrice = useCallback(() => {
        if (!checkIn || !checkOut) return null;
        const start = new Date(checkIn + "T00:00:00");
        const end = new Date(checkOut + "T00:00:00");
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        let roomTotal = 0, extraAdultTotal = 0, extraKidsTotal = 0, specialDiscount = 0, totalUnits = 0;

        const calcUnit = (propName: string, villaName?: string) => {
            let unitRoom = 0, unitExA = 0, unitExK = 0, unitDiscount = 0;
            for (let i = 0; i < nights; i++) {
                const d = new Date(start); d.setDate(start.getDate() + i);
                const day = d.getDay();
                const isSat = day === 6; const isWe = day === 0 || day === 5 || day === 6;
                let basePrice = 0, extraAdultPrice = 0, kidsPrice = 0, baseGuests = 2;
                let liveKey = "";
                if (propName.includes("Ambrose") && villaName) liveKey = `Ambrose/${villaName.toUpperCase()}`;
                else if (propName.includes("Amstel") && villaName) liveKey = villaName.toLowerCase().includes("family") ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
                else { for (const k of Object.keys(livePricing)) { if (propName.includes(k)) { liveKey = k; break; } } }
                let lp = livePricing[liveKey];
                if (!lp) { for (const [k, v] of Object.entries(livePricing)) { if (k.toUpperCase() === liveKey.toUpperCase()) { lp = v; break; } } }
                if (!lp && (propName.includes("Amstel") || propName.includes("Ambrose"))) lp = livePricing[propName.includes("Amstel") ? "Amstel Nest" : "Ambrose"];
                if (lp) { basePrice = isSat ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday; extraAdultPrice = lp.extraAdult; kidsPrice = lp.kidsCharge; baseGuests = lp.baseGuests; }
                else {
                    if (propName.includes("Hill View")) { basePrice = isWe ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
                    else if (propName.includes("Mount View")) { basePrice = isWe ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (propName.includes("Heavenly")) { basePrice = isWe ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (propName.includes("La Paraiso")) { basePrice = isWe ? 7500 : 4960; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWe ? 4 : 2; }
                    else if (propName.includes("Amstel")) { basePrice = isWe ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; }
                    else if (propName.includes("Ambrose")) { basePrice = isWe ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
                }
                unitRoom += basePrice;
                const exA = Math.max(0, adults - baseGuests);
                const freeKids = Math.max(0, baseGuests - adults);
                const exK = Math.max(0, kids - freeKids);
                unitExA += exA * extraAdultPrice; unitExK += exK * kidsPrice;

                // Special Discount calculations
                const pSlug = propName.toLowerCase();
                const sSlug = (villaName || "").toLowerCase();
                const totalGuests = adults + kids;

                const isAmbroseVilla = pSlug.includes("ambrose") && (sSlug.includes("take-1") || sSlug.includes("alta") || sSlug.includes("santorini") || sSlug.includes("take 1"));
                const isLaParaiso = pSlug.includes("la paraiso") || pSlug.includes("la-paraiso");

                let nightDiscount = 0;
                if (isAmbroseVilla) {
                    if (isSat && totalGuests === 4) {
                        nightDiscount = 500;
                    }
                } else if (isLaParaiso) {
                    if (isWe) {
                        if (totalGuests >= 3) {
                            let extraAdultsCount = 0;
                            let extraKidsCount = 0;
                            for (let slot = 3; slot <= Math.min(4, totalGuests); slot++) {
                                if (slot <= adults) {
                                    extraAdultsCount++;
                                } else {
                                    extraKidsCount++;
                                }
                            }
                            nightDiscount = (extraAdultsCount * extraAdultPrice) + (extraKidsCount * kidsPrice);
                        }
                    }
                }
                unitDiscount += nightDiscount;
            }
            return { roomTotal: unitRoom, extraAdultTotal: unitExA, extraKidsTotal: unitExK, specialDiscount: unitDiscount };
        };

        if (quotationType === "multiple") {
            const hasSelections = Object.values(multiSelections).some(q => q > 0);
            if (!hasSelections) return null;
            for (const [key, qty] of Object.entries(multiSelections)) {
                if (qty <= 0) continue;
                const parts = key.split("/");
                const u = calcUnit(parts[0], parts.length > 1 ? parts[1] : undefined);
                roomTotal += u.roomTotal * qty; extraAdultTotal += u.extraAdultTotal * qty;
                extraKidsTotal += u.extraKidsTotal * qty; specialDiscount += u.specialDiscount * qty; totalUnits += qty;
            }
        } else {
            if (!selectedProperty) return null;
            if (isMultiVilla && Object.values(villaQuantities).some(q => q > 0)) {
                for (const [vName, qty] of Object.entries(villaQuantities)) {
                    if (qty <= 0) continue;
                    const u = calcUnit(selectedProperty, vName);
                    roomTotal += u.roomTotal * qty; extraAdultTotal += u.extraAdultTotal * qty;
                    extraKidsTotal += u.extraKidsTotal * qty; specialDiscount += u.specialDiscount * qty; totalUnits += qty;
                }
            } else if (!isMultiVilla) {
                const u = calcUnit(selectedProperty);
                roomTotal = u.roomTotal; extraAdultTotal = u.extraAdultTotal; extraKidsTotal = u.extraKidsTotal; specialDiscount = u.specialDiscount; totalUnits = 1;
            } else return null;
        }

        const petCharge = pets * 600;
        const subtotal = roomTotal + extraAdultTotal + extraKidsTotal + petCharge;
        const baseAmount = Math.round(subtotal - specialDiscount);
        const gstAmount = Math.round(baseAmount * 0.05);
        let total = baseAmount + gstAmount + (decoration ? 1200 : 0);
        total = Math.round(total / 10) * 10;
        return {
            nights, totalUnits, roomTotal: Math.round(roomTotal),
            extraAdultCharge: Math.round(extraAdultTotal), extraKidsCharge: Math.round(extraKidsTotal),
            decorationCharge: decoration ? 1200 : 0, subtotal: baseAmount, gstAmount,
            petCharge, totalAmount: total, specialDiscount
        };
    }, [quotationType, selectedProperty, villaQuantities, multiSelections, checkIn, checkOut, adults, kids, pets, decoration, livePricing, isMultiVilla]);

    useEffect(() => { setPricing(calculatePrice()); }, [calculatePrice]);

    // ── Generate quote ──
    const generateQuote = async () => {
        if (!customerName.trim()) { alert("Customer name is required"); return null; }
        if (!customerPhone.trim()) { alert("Customer phone is required"); return null; }
        if (!checkIn || !checkOut) { alert("Please fill dates"); return null; }
        if (quotationType === "regular" && !selectedProperty) { alert("Please select a property"); return null; }
        if (quotationType === "regular" && isMultiVilla && !Object.values(villaQuantities).some(q => q > 0)) {
            alert("Please select at least one villa/cottage"); return null;
        }
        if (quotationType === "multiple" && !Object.values(multiSelections).some(q => q > 0)) {
            alert("Please select at least one property/villa"); return null;
        }

        const body: any = {
            customerName, customerPhone, customerEmail: customerEmail || undefined,
            checkIn, checkOut, adults, kids, pets,
            regularCount,
            jainCount,
            decoration,
        };

        if (quotationType === "multiple") {
            const parts: string[] = [];
            const vq: Record<string, number> = {};
            for (const [key, qty] of Object.entries(multiSelections)) {
                if (qty <= 0) continue;
                const sp = key.split("/");
                vq[sp.length > 1 ? sp[1] : sp[0]] = qty;
                parts.push(sp.length > 1 ? `${sp[0]} (${sp[1]})` : sp[0]);
            }
            body.propertyName = parts.join(" + ");
            body.villaQuantities = vq;
        } else {
            body.propertyName = selectedProperty;
            if (isMultiVilla) body.villaQuantities = villaQuantities;
        }

        const res = await api.post("/quotations/generate", body);
        setLastQuoteId(res.quoteId);
        setLastBookingUrl(res.bookingUrl);
        return res;
    };

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const res = await generateQuote();
            if (!res) { setPdfLoading(false); return; }
            const pdfRes = await fetch(`/api/quotations/${res.quoteId}/download`);
            if (!pdfRes.ok) throw new Error("Failed to download PDF");
            const blob = await pdfRes.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Galaxia-Quote-${res.quoteId}.pdf`;
            link.click();
            URL.revokeObjectURL(link.href);
            setSuccessMsg("PDF downloaded!");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) { alert(err?.message || "Failed"); }
        finally { setPdfLoading(false); }
    };

    const handleSendWhatsApp = async () => {
        setSendLoading(true);
        try {
            const res = await generateQuote();
            if (!res) { setSendLoading(false); return; }
            const waRes = await api.post(`/quotations/${res.quoteId}/send-whatsapp`, { bookingUrl: res.bookingUrl });
            setSuccessMsg(`Sent to ${waRes.sentTo}! PDF: ${waRes.pdfSent ? '✅' : '❌'} | Link: ${waRes.linkSent ? '✅' : '❌'}`);
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err: any) { alert(err?.message || "Failed"); }
        finally { setSendLoading(false); }
    };

    const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })();

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-purple-100 rounded-xl"><ScrollText size={22} className="text-purple-600" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quotation Generator</h1>
                        <p className="text-sm text-slate-500 font-medium">Create quotes, download PDFs, and send via WhatsApp</p>
                    </div>
                </div>
            </div>

            {/* Quotation Type Toggle */}
            <div className="mb-6 flex gap-2">
                <button onClick={() => setQuotationType("regular")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${quotationType === "regular" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    Regular Quotation
                </button>
                <button onClick={() => setQuotationType("multiple")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${quotationType === "multiple" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    Multiple Properties
                </button>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <Check size={18} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">{successMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Guest Details */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={15} className="text-purple-500" /> Guest Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Name *</label>
                                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Phone *</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="10-digit number"
                                        className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Optional"
                                        className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Property & Dates */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Home size={15} className="text-purple-500" /> Stay Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {quotationType === "regular" ? (
                                <>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Property *</label>
                                        <div className="relative">
                                            <select value={selectedProperty}
                                                onChange={e => setSelectedProperty(e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none appearance-none bg-white">
                                                <option value="">Select property...</option>
                                                {PROPERTIES.map(p => <option key={p.slug} value={p.name}>{p.name}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    {isMultiVilla && selectedProp?.villas && (
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                                <Building2 size={13} /> Select Villas / Cottages *
                                            </label>
                                            <div className="space-y-2">
                                                {selectedProp.villas.map(v => (
                                                    <div key={v.name} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-700">{v.name}</span>
                                                            {v.unitCount > 1 && <span className="ml-2 text-xs text-slate-400">({v.unitCount} units)</span>}
                                                        </div>
                                                        {v.unitCount > 1 ? (
                                                            <div className="flex items-center border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                                                                <button onClick={() => setVillaQuantities(prev => ({ ...prev, [v.name]: Math.max(0, (prev[v.name] || 0) - 1) }))}
                                                                    className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 font-bold text-sm">−</button>
                                                                <span className="px-3 py-1.5 text-sm font-bold text-slate-700 min-w-[32px] text-center">{villaQuantities[v.name] || 0}</span>
                                                                <button onClick={() => setVillaQuantities(prev => ({ ...prev, [v.name]: Math.min(v.unitCount, (prev[v.name] || 0) + 1) }))}
                                                                    className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 font-bold text-sm">+</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setVillaQuantities(prev => ({ ...prev, [v.name]: prev[v.name] ? 0 : 1 }))}
                                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${villaQuantities[v.name] ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                                                                {villaQuantities[v.name] ? "Selected ✓" : "Select"}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* ── Multiple Properties Mode ── */
                                <div className="sm:col-span-2 space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                                        <Building2 size={13} /> Select Properties & Villas *
                                    </label>
                                    {PROPERTIES.map(prop => (
                                        <div key={prop.slug} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                            <p className="text-sm font-black text-slate-700 mb-2">{prop.name}</p>
                                            {prop.type === "multi" && prop.villas ? (
                                                <div className="space-y-2 pl-2">
                                                    {prop.villas.map(v => {
                                                        const key = `${prop.name}/${v.name}`;
                                                        return (
                                                            <div key={key} className="flex items-center justify-between">
                                                                <span className="text-xs font-medium text-slate-600">{v.name}{v.unitCount > 1 ? ` (${v.unitCount} units)` : ""}</span>
                                                                {v.unitCount > 1 ? (
                                                                    <div className="flex items-center border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                                                                        <button onClick={() => setMultiSelections(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                                                                            className="px-2 py-1 text-slate-400 hover:text-slate-600 font-bold text-xs">−</button>
                                                                        <span className="px-2 py-1 text-xs font-bold text-slate-700 min-w-[24px] text-center">{multiSelections[key] || 0}</span>
                                                                        <button onClick={() => setMultiSelections(prev => ({ ...prev, [key]: Math.min(v.unitCount, (prev[key] || 0) + 1) }))}
                                                                            className="px-2 py-1 text-slate-400 hover:text-slate-600 font-bold text-xs">+</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setMultiSelections(prev => ({ ...prev, [key]: prev[key] ? 0 : 1 }))}
                                                                        className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${multiSelections[key] ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                                                                        {multiSelections[key] ? "✓" : "Select"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <button onClick={() => setMultiSelections(prev => ({ ...prev, [prop.name]: prev[prop.name] ? 0 : 1 }))}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${multiSelections[prop.name] ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                                                    {multiSelections[prop.name] ? "Selected ✓" : "Select"}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Check-in *</label>
                                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={todayStr}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Check-out *</label>
                                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || todayStr}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Guests & Food */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Users size={15} className="text-purple-500" /> Guests & Food
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <NumberInput label="Adults" value={adults} onChange={setAdults} min={1} max={20} icon={<Users size={14} />} />
                            <NumberInput label="Kids" value={kids} onChange={setKids} min={0} max={10} icon={<User size={14} />} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <NumberInput label="Pets" value={pets} onChange={setPets} min={0} max={5} icon={<PawPrint size={14} />} />
                            <NumberInput label="Regular Veg" value={regularCount} onChange={setRegularCount} min={0} max={30} icon={<UtensilsCrossed size={14} />} />
                            <NumberInput label="Jain Veg" value={jainCount} onChange={setJainCount} min={0} max={30} icon={<UtensilsCrossed size={14} />} />
                            <div className="flex flex-col justify-end">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Decoration</label>
                                <button onClick={() => setDecoration(!decoration)}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all h-[42px] ${decoration
                                        ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                    <PartyPopper size={14} /> {decoration ? "Decoration ✓" : "Add Decoration"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Price Summary & Actions */}
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-8">
                        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <IndianRupee size={15} className="text-emerald-500" /> Price Breakdown
                        </h2>

                        {pricing ? (
                            <div className="space-y-2.5">
                                <PriceRow label="Room Total" value={fmtCurrency(pricing.roomTotal)} sub={`${pricing.nights} night${pricing.nights > 1 ? 's' : ''}${pricing.totalUnits > 1 ? ` × ${pricing.totalUnits} units` : ''}`} bold />
                                <PriceRow label="GST" value={fmtCurrency(pricing.gstAmount)} />
                                {pricing.extraAdultCharge > 0 && <PriceRow label="Extra Adults" value={fmtCurrency(pricing.extraAdultCharge)} />}
                                {pricing.extraKidsCharge > 0 && <PriceRow label="Extra Kids" value={fmtCurrency(pricing.extraKidsCharge)} />}
                                {pricing.specialDiscount > 0 && <PriceRow label="Discount" value={`-${fmtCurrency(pricing.specialDiscount)}`} />}
                                {pricing.decorationCharge > 0 && <PriceRow label="Celebration Add-on" value={fmtCurrency(pricing.decorationCharge)} />}
                                {pricing.petCharge > 0 && <PriceRow label="Pet Charges" value={fmtCurrency(pricing.petCharge)} />}
                                <div className="border-t-2 border-emerald-200 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-black text-slate-800">Grand Total</span>
                                        <span className="text-xl font-black text-emerald-600">{fmtCurrency(pricing.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-medium">Select property & dates to see pricing</p>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <button onClick={handleDownloadPDF}
                                disabled={!pricing || !customerName.trim() || !customerPhone.trim() || pdfLoading}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                                {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF
                            </button>
                            <button onClick={handleSendWhatsApp}
                                disabled={!pricing || !customerName.trim() || !customerPhone.trim() || sendLoading}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                                {sendLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Generate Quote & Send
                            </button>
                            <p className="text-[11px] text-slate-400 text-center font-medium">Sends PDF + booking link via WhatsApp</p>
                        </div>

                        {lastQuoteId && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                                <p><strong>Last Quote:</strong> {lastQuoteId}</p>
                                {lastBookingUrl && <p className="truncate"><strong>Link:</strong> <a href={lastBookingUrl} target="_blank" className="text-purple-600 hover:underline">{lastBookingUrl}</a></p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NumberInput({ label, value, onChange, min, max, icon }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; icon: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">{label}</label>
            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => onChange(Math.max(min, value - 1))}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors font-bold">−</button>
                <div className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
                    <span className="text-slate-400">{icon}</span>{value}
                </div>
                <button onClick={() => onChange(Math.min(max, value + 1))}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors font-bold">+</button>
            </div>
        </div>
    );
}

function PriceRow({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
    return (
        <div className="flex justify-between items-start">
            <div>
                <span className={`text-sm ${bold ? "font-bold text-slate-700" : "text-slate-500"}`}>{label}</span>
                {sub && <p className="text-[11px] text-slate-400 font-medium">{sub}</p>}
            </div>
            <span className={`text-sm ${bold ? "font-bold text-slate-800" : "font-semibold text-slate-700"}`}>{value}</span>
        </div>
    );
}
