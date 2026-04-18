"use client";

import { useState, useEffect } from "react";
import { Search, IndianRupee, TrendingUp, TrendingDown, Loader2, Trash2, X, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../lib/api";

interface FoodBill {
    id: number;
    date: string;
    guestName: string;
    screenName: string;
    satkarAmount: number;
    guestBillAmount: number;
    paymentMethod: string;
    upiProofUrl: string | null;
    createdAt: string;
    creator?: { displayName: string } | null;
}

interface Summary {
    totalBills: number;
    totalSatkar: number;
    totalCollected: number;
    netProfit: number;
}

export default function FoodHistoryPage() {
    const [bills, setBills] = useState<FoodBill[]>([]);
    const [summary, setSummary] = useState<Summary>({ totalBills: 0, totalSatkar: 0, totalCollected: 0, netProfit: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [billsData, summaryData] = await Promise.all([
                api.get("/food-bills"),
                api.get("/food-bills/summary"),
            ]);
            setBills(billsData);
            setSummary(summaryData);
        } catch (err) {
            console.error("Failed to fetch food bills:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this food bill? This will also reverse any cash/UPI logs.")) return;
        setDeleteLoading(id);
        try {
            await api.delete(`/food-bills/${id}`);
            await fetchData();
        } catch (err) {
            alert("Failed to delete");
        } finally {
            setDeleteLoading(null);
        }
    };

    const filteredBills = bills.filter(b =>
        b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.screenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `FB-${b.id}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <Link href="/admin3/digital-diaries/food-billing" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Create Food Bill
                </Link>
                <Link href="/admin3/digital-diaries/food-history" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                    Food Bill History
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <UtensilsCrossed className="text-orange-500" size={24} /> Food Bill Analysis
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Overview of all food bill transactions and financial summary.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid to Satkar</p>
                    <p className="text-2xl font-black text-red-700 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {summary.totalSatkar.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-red-400 mt-1">{summary.totalBills} bill{summary.totalBills !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected from Guests</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {summary.totalCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400 mt-1">Satkar + 25% markup</p>
                </div>
                <div className={`bg-white border rounded-2xl p-5 shadow-sm ${summary.netProfit >= 0 ? "border-emerald-200" : "border-red-200"}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</p>
                    <p className={`text-2xl font-black mt-1 flex items-center ${summary.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {summary.netProfit >= 0 ? <TrendingUp size={20} className="mr-1" /> : <TrendingDown size={20} className="mr-1" />}
                        <IndianRupee size={20} className="mr-0.5" /> {Math.abs(summary.netProfit).toLocaleString("en-IN")}
                    </p>
                    <p className={`text-[10px] font-bold mt-1 ${summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {summary.netProfit >= 0 ? "Positive margin" : "Loss"}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by guest name, screen, or ID…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bill</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Screen</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Satkar</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest Bill</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Method</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created By</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={28} /><p className="text-sm text-slate-500 mt-2">Loading…</p></td></tr>
                            ) : filteredBills.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">No food bills found.</td></tr>
                            ) : filteredBills.map(bill => (
                                <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 md:px-6 py-3">
                                        <p className="text-sm font-bold text-slate-800">FB-{bill.id}</p>
                                        <p className="text-xs font-medium text-slate-500">{bill.guestName}</p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {new Date(bill.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 hidden sm:table-cell">
                                        <span className="inline-flex px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wide rounded border border-indigo-100">{bill.screenName}</span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <p className="text-sm font-bold text-red-700">₹{bill.satkarAmount.toLocaleString("en-IN")}</p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">
                                        <p className="text-sm font-bold text-emerald-700">₹{bill.guestBillAmount.toLocaleString("en-IN")}</p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 hidden md:table-cell">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                            bill.paymentMethod === "cash"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-purple-50 text-purple-700 border-purple-200"
                                        }`}>
                                            {bill.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 hidden md:table-cell">
                                        <p className="text-xs font-medium text-slate-500">{bill.creator?.displayName || "—"}</p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(bill.id)}
                                            disabled={deleteLoading === bill.id}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {deleteLoading === bill.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
