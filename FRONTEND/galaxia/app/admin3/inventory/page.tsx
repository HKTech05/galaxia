"use client";

import { useState, useEffect, Suspense } from "react";
import { Package, RefreshCw, Save, Coffee, Sparkles, AlertCircle, ShoppingBag, Plus, Trash2, Pencil, X, TrendingUp, BarChart3, DollarSign, Award, ArrowDown, ArrowUp, PieChart, Download } from "lucide-react";
import { api } from "../../../lib/api";
import { EMenuContent } from "../../hospitalityemenu/page";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: "Normal" | "High Tea" | "Timepass";
    stock?: number;
    tracked?: boolean;
    costPrice?: number;
}

interface InsightItem {
    id: string;
    name: string;
    price: number;
    category: string;
    totalOrdered: number;
    totalRevenue: number;
    estimatedCost: number;
    orderDates: string[];
}

interface InsightsData {
    totalOrders: number;
    totalRevenue: number;
    totalEstimatedCost: number;
    totalProfit: number;
    categoryStats: Record<string, { orders: number; revenue: number; cost: number }>;
    items: InsightItem[];
    mostOrdered: InsightItem[];
    leastOrdered: InsightItem[];
}

export default function InventoryPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloadingMenuPdf, setDownloadingMenuPdf] = useState(false);
    const [downloadingStockPdf, setDownloadingStockPdf] = useState(false);
    const [editStocks, setEditStocks] = useState<Record<string, string>>({});

    const handleDownloadMenuPdf = async () => {
        try {
            setDownloadingMenuPdf(true);
            const res = await fetch("/api/hospitality/menu/download-pdf");
            if (!res.ok) throw new Error("Failed to download menu PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Galaxia_Resorts_Menu.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || "Failed to download menu PDF.");
        } finally {
            setDownloadingMenuPdf(false);
        }
    };

    const handleDownloadStockPdf = async () => {
        try {
            setDownloadingStockPdf(true);
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch("/api/hospitality/menu/download-stock-pdf", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to download stock PDF");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Galaxia_Resorts_Stock.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || "Failed to download stock PDF.");
        } finally {
            setDownloadingStockPdf(false);
        }
    };
    const [editNames, setEditNames] = useState<Record<string, string>>({});
    const [editPrices, setEditPrices] = useState<Record<string, string>>({});
    const [editCostPrices, setEditCostPrices] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [currentTab, setCurrentTab] = useState<"stock" | "manage" | "insights" | "customer">("stock");
    const [ownerMode, setOwnerMode] = useState(false);

    // Add Item Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemCategory, setNewItemCategory] = useState<MenuItem["category"]>("Normal");
    const [newItemStock, setNewItemStock] = useState("100");
    const [newItemCostPrice, setNewItemCostPrice] = useState("");

    // Insights
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // Inventory Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportMode, setReportMode] = useState<"single" | "month" | "range">("month");
    const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [monthValue, setMonthValue] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [downloadingReport, setDownloadingReport] = useState(false);

    const handleDownloadInventoryReport = async () => {
        try {
            setDownloadingReport(true);
            let sDate = "";
            let eDate = "";
            let periodLabel = "";

            if (reportMode === "single") {
                sDate = singleDate;
                eDate = singleDate;
                periodLabel = `Date: ${singleDate}`;
            } else if (reportMode === "month") {
                const [y, m] = monthValue.split("-").map(Number);
                const lastDay = new Date(y, m, 0).getDate();
                sDate = `${monthValue}-01`;
                eDate = `${monthValue}-${String(lastDay).padStart(2, '0')}`;
                const dateObj = new Date(y, m - 1, 1);
                periodLabel = `Month: ${dateObj.toLocaleString("default", { month: "long", year: "numeric" })}`;
            } else {
                sDate = startDate;
                eDate = endDate;
                periodLabel = `Period: ${startDate} to ${endDate}`;
            }

            const data = await api.get<InsightsData>(`/hospitality/insights?startDate=${sDate}&endDate=${eDate}`);
            
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("GALAXIA RESORTS — INVENTORY SALES REPORT", pageWidth / 2, 15, { align: "center" });

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(periodLabel, pageWidth / 2, 21, { align: "center" });
            doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, pageWidth / 2, 26, { align: "center" });

            // Summary Card
            const totalSales = data.totalRevenue || 0;
            doc.setFillColor(243, 240, 255);
            doc.setDrawColor(216, 180, 254);
            doc.roundedRect(14, 31, pageWidth - 28, 18, 3, 3, "FD");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(126, 34, 206);
            doc.text("TOTAL AMOUNT EARNED IN SALES", 20, 38);

            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(88, 28, 135);
            doc.text(`Rs. ${totalSales.toLocaleString("en-IN")}`, 20, 44.5);

            // Table Data
            const items = data.items || [];
            const tableRows = items.map(item => [
                item.name || "Unknown Item",
                String(item.totalOrdered || 0),
                `Rs. ${(item.totalRevenue || 0).toLocaleString("en-IN")}`
            ]);

            autoTable(doc, {
                startY: 54,
                head: [["Item Name", "Quantity (Units)", "Sales (Total Earned)"]],
                body: tableRows.length > 0 ? tableRows : [["No items sold in selected period", "-", "Rs. 0"]],
                theme: "grid",
                headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
                columnStyles: {
                    0: { halign: "left" },
                    1: { halign: "center" },
                    2: { halign: "right", fontStyle: "bold" }
                },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            const fileName = `Inventory_Report_${sDate}_to_${eDate}.pdf`;
            doc.save(fileName);
            setIsReportModalOpen(false);
        } catch (err: any) {
            console.error("Failed to generate inventory report:", err);
            alert(err?.message || "Failed to generate report PDF");
        } finally {
            setDownloadingReport(false);
        }
    };

    const fetchMenu = async () => {
        try {
            setLoading(true);
            const data = await api.get<MenuItem[]>("/hospitality/menu");
            if (Array.isArray(data)) {
                setMenuItems(data);
                const stocks: Record<string, string> = {};
                const names: Record<string, string> = {};
                const prices: Record<string, string> = {};
                const costPrices: Record<string, string> = {};
                data.forEach(item => {
                    stocks[item.id] = item.stock != null ? String(item.stock) : "100";
                    names[item.id] = item.name;
                    prices[item.id] = String(item.price);
                    costPrices[item.id] = item.costPrice != null ? String(item.costPrice) : "0";
                });
                setEditStocks(stocks);
                setEditNames(names);
                setEditPrices(prices);
                setEditCostPrices(costPrices);
            }
        } catch (err: any) {
            setError("Failed to fetch menu items.");
        } finally {
            setLoading(false);
        }
    };

    const fetchInsights = async () => {
        try {
            setLoadingInsights(true);
            const data = await api.get<InsightsData>("/hospitality/insights");
            setInsights(data);
        } catch (err: any) {
            console.error("Failed to fetch insights:", err);
        } finally {
            setLoadingInsights(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    useEffect(() => {
        if (currentTab === "insights" && !insights) {
            fetchInsights();
        }
    }, [currentTab]);

    const getUpdatedMenuItems = (currentList: MenuItem[]) => {
        return currentList.map(item => {
            const stockVal = editStocks[item.id] !== undefined ? editStocks[item.id] : String(item.stock ?? 100);
            const stockNum = stockVal === "" ? 0 : parseInt(stockVal);
            const priceVal = editPrices[item.id] !== undefined ? editPrices[item.id] : String(item.price ?? 0);
            const priceNum = priceVal === "" ? 0 : parseInt(priceVal);
            const costPriceVal = editCostPrices[item.id] !== undefined ? editCostPrices[item.id] : String(item.costPrice ?? 0);
            const costPriceNum = costPriceVal === "" ? 0 : parseInt(costPriceVal);
            return {
                ...item,
                name: editNames[item.id] !== undefined ? editNames[item.id] : item.name,
                price: isNaN(priceNum) ? item.price : priceNum,
                stock: isNaN(stockNum) ? (item.stock ?? 100) : stockNum,
                costPrice: isNaN(costPriceNum) ? (item.costPrice ?? 0) : costPriceNum
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const updatedMenu = getUpdatedMenuItems(menuItems);
            for (const item of updatedMenu) {
                const stock = item.stock ?? 0;
                if (isNaN(stock) || stock < 0) {
                    throw new Error(`Invalid stock value for ${item.name}`);
                }
                const price = item.price ?? 0;
                if (isNaN(price) || price < 0) {
                    throw new Error(`Invalid price for ${item.name}`);
                }
            }
            await api.put("/hospitality/menu", { menuItems: updatedMenu });
            setMenuItems(updatedMenu);
            fetchInsights();
            setSuccessMsg("Inventory updated successfully!");
        } catch (err: any) {
            setError(err.message || "Failed to update inventory.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) { setError("Item name is required."); return; }
        if (!newItemPrice || parseInt(newItemPrice) <= 0) { setError("Valid price is required."); return; }

        const id = newItemName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        if (menuItems.some(i => i.id === id)) { setError("An item with this name already exists."); return; }

        const newItem: MenuItem = {
            id,
            name: newItemName.trim(),
            price: parseInt(newItemPrice),
            category: newItemCategory,
            stock: parseInt(newItemStock) || 100,
            tracked: true,
            costPrice: parseInt(newItemCostPrice) || 0
        };

        const currentUpdated = getUpdatedMenuItems(menuItems);
        const updatedMenu = [...currentUpdated, newItem];
        try {
            setSaving(true);
            await api.put("/hospitality/menu", { menuItems: updatedMenu });
            setMenuItems(updatedMenu);
            fetchInsights();
            setEditStocks(prev => ({ ...prev, [id]: String(newItem.stock) }));
            setEditNames(prev => ({ ...prev, [id]: newItem.name }));
            setEditPrices(prev => ({ ...prev, [id]: String(newItem.price) }));
            setEditCostPrices(prev => ({ ...prev, [id]: String(newItem.costPrice || 0) }));
            setShowAddModal(false);
            setNewItemName("");
            setNewItemPrice("");
            setNewItemCostPrice("");
            setNewItemStock("100");
            setSuccessMsg(`"${newItem.name}" added successfully!`);
        } catch (err: any) {
            setError(err.message || "Failed to add item.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        const item = menuItems.find(i => i.id === itemId);
        if (!item || !confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

        const currentUpdated = getUpdatedMenuItems(menuItems);
        const updatedMenu = currentUpdated.filter(i => i.id !== itemId);
        try {
            setSaving(true);
            await api.put("/hospitality/menu", { menuItems: updatedMenu });
            setMenuItems(updatedMenu);
            setSuccessMsg(`"${item.name}" deleted.`);
        } catch (err: any) {
            setError(err.message || "Failed to delete item.");
        } finally {
            setSaving(false);
        }
    };

    const categories: MenuItem["category"][] = ["Normal", "High Tea", "Timepass"];
    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

    return (
        <div className="max-w-6xl w-full mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-5">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <Package className="text-purple-600" size={26} />
                                Inventory Management
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                Manage menu items, stock levels, and view order insights.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadMenuPdf}
                                disabled={downloadingMenuPdf}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                <Download size={14} className={downloadingMenuPdf ? "animate-bounce" : ""} />
                                {downloadingMenuPdf ? "Generating..." : "Download Menu PDF"}
                            </button>
                            <button
                                onClick={handleDownloadStockPdf}
                                disabled={downloadingStockPdf}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                <Download size={14} className={downloadingStockPdf ? "animate-bounce" : ""} />
                                {downloadingStockPdf ? "Generating..." : "Download Inventory PDF"}
                            </button>
                            {(currentTab === "stock" || currentTab === "manage") && (
                                <>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                                    >
                                        <Plus size={14} />
                                        Add Item
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || loading}
                                        className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <Save size={14} />
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { fetchMenu(); if (currentTab === "insights") fetchInsights(); }}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Tab Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                        <button
                            onClick={() => setCurrentTab("stock")}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentTab === "stock" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Stock Management
                        </button>
                        <button
                            onClick={() => setCurrentTab("manage")}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentTab === "manage" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <span className="flex items-center gap-1.5">Manage Items</span>
                        </button>
                        <button
                            onClick={() => setCurrentTab("insights")}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentTab === "insights" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <span className="flex items-center gap-1.5"><BarChart3 size={14} /> Insights</span>
                        </button>
                        <button
                            onClick={() => setCurrentTab("customer")}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${currentTab === "customer" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <span className="flex items-center gap-1.5"><ShoppingBag size={14} /> Customer Menu</span>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-4 rounded-xl flex items-center gap-2">
                            <Sparkles size={18} />
                            {successMsg}
                            <button onClick={() => setSuccessMsg("")} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={16} /></button>
                        </div>
                    )}

                    {/* ===== STOCK MANAGEMENT TAB ===== */}
                    {currentTab === "stock" && (
                        loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <RefreshCw size={36} className="animate-spin text-purple-600" />
                                <p className="text-sm font-semibold tracking-wide">Loading menu inventory...</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {categories.map(cat => {
                                    const catItems = menuItems.filter(item => item.category === cat && item.tracked);
                                    if (catItems.length === 0) return null;
                                    return (
                                        <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                                                {cat === "Normal" ? <ShoppingBag size={20} className="text-amber-500" /> : cat === "High Tea" ? <Coffee size={20} className="text-purple-500" /> : <Coffee size={20} className="text-teal-500" />}
                                                {cat === "Normal" ? "Beverages & Refreshments" : cat} Items
                                                <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{catItems.length} items</span>
                                            </h2>

                                            <div className="space-y-3">
                                                {catItems.map(item => {
                                                    const stockVal = editStocks[item.id] || "0";
                                                    const isOut = stockVal === "0";
                                                    return (
                                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-shadow">
                                                            {/* Name (editable) */}
                                                            <div className="flex-1 min-w-0">
                                                                <input
                                                                    type="text"
                                                                    value={editNames[item.id] || item.name}
                                                                    onChange={e => setEditNames(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                    className="text-sm font-extrabold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full transition-colors pb-0.5"
                                                                />
                                                            </div>

                                                            {/* Numerical details wrap container */}
                                                            <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 sm:gap-4 justify-between sm:justify-end">
                                                                {/* Price (editable) */}
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <span className="text-xs font-bold text-slate-400">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={editPrices[item.id] || String(item.price)}
                                                                        onChange={e => setEditPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                                    />
                                                                </div>

                                                                {/* Stock */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isOut && (
                                                                        <span className="text-[10px] font-black px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">Sold Out</span>
                                                                    )}
                                                                    <span className="text-xs font-bold text-slate-500">Stock:</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={stockVal}
                                                                        onChange={e => setEditStocks(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                        className="w-16 sm:w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                                    />
                                                                </div>

                                                                {/* Cost Price */}
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <span className="text-xs font-bold text-slate-500">Cost:</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={editCostPrices[item.id] || "0"}
                                                                        onChange={e => setEditCostPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                                    />
                                                                </div>

                                                                {/* Delete */}
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.id)}
                                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                                                    title="Delete item"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* ===== MANAGE ITEMS TAB ===== */}
                    {currentTab === "manage" && (
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="mb-4 pb-4 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Manage Menu Items</h2>
                                    <p className="text-xs text-slate-400 mt-1">Toggle tracking, edit item details, or remove items permanently from the menu.</p>
                                </div>

                                <div className="space-y-2.5">
                                    {menuItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                                                item.tracked ? "bg-purple-50/50 border-purple-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                                            }`}
                                        >
                                            {/* Track Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={!!item.tracked}
                                                onChange={async () => {
                                                    const currentUpdated = getUpdatedMenuItems(menuItems);
                                                    const updated = currentUpdated.map(m => m.id === item.id ? { ...m, tracked: !m.tracked } : m);
                                                    setMenuItems(updated);
                                                    try {
                                                        await api.put("/hospitality/menu", { menuItems: updated });
                                                    } catch (err) {
                                                        console.error("Failed to auto-save tracking toggle:", err);
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                                                title={item.tracked ? "Untrack item" : "Track item"}
                                            />

                                            {/* Name (editable) */}
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={editNames[item.id] || item.name}
                                                    onChange={e => setEditNames(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    className="text-sm font-extrabold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full transition-colors pb-0.5"
                                                    placeholder="Item Name"
                                                    onBlur={handleSave}
                                                />
                                            </div>

                                            {/* Price (editable) */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-xs font-bold text-slate-400">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={editPrices[item.id] || String(item.price)}
                                                    onChange={e => setEditPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    onBlur={handleSave}
                                                    className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                />
                                            </div>

                                            {/* Cost Price (editable) */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-xs font-bold text-slate-500">Cost:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={editCostPrices[item.id] !== undefined ? editCostPrices[item.id] : String(item.costPrice ?? 0)}
                                                    onChange={e => setEditCostPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    onBlur={handleSave}
                                                    className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-bold font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                                                />
                                            </div>

                                            {/* Right side badges & actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {item.tracked && (
                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                                        TRACKED
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                                                    item.category === "Normal"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : item.category === "High Tea"
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : "bg-teal-50 text-teal-700 border-teal-200"
                                                }`}>
                                                    {item.category}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                                                    title={`Delete ${item.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {menuItems.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-8">No menu items found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== INSIGHTS TAB ===== */}
                    {currentTab === "insights" && (
                        loadingInsights ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <RefreshCw size={36} className="animate-spin text-purple-600" />
                                <p className="text-sm font-semibold tracking-wide">Generating insights...</p>
                            </div>
                        ) : !insights ? (
                            <div className="text-center py-20 text-slate-400">
                                <p className="text-sm font-semibold">No insights data available yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Insights Header & Report Download Button */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                            <BarChart3 size={18} className="text-purple-600" /> Inventory Insights & Analytics
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">Track item sales, popular inventory, and download sales reports by date range.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsReportModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                                    >
                                        <Download size={15} /> Download Inventory Report
                                    </button>
                                </div>

                                {/* Top-level KPI Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: "Total Orders", value: insights.totalOrders.toString(), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
                                        { label: "Total Revenue", value: fmt(insights.totalRevenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                                        { label: "Cost", value: fmt(insights.totalEstimatedCost), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                                        { label: "Profit", value: fmt(insights.totalProfit), icon: TrendingUp, color: insights.totalProfit > 0 ? "text-emerald-600" : "text-red-600", bg: insights.totalProfit > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100" },
                                    ].map((kpi, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border ${kpi.bg} flex flex-col gap-2`}>
                                            <div className="flex items-center gap-2">
                                                <kpi.icon size={18} className={kpi.color} />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                                            </div>
                                            <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Category Breakdown */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                                        <PieChart size={20} className="text-purple-600" />
                                        Revenue by Category
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Object.entries(insights.categoryStats).map(([cat, stats]) => {
                                            const profit = stats.revenue - stats.cost;
                                            const margin = stats.revenue > 0 ? Math.round((profit / stats.revenue) * 100) : 0;
                                            return (
                                                <div key={cat} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-bold text-slate-800">{cat}</h3>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{stats.orders} items sold</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Revenue</p>
                                                            <p className="text-sm font-black text-emerald-600">{fmt(stats.revenue)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Cost</p>
                                                            <p className="text-sm font-black text-amber-600">{fmt(stats.cost)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Margin</p>
                                                            <p className={`text-sm font-black ${margin >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{margin}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Most & Least Ordered */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Most Ordered */}
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                                            <ArrowUp size={18} className="text-emerald-600" />
                                            Most Ordered
                                        </h2>
                                        <div className="space-y-2.5">
                                            {insights.mostOrdered.map((item, i) => (
                                                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : "bg-orange-50 text-orange-600"}`}>
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{item.category} · {fmt(item.price)}/unit</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-black text-purple-700">{item.totalOrdered}×</p>
                                                        <p className="text-[10px] font-bold text-emerald-600">{fmt(item.totalRevenue)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {insights.mostOrdered.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No order data yet.</p>}
                                        </div>
                                    </div>

                                    {/* Least Ordered */}
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                                            <ArrowDown size={18} className="text-red-500" />
                                            Least Ordered
                                        </h2>
                                        <div className="space-y-2.5">
                                            {insights.leastOrdered.map((item, i) => (
                                                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-red-50 text-red-600">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{item.category} · {fmt(item.price)}/unit</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-black text-red-600">{item.totalOrdered}×</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{fmt(item.totalRevenue)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {insights.leastOrdered.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No order data yet.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Full Item Table */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                                        <BarChart3 size={18} className="text-purple-600" />
                                        All Items Performance
                                    </h2>
                                    {insights.items.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-8">No order data available yet. Once guests start ordering, insights will appear here.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <th className="py-2.5 px-3">Item</th>
                                                        <th className="py-2.5 px-3">Category</th>
                                                        <th className="py-2.5 px-3 text-right">Sell Price</th>
                                                        <th className="py-2.5 px-3 text-right">Cost</th>
                                                        <th className="py-2.5 px-3 text-right">Qty Sold</th>
                                                        <th className="py-2.5 px-3 text-right">Revenue</th>
                                                        <th className="py-2.5 px-3 text-right">Profit</th>
                                                        <th className="py-2.5 px-3 text-right">Margin</th>
                                                        <th className="py-2.5 px-3 text-right">Days Active</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-xs">
                                                    {insights.items.map(item => {
                                                        const profit = item.totalRevenue - item.estimatedCost;
                                                        const margin = item.totalRevenue > 0 ? Math.round((profit / item.totalRevenue) * 100) : 0;
                                                        const costPerUnit = item.totalOrdered > 0 ? Math.round(item.estimatedCost / item.totalOrdered) : 0;
                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                                                                <td className="py-3 px-3">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.category === "Normal" ? "bg-amber-50 text-amber-700 border-amber-200" : item.category === "High Tea" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-teal-50 text-teal-700 border-teal-200"}`}>
                                                                        {item.category}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">{fmt(item.price)}</td>
                                                                <td className="py-3 px-3 text-right font-mono text-slate-400">{fmt(costPerUnit)}</td>
                                                                <td className="py-3 px-3 text-right font-black text-purple-700">{item.totalOrdered}</td>
                                                                <td className="py-3 px-3 text-right font-bold text-emerald-600">{fmt(item.totalRevenue)}</td>
                                                                <td className="py-3 px-3 text-right font-bold text-emerald-600">{fmt(profit)}</td>
                                                                <td className="py-3 px-3 text-right">
                                                                    <span className={`font-bold ${margin >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{margin}%</span>
                                                                </td>
                                                                <td className="py-3 px-3 text-right font-mono text-slate-400">{item.orderDates.length}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {currentTab === "customer" && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Owner Mode</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Toggle to place orders for free and without time constraints.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={ownerMode} 
                                        onChange={(e) => setOwnerMode(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            <Suspense fallback={
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                    <RefreshCw size={36} className="animate-spin text-purple-600" />
                                    <p className="text-sm font-semibold tracking-wide">Loading customer menu...</p>
                                </div>
                            }>
                                <EMenuContent isOwnerMode={ownerMode} disableTimers={true} />
                            </Suspense>
                        </div>
                    )}


            {/* Add Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Plus size={20} className="text-emerald-600" />
                                Add New Item
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="e.g. Masala Chai"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItemPrice}
                                        onChange={e => setNewItemPrice(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newItemStock}
                                        onChange={e => setNewItemStock(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cost Price (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newItemCostPrice}
                                    onChange={e => setNewItemCostPrice(e.target.value)}
                                    placeholder="e.g. 30"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                                <div className="flex gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setNewItemCategory(cat)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${newItemCategory === cat ? "bg-purple-600 text-white border-purple-700 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-purple-300"}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                            <button
                                onClick={handleAddItem}
                                disabled={saving}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving ? "Adding..." : "Add Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Inventory Report Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsReportModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Download size={16} className="text-purple-600" /> Download Inventory Report
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Select date period to generate sales report PDF.</p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Selection Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "single", label: "Single Date" },
                                        { id: "month", label: "Month Picker" },
                                        { id: "range", label: "Date Range" }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setReportMode(m.id as any)}
                                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                                                reportMode === m.id
                                                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-sm"
                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {reportMode === "single" && (
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">Choose Date</label>
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={e => setSingleDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            )}

                            {reportMode === "month" && (
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">Choose Month & Year</label>
                                    <input
                                        type="month"
                                        value={monthValue}
                                        onChange={e => setMonthValue(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            )}

                            {reportMode === "range" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 block mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleDownloadInventoryReport}
                                    disabled={downloadingReport}
                                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {downloadingReport ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Generating PDF...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            <span>Download PDF Report</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
