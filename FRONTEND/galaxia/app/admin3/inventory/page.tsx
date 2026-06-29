"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw, Save, Coffee, Sparkles, AlertCircle, ShoppingBag } from "lucide-react";
import { api } from "../../../lib/api";
import AdminSidebar from "../../components/AdminSidebar";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: "Normal" | "High Tea" | "Timepass";
    stock?: number;
}

export default function InventoryPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editStocks, setEditStocks] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const fetchMenu = async () => {
        try {
            setLoading(true);
            const data = await api.get<MenuItem[]>("/hospitality/menu");
            if (Array.isArray(data)) {
                setMenuItems(data);
                const stocks: Record<string, string> = {};
                data.forEach(item => {
                    stocks[item.id] = item.stock != null ? String(item.stock) : "100";
                });
                setEditStocks(stocks);
            }
        } catch (err: any) {
            setError("Failed to fetch menu items.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const handleStockChange = (itemId: string, value: string) => {
        setEditStocks(prev => ({
            ...prev,
            [itemId]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const updatedMenu = menuItems.map(item => {
                const stockVal = editStocks[item.id];
                const stockNum = stockVal === "" ? 0 : parseInt(stockVal);
                if (isNaN(stockNum) || stockNum < 0) {
                    throw new Error(`Invalid stock value for ${item.name}`);
                }
                return {
                    ...item,
                    stock: stockNum
                };
            });

            await api.put("/hospitality/menu", { menuItems: updatedMenu });
            setMenuItems(updatedMenu);
            setSuccessMsg("Inventory updated successfully!");
        } catch (err: any) {
            setError(err.message || "Failed to update inventory.");
        } finally {
            setSaving(false);
        }
    };

    const categories: MenuItem["category"][] = ["Normal", "High Tea", "Timepass"];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar isAdmin3={true} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-5">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <Package className="text-purple-600" size={26} />
                                Hospitality Inventory Management
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                Manage stock levels for e-menu items. Items with 0 stock will appear as "Sold Out".
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchMenu}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                Refresh
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                            >
                                <Save size={14} />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-4 rounded-xl flex items-center gap-2">
                            <Sparkles size={18} />
                            {successMsg}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <RefreshCw size={36} className="animate-spin text-purple-600" />
                            <p className="text-sm font-semibold tracking-wide">Loading menu inventory...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {categories.map(cat => {
                                const catItems = menuItems.filter(item => item.category === cat);
                                if (catItems.length === 0) return null;
                                return (
                                    <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                            {cat === "Normal" ? <ShoppingBag size={20} className="text-amber-500" /> : <Coffee size={20} className="text-purple-500" />}
                                            {cat === "Normal" ? "Beverages & Refreshments" : cat} Items
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {catItems.map(item => {
                                                const stockVal = editStocks[item.id] || "0";
                                                const isOut = stockVal === "0";
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-shadow">
                                                        <div>
                                                            <p className="text-sm font-extrabold text-slate-800">{item.name}</p>
                                                            <p className="text-xs text-slate-400 font-bold font-mono mt-0.5">₹{item.price}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {isOut && (
                                                                <span className="text-[10px] font-black px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-500">Stock:</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={stockVal}
                                                                    onChange={e => handleStockChange(item.id, e.target.value)}
                                                                    className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
