"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, IndianRupee, Loader2, X, UtensilsCrossed, AlertTriangle, RefreshCw, Plus, CheckCircle, Camera, Upload } from "lucide-react";
import { api } from "../../../lib/api";
import { compressImage } from "../../../lib/imageCompressor";

interface FoodBill {
    id: number;
    bookingId: number;
    description: string;
    amount: number;
    paymentMethod: string;
    upiProofUrl: string | null;
    upiPaymentId?: number | null;
    createdAt: string;
    creator?: { displayName: string } | null;
    booking?: {
        customerName: string;
        assignedUnit: string | null;
        bookingRef: string;
        property?: { name: string } | null;
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
    const router = useRouter();
    const [bills, setBills] = useState<FoodBill[]>([]);
    const [logs, setLogs] = useState<ChefLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingRole, setCheckingRole] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [selectedBill, setSelectedBill] = useState<FoodBill | null>(null);

    const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [reportProperty, setReportProperty] = useState<"ambrose" | "amstel" | "both">("both");
    const [reportStatus, setReportStatus] = useState<"all" | "paid" | "unpaid">("all");
    const [reportRequests, setReportRequests] = useState<any[]>([]);
    const [loadingReportRequests, setLoadingReportRequests] = useState(false);

    // Mark unpaid as paid states
    const [selectedUnpaidBill, setSelectedUnpaidBill] = useState<{
        bookingId: number;
        guestName: string;
        bookingRef: string;
        amount: number;
        description: string;
    } | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "split">("cash");
    const [splitCash, setSplitCash] = useState<number>(0);
    const [splitUpi, setSplitUpi] = useState<number>(0);
    const [paymentUpiProof, setPaymentUpiProof] = useState<File | null>(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    const handleCollectPayment = async () => {
        if (!selectedUnpaidBill) return;
        setPaymentSubmitting(true);
        try {
            let upiProofUrl = null;
            let upiProofKey = null;
            if ((paymentMethod === "upi" || (paymentMethod === "split" && splitUpi > 0)) && paymentUpiProof) {
                const compressed = await compressImage(paymentUpiProof);
                const formData = new FormData();
                formData.append("file", compressed);
                formData.append("category", "food-bill-proofs");
                const uploadData = await api.upload<{ url: string }>("/uploads/general", formData);
                upiProofUrl = uploadData.url;
                try {
                    const urlObj = new URL(uploadData.url);
                    upiProofKey = urlObj.pathname.slice(1);
                } catch {
                    upiProofKey = uploadData.url;
                }
            }

            await api.post("/stay-food-bills", {
                bookingId: selectedUnpaidBill.bookingId,
                description: selectedUnpaidBill.description,
                amount: selectedUnpaidBill.amount,
                paymentMethod: paymentMethod,
                splitCash: paymentMethod === "split" ? splitCash : undefined,
                splitUpi: paymentMethod === "split" ? splitUpi : undefined,
                upiProofUrl,
                upiProofKey,
            });

            // Mark e-menu requests as billed
            try {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                await fetch(`/api/hospitality/requests/bill/${selectedUnpaidBill.bookingId}`, {
                    method: "PUT",
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
            } catch (err) {
                console.error("Failed to mark hospitality requests as billed:", err);
            }

            setIsPaymentModalOpen(false);
            setSelectedUnpaidBill(null);
            setPaymentUpiProof(null);
            setPaymentMethod("cash");
            
            fetchData();
            fetchReportRequests(reportDate);
            alert("Payment collected and bill marked as paid successfully!");
        } catch (err) {
            console.error("Failed to collect payment:", err);
            alert("Failed to collect payment. Please try again.");
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const handleIgnoreUnpaidBill = async (bookingId: number, guestName: string) => {
        if (!confirm(`Are you sure you want to ignore the food bill for ${guestName}? This will omit it from pending food bills.`)) {
            return;
        }
        try {
            await api.put(`/hospitality/requests/bill/${bookingId}`);
            fetchData();
            fetchReportRequests(reportDate);
            alert("Food bill ignored and omitted from pending bills.");
        } catch (err: any) {
            console.error("Failed to ignore food bill:", err);
            alert(err?.message || "Failed to ignore food bill.");
        }
    };

    const fetchReportRequests = async (dateStr: string) => {
        try {
            setLoadingReportRequests(true);
            const data = await api.get<any[]>(`/hospitality/requests?status=fulfilled&isBilled=false&date=${dateStr}`);
            setReportRequests(data || []);
        } catch (err) {
            console.error("Failed to fetch report requests:", err);
            setReportRequests([]);
        } finally {
            setLoadingReportRequests(false);
        }
    };

    useEffect(() => {
        if (isDailyReportOpen) {
            fetchReportRequests(reportDate);
        }
    }, [isDailyReportOpen, reportDate]);

    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [loadingProof, setLoadingProof] = useState<boolean>(false);

    const handleViewProof = async (logId: number) => {
        try {
            setLoadingProof(true);
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`/api/upi-payments/image/${logId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                alert("Failed to load proof image");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setLightboxImage(url);
        } catch (err: any) {
            alert(err.message || "Failed to load proof image");
        } finally {
            setLoadingProof(false);
        }
    };

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
        api.get("/auth/me").then(data => {
            if (data?.role === "chef") {
                router.replace("/admin3/chef");
            } else {
                setUserRole(data?.role || "");
                setCheckingRole(false);
                fetchData();
            }
        }).catch(() => {
            setCheckingRole(false);
            fetchData();
        });
    }, []);

    // Filter bills
    const filteredBills = bills.filter(b => {
        const guest = b.booking?.customerName || "";
        const ref = b.booking?.bookingRef || "";
        const villa = b.booking?.assignedUnit || b.booking?.subProperty?.name || "";
        const s = searchTerm.toLowerCase();
        
        const matchesSearch = (
            guest.toLowerCase().includes(s) ||
            ref.toLowerCase().includes(s) ||
            villa.toLowerCase().includes(s) ||
            `fb-${b.id}`.toLowerCase().includes(s) ||
            b.description.toLowerCase().includes(s)
        );

        const billDateStr = b.createdAt.split("T")[0]; // YYYY-MM-DD
        const matchesDateFrom = !dateFrom || billDateStr >= dateFrom;
        const matchesDateTo = !dateTo || billDateStr <= dateTo;

        return matchesSearch && matchesDateFrom && matchesDateTo;
    });

    // Summary calculations (dynamic based on filtered list)
    const totalCollected = filteredBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const cashCollected = filteredBills.filter(b => b.paymentMethod === "cash").reduce((sum, b) => sum + (b.amount || 0), 0);
    const upiCollected = filteredBills.filter(b => b.paymentMethod === "upi").reduce((sum, b) => sum + (b.amount || 0), 0);

    // Get audit/modification logs matching selected bill's villa
    const getAuditLogsForBill = (bill: FoodBill) => {
        const villa = (bill.booking?.assignedUnit || bill.booking?.subProperty?.name || "").toLowerCase();
        if (!villa) return [];
        return logs.filter(log => {
            const details = log.details.toLowerCase();
            return (log.actionType === "modify_request" || log.actionType === "delete_request") && details.includes(villa);
        });
    };

    if (checkingRole) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2">
                <Loader2 className="animate-spin text-indigo-600" size={28} />
                <span className="text-sm font-semibold">Verifying access...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <UtensilsCrossed className="text-orange-500" size={24} /> Food Bill History
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Logs and breakdowns of staycation hospitality food orders.</p>
                </div>
                <div className="self-start sm:self-auto flex items-center gap-3">
                    {(userRole === "owner" || userRole === "developer" || userRole === "staycation_call_manager") && (
                        <button
                            onClick={() => setIsDailyReportOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all uppercase tracking-wider"
                        >
                            Daily Food Reports
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-800 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-100 transition-all uppercase tracking-wider"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards — only visible to owner/developer */}
            {(userRole === "owner" || userRole === "developer") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Food Revenue</p>
                    <p className="text-2xl font-black text-slate-800 mt-1 flex items-center">
                        <IndianRupee size={20} className="mr-0.5" /> {totalCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{filteredBills.length} bill{filteredBills.length !== 1 ? "s" : ""}{(dateFrom || dateTo) ? " (filtered)" : ""}</p>
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
            )}

            {/* Search and Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by guest name, villa, or bill ID…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        />
                    </div>
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
                                            {bill.paymentMethod.toLowerCase() === "cash" ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                                                    CASH
                                                </span>
                                            ) : (
                                                bill.upiProofUrl ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLightboxImage(bill.upiProofUrl);
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 transition-colors cursor-pointer"
                                                    >
                                                        UPI
                                                    </button>
                                                ) : bill.upiPaymentId ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewProof(bill.upiPaymentId!);
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 transition-colors cursor-pointer"
                                                    >
                                                        UPI
                                                    </button>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200">
                                                        UPI
                                                    </span>
                                                )
                                            )}
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

            {/* UPI Proof Lightbox */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-200">
                    <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
                            <span className="text-sm font-bold text-slate-200">UPI Payment Proof</span>
                            <button
                                onClick={() => setLightboxImage(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Image Body */}
                        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950">
                            <img
                                src={lightboxImage}
                                alt="UPI Proof"
                                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-800 shadow-2xl"
                            />
                        </div>
                        {/* Footer */}
                        <div className="p-4 border-t border-slate-800 shrink-0 flex justify-end gap-3 bg-slate-900">
                            <a
                                href={lightboxImage}
                                download="upi_proof.png"
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                Open in New Tab
                            </a>
                            <button
                                onClick={() => setLightboxImage(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Food Report Modal */}
            {isDailyReportOpen && (() => {
                // Filter Paid staycation food bills by selected reportDate and reportProperty
                const matchedPaidBills = bills.filter(b => {
                    const dateStr = b.createdAt ? b.createdAt.split("T")[0] : "";
                    if (dateStr !== reportDate) return false;
                    
                    const propName = b.booking?.property?.name?.toLowerCase() || "";
                    if (reportProperty === "ambrose") {
                        return propName.includes("ambrose");
                    } else if (reportProperty === "amstel") {
                        return propName.includes("amstel");
                    }
                    return propName.includes("ambrose") || propName.includes("amstel");
                });

                // Group unbilled hospitality requests by bookingId
                const unbilledGroups: Record<number, any[]> = {};
                reportRequests.forEach(req => {
                    if (!req.bookingId) return;
                    
                    const propName = req.booking?.property?.name?.toLowerCase() || "";
                    const isMatchedProp = reportProperty === "ambrose"
                        ? propName.includes("ambrose")
                        : reportProperty === "amstel"
                            ? propName.includes("amstel")
                            : propName.includes("ambrose") || propName.includes("amstel");
                            
                    if (!isMatchedProp) return;
                    
                    if (!unbilledGroups[req.bookingId]) {
                        unbilledGroups[req.bookingId] = [];
                    }
                    unbilledGroups[req.bookingId].push(req);
                });

                // Map grouped unbilled requests to Unpaid bills
                const matchedUnpaidBills = Object.entries(unbilledGroups).map(([bookingId, reqs]) => {
                    const firstReq = reqs[0];
                    const booking = firstReq.booking;
                    
                    let totalAmount = 0;
                    const descriptionList: string[] = [];
                    
                    reqs.forEach(req => {
                        if (Array.isArray(req.items)) {
                            req.items.forEach((item: any) => {
                                const price = item.price || 0;
                                const qty = item.quantity || 1;
                                totalAmount += price * qty;
                                descriptionList.push(`${item.name} x${qty} (Rs. ${price})`);
                            });
                        }
                    });
                    
                    const propertyLabel = booking?.property?.name 
                        ? `${booking.property.name}${booking.subProperty?.name ? ` (${booking.subProperty.name})` : ""}`
                        : firstReq.villaName || "Unassigned";
                    
                    return {
                        id: `unpaid-${bookingId}`,
                        bookingId: parseInt(bookingId),
                        guestName: booking?.customerName || "Walk-In",
                        bookingRef: booking?.bookingRef || "-",
                        propertyLabel,
                        description: descriptionList.join(", "),
                        amount: totalAmount,
                        status: "Unpaid"
                    };
                });

                // Map Paid bills to unified format
                const formattedPaidBills = matchedPaidBills.map(b => {
                    const propertyLabel = b.booking?.property?.name 
                        ? `${b.booking.property.name}${b.booking.subProperty?.name ? ` (${b.booking.subProperty.name})` : ""}`
                        : b.booking?.assignedUnit || "Unassigned";
                    return {
                        id: `paid-${b.id}`,
                        bookingId: b.bookingId,
                        guestName: b.booking?.customerName || "Walk-In",
                        bookingRef: b.booking?.bookingRef || "-",
                        propertyLabel,
                        description: b.description ? b.description.replaceAll("₹", "Rs. ") : "",
                        amount: b.amount,
                        status: "Paid"
                    };
                });

                // Combine all
                const combinedReportBills = [...formattedPaidBills, ...matchedUnpaidBills];
                
                // Filter by status filter
                const filteredReportBills = combinedReportBills.filter(b => {
                    if (reportStatus === "paid") return b.status === "Paid";
                    if (reportStatus === "unpaid") return b.status === "Unpaid";
                    return true;
                });

                // Calculate summary totals
                const totalPaid = formattedPaidBills.reduce((sum, b) => sum + b.amount, 0);
                const totalUnpaid = matchedUnpaidBills.reduce((sum, b) => sum + b.amount, 0);
                const totalToCollect = totalPaid + totalUnpaid;

                const handleDownloadReportPDF = async () => {
                    try {
                        const { default: jsPDF } = await import("jspdf");
                        const { default: autoTable } = await import("jspdf-autotable");
                        
                        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                        const pageWidth = doc.internal.pageSize.getWidth();
                        
                        doc.setFontSize(16);
                        doc.setFont("helvetica", "bold");
                        doc.text("Galaxia Resorts — Daily Food Bill Report", pageWidth / 2, 15, { align: "center" });
                        
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(100);
                        
                        const propLabel = reportProperty === "ambrose" ? "Ambrose" : reportProperty === "amstel" ? "Amstel Nest" : "Ambrose + Amstel Nest";
                        doc.text(`Date: ${reportDate}  |  Property: ${propLabel}  |  Status: ${reportStatus.toUpperCase()}`, pageWidth / 2, 21, { align: "center" });
                        
                        doc.setFontSize(8);
                        doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, pageWidth / 2, 26, { align: "center" });
                        doc.setTextColor(0);
                        
                        // Summary Stats box
                        let startY = 32;
                        doc.setFillColor(245, 247, 250);
                        doc.rect(14, startY, pageWidth - 28, 20, "F");
                        
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(9);
                        doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString("en-IN")}`, 20, startY + 8);
                        doc.text(`Total Unpaid: Rs. ${totalUnpaid.toLocaleString("en-IN")}`, 20, startY + 14);
                        
                        doc.setFontSize(10);
                        doc.text(`Total to Collect: Rs. ${totalToCollect.toLocaleString("en-IN")}`, pageWidth - 80, startY + 11);
                        
                        const headers = [["Guest", "Villa/Property", "Contents", "Status", "Amount"]];
                        const pdfData = filteredReportBills.map(b => [
                            `${b.guestName}\n(${b.bookingRef})`,
                            b.propertyLabel,
                            b.description,
                            b.status,
                            `Rs. ${b.amount.toLocaleString("en-IN")}`
                        ]);
                        
                        autoTable(doc, {
                            startY: 57,
                            head: headers,
                            body: pdfData,
                            theme: "striped",
                            headStyles: { fillColor: [79, 70, 229] },
                            styles: { fontSize: 8, cellPadding: 3 },
                            columnStyles: {
                                0: { cellWidth: 35 },
                                1: { cellWidth: 35 },
                                2: { cellWidth: 75 },
                                3: { cellWidth: 17, halign: "center" },
                                4: { cellWidth: 20, halign: "right" }
                            }
                        });
                        
                        doc.save(`daily_food_report_${reportDate}.pdf`);
                    } catch (err: any) {
                        console.error("Failed to generate PDF:", err);
                        alert("Failed to generate PDF. Please try again.");
                    }
                };

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsDailyReportOpen(false)}>
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <UtensilsCrossed className="text-amber-600" size={18} />
                                        Daily Food Reports
                                    </h3>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Summary of food collections and pending bills</p>
                                </div>
                                <button onClick={() => setIsDailyReportOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {/* Filters Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={reportDate}
                                            onChange={e => setReportDate(e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Property</label>
                                        <select
                                            value={reportProperty}
                                            onChange={e => setReportProperty(e.target.value as any)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                        >
                                            <option value="both">Ambrose + Amstel Nest</option>
                                            <option value="ambrose">Ambrose</option>
                                            <option value="amstel">Amstel Nest</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={reportStatus}
                                            onChange={e => setReportStatus(e.target.value as any)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                        >
                                            <option value="all">All</option>
                                            <option value="paid">Paid</option>
                                            <option value="unpaid">Unpaid</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</span>
                                        <p className="text-xl font-black text-emerald-800 mt-1">₹{totalPaid.toLocaleString("en-IN")}</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Total Unpaid</span>
                                        <p className="text-xl font-black text-red-800 mt-1">₹{totalUnpaid.toLocaleString("en-IN")}</p>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total amount to collect</span>
                                        <p className="text-xl font-black text-indigo-800 mt-1">₹{totalToCollect.toLocaleString("en-IN")}</p>
                                    </div>
                                </div>

                                {/* Report Table */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto max-h-[40vh]">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest Name / Booking Ref</th>
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Villa / Property</th>
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contents</th>
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price</th>
                                                    <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {loadingReportRequests ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center">
                                                            <Loader2 className="animate-spin mx-auto text-indigo-500" size={24} />
                                                            <p className="text-xs text-slate-500 mt-2">Loading unpaid food requests...</p>
                                                        </td>
                                                    </tr>
                                                ) : filteredReportBills.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium text-xs">
                                                            No food bills found matching current selection.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredReportBills.map(b => (
                                                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="text-xs font-bold text-slate-800">{b.guestName}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{b.bookingRef}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded uppercase">
                                                                    {b.propertyLabel}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-600 font-medium max-w-sm whitespace-pre-wrap" title={b.description}>
                                                                {b.description}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {b.status === "Paid" ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                        PAID
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                                                                        UNPAID
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-slate-800 text-xs">
                                                                ₹{b.amount.toLocaleString("en-IN")}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {b.status === "Unpaid" ? (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedUnpaidBill({
                                                                                    bookingId: b.bookingId,
                                                                                    guestName: b.guestName,
                                                                                    bookingRef: b.bookingRef,
                                                                                    amount: b.amount,
                                                                                    description: b.description
                                                                                });
                                                                                setPaymentMethod("cash");
                                                                                setPaymentUpiProof(null);
                                                                                setIsPaymentModalOpen(true);
                                                                            }}
                                                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                                                                        >
                                                                            Mark Paid
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleIgnoreUnpaidBill(b.bookingId, b.guestName)}
                                                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black rounded-lg transition-colors cursor-pointer uppercase tracking-wider border border-slate-300"
                                                                        >
                                                                            Ignore
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 font-bold">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                                <button
                                    onClick={handleDownloadReportPDF}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => setIsDailyReportOpen(false)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {isPaymentModalOpen && selectedUnpaidBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <UtensilsCrossed size={18} className="text-amber-600" /> Collect Food Bill
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <p className="font-bold text-slate-500 uppercase tracking-wider">Guest</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">
                                    {selectedUnpaidBill.guestName} ({selectedUnpaidBill.bookingRef})
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <p className="font-bold text-slate-500 uppercase tracking-wider">Bill Description</p>
                                <p className="text-slate-700 mt-0.5 font-medium whitespace-pre-wrap">
                                    {selectedUnpaidBill.description}
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <p className="font-bold text-slate-500 uppercase tracking-wider">Amount to Collect</p>
                                <p className="text-lg font-black text-slate-800 mt-0.5">
                                    ₹{selectedUnpaidBill.amount.toLocaleString("en-IN")}
                                </p>
                            </div>

                            <div>
                                <label className="font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Paid via</label>
                                <div className="bg-slate-50 rounded-lg p-1 flex">
                                    <button 
                                        type="button" 
                                        onClick={() => setPaymentMethod('cash')} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                                    >
                                        Cash
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setPaymentMethod('upi')} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'upi' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                                    >
                                        UPI
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setPaymentMethod('split'); setSplitCash(selectedUnpaidBill.amount); setSplitUpi(0); }} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'split' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}
                                    >
                                        Split
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'split' && (
                                <div className="grid grid-cols-2 gap-4 border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 shrink-0">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cash Amount</label>
                                        <input
                                            type="number"
                                            value={splitCash || ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSplitCash(val);
                                                setSplitUpi(Math.max(0, selectedUnpaidBill.amount - val));
                                            }}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">UPI Amount</label>
                                        <input
                                            type="number"
                                            value={splitUpi || ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSplitUpi(val);
                                                setSplitCash(Math.max(0, selectedUnpaidBill.amount - val));
                                            }}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="col-span-2 text-[10px] font-bold text-slate-400 text-center">
                                        Total: ₹{splitCash + splitUpi} (Required: ₹{selectedUnpaidBill.amount})
                                    </div>
                                </div>
                            )}

                            {(paymentMethod === 'upi' || (paymentMethod === 'split' && splitUpi > 0)) && (
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-500 uppercase tracking-wider mb-1 block">UPI Proof</label>
                                    {paymentUpiProof ? (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <CheckCircle size={14} className="text-emerald-600" />
                                            <span className="font-bold text-emerald-700 truncate max-w-[200px]">{paymentUpiProof.name}</span>
                                            <button type="button" onClick={() => setPaymentUpiProof(null)} className="text-red-500 font-bold ml-auto hover:underline">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setPaymentUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Camera size={14} className="text-indigo-600" />
                                                <span className="font-bold text-indigo-700">Camera</span>
                                            </label>
                                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setPaymentUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Upload size={14} className="text-indigo-600" />
                                                <span className="font-bold text-indigo-700">Gallery</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCollectPayment}
                                disabled={paymentSubmitting || (paymentMethod === "upi" && !paymentUpiProof) || (paymentMethod === "split" && splitUpi > 0 && !paymentUpiProof) || (paymentMethod === "split" && splitCash + splitUpi !== selectedUnpaidBill.amount)}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
                            >
                                {paymentSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Collecting...
                                    </>
                                ) : (
                                    "Confirm Payment"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
