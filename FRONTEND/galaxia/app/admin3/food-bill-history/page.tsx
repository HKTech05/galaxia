"use client";

import { useState, useEffect } from "react";
import { Search, IndianRupee, Loader2, X, UtensilsCrossed, AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../../../lib/api";

interface FoodBill {
    id: number;
    bookingId: number;
    description: string;
    amount: number;
    paymentMethod: string;
    upiProofUrl: string | null;
    createdAt: string;
    creator?: { displayName: string } | null;
    booking?: {
        customerName: string;
        assignedUnit: string | null;
        bookingRef: string;
        subProperty?: { name: string } | null;
    } | null;
}

interface ChefLog {
    id: number;
    actionType: string;
    details: string;
    createdAt: string;
    admin?: {
        displayName: string;
        username: string;
    } | null;
}

export default function FoodHistoryPage() {
    const [bills, setBills] = useState<FoodBill[]>([]);
    const [logs, setLogs] = useState<ChefLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBill, setSelectedBill] = useState<FoodBill | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const billsPromise = api.get<FoodBill[]>("/stay-food-bills").catch(err => {
                console.error("Failed to fetch food bills:", err);
                return [] as FoodBill[];
            });
            const logsPromise = api.get<ChefLog[]>("/chef/logs").catch(err => {
                console.error("Failed to fetch chef logs:", err);
                return [] as ChefLog[];
            });

            const [billsData, logsData] = await Promise.all([billsPromise, logsPromise]);
            setBills(billsData || []);
            setLogs(logsData || []);
        } catch (err) {
            console.error("Failed to fetch food bills & logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter bills
    const filteredBills = bills.filter(b => {
        const guest = b.booking?.customerName || "";
        const ref = b.booking?.bookingRef || "";
        const villa = b.booking?.assignedUnit || b.booking?.subProperty?.name || "";
        const s = searchTerm.toLowerCase();
        return (
            guest.toLowerCase().includes(s) ||
            ref.toLowerCase().includes(s) ||
            villa.toLowerCase().includes(s) ||
            `fb-${b.id}`.toLowerCase().includes(s) ||
            b.description.toLowerCase().includes(s)
        );
    });

    // Summary calculations
    const totalCollected = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const cashCollected = bills.filter(b => b.paymentMethod === "cash").reduce((sum, b) => sum + (b.amount || 0), 0);
    const upiCollected = bills.filter(b => b.paymentMethod === "upi").reduce((sum, b) => sum + (b.amount || 0), 0);

    // Get audit/modification logs matching selected bill's villa
    const getAuditLogsForBill = (bill: FoodBill) => {
        const villa = (bill.booking?.assignedUnit || bill.booking?.subProperty?.name || "").toLowerCase();
        if (!villa) return [];
        return logs.filter(log => {
            const details = log.details.toLowerCase();
            return (log.actionType === "modify_request" || log.actionType === "delete_request") && details.includes(villa);
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <UtensilsCrossed className="text-orange-500" size={24} /> Food Bill History
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Logs and breakdowns of staycation hospitality food orders.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-800 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-100 transition-all uppercase tracking-wider"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Food Revenue</p>
                    <p className="text-2xl font-black text-slate-800 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {totalCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{bills.length} bill{bills.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">UPI Collection</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {upiCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-400 mt-1">Direct via QR code</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Collection</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {cashCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-400 mt-1">Collected at reception</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by guest name, villa, or bill ID…"
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
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bill ID</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Villa Allotted</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pay Method</th>
                                <th className="px-4 md:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Collected By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin mx-auto text-indigo-500" size={28} />
                                        <p className="text-sm text-slate-500 mt-2">Loading billing records...</p>
                                    </td>
                                </tr>
                            ) : filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No staycation food bills found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map(bill => (
                                    <tr
                                        key={bill.id}
                                        onClick={() => setSelectedBill(bill)}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 md:px-6 py-3">
                                            <p className="text-sm font-bold text-slate-800">FB-{bill.id}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{bill.booking?.bookingRef || "-"}</p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3">
                                            <p className="text-sm font-semibold text-slate-700">
                                                {new Date(bill.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </p>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 font-bold text-slate-800">{bill.booking?.customerName || "Walk-In"}</td>
                                        <td className="px-4 md:px-6 py-3">
                                            <span className="inline-flex px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wide rounded border border-amber-100">
                                                {bill.booking?.assignedUnit || bill.booking?.subProperty?.name || "Unassigned"}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 font-black text-emerald-700 font-bold">₹{bill.amount.toLocaleString("en-IN")}</td>
                                        <td className="px-4 md:px-6 py-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                bill.paymentMethod === "cash"
                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                            }`}>
                                                {bill.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500">{bill.creator?.displayName || "System"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Breakdown & Audit Logs Detail Modal */}
            {selectedBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <UtensilsCrossed className="text-amber-600" size={18} />
                                    Food Bill Breakdown
                                </h3>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">FB-{selectedBill.id} • {selectedBill.booking?.bookingRef}</p>
                            </div>
                            <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Summary Metadata */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest Name</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedBill.booking?.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Villa / Unit</p>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedBill.booking?.assignedUnit || "Unassigned"}</p>
                                </div>
                            </div>

                            {/* Itemized list parsed from bill description */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items Billed</h4>
                                <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    {selectedBill.description.split(", ").map((item, idx) => (
                                        <div key={idx} className="flex justify-between p-3 text-xs font-semibold text-slate-700">
                                            <span>{item.split(" (₹")[0]}</span>
                                            <span className="text-emerald-700 font-bold">₹{item.split(" (₹")[1]?.replace(")", "") || ""}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Logs for Order Modifications / Deletions */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle size={14} className="text-red-500" />
                                    Order Audit / Modification History
                                </h4>
                                <div className="space-y-2">
                                    {getAuditLogsForBill(selectedBill).length === 0 ? (
                                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200/50 text-center">
                                            No deletions or modifications logged for this villa's order history.
                                        </p>
                                    ) : (
                                        getAuditLogsForBill(selectedBill).map(log => (
                                            <div key={log.id} className="bg-red-50/50 border border-red-100 rounded-xl p-3 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-red-700">
                                                    <span>{log.actionType === "delete_request" ? "Entire Order Deleted" : "Line Item Modified/Reduced"}</span>
                                                    <span className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                </div>
                                                <p className="text-[11px] font-semibold text-slate-700">{log.details.split("): ")[1] || log.details}</p>
                                                <p className="text-[9px] text-slate-400 font-bold text-right">— Performed by {log.admin?.displayName || "Staff"}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <div className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                                <span className="text-slate-500 text-xs font-semibold mr-1">Total Bill Paid:</span>
                                <IndianRupee size={16} /> {selectedBill.amount.toLocaleString("en-IN")}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
