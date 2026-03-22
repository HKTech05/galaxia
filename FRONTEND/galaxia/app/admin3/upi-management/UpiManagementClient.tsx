"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CalendarDays, IndianRupee, FileText, Download, X, Filter, Building, Loader2, Image, Eye, Archive, Pencil, Check } from "lucide-react";
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

    // PDF download
    const downloadPDF = async () => {
        if (!viewEmployeeId) return;
        const emp = employees.find(e => e.id === viewEmployeeId);
        if (!emp) return;

        const empLogs = upiLogs.filter(log => log.employeeId === viewEmployeeId);

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
            const token = localStorage.getItem("galaxia_token") || "";
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://65.1.183.241:4000'}/api/upi-payments/download-all/${viewEmployeeId}`, {
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
    const activeEmployeeLogs = upiLogs.filter(log => log.employeeId === viewEmployeeId);
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
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    {activeEmployee.location} — {activeEmployee.name}
                                </h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">UPI payment history & proof images</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={downloadPDF}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export Logs
                                </button>
                                <button
                                    onClick={downloadAllProofs}
                                    disabled={activeEmployeeLogs.length === 0}
                                    className={`px-4 py-2 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${
                                        activeEmployeeLogs.length > 0
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Archive size={16} /> All Proofs (ZIP)
                                </button>
                                <button
                                    onClick={() => setViewEmployeeId(null)}
                                    className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors"
                                >
                                    <X size={20} />
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
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Date & Time</th>
                                            <th className="px-4 py-3">Guest Name</th>
                                            <th className="px-4 py-3">Booking</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-center">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeEmployeeLogs.length > 0 ? (
                                            activeEmployeeLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3.5 font-medium text-slate-600">
                                                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-bold text-slate-800">{log.guestName || '—'}</td>
                                                    <td className="px-4 py-3.5 text-xs font-medium text-slate-500">{log.bookingRef || '—'}</td>
                                                    <td className="px-4 py-3.5 font-black text-indigo-700">
                                                        ₹{log.amount.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                                                            log.paymentType === 'deposit'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            {log.paymentType === 'deposit' ? 'Deposit' : 'Balance'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => setPreviewImageUrl(log.proofImageUrl)}
                                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                                                                title="View proof"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <a
                                                                href={log.proofImageUrl}
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                                title="Download proof"
                                                            >
                                                                <Download size={14} />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">No UPI transactions recorded for this employee.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
                            <a
                                href={previewImageUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Download size={16} /> Download Image
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
