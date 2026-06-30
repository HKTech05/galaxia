"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Calendar, IndianRupee, Users, TrendingUp, Filter, ChevronDown, Hotel } from "lucide-react";
import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";

type ReportType = "gst" | "revenue" | "occupancy" | "bookings";
type BusinessCategory = "all" | "staycation" | "digital-diaries";

const getBookingMethods = (b: any): string[] => {
    const methods: string[] = [];
    if (b._business === "staycation") {
        if (b.advanceAmount > 0 && b.advanceMethod) {
            methods.push(b.advanceMethod.toLowerCase());
        }
        if (b.balanceAmount > 0 && b.balanceMethod) {
            methods.push(b.balanceMethod.toLowerCase());
        }
        if (Array.isArray(b.payments)) {
            b.payments.forEach((p: any) => {
                if (p.method && p.amount > 0 && p.status === "completed") {
                    methods.push(p.method.toLowerCase());
                }
            });
        }
    } else {
        if (b.amountPaid > 0 && b.paymentMethod) {
            methods.push(b.paymentMethod.toLowerCase());
        }
        if (Array.isArray(b.payments)) {
            b.payments.forEach((p: any) => {
                if (p.method && p.amount > 0 && p.status === "completed") {
                    methods.push(p.method.toLowerCase());
                }
            });
        }
    }
    return methods;
};

const hasCash = (methods: string[]) => methods.some(m => m.includes("cash"));
const hasUpi = (methods: string[]) => methods.some(m => m.includes("upi"));

const getReportPropertyName = (b: any, reportType: string): string => {
    const parentName = b.property?.name || "";
    if (reportType !== "revenue" && reportType !== "occupancy") {
        return parentName || (b._business === "digital-diaries" ? "Digital Diaries" : "Other");
    }

    const isAmstel = parentName.toLowerCase().includes("amstel");
    const isAmbrose = parentName.toLowerCase().includes("ambrose");

    if (isAmstel) {
        const subName = (b.subProperty?.name || "").toLowerCase();
        if (subName.includes("family") || (b.assignedUnit || "").toLowerCase().includes("family")) {
            return "Amstel Nest - Family Cottage";
        }
        return "Amstel Nest - Standard Cottage";
    }

    if (isAmbrose) {
        const villaName = b.assignedUnit || b.subProperty?.name || "Unassigned";
        return `Ambrose - ${villaName}`;
    }

    return parentName || (b._business === "digital-diaries" ? "Digital Diaries" : "Other");
};

