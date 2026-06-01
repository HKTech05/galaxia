"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CalendarDays, IndianRupee, FileText, Download, X, Filter, Building, Loader2, Image, Eye, Archive, Pencil, Check, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";

interface Employee {
    id: number;
    name: string;
    role: string;
    location: string;
}

interface UpiLog {
    id: number;
    employeeId: number;
    createdAt: string;
    amount: number;
    guestName: string;
    paymentType: string;
    bookingRef: string;
    note: string;
    proofImageUrl: string;
    proofImageKey: string | null;
}

export default function UpiManagementClient() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [upiLogs, setUpiLogs] = useState<UpiLog[]>([]);
    const [allUpiLogs, setAllUpiLogs] = useState<UpiLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch employees from API
    const fetchEmployees = useCallback(async () => {
        try {
            const data = await api.get("/employees");
            const mapped = (Array.isArray(data) ? data : []).map((emp: any) => ({
                id: emp.id,
                name: emp.name,
                role: emp.role,
                location: emp.property?.name || "Unknown",
            }));
            setEmployees(mapped);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        }
    }, []);

    // Fetch all UPI logs to compute totals
    const fetchAllUpiLogs = useCallback(async () => {
        try {
            const data = await api.get("/upi-payments");
            setAllUpiLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch UPI payments:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchAllUpiLogs();
    }, [fetchEmployees, fetchAllUpiLogs]);

    // Filters
    const ALL_PROPERTIES = ["Digital Diaries", "Ambrose", "Amstel Nest", "La Paraiso", "Mount View", "Hill View", "Heavenly Villa"];
    const [selectedProperties, setSelectedProperties] = useState<string[]>(ALL_PROPERTIES);

    // UI State
    const [viewEmployeeId, setViewEmployeeId] = useState<number | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [upiDateFrom, setUpiDateFrom] = useState("");
    const [upiDateTo, setUpiDateTo] = useState("");

    // Cashout modal state
    const [showCashoutModal, setShowCashoutModal] = useState(false);
    const [cashoutMode, setCashoutMode] = useState<'full' | 'custom'>('full');
    const [cashoutCustomAmount, setCashoutCustomAmount] = useState('');

    // Fetch image with auth and return blob URL
    const fetchImageBlob = async (logId: number): Promise<string | null> => {
        try {
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`/api/upi-payments/image/${logId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const blob = await res.blob();
            return URL.createObjectURL(blob);
        } catch { return null; }
    };

    const handleViewProof = async (logId: number) => {
        const url = await fetchImageBlob(logId);
        if (url) setPreviewImageUrl(url);
        else alert("Failed to load proof image");
    };

    const handleDownloadProof = async (logId: number) => {
        try {
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`/api/upi-payments/download/${logId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `upi-proof-${logId}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Failed to download proof");
        }
    };

    const handleSaveName = async (empId: number) => {
        if (!editName.trim()) return;
        try {
            await api.patch(`/employees/${empId}`, { name: editName.trim() });
            setEmployees(prev => prev.map(e => e.id === empId ? { ...e, name: editName.trim() } : e));
            setEditingEmpId(null);
        } catch (err) {
            console.error("Failed to save employee name:", err);
            alert("Failed to save name");
        }
    };

    const handlePropertyToggle = (prop: string) => {
        if (selectedProperties.includes(prop)) {
            setSelectedProperties(selectedProperties.filter(p => p !== prop));
        } else {
            setSelectedProperties([...selectedProperties, prop]);
        }
    };

    const handleSelectAll = () => {
        if (selectedProperties.length === ALL_PROPERTIES.length) {
            setSelectedProperties([]);
        } else {
            setSelectedProperties(ALL_PROPERTIES);
        }
    };

    const openDetails = async (id: number) => {
        setViewEmployeeId(id);
        try {
            const logs = await api.get(`/upi-payments/by-employee/${id}`);
            setUpiLogs(Array.isArray(logs) ? logs : []);
        } catch (err) {
            console.error("Failed to fetch UPI logs:", err);
        }
    };

    // Cash out UPI
    const handleCashOut = async (empId: number, amount?: number) => {
        try {
            await api.post(`/upi-payments/cashout/${empId}`, amount ? { amount } : {});
            await fetchAllUpiLogs();
            if (viewEmployeeId === empId) {
                const logs = await api.get(`/upi-payments/by-employee/${empId}`);
                setUpiLogs(Array.isArray(logs) ? logs : []);
            }
            setShowCashoutModal(false);
            setCashoutCustomAmount('');
            setCashoutMode('full');
        } catch (err) {
            console.error('Cashout failed:', err);
            alert('Failed to cash out');
        }
    };

    const openCashoutModal = () => {
        setCashoutMode('full');
        setCashoutCustomAmount('');
        setShowCashoutModal(true);
    };

    const confirmCashout = () => {
        if (!viewEmployeeId) return;
        if (cashoutMode === 'custom') {
            const amt = parseFloat(cashoutCustomAmount);
            if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }
            handleCashOut(viewEmployeeId, amt);
        } else {
            handleCashOut(viewEmployeeId);
        }
    };

    // PDF download
    const downloadPDF = async (filterByRange = false) => {
        if (!viewEmployeeId) return;
        const emp = employees.find(e => e.id === viewEmployeeId);
        if (!emp) return;

        let empLogs = upiLogs.filter(log => log.employeeId === viewEmployeeId);
        if (filterByRange && (upiDateFrom || upiDateTo)) {
            empLogs = empLogs.filter(log => {
                const d = new Date(log.createdAt);
                if (upiDateFrom && d < new Date(upiDateFrom + 'T00:00:00')) return false;
                if (upiDateTo && d > new Date(upiDateTo + 'T23:59:59')) return false;
                return true;
            });
        }

        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`UPI Transaction History: ${emp.location} — ${emp.name}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);
        doc.text(`Total UPI Collected: Rs. ${empLogs.reduce((s, l) => s + l.amount, 0).toLocaleString('en-IN')}`, 14, 36);

        const tableColumn = ["Date & Time", "Guest", "Booking Ref", "Amount", "Type"];
        const tableRows = empLogs.map(log => [
            new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            log.guestName || '—',
            log.bookingRef || '—',
            `Rs. ${log.amount.toLocaleString('en-IN')}`,
            log.paymentType === "deposit" ? "Security Deposit" : "Balance"
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
        });

        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${emp.location.replace(/\s+/g, '_')}_${emp.name.replace(/\s+/g, '_')}_UPI_transactions.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Download all proofs as ZIP
    const downloadAllProofs = async () => {
        if (!viewEmployeeId) return;
        const emp = employees.find(e => e.id === viewEmployeeId);
        if (!emp) return;

        try {
            const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`/api/upi-payments/download-all/${viewEmployeeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Download failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${emp.location.replace(/\s+/g, '_')}_UPI_Proofs.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download proofs:", err);
            alert("Failed to download proofs");
        }
    };

    const handleDeleteUpiTx = async (logId: number) => {
        if (!confirm('Permanently delete this UPI transaction? This cannot be undone.')) return;
        try {
            await api.delete(`/upi-payments/${logId}`);
            await fetchAllUpiLogs();
            if (viewEmployeeId) {
                const logs = await api.get(`/upi-payments/by-employee/${viewEmployeeId}`);
                setUpiLogs(Array.isArray(logs) ? logs : []);
            }
        } catch (err) {
            console.error('Failed to delete UPI transaction:', err);
            alert('Failed to delete transaction');
        }
    };

    // Compute totals per employee from allUpiLogs
    const getEmployeeUpiTotal = (empId: number) => {
        return allUpiLogs.filter(l => l.employeeId === empId).reduce((s, l) => s + l.amount, 0);
    };
    const getEmployeeLastUpi = (empId: number) => {
        const logs = allUpiLogs.filter(l => l.employeeId === empId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (logs.length === 0) return "Never";
        return new Date(logs[0].createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const getEmployeeUpiCount = (empId: number) => {
        return allUpiLogs.filter(l => l.employeeId === empId).length;
    };

    // Filter employees
    const filteredEmployees = employees.filter(emp => selectedProperties.includes(emp.location));
    const activeEmployee = employees.find(e => e.id === viewEmployeeId);
    const activeEmployeeLogs = (() => {
        let logs = upiLogs.filter(log => log.employeeId === viewEmployeeId);
        if (upiDateFrom || upiDateTo) {
            logs = logs.filter(log => {
                const d = new Date(log.createdAt);
                if (upiDateFrom && d < new Date(upiDateFrom + 'T00:00:00')) return false;
                if (upiDateTo && d > new Date(upiDateTo + 'T23:59:59')) return false;
                return true;
            });
        }
        return logs;
    })();
    const totalUpiCollection = filteredEmployees.reduce((s, e) => s + getEmployeeUpiTotal(e.id), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">UPI Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Track UPI payment collections and view proof images.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 border border-indigo-100">
                    <IndianRupee size={18} />
                    <span className="font-bold">Total UPI: ₹{totalUpiCollection.toLocaleString('en-IN')}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={18} className="text-slate-500" />
                    <h3 className="font-bold text-slate-700 text-sm">Filter by Property</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSelectAll}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedProperties.length === ALL_PROPERTIES.length ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        All
                    </button>
                    {ALL_PROPERTIES.map(prop => (
                        <button
                            key={prop}
                            onClick={() => handlePropertyToggle(prop)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedProperties.includes(prop) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Building size={12} className={selectedProperties.includes(prop) ? 'text-indigo-600' : 'text-slate-400'} />
                            {prop}
                        </button>
                    ))}
                </div>
            </div>

            {/* Employee Cards Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEmployees.map(emp => {
                        const total = getEmployeeUpiTotal(emp.id);
                        const lastDate = getEmployeeLastUpi(emp.id);
                        const count = getEmployeeUpiCount(emp.id);
                        return (
                            <div
                                key={emp.id}
                                onClick={() => openDetails(emp.id)}
                                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md cursor-pointer transition-all relative group hover:border-indigo-200"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1 min-w-0">
                                            {editingEmpId === emp.id ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <span className="text-lg font-bold text-slate-800">{emp.location} — </span>
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(emp.id); }}
                                                        className="text-lg font-bold text-slate-800 bg-white border border-indigo-300 rounded-lg px-2 py-0.5 w-32 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={(e) => { e.stopPropagation(); handleSaveName(emp.id); }} className="p-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-emerald-700 transition-colors"><Check size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingEmpId(null); }} className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-lg font-bold text-slate-800 truncate">{emp.location} — {emp.name}</p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingEmpId(emp.id); setEditName(emp.name); }}
                                                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                                                        title="Edit name"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{emp.role}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <Image size={16} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-5 relative overflow-hidden group-hover:bg-indigo-50/50 transition-colors">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-50 opacity-50 rounded-bl-full pointer-events-none" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">UPI Collected (Lifetime)</p>
                                        <p className={`text-3xl font-black mt-1 relative z-10 ${total > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            ₹{total.toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1.5 bg-white w-fit px-2 py-1 rounded shadow-sm border border-slate-100 relative z-10">
                                            <CalendarDays size={12} className="text-slate-400" /> Last: {lastDate}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <p className="text-xs font-semibold text-slate-600">{count} UPI transaction{count !== 1 ? 's' : ''}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">Click to view log</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredEmployees.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No employees found for the selected properties.
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {viewEmployeeId && activeEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-2xl font-black text-slate-800 leading-tight">
                                        {activeEmployee.location} — {activeEmployee.name}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">UPI payment history & proof images</p>
                                </div>
                                <button
                                    onClick={() => { setViewEmployeeId(null); setUpiDateFrom(''); setUpiDateTo(''); }}
                                    className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-3">
                                <button
                                    onClick={() => downloadPDF(false)}
                                    className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export All Logs
                                </button>
                                {(upiDateFrom || upiDateTo) && (
                                <button
                                    onClick={() => downloadPDF(true)}
                                    className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export Range
                                </button>
                                )}
                                <button
                                    onClick={openCashoutModal}
                                    className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <IndianRupee size={16} /> Cash Out
                                </button>
                                <button
                                    onClick={downloadAllProofs}
                                    disabled={activeEmployeeLogs.length === 0}
                                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${
                                        activeEmployeeLogs.length > 0
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Archive size={16} /> All Proofs (ZIP)
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="mb-6 flex gap-4">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex-1">
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Total UPI Collected</p>
                                    <p className="text-2xl font-black text-indigo-800">₹{activeEmployeeLogs.reduce((s, l) => s + l.amount, 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Transactions</p>
                                    <p className="text-lg font-bold text-slate-700">{activeEmployeeLogs.length}</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><FileText size={18} className="text-indigo-500" /> UPI Transactions</h3>

                            {/* Date Range Filter */}
                            <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date Range</span>
                                <input type="date" value={upiDateFrom} onChange={e => setUpiDateFrom(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                <span className="text-xs text-slate-400">to</span>
                                <input type="date" value={upiDateTo} onChange={e => setUpiDateTo(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                {(upiDateFrom || upiDateTo) && (
                                    <button onClick={() => { setUpiDateFrom(''); setUpiDateTo(''); }} className="text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
                                )}
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden hidden sm:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Date & Time</th>
                                            <th className="px-4 py-3">Guest Name</th>
                                            <th className="px-4 py-3">Booking</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-center">Proof</th>
                                            <th className="px-4 py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeEmployeeLogs.length > 0 ? (
                                            activeEmployeeLogs.map(log => {
                                                const isRedLog = log.note?.toLowerCase().includes('satkar') || log.paymentType === 'expense' || log.note?.toLowerCase().includes('expense');
                                                return (
                                                <tr key={log.id} className={`transition-colors ${log.paymentType === 'deposit_refund' ? 'bg-red-50/60 hover:bg-red-50' : isRedLog ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50/50'}`}>
                                                    <td className="px-4 py-3.5 font-medium text-slate-600">
                                                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-bold text-slate-800">{log.guestName || '—'}</td>
                                                    <td className="px-4 py-3.5 text-xs font-medium text-slate-500">{log.bookingRef || '—'}</td>
                                                    <td className={`px-4 py-3.5 font-black ${log.amount < 0 ? 'text-red-600' : isRedLog ? 'text-red-600' : 'text-indigo-700'}`}>
                                                        {log.amount < 0 ? '-' : ''}₹{Math.abs(log.amount).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                                                            log.paymentType === 'deposit_refund'
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : log.paymentType === 'deposit'
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            {log.paymentType === 'deposit_refund' ? 'Refund' : log.paymentType === 'deposit' ? 'Deposit' : 'Balance'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {log.proofImageKey || log.proofImageUrl ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleViewProof(log.id)}
                                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                                                                title="View proof"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadProof(log.id)}
                                                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                                title="Download proof"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        </div>
                                                        ) : (
                                                        <span className="text-xs text-slate-400 italic">{log.paymentType === 'deposit_refund' ? 'Refund' : 'No proof'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <button onClick={() => handleDeleteUpiTx(log.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete"><Trash2 size={13} /></button>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">No UPI transactions recorded for this employee.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile card layout */}
                            <div className="sm:hidden space-y-3">
                                {activeEmployeeLogs.length > 0 ? (
                                    activeEmployeeLogs.map(log => {
                                        const isRedLog = log.note?.toLowerCase().includes('satkar') || log.paymentType === 'expense' || log.note?.toLowerCase().includes('expense');
                                        return (
                                        <div key={log.id} className={`p-4 rounded-xl border ${isRedLog ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-medium text-slate-500">
                                                    {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className={`text-sm font-black ${log.amount < 0 ? 'text-red-600' : isRedLog ? 'text-red-600' : 'text-indigo-700'}`}>{log.amount < 0 ? '-' : ''}₹{Math.abs(log.amount).toLocaleString('en-IN')}</p>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">{log.guestName || '—'}</p>
                                            {log.bookingRef && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{log.bookingRef}</p>}
                                            <div className="flex items-center justify-between mt-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                    log.paymentType === 'deposit_refund'
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                        : log.paymentType === 'deposit'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {log.paymentType === 'deposit_refund' ? 'Refund' : log.paymentType === 'deposit' ? 'Deposit' : 'Balance'}
                                                </span>
                                                <button
                                                    onClick={() => handleViewProof(log.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors text-xs font-bold"
                                                >
                                                    <Eye size={12} /> View Proof
                                                </button>
                                                <button onClick={() => handleDeleteUpiTx(log.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors text-xs font-bold"><Trash2 size={12} /> Delete</button>
                                            </div>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center text-slate-400 font-medium">No UPI transactions recorded.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cashout Modal */}
            {showCashoutModal && viewEmployeeId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-slate-800">Cash Out</h3>
                            <button onClick={() => setShowCashoutModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Current UPI balance: <span className="font-bold text-indigo-700">₹{activeEmployeeLogs.reduce((s, l) => s + l.amount, 0).toLocaleString('en-IN')}</span></p>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => setCashoutMode('full')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                    cashoutMode === 'full'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <p className="font-bold text-slate-800 text-sm">Full Amount Cashout</p>
                                <p className="text-xs text-slate-500 mt-1">Cash out the entire UPI balance</p>
                            </button>
                            <button
                                onClick={() => setCashoutMode('custom')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                    cashoutMode === 'custom'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <p className="font-bold text-slate-800 text-sm">Custom Amount</p>
                                <p className="text-xs text-slate-500 mt-1">Enter a specific amount to cash out</p>
                            </button>
                        </div>

                        {cashoutMode === 'custom' && (
                            <div className="mb-6">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Amount to Cash Out (₹)</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={cashoutCustomAmount}
                                    onChange={e => setCashoutCustomAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCashoutModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCashout}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <IndianRupee size={16} /> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Lightbox */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg text-slate-600 hover:text-red-500 transition-colors z-10"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="UPI Payment Proof"
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white"
                        />
                        <div className="mt-3 flex justify-center">
                            <button
                                onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = previewImageUrl;
                                    a.download = "upi-proof.jpg";
                                    a.click();
                                }}
                                className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Download size={16} /> Download Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
