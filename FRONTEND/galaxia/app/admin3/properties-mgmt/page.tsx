"use client";

import { useState, useEffect } from "react";
import { Building, Home, MapPin, Edit3, Power, MoreVertical, Plus, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";

interface Property {
    id: number;
    name: string;
    slug: string;
    type: string;
    location: string;
    maxGuests: number;
    weekdayPrice: number;
    weekendPrice: number;
    isActive: boolean;
    subProperties?: { id: number; name: string; slug: string }[];
}

export default function PropertiesMgmtPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchProperties(); }, []);

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const data = await api.get("/properties/all");
            // Map API fields to frontend interface
            const mapped = (data || []).map((p: any) => ({
                ...p,
                maxGuests: p.maxPersons || 0,
                weekdayPrice: p.pricing?.[0]?.basePrice || 0,
                weekendPrice: p.pricing?.[1]?.basePrice || 0,
            }));
            setProperties(mapped);
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
            console.error("Toggle status error:", err);
            alert("Failed to update property status");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Properties Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage villas, apartments, and digital screening rooms.</p>
                </div>
                <button className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors w-full sm:w-auto">
                    <Plus size={18} /> Add Property
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <p className="text-sm text-slate-500 mt-3">Loading properties…</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {properties.map((prop) => (
                        <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            {/* Header Area */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prop.type === 'dd_screen' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {prop.type === 'dd_screen' ? <Building size={20} /> : <Home size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 leading-tight">{prop.name}</h3>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">{prop.type === 'dd_screen' ? 'Digital Diaries' : prop.type}</p>
                                        {prop.subProperties && prop.subProperties.length > 0 && (
                                            <p className="text-[10px] text-purple-500 font-bold mt-0.5">{prop.subProperties.length} sub-units</p>
                                        )}
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 p-1">
                                    <MoreVertical size={20} />
                                </button>
                            </div>

                            {/* Details Area */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Location</span>
                                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                                        <MapPin size={14} className="text-slate-400" /> {prop.location || "Karjat"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Capacity</span>
                                    <span className="text-slate-700 font-bold">Up to {prop.maxGuests} guests</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Base Price</span>
                                    <span className="text-slate-700 font-bold">₹{(prop.weekdayPrice || 0).toLocaleString("en-IN")}/night</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Status</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${prop.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {prop.isActive ? "Active" : "Disabled"}
                                    </span>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-colors">
                                    <Edit3 size={16} /> Edit
                                </button>
                                <button
                                    onClick={() => togglePropertyStatus(prop)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold shadow-sm transition-colors ${prop.isActive
                                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                        : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                        }`}>
                                    <Power size={16} /> {prop.isActive ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
