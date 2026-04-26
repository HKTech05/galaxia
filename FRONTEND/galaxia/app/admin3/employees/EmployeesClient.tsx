"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CalendarDays, IndianRupee, FileText, Download, CheckCircle, Pencil, X, Filter, Building, Loader2, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";

// Type definitions
interface Employee {
    id: number;
    name: string;
    role: string;
    location: string;
    cashCollected: number;
    lastCollectedAt: string;
}

interface CashLog {
    id: number;
    employeeId: number;
    createdAt: string;
    amount: number;
    guestName: string;
    note: string;
    transactionType: string;
    bookingRef: string;
}

export default function EmployeesClient() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [cashLogs, setCashLogs] = useState<CashLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch employees from API
    const fetchEmployees = useCallback(async () => {
        try {
            const data = await api.get("/employees");
            // Map API response to match Employee interface
            const mapped = (Array.isArray(data) ? data : []).map((emp: any) => ({
                id: emp.id,
                name: emp.name,
                role: emp.role,
                location: emp.property?.name || "Unknown",
                cashCollected: emp.cashCollected || 0,
                lastCollectedAt: emp.lastCollectedAt ? new Date(emp.lastCollectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Never",
            }));
            setEmployees(mapped);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    // 2. Filters
    const ALL_PROPERTIES = ["Digital Diaries", "Ambrose", "Amstel Nest", "La Paraiso", "Mount View", "Hill View", "Heavenly Villa"];
    const [selectedProperties, setSelectedProperties] = useState<string[]>(ALL_PROPERTIES);

    // 3. UI State
    const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [viewEmployeeId, setViewEmployeeId] = useState<number | null>(null);
    const [cashDateFrom, setCashDateFrom] = useState("");
    const [cashDateTo, setCashDateTo] = useState("");

    // Cashout modal state (for DD employees)
    const [showCashoutModal, setShowCashoutModal] = useState(false);
    const [cashoutEmployeeId, setCashoutEmployeeId] = useState<number | null>(null);
    const [cashoutMode, setCashoutMode] = useState<'full' | 'custom'>('full');
    const [cashoutCustomAmount, setCashoutCustomAmount] = useState('');

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

    const handleCollectCash = async (e: React.MouseEvent, employeeId: number, amount?: number) => {
        e.stopPropagation();
        try {
            await api.post(`/employees/${employeeId}/collect`, amount ? { amount } : {});
            await fetchEmployees();
            // Refresh transaction logs if viewing this employee
            if (viewEmployeeId === employeeId) {
                const logs = await api.get(`/employees/${employeeId}/transactions`);
                setCashLogs(logs);
            }
        } catch (err) {
            console.error("Failed to collect cash:", err);
        }
    };

    const openCashoutModal = (e: React.MouseEvent, empId: number) => {
        e.stopPropagation();
        setCashoutEmployeeId(empId);
        setCashoutMode('full');
        setCashoutCustomAmount('');
        setShowCashoutModal(true);
    };

    const confirmCashout = async () => {
        if (!cashoutEmployeeId) return;
        const emp = employees.find(e => e.id === cashoutEmployeeId);
        if (!emp) return;
        const amount = cashoutMode === 'custom' ? parseFloat(cashoutCustomAmount) : undefined;
        if (cashoutMode === 'custom' && (!amount || amount <= 0 || amount > emp.cashCollected)) {
            alert(`Please enter a valid amount between 1 and ₹${emp.cashCollected.toLocaleString('en-IN')}`);
            return;
        }
        // Create a synthetic mouse event for the handler
        const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
        await handleCollectCash(syntheticEvent, cashoutEmployeeId, amount);
        setShowCashoutModal(false);
        setCashoutCustomAmount('');
        setCashoutMode('full');
    };

    const handleSaveName = async (e: React.MouseEvent | React.KeyboardEvent, id: number) => {
        e.stopPropagation();
        try {
            await api.patch(`/employees/${id}`, { name: editName });
            setEmployees(employees.map(emp => emp.id === id ? { ...emp, name: editName } : emp));
            setEditingEmployee(null);
        } catch (err) {
            console.error("Failed to update name:", err);
        }
    };

    const startEditing = (e: React.MouseEvent, emp: Employee) => {
        e.stopPropagation();
        setEditingEmployee(emp.id);
        setEditName(emp.name);
    };

    const openDetails = async (id: number) => {
        if (editingEmployee === null) {
            setViewEmployeeId(id);
            try {
                const logs = await api.get(`/employees/${id}/transactions`);
                setCashLogs(logs);
            } catch (err) {
                console.error("Failed to fetch transaction logs:", err);
            }
        }
    };

    const handleDeleteCashTx = async (empId: number, txId: number) => {
        if (!confirm('Permanently delete this cash transaction? This cannot be undone.')) return;
        try {
            await api.delete(`/employees/${empId}/transactions/${txId}`);
            await fetchEmployees();
            const logs = await api.get(`/employees/${empId}/transactions`);
            setCashLogs(logs);
        } catch (err) {
            console.error('Failed to delete cash transaction:', err);
            alert('Failed to delete transaction');
        }
    };

    // 4. Dedicated PDF Download
    const downloadEmployeePDF = async (filterByRange = false) => {
        if (!viewEmployeeId) return;

        const emp = employees.find(e => e.id === viewEmployeeId);
        if (!emp) return;

        let empLogs = cashLogs.filter(log => log.employeeId === viewEmployeeId);
        if (filterByRange && (cashDateFrom || cashDateTo)) {
            empLogs = empLogs.filter(log => {
                const d = new Date(log.createdAt);
                if (cashDateFrom && d < new Date(cashDateFrom + 'T00:00:00')) return false;
                if (cashDateTo && d > new Date(cashDateTo + 'T23:59:59')) return false;
                return true;
            });
        }

        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Transaction History: ${emp.location} — ${emp.name}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);
        doc.text(`Current Pending Cash: Rs. ${emp.cashCollected.toLocaleString('en-IN')}`, 14, 36);

        const tableColumn = ["Date & Time", "Guest", "Booking Ref", "Amount", "Type"];
        const tableRows = empLogs.map(log => [
            new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            log.guestName || '—',
            log.bookingRef || '—',
            `${log.amount < 0 ? '-' : ''}Rs. ${Math.abs(log.amount).toLocaleString('en-IN')}`,
            log.note
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237] },
            didParseCell: function(data: any) {
                if (data.section === 'body') {
                    const note = tableRows[data.row.index]?.[4] || '';
                    if (note.includes('Owner') || note.includes('owner')) {
                        data.cell.styles.fillColor = [219, 234, 254];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (note.includes('refund') || note.includes('Refund')) {
                        data.cell.styles.fillColor = [254, 226, 226];
                    }
                }
            }
        });

        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${emp.location.replace(/\s+/g, '_')}_${emp.name.replace(/\s+/g, '_')}_transactions.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Filter employees based on selected properties
    const filteredEmployees = employees.filter(emp => selectedProperties.includes(emp.location));
    const activeEmployee = employees.find(e => e.id === viewEmployeeId);
    const activeEmployeeLogs = (() => {
        let logs = cashLogs.filter(log => log.employeeId === viewEmployeeId);
        if (cashDateFrom || cashDateTo) {
            logs = logs.filter(log => {
                const d = new Date(log.createdAt);
                if (cashDateFrom && d < new Date(cashDateFrom + 'T00:00:00')) return false;
                if (cashDateTo && d > new Date(cashDateTo + 'T23:59:59')) return false;
                return true;
            });
        }
        return logs;
    })();

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cash Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage staff, track collections, and view detailed histories.</p>
                </div>
                <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl flex items-center gap-2 border border-purple-100">
                    <IndianRupee size={18} />
                    <span className="font-bold">Total Collection: ₹{filteredEmployees.reduce((sum, emp) => sum + emp.cashCollected, 0).toLocaleString('en-IN')}</span>
                </div>
            </div>

            {/* Filters Section */}
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedProperties.includes(prop) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Building size={12} className={selectedProperties.includes(prop) ? 'text-purple-600' : 'text-slate-400'} />
                            {prop}
                        </button>
                    ))}
                </div>
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEmployees.map(emp => (
                    <div
                        key={emp.id}
                        onClick={() => openDetails(emp.id)}
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md cursor-pointer transition-all relative group hover:border-purple-200"
                    >
                        <div>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    {editingEmployee === emp.id ? (
                                        <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="border border-purple-300 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 w-full max-w-[150px]"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleSaveName(e, emp.id)}
                                            />
                                            <button onClick={(e) => handleSaveName(e, emp.id)} className="text-emerald-600 hover:text-emerald-700 p-1 w-7 h-7 bg-emerald-50 rounded flex items-center justify-center">
                                                <CheckCircle size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/edit" onClick={(e) => startEditing(e, emp)}>
                                            <p className="text-lg font-bold text-slate-800">{emp.location} — {emp.name}</p>
                                            <Pencil size={12} className="text-slate-300 group-hover/edit:text-purple-600 transition-colors" />
                                        </div>
                                    )}

                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{emp.role}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                    <Users size={16} />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-5 relative overflow-hidden group-hover:bg-purple-50/50 transition-colors">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 opacity-50 rounded-bl-full pointer-events-none" />
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">Cash to Collect</p>
                                <p className={`text-3xl font-black mt-1 relative z-10 ${emp.cashCollected > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    ₹{emp.cashCollected.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1.5 bg-white w-fit px-2 py-1 rounded shadow-sm border border-slate-100 relative z-10">
                                    <CalendarDays size={12} className="text-slate-400" /> Last Collected: {emp.lastCollectedAt}
                                </p>
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    <p className="text-xs font-semibold text-slate-600">Location: <span className="text-purple-700 font-bold">{emp.location}</span></p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-purple-600 transition-colors">Click to view log</span>
                            </div>
                        </div>
                        {emp.location === 'Digital Diaries' ? (
                            <button
                                onClick={(e) => openCashoutModal(e, emp.id)}
                                disabled={emp.cashCollected === 0}
                                className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${emp.cashCollected > 0
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    }`}
                            >
                                {emp.cashCollected > 0 ? 'Collect Cash' : 'No Cash Pending'}
                            </button>
                        ) : (
                            <button
                                onClick={(e) => handleCollectCash(e, emp.id)}
                                disabled={emp.cashCollected === 0}
                                className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${emp.cashCollected > 0
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    }`}
                            >
                                {emp.cashCollected > 0 ? 'Collect Cash (Zero Out)' : 'No Cash Pending'}
                            </button>
                        )}
                    </div>
                ))}
                {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No employees found for the selected properties.
                    </div>
                )}
            </div>

            {/* Detailed View Modal */}
            {viewEmployeeId && activeEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3">
                                    {activeEmployee.location} — {activeEmployee.name}
                                </h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Cash collection history & transaction logs</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => downloadEmployeePDF(false)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export All Logs
                                </button>
                                {(cashDateFrom || cashDateTo) && (
                                <button
                                    onClick={() => downloadEmployeePDF(true)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export Range
                                </button>
                                )}
                                <button
                                    onClick={() => { setViewEmployeeId(null); setCashDateFrom(''); setCashDateTo(''); }}
                                    className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body / Table */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="mb-6 flex gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex-1">
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Current Pending Cash</p>
                                    <p className="text-2xl font-black text-emerald-800">₹{activeEmployee.cashCollected.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-1">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Last Owner Collection</p>
                                    <p className="text-lg font-bold text-slate-700">{activeEmployee.lastCollectedAt}</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><FileText size={18} className="text-indigo-500" /> Lifetime Transactions</h3>

                            {/* Date Range Filter */}
                            <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date Range</span>
                                <input type="date" value={cashDateFrom} onChange={e => setCashDateFrom(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                <span className="text-xs text-slate-400">to</span>
                                <input type="date" value={cashDateTo} onChange={e => setCashDateTo(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                {(cashDateFrom || cashDateTo) && (
                                    <button onClick={() => { setCashDateFrom(''); setCashDateTo(''); }} className="text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
                                )}
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden hidden sm:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3">Date & Time</th>
                                            <th className="px-5 py-3">Guest Name</th>
                                            <th className="px-5 py-3">Amount</th>
                                            <th className="px-5 py-3">Status / Notes</th>
                                            <th className="px-5 py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeEmployeeLogs.length > 0 ? (
                                            activeEmployeeLogs.map(log => {
                                                const isOwnerPickup = log.transactionType === 'owner_pickup' || log.note?.toLowerCase().includes('owner');
                                                const isRefund = log.transactionType === 'refund' || log.amount < 0;
                                                const isRedLog = log.transactionType === 'food_collection' || log.note?.toLowerCase().includes('satkar') || log.note?.toLowerCase().includes('food bill') || log.transactionType === 'expense' || log.note?.toLowerCase().includes('expense');
                                                return (
                                                    <tr key={log.id} className={`transition-colors ${
                                                        isOwnerPickup ? 'bg-blue-50 hover:bg-blue-100/70 border-l-4 border-l-blue-500' :
                                                        isRefund ? 'bg-red-50 hover:bg-red-100/70 border-l-4 border-l-red-400' :
                                                        isRedLog ? 'bg-red-50/40 hover:bg-red-50 border-l-4 border-l-red-400' :
                                                        'hover:bg-slate-50/50'
                                                    }`}>
                                                        <td className="px-5 py-3.5 font-medium text-slate-600">
                                                            {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-5 py-3.5 font-bold text-slate-800">{log.guestName || '—'}</td>
                                                        <td className={`px-5 py-3.5 font-black ${log.amount < 0 ? 'text-red-600' : isRedLog ? 'text-red-600' : 'text-emerald-700'}`}>
                                                            {log.amount < 0 ? '-' : ''}₹{Math.abs(log.amount).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                                                            {isOwnerPickup ? (
                                                                <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded border border-blue-300 font-bold">{log.note}</span>
                                                            ) : isRefund ? (
                                                                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded border border-red-200 font-bold">↩ {log.note}</span>
                                                            ) : isRedLog ? (
                                                                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded border border-red-200 font-bold">{log.note}</span>
                                                            ) : (
                                                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200 font-bold">{log.note}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <button onClick={() => handleDeleteCashTx(viewEmployeeId!, log.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete"><Trash2 size={13} /></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">No transactions recorded for this employee.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile card layout */}
                            <div className="sm:hidden space-y-3">
                                {activeEmployeeLogs.length > 0 ? (
                                    activeEmployeeLogs.map(log => {
                                        const isOwnerPickup = log.transactionType === 'owner_pickup' || log.note?.toLowerCase().includes('owner');
                                        const isRefund = log.transactionType === 'refund' || log.amount < 0;
                                        const isRedLog = log.transactionType === 'food_collection' || log.note?.toLowerCase().includes('satkar') || log.note?.toLowerCase().includes('food bill') || log.transactionType === 'expense' || log.note?.toLowerCase().includes('expense');
                                        return (
                                            <div key={log.id} className={`p-4 rounded-xl border ${
                                                isOwnerPickup ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500' :
                                                isRefund ? 'bg-red-50 border-red-200 border-l-4 border-l-red-400' :
                                                isRedLog ? 'bg-red-50/40 border-red-200 border-l-4 border-l-red-400' :
                                                'bg-white border-slate-200'
                                            }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-medium text-slate-500">
                                                        {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className={`text-sm font-black ${log.amount < 0 ? 'text-red-600' : isRedLog ? 'text-red-600' : 'text-emerald-700'}`}>
                                                        {log.amount < 0 ? '-' : ''}₹{Math.abs(log.amount).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800">{log.guestName || '—'}</p>
                                                <div className="mt-2">
                                                    {isOwnerPickup ? (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-300">{log.note}</span>
                                                    ) : isRefund ? (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">↩ {log.note}</span>
                                                    ) : isRedLog ? (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">{log.note}</span>
                                                    ) : (
                                                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">{log.note}</span>
                                                    )}
                                                </div>
                                                <button onClick={() => handleDeleteCashTx(viewEmployeeId!, log.id)} className="mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1"><Trash2 size={10} /> Delete</button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center text-slate-400 font-medium">No transactions recorded.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cashout Modal for DD */}
            {showCashoutModal && cashoutEmployeeId && (() => {
                const emp = employees.find(e => e.id === cashoutEmployeeId);
                if (!emp) return null;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-slate-800">Cash Out</h3>
                                <button onClick={() => setShowCashoutModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Current cash balance: <span className="font-bold text-emerald-700">₹{emp.cashCollected.toLocaleString('en-IN')}</span></p>

                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => setCashoutMode('full')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        cashoutMode === 'full'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <p className="font-bold text-slate-800 text-sm">Full Amount Cashout</p>
                                    <p className="text-xs text-slate-500 mt-1">Collect the entire cash balance (₹{emp.cashCollected.toLocaleString('en-IN')})</p>
                                </button>
                                <button
                                    onClick={() => setCashoutMode('custom')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        cashoutMode === 'custom'
                                            ? 'border-emerald-500 bg-emerald-50'
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
                                        max={emp.cashCollected}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
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
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <IndianRupee size={16} /> Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
