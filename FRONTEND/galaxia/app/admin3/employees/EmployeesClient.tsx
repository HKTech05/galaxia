"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CalendarDays, IndianRupee, FileText, Download, CheckCircle, Pencil, X, Filter, Building, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
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
    date: string;
    amount: number;
    guestName: string;
    note: string;
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
                lastCollectedAt: emp.lastCollectedAt || "",
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

    const handleCollectCash = async (e: React.MouseEvent, employeeId: number) => {
        e.stopPropagation();
        try {
            await api.post(`/employees/${employeeId}/collect`);
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

    // 4. Dedicated PDF Download
    const downloadEmployeePDF = () => {
        if (!viewEmployeeId) return;

        const emp = employees.find(e => e.id === viewEmployeeId);
        if (!emp) return;

        const empLogs = cashLogs.filter(log => log.employeeId === viewEmployeeId);
        const doc = new jsPDF() as any;

        doc.setFontSize(18);
        doc.text(`Transaction History: ${emp.name}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Property: ${emp.location}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

        const tableColumn = ["Date & Time", "Guest", "Amount", "Status"];
        const tableRows = empLogs.map(log => [
            log.date,
            log.guestName,
            `Rs. ${log.amount.toLocaleString('en-IN')}`,
            log.note
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237] }, // Purple-600
        });

        doc.save(`${emp.name.replace(/\s+/g, '_')}_transactions.pdf`);
    };

    // Filter employees based on selected properties
    const filteredEmployees = employees.filter(emp => selectedProperties.includes(emp.location));
    const activeEmployee = employees.find(e => e.id === viewEmployeeId);
    const activeEmployeeLogs = cashLogs.filter(log => log.employeeId === viewEmployeeId);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employee Management</h1>
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
                                            <p className="text-lg font-bold text-slate-800">{emp.name}</p>
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
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">Cash Collected (Pending)</p>
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
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    {activeEmployee.name} <span className="text-sm font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">{activeEmployee.location}</span>
                                </h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Detailed Transaction & Collection Logs</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={downloadEmployeePDF}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Export Logs
                                </button>
                                <button
                                    onClick={() => setViewEmployeeId(null)}
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
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3">Date & Time</th>
                                            <th className="px-5 py-3">Guest Name</th>
                                            <th className="px-5 py-3">Amount</th>
                                            <th className="px-5 py-3">Status / Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeEmployeeLogs.length > 0 ? (
                                            activeEmployeeLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3.5 font-medium text-slate-600">{log.date}</td>
                                                    <td className="px-5 py-3.5 font-bold text-slate-800">{log.guestName}</td>
                                                    <td className="px-5 py-3.5 font-black text-emerald-700">₹{log.amount.toLocaleString('en-IN')}</td>
                                                    <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                                                        {log.note.includes('Owner') ? (
                                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-bold">{log.note}</span>
                                                        ) : (
                                                            <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200 font-bold">{log.note}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-medium">No transactions recorded for this employee.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
