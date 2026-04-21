"use client";

import { useState, useEffect, useCallback } from "react";
import { IndianRupee, Plus, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../lib/api";

interface DdExpense {
    id: number;
    name: string;
    amount: number;
    paymentMethod: string;
    createdAt: string;
    creator?: { displayName: string } | null;
}

export default function DdExpensesPage() {
    const [expenses, setExpenses] = useState<DdExpense[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [expenseName, setExpenseName] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
    const [submitting, setSubmitting] = useState(false);

    const fetchExpenses = useCallback(async () => {
        try {
            const data = await api.get("/dd-expenses?limit=50");
            if (Array.isArray(data)) setExpenses(data);
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseName.trim() || !expenseAmount.trim()) return;
        setSubmitting(true);
        try {
            await api.post("/dd-expenses", {
                name: expenseName.trim(),
                amount: parseInt(expenseAmount),
                paymentMethod,
            });
            setExpenseName("");
            setExpenseAmount("");
            setPaymentMethod("cash");
            fetchExpenses();
            alert("Expense added successfully!");
        } catch (err: any) {
            console.error("Failed to create expense:", err);
            alert(err.message || "Failed to create expense");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (d: string) => {
        const dt = new Date(d);
        return `${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    };

    // Today's totals
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todayExpenses = expenses.filter(e => e.createdAt.startsWith(todayStr));
    const todayCash = todayExpenses.filter(e => e.paymentMethod === "cash").reduce((s, e) => s + e.amount, 0);
    const todayUpi = todayExpenses.filter(e => e.paymentMethod === "upi").reduce((s, e) => s + e.amount, 0);
    const todayTotal = todayCash + todayUpi;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Sub-Nav */}
            <div className="flex gap-4 sm:gap-6 border-b border-slate-200 pb-1 mb-2 overflow-x-auto">
                <Link href="/admin3/digital-diaries" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Daily Schedule
                </Link>
                <Link href="/admin3/digital-diaries/bookings" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    All Walk-ins &amp; Bookings
                </Link>
                <Link href="/admin3/digital-diaries/food-billing" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Create Food Bill
                </Link>
                <Link href="/admin3/digital-diaries/food-history" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Food Bill History
                </Link>
                <Link href="/admin3/digital-diaries/expenses" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                    Expenses
                </Link>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Expenses</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Track daily expenses for Digital Diaries.</p>
            </div>

            {/* Today's Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Total</p>
                    <p className="text-xl font-black text-slate-800">₹{todayTotal.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Cash</p>
                    <p className="text-xl font-black text-emerald-700">₹{todayCash.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">UPI</p>
                    <p className="text-xl font-black text-indigo-700">₹{todayUpi.toLocaleString("en-IN")}</p>
                </div>
            </div>

            {/* Add Expense Form */}
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Plus size={16} /> Add New Expense
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Expense Name</label>
                        <input
                            type="text"
                            value={expenseName}
                            onChange={(e) => setExpenseName(e.target.value)}
                            placeholder="e.g. Cleaning supplies, Snacks restock"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₹)</label>
                        <input
                            type="number"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            placeholder="500"
                            min="1"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                            required
                        />
                    </div>
                </div>

                {/* Payment Method Toggle */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Payment Method</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("cash")}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                                paymentMethod === "cash"
                                    ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                        >
                            💵 Cash
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("upi")}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                                paymentMethod === "upi"
                                    ? "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                        >
                            📱 UPI
                        </button>
                    </div>
                    {paymentMethod === "cash" && (
                        <p className="text-[10px] text-amber-600 font-medium mt-2">⚠️ Cash expenses will be deducted from Cash Management.</p>
                    )}
                    {paymentMethod === "upi" && (
                        <p className="text-[10px] text-indigo-500 font-medium mt-2">ℹ️ UPI expenses are logged in the database only.</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={submitting || !expenseName.trim() || !expenseAmount.trim()}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <><Clock size={16} className="animate-spin" /> Adding...</>
                    ) : (
                        <><IndianRupee size={16} /> Add Expense</>
                    )}
                </button>
            </form>

            {/* Recent Expenses List */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Expenses</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No expenses recorded yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {expenses.map((exp) => (
                            <div key={exp.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{exp.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                        <Clock size={10} /> {formatDate(exp.createdAt)}
                                        {exp.creator && <span>· {exp.creator.displayName}</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        exp.paymentMethod === "cash"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    }`}>
                                        {exp.paymentMethod}
                                    </span>
                                    <span className="text-sm font-black text-slate-800">₹{exp.amount.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
