"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Calendar, IndianRupee, Users, TrendingUp, Filter, ChevronDown } from "lucide-react";
import { api } from "../../../lib/api";

type ReportType = "revenue" | "occupancy" | "bookings";
type BusinessCategory = "all" | "staycation" | "digital-diaries";

export default function ReportsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [ddBookings, setDdBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState<ReportType>("revenue");
    const [businessCategory, setBusinessCategory] = useState<BusinessCategory>("all");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [propertyFilter, setPropertyFilter] = useState("all");

    useEffect(() => {
        (async () => {
            try {
                const [stayData, ddData] = await Promise.all([
                    api.get("/bookings/staycation").catch(() => []),
                    api.get("/bookings/dd").catch(() => []),
                ]);
                if (Array.isArray(stayData)) setBookings(stayData);
                if (Array.isArray(ddData)) {
                    // Normalize DD bookings to match staycation shape
                    const normalized = ddData.map((d: any) => ({
                        id: `dd-${d.id}`,
                        customerName: d.customerName,
                        checkInDate: d.bookingDate,
                        checkOutDate: d.bookingDate,
                        totalAmount: d.totalAmount || 0,
                        advanceAmount: d.amountPaid || 0,
                        balanceAmount: d.amountToCollect || 0,
                        gstAmount: d.gstAmount || 0,
                        status: d.status || "confirmed",
                        source: d.source || "website",
                        property: { name: d.screen?.name || "Digital Diaries" },
                        _business: "digital-diaries",
                    }));
                    setDdBookings(normalized);
                }
            } catch {} finally { setLoading(false); }
        })();
        // Default: current month
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        setDateRange({ from, to });
    }, []);

    // Combine bookings based on category
    const combinedBookings = useMemo(() => {
        const stayWithBiz = bookings.map(b => ({ ...b, _business: "staycation" }));
        if (businessCategory === "staycation") return stayWithBiz;
        if (businessCategory === "digital-diaries") return ddBookings;
        return [...stayWithBiz, ...ddBookings];
    }, [bookings, ddBookings, businessCategory]);

    const filteredBookings = useMemo(() => {
        return combinedBookings.filter(b => {
            if (b.status === "cancelled") return false;
            if (dateRange.from && new Date(b.checkInDate) < new Date(dateRange.from)) return false;
            if (dateRange.to && new Date(b.checkInDate) > new Date(dateRange.to)) return false;
            if (propertyFilter !== "all" && b.property?.name !== propertyFilter) return false;
            return true;
        });
    }, [combinedBookings, dateRange, propertyFilter]);

    const properties = useMemo(() => {
        const names = new Set<string>();
        combinedBookings.forEach(b => { if (b.property?.name) names.add(b.property.name); });
        return Array.from(names).sort();
    }, [combinedBookings]);

    // Revenue stats
    const stats = useMemo(() => {
        const total = filteredBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
        const collected = filteredBookings.reduce((s, b) => s + (b.advanceAmount || 0), 0);
        const pending = filteredBookings.reduce((s, b) => s + (b.balanceAmount || 0), 0);
        const gst = filteredBookings.reduce((s, b) => s + (b.gstAmount || 0), 0);
        const avgBooking = filteredBookings.length > 0 ? Math.round(total / filteredBookings.length) : 0;
        const byProperty: Record<string, { count: number; revenue: number }> = {};
        filteredBookings.forEach(b => {
            const pn = b.property?.name || "Unknown";
            if (!byProperty[pn]) byProperty[pn] = { count: 0, revenue: 0 };
            byProperty[pn].count++;
            byProperty[pn].revenue += b.totalAmount || 0;
        });
        const bySource: Record<string, number> = {};
        filteredBookings.forEach(b => {
            const src = b.source || "website";
            bySource[src] = (bySource[src] || 0) + 1;
        });
        return { total, collected, pending, gst, avgBooking, byProperty, bySource, count: filteredBookings.length };
    }, [filteredBookings]);

    // Generate PDF via browser print
    const handleDownloadPDF = () => {
        const printContent = document.getElementById("report-content");
        if (!printContent) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Galaxia Report - ${reportType}</title>
            <style>
                body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
                h1 { font-size: 24px; margin-bottom: 8px; }
                h2 { font-size: 18px; color: #555; margin: 24px 0 12px; }
                .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
                th { background: #f8f9fa; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
                td { padding: 10px 12px; border-bottom: 1px solid #eee; }
                .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                .stat-card { padding: 16px; border: 1px solid #e5e5e5; border-radius: 8px; }
                .stat-value { font-size: 22px; font-weight: 800; }
                .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; }
                @media print { body { padding: 20px; } }
            </style></head><body>
            <h1>Galaxia ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h1>
            <p class="subtitle">${dateRange.from} to ${dateRange.to} · ${propertyFilter === "all" ? "All Properties" : propertyFilter}</p>
            ${printContent.innerHTML}
            <div class="footer">Generated on ${new Date().toLocaleString("en-IN")} · Galaxia Resorts</div>
            </body></html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

    if (loading) return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Generate and download detailed reports.</p>
                </div>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
                    <Download size={16} /> Download PDF
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-600 uppercase tracking-wider"><Filter size={14} className="text-indigo-600" /> Filters</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Business</label>
                        <select value={businessCategory} onChange={e => setBusinessCategory(e.target.value as BusinessCategory)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none">
                            <option value="all">All</option>
                            <option value="staycation">Staycation</option>
                            <option value="digital-diaries">Digital Diaries</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none">
                            <option value="revenue">Revenue Report</option>
                            <option value="occupancy">Occupancy Report</option>
                            <option value="bookings">Bookings Report</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
                        <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
                        <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Property / Screen</label>
                        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none">
                            <option value="all">All</option>
                            {properties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div id="report-content">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Total Revenue", value: fmt(stats.total), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Bookings", value: stats.count.toString(), icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Avg. Booking", value: fmt(stats.avgBooking), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                        { label: "GST Collected", value: fmt(stats.gst), icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
                    ].map(card => (
                        <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <card.icon size={18} className={card.color} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                            <p className={`text-xl font-black text-slate-800 mt-1`}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Revenue by Property */}
                {reportType === "revenue" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2"><IndianRupee size={16} className="text-emerald-600" /> Revenue by Property</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="text-left py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Property</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Bookings</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Revenue</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Avg/Booking</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats.byProperty).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data]) => (
                                        <tr key={name} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-bold text-slate-800">{name}</td>
                                            <td className="py-3 px-4 text-right text-slate-600">{data.count}</td>
                                            <td className="py-3 px-4 text-right font-bold text-emerald-600">{fmt(data.revenue)}</td>
                                            <td className="py-3 px-4 text-right text-slate-600">{fmt(Math.round(data.revenue / data.count))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Booking Source Breakdown */}
                {reportType === "bookings" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2"><Users size={16} className="text-indigo-600" /> Bookings by Source</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                                <div key={source} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                                    <p className="text-2xl font-black text-slate-800">{count}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{source}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Collection Summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Collection Summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Collected (Advance)</p>
                            <p className="text-xl font-black text-emerald-700 mt-1">{fmt(stats.collected)}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending (Balance)</p>
                            <p className="text-xl font-black text-amber-700 mt-1">{fmt(stats.pending)}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">GST Component</p>
                            <p className="text-xl font-black text-purple-700 mt-1">{fmt(stats.gst)}</p>
                        </div>
                    </div>
                </div>

                {/* Booking Details Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">All Bookings ({filteredBookings.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Guest</th>
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Property</th>
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Check-in</th>
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Nights</th>
                                    <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Total</th>
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Source</th>
                                    <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.slice(0, 100).map(b => {
                                    const ci = new Date(b.checkInDate), co = new Date(b.checkOutDate);
                                    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 3600 * 24)));
                                    return (
                                        <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[150px] truncate">{b.customerName}</td>
                                            <td className="py-2.5 px-3 text-slate-600 max-w-[120px] truncate">{b.property?.name || "-"}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{ci.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{nights}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{fmt(b.totalAmount || 0)}</td>
                                            <td className="py-2.5 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${b.source === "admin-bulk" ? "bg-purple-50 text-purple-700" : b.source === "walk-in" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>{b.source || "website"}</span></td>
                                            <td className="py-2.5 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${b.status === "checked_in" ? "bg-indigo-50 text-indigo-700" : b.status === "checked_out" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{b.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
