"use client";

import { useState, useEffect } from "react";
import { Building, Home, Edit3, Power, Save, X, Loader2, IndianRupee, Users, Ban, Check, Calendar, Plus } from "lucide-react";
import { api } from "../../../lib/api";

type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

interface Property {
    id: number; name: string; slug: string; type: string; location: string;
    maxGuests: number; isActive: boolean; pricing: any[];
    subProperties?: { id: number; name: string; slug: string; isActive: boolean }[];
    ddScreens?: { id: number; name: string; slug: string; theme: string; isActive: boolean }[];
    ddPackages?: { id: number; name: string; slug: string; extraPersonPrice: number; inclusions: any; pricing: { id: number; hours: number; label: string; weekdayPrice: number; weekendPrice: number }[] }[];
}

export default function PropertiesMgmtPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("standalone");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrices, setEditPrices] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    // Date-specific pricing
    const [dateOverrideOpen, setDateOverrideOpen] = useState<number | null>(null);
    const [overrideDate, setOverrideDate] = useState("");
    const [overridePrice, setOverridePrice] = useState("");

    useEffect(() => { fetchProperties(); }, []);

    const fetchProperties = async () => {
        try { setLoading(true); const data = await api.get("/properties/all-nested"); setProperties(data || []); }
        catch (err) { console.error("Failed to fetch properties:", err); }
        finally { setLoading(false); }
    };

    const togglePropertyStatus = async (prop: Property) => {
        try { await api.patch(`/properties/${prop.id}`, { isActive: !prop.isActive }); await fetchProperties(); }
        catch { alert("Failed to update status"); }
    };

    const toggleSubPropertyStatus = async (subPropId: number) => {
        try { await api.patch(`/properties/sub/${subPropId}/toggle`); await fetchProperties(); }
        catch { alert("Failed to update sub-property"); }
    };

    const toggleDdScreen = async (screenId: number, currentActive: boolean) => {
        try { await api.patch(`/properties/dd-${screenId}`, { isActive: !currentActive }); await fetchProperties(); }
        catch { alert("Failed to toggle screen"); }
    };

    const startEditing = (prop: Property) => {
        const prices: Record<string, string> = {};
        (prop.pricing || []).forEach((p: any) => {
            prices[`${p.dayType}_base`] = p.basePrice?.toString() || "";
            prices[`${p.dayType}_extra`] = p.extraAdultPrice?.toString() || "";
        });
        setEditingId(prop.id);
        setEditPrices(prices);
    };

    const saveEditing = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            await api.patch(`/properties/${editingId}/pricing`, {
                weekday: parseInt(editPrices.weekday_base) || undefined,
                weekend: parseInt(editPrices.weekend_base) || undefined,
                saturday: editPrices.saturday_base ? parseInt(editPrices.saturday_base) : undefined,
                extraGuest: parseInt(editPrices.weekday_extra) || undefined
            });
            setEditingId(null); await fetchProperties();
        } catch { alert("Failed to update prices"); }
        finally { setSaving(false); }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: "standalone", label: "Standalone Villas" },
        { key: "amstelnest", label: "Amstel Nest" },
        { key: "ambrose", label: "Ambrose" },
        { key: "digitaldiaries", label: "Digital Diaries" },
    ];

    const getFilteredProperties = () => {
        switch (activeTab) {
            case "standalone": return properties.filter(p => p.type === "standalone");
            case "amstelnest": return properties.filter(p => p.slug === "amstel-nest" || p.name?.toLowerCase().includes("amstel"));
            case "ambrose": return properties.filter(p => p.slug === "ambrose" || p.name?.toLowerCase().includes("ambrose"));
            case "digitaldiaries": return properties.filter(p => p.slug === "digital-diaries");
            default: return [];
        }
    };

    const filteredProps = getFilteredProperties();

    /* Standalone / individual villa card */
    const renderVillaCard = (prop: Property, subName?: string) => {
        const isEditing = editingId === prop.id;
        const weekday = prop.pricing?.find((p: any) => p.dayType === "weekday");
        const weekend = prop.pricing?.find((p: any) => p.dayType === "weekend");
        const saturday = prop.pricing?.find((p: any) => p.dayType === "saturday");

        return (
            <div key={prop.id + (subName || "")} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div>
                        <div>
                            <h3 className="font-bold text-slate-800 leading-tight">{subName || prop.name}</h3>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{prop.type}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${prop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {prop.isActive ? "Active" : "Disabled"}
                    </span>
                </div>
                <div className="p-5 space-y-3">
                    {isEditing ? (
                        <div className="space-y-3 animate-in fade-in">
                            {["weekday", "weekend", ...(saturday ? ["saturday"] : [])].map(dt => (
                                <div key={dt} className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{dt === "weekday" ? "Mon-Thu" : dt === "weekend" ? "Fri/Sun" : "Saturday"}</label>
                                    <div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" value={editPrices[`${dt}_base`] || ""} onChange={e => setEditPrices({ ...editPrices, [`${dt}_base`]: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" />
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extra Guest Charge</label>
                                <div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="number" value={editPrices.weekday_extra || ""} onChange={e => setEditPrices({ ...editPrices, weekday_extra: e.target.value })}
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={saveEditing} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                                </button>
                                <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"><X size={14} /> Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 font-medium">Mon-Thu</span><span className="text-slate-700 font-bold">₹{(weekday?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 font-medium">Fri/Sun</span><span className="text-slate-700 font-bold">₹{(weekend?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                            {saturday && <div className="flex items-center justify-between text-sm"><span className="text-slate-500 font-medium">Saturday</span><span className="text-slate-700 font-bold">₹{(saturday.basePrice || 0).toLocaleString("en-IN")}</span></div>}
                            {weekday?.extraAdultPrice > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-500 font-medium">Extra Guest</span><span className="text-slate-700 font-bold">₹{weekday.extraAdultPrice.toLocaleString("en-IN")}/person</span></div>}
                            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 font-medium">Capacity</span><span className="text-slate-700 font-bold flex items-center gap-1"><Users size={14} /> {prop.maxGuests || 0} guests</span></div>
                        </>
                    )}
                </div>
                {!isEditing && (
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <button onClick={() => startEditing(prop)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-colors"><Edit3 size={14} /> Edit Prices</button>
                        <button onClick={() => { setDateOverrideOpen(dateOverrideOpen === prop.id ? null : prop.id); setOverrideDate(""); setOverridePrice(""); }}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"><Calendar size={14} /></button>
                        <button onClick={() => togglePropertyStatus(prop)} className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold shadow-sm transition-colors ${prop.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}><Power size={14} /> {prop.isActive ? 'Disable' : 'Enable'}</button>
                    </div>
                )}
                {/* Date-specific pricing form */}
                {dateOverrideOpen === prop.id && (
                    <div className="px-5 py-4 bg-indigo-50/50 border-t border-indigo-100 space-y-3 animate-in fade-in">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Set Price for Specific Date</p>
                        <div className="flex gap-2">
                            <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                            <div className="relative flex-1"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="number" placeholder="Price" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                            </div>
                        </div>
                        <button onClick={async () => {
                            if (!overrideDate || !overridePrice) return alert("Enter date and price");
                            try { await api.post(`/properties/${prop.id}/date-pricing`, { date: overrideDate, price: parseInt(overridePrice) }); alert("Date pricing saved!"); setDateOverrideOpen(null); }
                            catch { alert("Failed to save date pricing"); }
                        }} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Plus size={14} className="inline mr-1" />Set Price Override</button>
                    </div>
                )}
            </div>
        );
    };

    /* AMSTEL NEST — 2 cards */
    const renderAmstelNest = () => {
        const amstel = filteredProps[0];
        if (!amstel) return <div className="text-center py-20 text-slate-500 font-medium">No Amstel Nest found.</div>;
        const allSubs = amstel.subProperties || [];
        const standardCottages = allSubs.filter(sp => !sp.name.toLowerCase().includes("family") && !sp.name.toLowerCase().includes("standard cottage"));
        const familyCottage = allSubs.find(sp => sp.name.toLowerCase().includes("family"));
        const weekday = amstel.pricing?.find((p: any) => p.dayType === "weekday");
        const weekend = amstel.pricing?.find((p: any) => p.dayType === "weekend");

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Standard Cottages */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div>
                            <div><h3 className="font-bold text-slate-800">Standard Cottages</h3><p className="text-xs text-slate-500 mt-0.5">Amstel Nest — {standardCottages.length} cottages</p></div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${amstel.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{amstel.isActive ? "Active" : "Disabled"}</span>
                    </div>
                    <div className="p-5 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Mon-Thu</span><span className="text-slate-700 font-bold">₹{(weekday?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Fri/Sun</span><span className="text-slate-700 font-bold">₹{(weekend?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                        {weekday?.extraAdultPrice > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Extra Guest</span><span className="text-slate-700 font-bold">₹{weekday.extraAdultPrice.toLocaleString("en-IN")}/person</span></div>}
                    </div>
                    <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Cottages ({standardCottages.filter(s => s.isActive).length}/{standardCottages.length} active)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {standardCottages.map(sp => (
                                <button key={sp.id} onClick={() => toggleSubPropertyStatus(sp.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${sp.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                                    <span className="truncate">{sp.name}</span>{sp.isActive ? <Check size={12} /> : <Ban size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button onClick={() => startEditing(amstel)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm"><Edit3 size={14} /> Edit Prices</button>
                        <button onClick={() => togglePropertyStatus(amstel)} className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold shadow-sm ${amstel.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}><Power size={14} /> {amstel.isActive ? 'Disable All' : 'Enable All'}</button>
                    </div>
                </div>
                {/* Family Cottage */}
                {familyCottage && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600"><Home size={20} /></div>
                                <div><h3 className="font-bold text-slate-800">Family Cottage</h3><p className="text-xs text-slate-500 mt-0.5">Amstel Nest — Premium Family Unit</p></div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${familyCottage.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{familyCottage.isActive ? "Active" : "Disabled"}</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Mon-Thu</span><span className="text-slate-700 font-bold">₹{(weekday?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Fri/Sun</span><span className="text-slate-700 font-bold">₹{(weekend?.basePrice || 0).toLocaleString("en-IN")}</span></div>
                            <p className="text-xs text-slate-400 italic">Shares pricing with Standard Cottages</p>
                        </div>
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => toggleSubPropertyStatus(familyCottage.id)}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 border rounded-lg text-sm font-bold ${familyCottage.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                <Power size={14} /> {familyCottage.isActive ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* AMBROSE — separate villa cards */
    const renderAmbrose = () => {
        const ambrose = filteredProps[0];
        if (!ambrose) return <div className="text-center py-20 text-slate-500 font-medium">No Ambrose found.</div>;
        const villas = ambrose.subProperties || [];
        const weekday = ambrose.pricing?.find((p: any) => p.dayType === "weekday");
        const weekend = ambrose.pricing?.find((p: any) => p.dayType === "weekend");
        const saturday = ambrose.pricing?.find((p: any) => p.dayType === "saturday");

        return (
            <div className="space-y-4">
                {/* Parent pricing row */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Home size={20} /></div>
                        <div><h3 className="font-bold text-slate-800">Ambrose Resort</h3><p className="text-xs text-slate-500">{villas.length} themed villas</p></div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">Mon-Thu: <b className="text-slate-800">₹{(weekday?.basePrice || 0).toLocaleString("en-IN")}</b></span>
                        <span className="text-slate-500">Fri/Sun: <b className="text-slate-800">₹{(weekend?.basePrice || 0).toLocaleString("en-IN")}</b></span>
                        {saturday && <span className="text-slate-500">Sat: <b className="text-slate-800">₹{(saturday.basePrice || 0).toLocaleString("en-IN")}</b></span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => startEditing(ambrose)} className="flex items-center gap-2 py-2 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm"><Edit3 size={14} /> Edit Base Prices</button>
                        <button onClick={() => togglePropertyStatus(ambrose)} className={`flex items-center gap-2 py-2 px-4 border rounded-lg text-sm font-semibold shadow-sm ${ambrose.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}><Power size={14} /> {ambrose.isActive ? 'Disable All' : 'Enable All'}</button>
                    </div>
                </div>
                {/* Inline price edit */}
                {editingId === ambrose.id && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {["weekday", "weekend", ...(saturday ? ["saturday"] : [])].map(dt => (
                                <div key={dt} className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">{dt === "weekday" ? "Mon-Thu" : dt === "weekend" ? "Fri/Sun" : "Saturday"}</label>
                                    <div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" value={editPrices[`${dt}_base`] || ""} onChange={e => setEditPrices({ ...editPrices, [`${dt}_base`]: e.target.value })} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" />
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Extra Guest</label>
                                <div className="relative"><IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="number" value={editPrices.weekday_extra || ""} onChange={e => setEditPrices({ ...editPrices, weekday_extra: e.target.value })} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500/20 outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={saveEditing} disabled={saving} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                            <button onClick={() => setEditingId(null)} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">Cancel</button>
                        </div>
                    </div>
                )}
                {/* Individual villa cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {villas.map(v => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600"><Home size={18} /></div>
                                    <h3 className="font-bold text-slate-800">{v.name}</h3>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.isActive ? "Active" : "Disabled"}</span>
                            </div>
                            <div className="px-5 pb-4">
                                <button onClick={() => toggleSubPropertyStatus(v.id)}
                                    className={`w-full flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-bold transition-colors ${v.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                    <Power size={14} /> {v.isActive ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    /* DIGITAL DIARIES */
    const renderDigitalDiaries = () => {
        const ddProp = filteredProps[0];
        if (!ddProp) return <div className="text-center py-20 text-slate-500 font-medium">No DD property found.</div>;
        const screens = ddProp.ddScreens || [];
        const packages = ddProp.ddPackages || [];

        return (
            <div className="space-y-6">
                {/* Screens */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600"><Building size={20} /></div>
                            <div><h3 className="font-bold text-slate-800">Screens</h3><p className="text-xs text-slate-500">{screens.length} screens</p></div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ddProp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{ddProp.isActive ? "Active" : "Disabled"}</span>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {screens.map(s => (
                                <button key={s.id} onClick={() => toggleDdScreen(s.id, s.isActive)}
                                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-xs font-bold border transition-colors ${s.isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                                    <span className="font-bold">{s.name}</span>
                                    <span className="text-[9px] font-medium opacity-70">{s.theme}</span>
                                    {s.isActive ? <Check size={12} /> : <Ban size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Packages with pricing */}
                {packages.map(pkg => (
                    <div key={pkg.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">{pkg.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Extra person: ₹{pkg.extraPersonPrice}/person</p>
                        </div>
                        <div className="p-5">
                            {/* Inclusions */}
                            {pkg.inclusions && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Inclusions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(pkg.inclusions) ? pkg.inclusions : []).map((inc: string, i: number) => (
                                            <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 font-medium">{inc}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Pricing tiers */}
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pricing (for 2 people)</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-slate-50">
                                        <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase">Duration</th>
                                        <th className="text-right px-4 py-2 text-xs font-bold text-slate-500 uppercase">Weekday</th>
                                        <th className="text-right px-4 py-2 text-xs font-bold text-slate-500 uppercase">Weekend</th>
                                    </tr></thead>
                                    <tbody>
                                        {pkg.pricing.map(pr => (
                                            <tr key={pr.id} className="border-t border-slate-100">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">{pr.hours} {pr.hours === 1 ? 'Hour' : 'Hours'}{pr.label ? ` (${pr.label})` : ''}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{pr.weekdayPrice.toLocaleString("en-IN")}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{pr.weekendPrice.toLocaleString("en-IN")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div><h1 className="text-2xl font-bold text-slate-800 tracking-tight">Properties Management</h1><p className="text-sm font-medium text-slate-500 mt-1">Manage pricing, availability, and sub-properties.</p></div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
                ))}
            </div>
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /><p className="text-sm text-slate-500 mt-3">Loading…</p></div>
            ) : activeTab === "amstelnest" ? renderAmstelNest()
            : activeTab === "ambrose" ? renderAmbrose()
            : activeTab === "digitaldiaries" ? renderDigitalDiaries()
            : filteredProps.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">No properties found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProps.map(p => renderVillaCard(p))}
                </div>
            )}
        </div>
    );
}