export default function ReportsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [ddBookings, setDdBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState<ReportType>("gst");
    const [businessCategory, setBusinessCategory] = useState<BusinessCategory>("all");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [selectedProps, setSelectedProps] = useState<string[]>(["all"]);
    const [paymentFilter, setPaymentFilter] = useState("all");

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
                        payments: d.payments || [],
                        paymentMethod: d.paymentMethod,
                        amountPaid: d.amountPaid || 0,
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
        return [...stayWithBiz, ...ddBookings];
    }, [bookings, ddBookings]);

    const filteredBookings = useMemo(() => {
        return combinedBookings.filter(b => {
            if (b.status === "cancelled") return false;
            
            const bookingDateStr = new Date(b.checkInDate).toISOString().split("T")[0];
            if (dateRange.from && bookingDateStr < dateRange.from) return false;
            if (dateRange.to && bookingDateStr > dateRange.to) return false;

            if (!selectedProps.includes("all")) {
                const belongsToSelected = selectedProps.some(sel => {
                    if (sel === "all-staycation") {
                        return b._business === "staycation";
                    } else if (sel === "digital-diaries") {
                        return b._business === "digital-diaries";
                    } else {
                        return b.property?.name === sel;
                    }
                });
                if (!belongsToSelected) return false;
            }

            // Payment method filter logic:
            const methods = getBookingMethods(b);
            const hasC = hasCash(methods);
            const hasU = hasUpi(methods);

            if (paymentFilter === "cash") {
                if (!hasC) return false;
            } else if (paymentFilter === "upi") {
                if (!hasU) return false;
            } else if (paymentFilter === "cash_upi") {
                if (!hasC && !hasU) return false;
            }

            return true;
        });
    }, [combinedBookings, dateRange, selectedProps, paymentFilter]);

    const staycationProperties = useMemo(() => {
        const names = new Set<string>();
        bookings.forEach(b => { if (b.property?.name) names.add(b.property.name); });
        return Array.from(names).sort();
    }, [bookings]);

    // Revenue stats
    const stats = useMemo(() => {
        const total = filteredBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
        const collected = filteredBookings.reduce((s, b) => s + (b.advanceAmount || 0), 0);
        const pending = filteredBookings.reduce((s, b) => s + (b.balanceAmount || 0), 0);
        const gst = filteredBookings.reduce((s, b) => s + (b.gstAmount || 0), 0);
        const avgBooking = filteredBookings.length > 0 ? Math.round(total / filteredBookings.length) : 0;
        const byProperty: Record<string, { count: number; revenue: number }> = {};
        filteredBookings.forEach(b => {
            const pn = getReportPropertyName(b, "revenue");
            if (!byProperty[pn]) byProperty[pn] = { count: 0, revenue: 0 };
            byProperty[pn].count++;
            byProperty[pn].revenue += b.totalAmount || 0;
        });
        const bySource: Record<string, number> = {};
        filteredBookings.forEach(b => {
            let src = b.source || "website";
            if (b._business === "staycation" && src === "walk-in") {
                src = "manual";
            }
            bySource[src] = (bySource[src] || 0) + 1;
        });
        return { total, collected, pending, gst, avgBooking, byProperty, bySource, count: filteredBookings.length };
    }, [filteredBookings]);

    // GST Stats specifically for the GST Report
    const gstStats = useMemo(() => {
        let totalBase = 0;
        let totalGst = 0;
        let totalAmount = 0;
        let totalBasePrice = 0;
        let totalExtraGuest = 0;

        filteredBookings.forEach(b => {
            const gst = b.gstAmount || 0;
            const total = b.totalAmount || 0;
            const base = total - gst;

            totalBase += base;
            totalGst += gst;
            totalAmount += total;
            const bp = b.basePrice || 0;
            const extraGuest = (b.extraPersonCharge || 0) + (b.extraAdultCharge || 0) + (b.extraKidsCharge || 0);
            totalBasePrice += bp;
            totalExtraGuest += extraGuest;
        });

        return {
            totalBase,
            totalGst,
            totalAmount,
            totalBasePrice,
            totalExtraGuest,
            count: filteredBookings.length
        };
    }, [filteredBookings]);

    // Direct PDF download using jsPDF and jspdf-autotable
    const handleDownloadPDF = async () => {
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();

            // Use 'Rs. ' instead of Rupee symbol '₹' to avoid PDF standard font encoding issues
            const pdfFmt = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

            // Set Title
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            const titleStr = reportType === "gst" 
                ? "Galaxia Resorts — GST Report" 
                : `Galaxia Resorts — ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
            doc.text(titleStr, pageWidth / 2, 15, { align: "center" });

            // Subtitle
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            const propText = selectedProps.includes("all")
                ? "All Properties"
                : selectedProps.join(", ");
            doc.text(`Period: ${dateRange.from} to ${dateRange.to}  |  Property: ${propText}  |  Payment: ${paymentFilter}`, pageWidth / 2, 21, { align: "center" });

            doc.setFontSize(8);
            doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, pageWidth / 2, 26, { align: "center" });
            doc.setTextColor(0);

            // Summary Stats box (Increase height to 25mm to support 2x2 grid layout and prevent text collision/overlapping)
            let startY = 32;
            doc.setFillColor(245, 247, 250);
            doc.rect(14, startY, pageWidth - 28, 25, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.text("SUMMARY STATS", 18, startY + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            
            if (reportType === "gst") {
                // Row 1
                doc.text(`Total Bookings: ${gstStats.count}`, 20, startY + 13);
                doc.text(`Total Taxable (Base): ${pdfFmt(gstStats.totalBase)}`, 110, startY + 13);
                // Row 2
                doc.text(`Total GST (18%): ${pdfFmt(gstStats.totalGst)}`, 20, startY + 20);
                doc.text(`Total Gross: ${pdfFmt(gstStats.totalAmount)}`, 110, startY + 20);
            } else {
                // Row 1
                doc.text(`Total Bookings: ${stats.count}`, 20, startY + 13);
                doc.text(`Total Revenue: ${pdfFmt(stats.total)}`, 110, startY + 13);
                // Row 2
                doc.text(`GST Collected: ${pdfFmt(stats.gst)}`, 20, startY + 20);
                doc.text(`Avg/Booking: ${pdfFmt(stats.avgBooking)}`, 110, startY + 20);
            }

            // Build table
            let headers: string[] = [];
            let body: any[] = [];

            if (reportType === "gst") {
                headers = ["Booking ID", "Guest Name", "Property Name", "Base Price", "Extra Guest", "Taxable Amount", "GST Charged", "Gross Amount"];
                body = filteredBookings.map(b => {
                    const taxable = b.totalAmount - b.gstAmount;
                    const bp = b.basePrice || 0;
                    const extra = (b.extraPersonCharge || 0) + (b.extraAdultCharge || 0) + (b.extraKidsCharge || 0);
                    return [
                        b.bookingRef || `ID-${b.id}`,
                        b.customerName,
                        b.property?.name || (b._business === "digital-diaries" ? "Digital Diaries" : "-"),
                        pdfFmt(bp),
                        pdfFmt(extra),
                        pdfFmt(taxable),
                        pdfFmt(b.gstAmount),
                        pdfFmt(b.totalAmount)
                    ];
                });
                // Totals row at the bottom
                body.push([
                    "Totals",
                    "",
                    "",
                    pdfFmt(gstStats.totalBasePrice),
                    pdfFmt(gstStats.totalExtraGuest),
                    pdfFmt(gstStats.totalBase),
                    pdfFmt(gstStats.totalGst),
                    pdfFmt(gstStats.totalAmount)
                ]);
            } else if (reportType === "revenue") {
                headers = ["Property / Screen", "Bookings Count", "Total Revenue", "Avg/Booking"];
                body = Object.entries(stats.byProperty)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([name, data]) => [
                        name,
                        data.count.toString(),
                        pdfFmt(data.revenue),
                        pdfFmt(Math.round(data.revenue / data.count))
                    ]);
            } else if (reportType === "bookings") {
                headers = ["Source", "Bookings Count"];
                body = Object.entries(stats.bySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => [source, count.toString()]);
            } else {
                headers = ["Guest", "Property", "Check-in", "Nights", "Total Amount", "Source", "Status"];
                body = filteredBookings.map(b => [
                    b.customerName,
                    b.property?.name || (b._business === "digital-diaries" ? "Digital Diaries" : "-"),
                    new Date(b.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                    Math.max(1, Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 3600 * 24))).toString(),
                    pdfFmt(b.totalAmount),
                    b.source || "website",
                    b.status
                ]);
            }

            autoTable(doc, {
                startY: startY + 30,
                margin: { left: 14, right: 14 },
                head: [headers],
                body: body,
                theme: "grid",
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
                bodyStyles: { fontSize: 8, cellPadding: 2.5 },
                didParseCell: (data) => {
                    if (reportType === "gst" && data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            });

            doc.save(`${reportType}-report-${dateRange.from}-to-${dateRange.to}.pdf`);
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Failed to generate PDF. Please try again.");
        }
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
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none">
                            <option value="gst">GST Report</option>
                            <option value="revenue">Revenue Report</option>
                            <option value="occupancy">Occupancy Report</option>
                            <option value="bookings">Bookings Report</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
                        <CustomDatePicker
                            date={dateRange.from ? new Date(dateRange.from + 'T00:00:00') : new Date()}
                            onDateChange={(d) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setDateRange(p => ({ ...p, from: `${y}-${m}-${day}` }));
                            }}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
                        <CustomDatePicker
                            date={dateRange.to ? new Date(dateRange.to + 'T00:00:00') : new Date()}
                            onDateChange={(d) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setDateRange(p => ({ ...p, to: `${y}-${m}-${day}` }));
                            }}
                            className="w-full"
                        />
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Property / Category</label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedProps.includes("all")}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedProps(["all"]);
                                        } else {
                                            setSelectedProps([]);
                                        }
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                All
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedProps.includes("all-staycation")}
                                    onChange={(e) => {
                                        let updated = selectedProps.filter(p => p !== "all");
                                        if (e.target.checked) {
                                            updated.push("all-staycation");
                                        } else {
                                            updated = updated.filter(p => p !== "all-staycation");
                                        }
                                        if (updated.length === 0) updated = ["all"];
                                        setSelectedProps(updated);
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                All Staycation
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedProps.includes("digital-diaries")}
                                    onChange={(e) => {
                                        let updated = selectedProps.filter(p => p !== "all");
                                        if (e.target.checked) {
                                            updated.push("digital-diaries");
                                        } else {
                                            updated = updated.filter(p => p !== "digital-diaries");
                                        }
                                        if (updated.length === 0) updated = ["all"];
                                        setSelectedProps(updated);
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                Digital Diaries
                            </label>
                            {staycationProperties.map(p => (
                                <label key={p} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedProps.includes(p)}
                                        onChange={(e) => {
                                            let updated = selectedProps.filter(x => x !== "all");
                                            if (e.target.checked) {
                                                updated.push(p);
                                            } else {
                                                updated = updated.filter(x => x !== p);
                                            }
                                            if (updated.length === 0) updated = ["all"];
                                            setSelectedProps(updated);
                                        }}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    {p}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Method</label>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none">
                            <option value="all">All Payments</option>
                            <option value="cash">Cash Only</option>
                            <option value="upi">UPI Only</option>
                            <option value="cash_upi">Cash + UPI</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div id="report-content">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {reportType === "gst" ? (
                        [
                            { label: "Total Gross Amount", value: fmt(gstStats.totalAmount), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Total GST (18%)", value: fmt(gstStats.totalGst), icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
                            { label: "Total Taxable (Base)", value: fmt(gstStats.totalBase), icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                            { label: "Total Records", value: gstStats.count.toString(), icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
                        ].map(card => (
                            <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <card.icon size={18} className={card.color} />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                                <p className={`text-xl font-black text-slate-800 mt-1`}>{card.value}</p>
                            </div>
                        ))
                    ) : (
                        [
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
                        ))
                    )}
                </div>

                {/* GST Report Details Table */}
                {reportType === "gst" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={16} className="text-purple-600" /> 
                                GST Booking Records
                            </h2>
                            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                                {filteredBookings.length} Bookings
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Booking ID</th>
                                        <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Guest Name</th>
                                        <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Property Name</th>
                                        <th className="text-left py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Check-in</th>
                                        <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Base Price</th>
                                        <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Extra Guest</th>
                                        <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Taxable Amount</th>
                                        <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">GST Charged</th>
                                        <th className="text-right py-3 px-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Gross Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map(b => {
                                        const taxable = b.totalAmount - b.gstAmount;
                                        const bp = b.basePrice || 0;
                                        const extra = (b.extraPersonCharge || 0) + (b.extraAdultCharge || 0) + (b.extraKidsCharge || 0);
                                        return (
                                        <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{b.bookingRef || `ID-${b.id}`}</td>
                                            <td className="py-2.5 px-3 font-medium text-slate-800">{b.customerName}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{b.property?.name || (b._business === "digital-diaries" ? "Digital Diaries" : "-")}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{new Date(b.checkInDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-600">{fmt(bp)}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-orange-600">{fmt(extra)}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-slate-700">{fmt(taxable)}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-purple-600">{fmt(b.gstAmount)}</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{fmt(b.totalAmount)}</td>
                                        </tr>
                                        );
                                    })}
                                    {/* Summary Row */}
                                    <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                                        <td className="py-3 px-3 uppercase text-slate-700" colSpan={4}>Totals</td>
                                        <td className="py-3 px-3 text-right text-slate-600">{fmt(gstStats.totalBasePrice)}</td>
                                        <td className="py-3 px-3 text-right text-orange-600">{fmt(gstStats.totalExtraGuest)}</td>
                                        <td className="py-3 px-3 text-right text-slate-800">{fmt(gstStats.totalBase)}</td>
                                        <td className="py-3 px-3 text-right text-purple-700">{fmt(gstStats.totalGst)}</td>
                                        <td className="py-3 px-3 text-right text-emerald-700">{fmt(gstStats.totalAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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

                {/* Occupancy by Property / Villa */}
                {reportType === "occupancy" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2"><Hotel size={16} className="text-indigo-600" /> Occupancy & Times Booked by Property</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="text-left py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Property / Villa</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Times Booked</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Total Nights Booked</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Total Revenue Generated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const occData: Record<string, { count: number; nights: number; revenue: number }> = {};
                                        filteredBookings.forEach(b => {
                                            const name = getReportPropertyName(b, "occupancy");
                                            if (!occData[name]) occData[name] = { count: 0, nights: 0, revenue: 0 };
                                            occData[name].count++;
                                            const ci = new Date(b.checkInDate), co = new Date(b.checkOutDate);
                                            const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 3600 * 24)));
                                            occData[name].nights += nights;
                                            occData[name].revenue += (b.totalAmount || 0);
                                        });
                                        return Object.entries(occData).sort((a, b) => b[1].count - a[1].count).map(([name, data]) => (
                                            <tr key={name} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="py-3 px-4 font-bold text-slate-800">{name}</td>
                                                <td className="py-3 px-4 text-right font-bold text-indigo-600">{data.count} times</td>
                                                <td className="py-3 px-4 text-right text-slate-700 font-semibold">{data.nights} nights</td>
                                                <td className="py-3 px-4 text-right font-bold text-emerald-600">{fmt(data.revenue)}</td>
                                            </tr>
                                        ));
                                    })()}
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
            </div>
        </div>
    );
}
