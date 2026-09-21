"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Calendar,
    CalendarDays,
    Search,
    Download,
    TrendingUp,
    BarChart3,
    DollarSign,
    Filter,
    RotateCcw,
    Building,
    Film,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Clock,
    Sparkles,
    UserCheck,
    ShieldAlert,
    Phone,
    Mail,
    ChevronRight,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    CartesianGrid,
} from "recharts";
import { api } from "../../../lib/api";

interface UnifiedBooking {
    id: string;
    bookingRef: string;
    type: "staycation" | "digital_diaries";
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    propertyOrScreen: string;
    unitOrPackage: string;
    bookingDate: string;
    bookedAt: string;
    totalAmount: number;
    advanceAmount: number;
    status: string;
    bookedVia: string;
}

interface EmployeeStat {
    name: string;
    count: number;
    revenue: number;
    stayCount: number;
    ddCount: number;
    percentage: number;
    countPercentage: number;
}

interface AttributionResponse {
    success: boolean;
    filter: {
        date: string | null;
        startDate: string | null;
        endDate: string | null;
        period: string;
        type: string;
        source: string;
    };
    stats: {
        totalRevenue: number;
        totalAdvance: number;
        totalBookings: number;
        avgBookingValue: number;
        topEmployee: EmployeeStat | null;
        staycationStats: { count: number; revenue: number };
        digitalDiariesStats: { count: number; revenue: number };
    };
    byEmployee: EmployeeStat[];
    dailyTrends: Array<{ date: string; revenue: number; count: number; [key: string]: any }>;
    bookings: UnifiedBooking[];
}

const EMPLOYEE_COLORS: Record<string, string> = {
    "Sana (Bookings manager)": "#8b5cf6",
    "Pooja (Bookings manager)": "#ec4899",
    "Arzu (Bookings manager)": "#f97316",
    "Sonal (Bookings manager)": "#06b6d4",
    "Whatsapp": "#22c55e",
    "Instagram": "#e1306c",
    "Website (via online browsing)": "#3b82f6",
    "Unspecified": "#94a3b8",
};

const COLOR_PALETTE = [
    "#8b5cf6", "#ec4899", "#f97316", "#06b6d4", "#22c55e",
    "#e1306c", "#3b82f6", "#eab308", "#14b8a6", "#6366f1"
];

