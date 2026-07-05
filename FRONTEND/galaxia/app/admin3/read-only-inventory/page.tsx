"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw, Eye } from "lucide-react";
import { api } from "../../../lib/api";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: "Normal" | "High Tea" | "Timepass";
    stock: number;
    tracked: boolean;
    costPrice?: number;
}

export default function ReadOnlyInventoryPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMenu = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api.get<MenuItem[]>("/hospitality/menu");
            setMenuItems(data || []);
        } catch (err: any) {
            console.error("Failed to fetch menu items:", err);
            setError("Failed to load inventory items.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    // Filter categories
    const categories: MenuItem["category"][] = ["Normal", "High Tea", "Timepass"];

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                        <Package size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Inventory Stock</h1>
                        <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                            <Eye size={14} className="text-slate-400" />
                            Read-only stock levels view for staff
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchMenu}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-2xl border border-slate-200 transition-all duration-200 text-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin text-purple-600" : ""} />
                    Refresh Stock
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {/* Lists by category */}
            {loading && menuItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <RefreshCw size={36} className="animate-spin text-purple-600" />
                    <p className="text-sm font-semibold">Loading stock records...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {categories.map((category) => {
                        const items = menuItems.filter(i => i.category === category);
                        if (items.length === 0) return null;

                        return (
                            <div key={category} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                                <div className="border-b border-slate-100 pb-3">
                                    <h2 className="text-lg font-black text-slate-800 tracking-wide uppercase">{category} Category</h2>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                                                <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Current Stock / Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3.5 px-4 text-sm font-bold text-slate-700">{item.name}</td>
                                                    <td className="py-3.5 px-4 text-sm text-right">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-black text-xs border ${
                                                            item.stock <= 5 
                                                                ? "bg-red-50 text-red-700 border-red-100" 
                                                                : item.stock <= 15 
                                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        }`}>
                                                            {item.stock} Units
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
