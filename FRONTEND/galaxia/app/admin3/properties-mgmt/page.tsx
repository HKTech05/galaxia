"use client";

import { useState, useEffect } from "react";
import { Building, Home, MapPin, Edit3, Power, Save, X, Loader2, IndianRupee, Users, Ban, Check } from "lucide-react";
import { api } from "../../../lib/api";

type Tab = "standalone" | "amstelnest" | "ambrose" | "digitaldiaries";

interface Property {
    id: number;
    name: string;
    slug: string;
    type: string;
    location: string;
    maxGuests: number;
    isActive: boolean;
    pricing: any[];
    subProperties?: { id: number; name: string; slug: string; isActive: boolean }[];
}

export default function PropertiesMgmtPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>("standalone");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrices, setEditPrices] = useState<{ weekday: string; weekend: string; saturday?: string; extraGuest?: string }>({ weekday: "", weekend: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchProperties(); }, []);

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const data = await api.get("/properties/all-nested");
            setProperties(data || []);
        } catch (err) {
            console.error("Failed to fetch properties:", err);
        } finally {
            setLoading(false);
        }
    };

    const togglePropertyStatus = async (prop: Property) => {
        try {
            await api.patch(`/properties/${prop.id}`, { isActive: !prop.isActive });
            await fetchProperties();
        } catch (err) {
            alert("Failed to update property status");
        }
    };

    const toggleSubPropertyStatus = async (subPropId: number) => {
        try {
            await api.patch(`/properties/sub/${subPropId}/toggle`);
            await fetchProperties();
        } catch (err) {
            alert("Failed to update sub-property status");
        }
    };

    const startEditing = (prop: Property) => {
        const weekday = prop.pricing?.find((p: any) => p.dayType === "weekday");
        const weekend = prop.pricing?.find((p: any) => p.dayType === "weekend");
        const saturday = prop.pricing?.find((p: any) => p.dayType === "saturday");
        setEditingId(prop.id);
        setEditPrices({
            weekday: weekday?.basePrice?.toString() || "",
            weekend: weekend?.basePrice?.toString() || "",
            saturday: saturday?.basePrice?.toString() || "",
            extraGuest: weekday?.extraAdultPrice?.toString() || ""
        });
    };

    const saveEditing = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            await api.patch(`/properties/${editingId}/pricing`, {
                weekday: parseInt(editPrices.weekday) || 0,
                weekend: parseInt(editPrices.weekend) || 0,
                saturday: editPrices.saturday ? parseInt(editPrices.saturday) : undefined,
                extraGuest: editPrices.extraGuest ? parseInt(editPrices.extraGuest) : undefined
            });
            setEditingId(null);
            await fetchProperties();
        } catch (err) {
            alert("Failed to update prices");
        } finally {
            setSaving(false);
        }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: "standalone", label: "Standalone Villas" },
        { key: "amstelnest", label: "Amstel Nest" },
        { key: "ambrose", label: "Ambrose" },
        { key: "digitaldiaries", label: "Digital Diaries" },
    ];

    // Filter properties by tab
    const getFilteredProperties = () => {
        switch (activeTab) {
            case "standalone":
                return properties.filter(p => p.type === "standalone");
            case "amstelnest":
                return properties.filter(p => p.slug === "amstel-nest" || p.name?.toLowerCase().includes("amstel"));
            case "ambrose":
                return properties.filter(p => p.slug === "ambrose" || p.name?.toLowerCase().includes("ambrose"));
            case "digitaldiaries":
                return properties.filter(p => p.type === "dd_screen" || p.slug === "digital-diaries");
            default:
                return [];
        }
    };

    const filteredProps = getFilteredProperties();

    const renderPriceField = (label: string, field: keyof typeof editPrices) => (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="number"
                    value={editPrices[field] || ""}
                    onChange={(e) => setEditPrices({ ...editPrices, [field]: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
            </div>
        </div>
    );

    const renderPropertyCard = (prop: Property) => {
        const isEditing = editingId === prop.id;
        const weekday = prop.pricing?.find((p: any) => p.dayType === "weekday");
        const weekend = prop.pricing?.find((p: any) => p.dayType === "weekend");
        const saturday = prop.pricing?.find((p: any) => p.dayType === "saturday");

        return (
            <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prop.type === 'dd_screen' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                            {prop.type === 'dd_screen' ? <Building size={20} /> : <Home size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 leading-tight">{prop.name}</h3>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{prop.type === 'dd_screen' ? 'Digital Diaries' : prop.type}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${prop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {prop.isActive ? "Active" : "Disabled"}
                    </span>
                </div>

                <div className="p-5 space-y-3">
                    {isEditing ? (
                        <div className="space-y-3 animate-in fade-in">
                            {renderPriceField("Mon-Thu Price", "weekday")}
                            {renderPriceField("Fri/Sun Price", "weekend")}
                            {saturday && renderPriceField("Saturday Price", "saturday")}
                            {renderPriceField("Extra Guest Charge", "extraGuest")}
                            <div className="flex gap-2 pt-2">
                                <button onClick={saveEditing} disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium">Mon-Thu</span>
                                <span className="text-slate-700 font-bold">₹{(weekday?.basePrice || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium">Fri/Sun</span>
                                <span className="text-slate-700 font-bold">₹{(weekend?.basePrice || 0).toLocaleString("en-IN")}</span>
                            </div>
                            {saturday && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Saturday</span>
                                    <span className="text-slate-700 font-bold">₹{(saturday.basePrice || 0).toLocaleString("en-IN")}</span>
                                </div>
                            )}
                            {weekday?.extraAdultPrice > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Extra Guest</span>
                                    <span className="text-slate-700 font-bold">₹{weekday.extraAdultPrice.toLocaleString("en-IN")}/person</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium">Capacity</span>
                                <span className="text-slate-700 font-bold flex items-center gap-1"><Users size={14} /> {prop.maxGuests || 0} guests</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Sub-properties for Amstel Nest */}
                {activeTab === "amstelnest" && prop.subProperties && prop.subProperties.length > 0 && (
                    <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Cottages ({prop.subProperties.filter(sp => sp.isActive).length}/{prop.subProperties.length} active)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {prop.subProperties.map(sp => (
                                <button
                                    key={sp.id}
                                    onClick={() => toggleSubPropertyStatus(sp.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                        sp.isActive
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                    }`}
                                >
                                    <span className="truncate">{sp.name}</span>
                                    {sp.isActive ? <Check size={12} /> : <Ban size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sub-properties for Ambrose */}
                {activeTab === "ambrose" && prop.subProperties && prop.subProperties.length > 0 && (
                    <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Villas ({prop.subProperties.length})</p>
                        <div className="space-y-2">
                            {prop.subProperties.map(sp => (
                                <div key={sp.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-xs font-bold text-slate-700">{sp.name}</span>
                                    <button
                                        onClick={() => toggleSubPropertyStatus(sp.id)}
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                                            sp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}
                                    >
                                        {sp.isActive ? "Active" : "Disabled"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                {!isEditing && (
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button onClick={() => startEditing(prop)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-colors">
                            <Edit3 size={14} /> Edit Prices
                        </button>
                        <button onClick={() => togglePropertyStatus(prop)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                                prop.isActive
                                    ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                    : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}>
                            <Power size={14} /> {prop.isActive ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Properties Management</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage pricing, availability, and sub-properties.</p>
            </div>

            {/* 4-Tab Nav */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <p className="text-sm text-slate-500 mt-3">Loading properties…</p>
                </div>
            ) : filteredProps.length === 0 ? (
                <div className="text-center py-20 text-slate-500 font-medium">No properties found for this category.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProps.map(renderPropertyCard)}
                </div>
            )}
        </div>
    );
}