export default function BookingEmployeesClient() {
    const router = useRouter();

    // Access control state
    const [adminRole, setAdminRole] = useState<string>("");
    const [authChecking, setAuthChecking] = useState(true);

    // Filters state
    const [period, setPeriod] = useState<string>("this_month");
    const [singleDate, setSingleDate] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [moduleType, setModuleType] = useState<string>("all");
    const [selectedSource, setSelectedSource] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Data state
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<AttributionResponse | null>(null);
    const [error, setError] = useState<string>("");

    // Table sorting & pagination
    const [sortField, setSortField] = useState<keyof UnifiedBooking>("bookedAt");
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);

    // Active chart tab: 'revenue' | 'distribution' | 'trend'
    const [activeChart, setActiveChart] = useState<"revenue" | "distribution" | "trend">("revenue");

    // Check admin access (Owner or Dev only)
    useEffect(() => {
        api.get("/auth/me")
            .then((res) => {
                const role = res?.role || "";
                setAdminRole(role);
                if (role !== "owner" && role !== "developer") {
                    router.push("/admin3");
                }
                setAuthChecking(false);
            })
            .catch(() => {
                setAuthChecking(false);
                router.push("/admin3");
            });
    }, [router]);

    // Fetch attribution data from API
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (singleDate) {
                params.set("date", singleDate);
            } else if (startDate && endDate) {
                params.set("startDate", startDate);
                params.set("endDate", endDate);
            } else if (period) {
                params.set("period", period);
            }

            if (moduleType !== "all") params.set("type", moduleType);
            if (selectedSource !== "all") params.set("source", selectedSource);

            const res = await api.get(`/admin/employee-attribution?${params.toString()}`);
            if (res && res.success) {
                setData(res);
            } else {
                setError(res?.error || "Failed to load attribution data");
            }
        } catch (err: any) {
            setError(err?.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }, [singleDate, startDate, endDate, period, moduleType, selectedSource]);

    useEffect(() => {
        if (!authChecking && (adminRole === "owner" || adminRole === "developer")) {
            fetchData();
        }
    }, [authChecking, adminRole, fetchData]);

    // Quick duration preset click handler
    const handlePresetChange = (newPeriod: string) => {
        setPeriod(newPeriod);
        setSingleDate("");
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
    };

    // Single date change handler
    const handleSingleDateChange = (dateVal: string) => {
        setSingleDate(dateVal);
        setPeriod("");
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
    };

    // Date range change handler
    const handleRangeChange = (startVal: string, endVal: string) => {
        setStartDate(startVal);
        setEndDate(endVal);
        setSingleDate("");
        setPeriod("");
        setCurrentPage(1);
    };

    // Filtered and sorted bookings list for the table
    const processedBookings = useMemo(() => {
        if (!data?.bookings) return [];
        let list = [...data.bookings];

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (b) =>
                    b.bookingRef.toLowerCase().includes(q) ||
                    b.customerName.toLowerCase().includes(q) ||
                    b.customerPhone.toLowerCase().includes(q) ||
                    b.customerEmail.toLowerCase().includes(q) ||
                    b.bookedVia.toLowerCase().includes(q) ||
                    b.propertyOrScreen.toLowerCase().includes(q)
            );
        }

        // Sorting
        list.sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === "totalAmount" || sortField === "advanceAmount") {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return sortAsc ? valA - valB : valB - valA;
            }

            if (sortField === "bookedAt" || sortField === "bookingDate") {
                const dateA = new Date(valA).getTime() || 0;
                const dateB = new Date(valB).getTime() || 0;
                return sortAsc ? dateA - dateB : dateB - dateA;
            }

            valA = (valA || "").toString().toLowerCase();
            valB = (valB || "").toString().toLowerCase();
            return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        return list;
    }, [data?.bookings, searchQuery, sortField, sortAsc]);

    // Paginated slice
    const totalPages = Math.ceil(processedBookings.length / pageSize) || 1;
    const paginatedBookings = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return processedBookings.slice(start, start + pageSize);
    }, [processedBookings, currentPage, pageSize]);

    // Handle column sort toggle
    const handleSort = (field: keyof UnifiedBooking) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        if (!processedBookings || processedBookings.length === 0) return;
        const headers = [
            "Booking Ref",
            "Module",
            "Customer Name",
            "Customer Phone",
            "Customer Email",
            "Property / Screen",
            "Unit / Package",
            "Stay / Event Date",
            "Booked On",
            "Attributed To / Booked Via",
            "Total Amount (INR)",
            "Advance Paid (INR)",
            "Status",
        ];

        const rows = processedBookings.map((b) => [
            b.bookingRef,
            b.type === "staycation" ? "Staycation" : "Digital Diaries",
            `"${b.customerName.replace(/"/g, '""')}"`,
            `"${b.customerPhone}"`,
            `"${b.customerEmail}"`,
            `"${b.propertyOrScreen}"`,
            `"${b.unitOrPackage}"`,
            b.bookingDate,
            b.bookedAt.slice(0, 19).replace("T", " "),
            `"${b.bookedVia.replace(/"/g, '""')}"`,
            b.totalAmount,
            b.advanceAmount,
            b.status,
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `employee-attribution-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Format currency in INR
    const formatINR = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    if (authChecking) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium text-sm">Verifying owner credentials...</p>
                </div>
            </div>
        );
    }

    if (adminRole !== "owner" && adminRole !== "developer") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-slate-200">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        This section contains confidential employee sales and booking attribution data. It is restricted strictly to the Main Owner profile.
                    </p>
                    <button
                        onClick={() => router.push("/admin3")}
                        className="w-full bg-slate-900 text-white font-medium text-sm py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Top Navigation & Title Bar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
                                <UserCheck size={16} />
                                <span>Owner Management Panel</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Employee & Channel Sales Attribution
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Performance tracking and booking source analytics across booking managers and marketing channels
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
                            >
                                <RotateCcw size={15} className={loading ? "animate-spin text-purple-600" : ""} />
                                <span>Refresh</span>
                            </button>
                            <button
                                onClick={handleExportCSV}
                                disabled={!processedBookings.length}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all shadow-sm shadow-purple-200 disabled:opacity-50"
                            >
                                <Download size={15} />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar: Duration Presets + Custom Pickers */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                            {[
                                { id: "today", label: "Today" },
                                { id: "yesterday", label: "Yesterday" },
                                { id: "this_week", label: "Last 7 Days" },
                                { id: "this_month", label: "This Month" },
                                { id: "last_month", label: "Last Month" },
                                { id: "this_year", label: "This Year" },
                                { id: "all", label: "All Time" },
                            ].map((preset) => {
                                const isActive = period === preset.id && !singleDate && !startDate;
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePresetChange(preset.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                            isActive
                                                ? "bg-purple-600 text-white shadow-xs font-semibold"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Pickers */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Single Date Picker */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                                <Calendar size={13} className="text-slate-400" />
                                <span className="text-slate-500 font-medium">Single Date:</span>
                                <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => handleSingleDateChange(e.target.value)}
                                    className="bg-transparent border-0 text-slate-700 text-xs font-medium focus:ring-0 cursor-pointer p-0"
                                />
                            </div>

                            {/* Range Picker */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                                <CalendarDays size={13} className="text-slate-400" />
                                <span className="text-slate-500 font-medium">Range:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => handleRangeChange(e.target.value, endDate)}
                                    className="bg-transparent border-0 text-slate-700 text-xs font-medium focus:ring-0 cursor-pointer p-0"
                                    placeholder="Start"
                                />
                                <span className="text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => handleRangeChange(startDate, e.target.value)}
                                    className="bg-transparent border-0 text-slate-700 text-xs font-medium focus:ring-0 cursor-pointer p-0"
                                    placeholder="End"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Secondary Filters: Type & Attribution Channel */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        {/* Module Type Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => { setModuleType("all"); setCurrentPage(1); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                    moduleType === "all" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                All Bookings
                            </button>
                            <button
                                onClick={() => { setModuleType("staycation"); setCurrentPage(1); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                    moduleType === "staycation" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <Building size={12} className="text-emerald-600" />
                                Staycation
                            </button>
                            <button
                                onClick={() => { setModuleType("digital_diaries"); setCurrentPage(1); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                    moduleType === "digital_diaries" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <Film size={12} className="text-rose-600" />
                                Digital Diaries
                            </button>
                        </div>

                        {/* Employee / Source Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedSource}
                                onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                                className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs"
                            >
                                <option value="all">All Sources / Managers</option>
                                <optgroup label="Staycation Managers">
                                    <option value="Sana (Bookings manager)">Sana (Bookings manager)</option>
                                    <option value="Pooja (Bookings manager)">Pooja (Bookings manager)</option>
                                </optgroup>
                                <optgroup label="Digital Diaries Managers">
                                    <option value="Arzu (Bookings manager)">Arzu (Bookings manager)</option>
                                    <option value="Sonal (Bookings manager)">Sonal (Bookings manager)</option>
                                </optgroup>
                                <optgroup label="Direct / Social Marketing">
                                    <option value="Whatsapp">Whatsapp</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Website (via online browsing)">Website (via online browsing)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-700 text-sm">
                        <span>{error}</span>
                        <button onClick={fetchData} className="text-xs font-semibold underline">Retry</button>
                    </div>
                )}

                {/* KPI Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* Total Revenue */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Attributed Sales</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {formatINR(data?.stats.totalRevenue || 0)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <span className="text-emerald-600 font-semibold">{formatINR(data?.stats.totalAdvance || 0)}</span> advance collected
                            </p>
                        </div>
                    </div>

                    {/* Total Bookings */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bookings</span>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {data?.stats.totalBookings || 0}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {data?.stats.staycationStats.count || 0} Staycation · {data?.stats.digitalDiariesStats.count || 0} Digital Diaries
                            </p>
                        </div>
                    </div>

                    {/* Average Booking Value */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Booking Value</span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {formatINR(data?.stats.avgBookingValue || 0)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Across all attributed bookings</p>
                        </div>
                    </div>

                    {/* Top Performer */}
                    <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-2xl p-5 shadow-sm shadow-purple-900/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Top Attribution Channel</span>
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                                <Sparkles size={20} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-lg font-bold text-white truncate">
                                {data?.stats.topEmployee ? data.stats.topEmployee.name : "No Data"}
                            </h3>
                            <p className="text-xs text-purple-200 mt-1">
                                {data?.stats.topEmployee ? (
                                    <>
                                        <span className="font-semibold text-white">{formatINR(data.stats.topEmployee.revenue)}</span> ({data.stats.topEmployee.count} bookings)
                                    </>
                                ) : (
                                    "No bookings in range"
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Visual Comparisons & Charts Section */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <BarChart3 size={18} className="text-purple-600" />
                                <span>Visual Sales & Volume Breakdown</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Real-time dynamic comparison linked to your selected date pickers
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveChart("revenue")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeChart === "revenue"
                                        ? "bg-white text-purple-700 shadow-xs font-semibold"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Revenue by Employee
                            </button>
                            <button
                                onClick={() => setActiveChart("distribution")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeChart === "distribution"
                                        ? "bg-white text-purple-700 shadow-xs font-semibold"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Volume Share %
                            </button>
                            <button
                                onClick={() => setActiveChart("trend")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeChart === "trend"
                                        ? "bg-white text-purple-700 shadow-xs font-semibold"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Timeline Trend
                            </button>
                        </div>
                    </div>

                    <div className="pt-6">
                        {loading ? (
                            <div className="h-72 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : !data?.byEmployee.length ? (
                            <div className="h-72 flex flex-col items-center justify-center text-slate-400">
                                <Users size={40} className="stroke-1 mb-2" />
                                <p className="text-sm">No attribution data found for the selected timeframe</p>
                            </div>
                        ) : (
                            <>
                                {/* Chart 1: Revenue by Employee / Channel */}
                                {activeChart === "revenue" && (
                                    <div className="w-full h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={data.byEmployee}
                                                margin={{ top: 10, right: 20, left: 20, bottom: 40 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fontSize: 11, fill: "#64748B" }}
                                                    interval={0}
                                                    angle={-20}
                                                    textAnchor="end"
                                                    height={60}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: "#64748B" }}
                                                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                                />
                                                <RechartsTooltip
                                                    formatter={(val: any) => [formatINR(val), "Revenue"]}
                                                    contentStyle={{
                                                        backgroundColor: "#FFFFFF",
                                                        border: "1px solid #E2E8F0",
                                                        borderRadius: "0.75rem",
                                                        fontSize: "12px",
                                                    }}
                                                />
                                                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                                                    {data.byEmployee.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={EMPLOYEE_COLORS[entry.name] || COLOR_PALETTE[index % COLOR_PALETTE.length]}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Chart 2: Booking Share Donut */}
                                {activeChart === "distribution" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                                        <div className="w-full h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={data.byEmployee}
                                                        dataKey="count"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={105}
                                                        paddingAngle={3}
                                                    >
                                                        {data.byEmployee.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-pie-${index}`}
                                                                fill={EMPLOYEE_COLORS[entry.name] || COLOR_PALETTE[index % COLOR_PALETTE.length]}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        formatter={(val: any, name: any, item: any) => [
                                                            `${val} bookings (${item.payload.countPercentage}%) · ${formatINR(item.payload.revenue)}`,
                                                            name,
                                                        ]}
                                                        contentStyle={{
                                                            backgroundColor: "#FFFFFF",
                                                            border: "1px solid #E2E8F0",
                                                            borderRadius: "0.75rem",
                                                            fontSize: "12px",
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                Attribution Share Breakdown
                                            </h4>
                                            {data.byEmployee.map((emp, i) => (
                                                <div
                                                    key={emp.name}
                                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-xs"
                                                >
                                                    <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                                                        <div
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    EMPLOYEE_COLORS[emp.name] || COLOR_PALETTE[i % COLOR_PALETTE.length],
                                                            }}
                                                        />
                                                        <span className="font-semibold text-slate-800 truncate">{emp.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-slate-900">{emp.count} bookings</span>
                                                        <span className="text-slate-400 ml-1.5 font-medium">({emp.countPercentage}%)</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Chart 3: Timeline Trend */}
                                {activeChart === "trend" && (
                                    <div className="w-full h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={data.dailyTrends}
                                                margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                                            >
                                                <defs>
                                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 11, fill: "#64748B" }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: "#64748B" }}
                                                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                                />
                                                <RechartsTooltip
                                                    formatter={(val: any) => [formatINR(val), "Revenue"]}
                                                    contentStyle={{
                                                        backgroundColor: "#FFFFFF",
                                                        border: "1px solid #E2E8F0",
                                                        borderRadius: "0.75rem",
                                                        fontSize: "12px",
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2.5}
                                                    fillOpacity={1}
                                                    fill="url(#trendGradient)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Employee Breakdown Cards Grid */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                        <Users size={16} className="text-purple-600" />
                        <span>Managers & Channels Summary</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data?.byEmployee.map((emp, i) => {
                            const empColor = EMPLOYEE_COLORS[emp.name] || COLOR_PALETTE[i % COLOR_PALETTE.length];
                            return (
                                <div
                                    key={emp.name}
                                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-200 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: empColor }}
                                            />
                                            <h4 className="font-bold text-slate-900 text-sm">{emp.name}</h4>
                                        </div>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                                            {emp.percentage}% of sales
                                        </span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                        <div>
                                            <span className="text-[11px] text-slate-400 font-medium">Revenue</span>
                                            <p className="text-base font-bold text-slate-900">{formatINR(emp.revenue)}</p>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-slate-400 font-medium">Bookings</span>
                                            <p className="text-base font-bold text-slate-900">
                                                {emp.count} <span className="text-xs font-normal text-slate-400">({emp.stayCount} stay, {emp.ddCount} dd)</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detailed Interactive Bookings Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Table Header & Search */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Attributed Bookings Log</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Showing {processedBookings.length} bookings matching the current filters
                            </p>
                        </div>
                        <div className="relative max-w-xs w-full">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Search ref, guest, phone..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Ref & Module</th>
                                    <th
                                        className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                                        onClick={() => handleSort("bookedAt")}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Date</span>
                                            <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                                        onClick={() => handleSort("customerName")}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Customer Details</span>
                                            <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th className="py-3 px-4">Property / Screen</th>
                                    <th
                                        className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                                        onClick={() => handleSort("bookedVia")}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Attributed Source</span>
                                            <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 select-none"
                                        onClick={() => handleSort("totalAmount")}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>Amount (INR)</span>
                                            <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <span>Loading attributed bookings...</span>
                                        </td>
                                    </tr>
                                ) : paginatedBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                            No bookings found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedBookings.map((b) => {
                                        const empColor = EMPLOYEE_COLORS[b.bookedVia] || "#8b5cf6";
                                        const isStay = b.type === "staycation";

                                        return (
                                            <tr key={b.id} className="hover:bg-purple-50/40 transition-colors">
                                                {/* Booking Ref & Module */}
                                                <td className="py-3.5 px-4">
                                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                                        {b.bookingRef}
                                                    </span>
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                                                isStay
                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                                            }`}
                                                        >
                                                            {isStay ? <Building size={10} /> : <Film size={10} />}
                                                            {isStay ? "Staycation" : "Digital Diaries"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Date Info */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-slate-900">
                                                        {new Date(b.bookedAt).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        Stay: {b.bookingDate || "N/A"}
                                                    </div>
                                                </td>

                                                {/* Customer */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900">{b.customerName}</div>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                        {b.customerPhone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone size={10} />
                                                                {b.customerPhone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Property / Screen */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-slate-900">{b.propertyOrScreen}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">{b.unitOrPackage}</div>
                                                </td>

                                                {/* Attributed Source / Manager */}
                                                <td className="py-3.5 px-4">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                                                        <div
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: empColor }}
                                                        />
                                                        <span>{b.bookedVia}</span>
                                                    </div>
                                                </td>

                                                {/* Amount */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {formatINR(b.totalAmount)}
                                                    </div>
                                                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                                        Adv: {formatINR(b.advanceAmount)}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <span
                                                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            b.status === "confirmed"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : b.status === "checked_in"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {b.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <div>
                                Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                                <span className="font-bold text-slate-900">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
