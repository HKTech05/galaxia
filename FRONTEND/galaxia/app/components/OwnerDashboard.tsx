"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LayoutDashboard, Building, Film, Globe, CalendarDays,
    CheckCircle, XCircle, Clock, IndianRupee, Users, ChevronRight,
    X, Upload, Trash2, Ban, User as UserIcon, Phone, Image as ImageIcon
} from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    LineChart, Line, AreaChart, Area
} from "recharts";
import CustomDatePicker from "./CustomDatePicker";
import { api } from "../../lib/api";

// ─── CUSTOM SELECT COMPONENT (Fixes Windows native font rendering bug) ───
const CustomSelect = ({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { label: string, options?: string[] }[] | string[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-fit">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600/20 w-fit flex items-center justify-between gap-3 min-w-[200px]"
            >
                <span className="truncate">{value || "Select..."}</span>
                <ChevronRight size={16} className={`text-slate-500 transition-transform ${isOpen ? "rotate-270" : "rotate-90"}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-2 flex flex-col">
                        {options.map((opt, i) => {
                            if (typeof opt === 'string') {
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`text-left px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors ${value === opt ? 'text-purple-700 bg-purple-50/50' : 'text-slate-700'}`}
                                    >
                                        {opt}
                                    </button>
                                );
                            } else {
                                return (
                                    <div key={opt.label} className="flex flex-col">
                                        <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 mt-1">{opt.label}</div>
                                        {opt.options?.map(subOpt => (
                                            <button
                                                key={subOpt}
                                                onClick={() => { onChange(subOpt); setIsOpen(false); }}
                                                className={`text-left px-4 py-2.5 text-sm font-semibold pl-6 hover:bg-slate-50 transition-colors ${value === subOpt ? 'text-purple-700 bg-purple-50/50' : 'text-slate-700'}`}
                                            >
                                                {subOpt}
                                            </button>
                                        ))}
                                    </div>
                                );
                            }
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── MOCK DATA ───────────────────────────────────────────────────────────

// Ambrose Pie Chart Data (villa performance)
const ambroseData: any[] = [];

// Amstel Nest Bar Data
const amstelSalesData: any[] = [];

const amstelNightsData: any[] = [];

// DD Screen Revenue
const ddScreenData: any[] = [];

// DD Package Data
const ddPackageData: any[] = [];

// Standalone Villas Data (Hill View, Mount View, La Paraiso, Euphoria)
const standaloneVillaData: any[] = [];

// Overall Earnings Data — yearly (monthly), with weekly detail for 1-month
const earningsYearly: any[] = [];
const earnings1Month: any[] = [];

// DD Booking Source — Website vs Walk-in only
const ddBookingSourceData: any[] = [];

// Occupancy Trend — yearly (monthly), with weekly detail for 1-month
const occupancyYearly: any[] = [];
const occupancy1Month: any[] = [];

// Property-wise Revenue Comparison
const propertyRevenueComparison: any[] = [];

// Properties Check-in Status
const propertyStatusData: any[] = [
    { name: "Hill View", checkedIn: true, guest: "Anjali Mehta", guests: 3, phone: "+91 98765 43210", balanceCollected: true, balanceMode: "Cash", balanceTime: "01 Mar 2026, 1:15 PM", depositCollected: true, depositMode: "UPI", depositTime: "01 Mar 2026, 1:20 PM", checkInTime: "01 Mar 2026, 1:00 PM", checkOutDate: "03 Mar 2026", extraGuests: [{ name: "Rohan Mehta", idType: "Passport", amount: "1500", paymentMode: "Cash" }] },
    { name: "Mount View", checkedIn: true, guest: "Alia Bhatt", guests: 2, phone: "+91 87654 32109", balanceCollected: false, balanceMode: null, balanceTime: null, depositCollected: false, depositMode: null, depositTime: null, checkInTime: "01 Mar 2026, 2:00 PM", checkOutDate: "05 Mar 2026" },
    { name: "La Paraiso", checkedIn: true, guest: "Deepika R", guests: 4, phone: "+91 99887 76655", balanceCollected: true, balanceMode: "UPI", balanceTime: "01 Mar 2026, 2:10 PM", depositCollected: true, depositMode: "Cash", depositTime: "01 Mar 2026, 2:15 PM", checkInTime: "01 Mar 2026, 2:00 PM", checkOutDate: "03 Mar 2026", extraGuests: [{ name: "Ranveer S", idType: "Aadhar", amount: "1500", paymentMode: "UPI" }, { name: "Kabir", idType: "Aadhar", amount: "1500", paymentMode: "UPI" }] },
    { name: "Euphoria", checkedIn: false, guest: null, guests: 0, phone: null, balanceCollected: false, balanceMode: null, balanceTime: null, depositCollected: false, depositMode: null, depositTime: null, checkInTime: null, checkOutDate: null },
];

// Ambrose Villas Status
const ambroseVillaStatus = [
    { name: "TAKE-1", checkedIn: true, guest: "Ranveer Singh", guests: 8, phone: "+91 91234 56780", balanceCollected: true, balanceMode: "UPI", balanceTime: "01 Mar 2026, 2:30 PM", depositCollected: true, depositMode: "Cash", depositTime: "01 Mar 2026, 2:35 PM", checkInTime: "01 Mar 2026, 2:00 PM", checkOutDate: "04 Mar 2026", extraGuests: [{ name: "Deepika", idType: "Passport", amount: "2000", paymentMode: "UPI" }] },
    { name: "ALTA", checkedIn: false, guest: null, guests: 0, phone: null, balanceCollected: false, balanceMode: null, balanceTime: null, depositCollected: false, depositMode: null, depositTime: null, checkInTime: null, checkOutDate: null },
    { name: "SANTORINI", checkedIn: true, guest: "Varun Dhawan", guests: 4, phone: "+91 88776 65544", balanceCollected: true, balanceMode: "Cash", balanceTime: "01 Mar 2026, 1:45 PM", depositCollected: false, depositMode: null, depositTime: null, checkInTime: "01 Mar 2026, 1:30 PM", checkOutDate: "02 Mar 2026" },
    { name: "BAMBOOSA", checkedIn: false, guest: null, guests: 0, phone: null, balanceCollected: false, balanceMode: null, balanceTime: null, depositCollected: false, depositMode: null, depositTime: null, checkInTime: null, checkOutDate: null },
    { name: "CYPRESS", checkedIn: false, guest: null, guests: 0, phone: null, balanceCollected: false, balanceMode: null, balanceTime: null, depositCollected: false, depositMode: null, depositTime: null, checkInTime: null, checkOutDate: null },
];

// Amstel Nest Villas Status
const amstelVillaStatus: any[] = [];

// DD Bookings (Read-only)
const ddBookings = [
    { id: "#DD-1024", customer: "Rahul Sharma", phone: "+91 98765 43210", screen: "Cine Love", date: "28 Feb, 2026", slot: "7:00 PM - 10:00 PM", source: "Online", upfrontAmt: "₹1,750", upfrontMode: "Online", remainingAmt: "₹1,750", remainingStatus: "Pending", status: "Confirmed" },
    { id: "#DD-1025", customer: "Priya Patel", phone: "+91 87654 32109", screen: "Sandy Screen", date: "28 Feb, 2026", slot: "4:00 PM - 7:00 PM", source: "Walk-in", upfrontAmt: "₹4,200", upfrontMode: "Cash", remainingAmt: "₹0", remainingStatus: "Paid", status: "Confirmed" },
    { id: "#DD-1026", customer: "Amit Singh", phone: "+91 91234 56780", screen: "Park N Watch", date: "01 Mar, 2026", slot: "11:00 AM - 1:00 PM", source: "Online", upfrontAmt: "₹1,400", upfrontMode: "Online", remainingAmt: "₹1,400", remainingStatus: "Pending", status: "Confirmed" },
    { id: "#DD-1027", customer: "Neha Gupta", phone: "+91 99887 76655", screen: "Cine Love", date: "27 Feb, 2026", slot: "11:00 AM - 2:00 PM", source: "Walk-in", upfrontAmt: "₹3,500", upfrontMode: "UPI", remainingAmt: "₹0", remainingStatus: "Paid", status: "Cancelled" },
    { id: "#DD-1028", customer: "Karan Johar", phone: "+91 99999 88888", screen: "Baywatch", date: "02 Mar, 2026", slot: "2:00 PM - 5:00 PM", source: "Online", upfrontAmt: "₹2,500", upfrontMode: "Online", remainingAmt: "₹2,500", remainingStatus: "Pending", status: "Confirmed" },
    { id: "#DD-1029", customer: "Sara Ali Khan", phone: "+91 77766 55544", screen: "Sandy Screen", date: "03 Mar, 2026", slot: "6:00 PM - 9:00 PM", source: "Online", upfrontAmt: "₹1,950", upfrontMode: "Online", remainingAmt: "₹1,475", remainingStatus: "Pending", status: "Confirmed" },
];

// Website Photo Sections
const websiteSections = [
    { section: "Hero / Landing Page", photos: ["hero_1.jpg", "hero_2.jpg", "hero_3.jpg"] },
    { section: "Hill View", photos: ["hv_1.jpg", "hv_2.jpg"] },
    { section: "Mount View", photos: ["mv_1.jpg", "mv_2.jpg", "mv_3.jpg"] },
    { section: "Euphoria", photos: ["eu_1.jpg", "eu_2.jpg"] },
    { section: "La Paraiso", photos: ["lp_1.jpg", "lp_2.jpg", "lp_3.jpg"] },
    { section: "Amstel Nest", photos: ["an_1.jpg", "an_2.jpg"] },
    { section: "Ambrose", photos: ["am_1.jpg", "am_2.jpg", "am_3.jpg", "am_4.jpg"] },
    { section: "About Us", photos: ["about_1.jpg", "about_2.jpg"] },
];

// ─── TABS ────────────────────────────────────────────────────────────────

const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "properties", label: "Properties", icon: Building },
    { key: "dd", label: "Digital Diaries", icon: Film },
    { key: "website", label: "Website", icon: Globe },
];

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────

const AmbroseTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg">
                <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Sales: ₹{d.sales.toLocaleString('en-IN')}</p>
                <p className="text-xs text-indigo-600 font-semibold">Nights: {d.nights}</p>
            </div>
        );
    }
    return null;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────

export default function OwnerDashboard({ initialTab = "dashboard" }: { initialTab?: string }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [timeRange, setTimeRange] = useState("1m");
    const [dashboardSubTab, setDashboardSubTab] = useState<"insights" | "reports" | "calendar">("insights");

    // API-loaded dashboard data
    const [dashboardKPIs, setDashboardKPIs] = useState<any>(null);
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [propertyStatusLive, setPropertyStatusLive] = useState<any[]>([]);
    const [ddBookingsLive, setDdBookingsLive] = useState<any[]>([]);

    // Fetch dashboard data from API
    useEffect(() => {
        api.get("/admin/dashboard").then(data => {
            setDashboardKPIs(data);
        }).catch(err => console.error("Dashboard KPIs:", err));

        api.get("/admin/dashboard/earnings").then(data => {
            if (Array.isArray(data) && data.length > 0) setEarningsData(data);
        }).catch(err => console.error("Earnings:", err));

        api.get("/admin/dashboard/property-status").then(data => {
            if (data?.properties && data.properties.length > 0) setPropertyStatusLive(data.properties);
        }).catch(err => console.error("Property status:", err));

        api.get("/bookings/dd").then(data => {
            if (Array.isArray(data) && data.length > 0) setDdBookingsLive(data);
        }).catch(err => console.error("DD bookings:", err));
    }, []);

    // Properties tab
    const [propertyDate, setPropertyDate] = useState(new Date());
    const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
    const [villaModal, setVillaModal] = useState<{ type: "ambrose" | "amstel"; open: boolean }>({ type: "ambrose", open: false });
    const [expandedVilla, setExpandedVilla] = useState<string | null>(null);

    // DD tab
    const [ddSelectedBooking, setDdSelectedBooking] = useState<typeof ddBookings[0] | null>(null);
    const [ddViewDate, setDdViewDate] = useState(new Date());

    // Website tab
    const [blackoutProperty, setBlackoutProperty] = useState("Hill View");
    const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
    const [blackoutReason, setBlackoutReason] = useState("");
    const [blackoutViewMonth, setBlackoutViewMonth] = useState(new Date());
    const [activeBlocks, setActiveBlocks] = useState<any[]>([]);

    // Live calendar view
    const [calendarProperty, setCalendarProperty] = useState("Hill View");
    const [calendarViewMonth, setCalendarViewMonth] = useState(new Date());


    const timeRanges = [
        { key: "1m", label: "1 Month" },
        { key: "3m", label: "3 Months" },
        { key: "6m", label: "6 Months" },
        { key: "1y", label: "Yearly" },
    ];

    // ─── STATUS ROW COMPONENT ────────────────────────────────────────────
    const StatusRow = ({ item }: { item: any }) => {
        const isExpanded = expandedProperty === item.name || expandedVilla === item.name;
        const toggle = () => {
            if (expandedVilla !== null) setExpandedVilla(isExpanded ? null : item.name);
            else setExpandedProperty(isExpanded ? null : item.name);
        };

        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={toggle} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                        {item.checkedIn ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase">Checked In</span>
                        ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase">Vacant</span>
                        )}
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                {isExpanded && item.checkedIn && (
                    <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1"><UserIcon size={12} /> {item.guest}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1"><Users size={12} /> {item.guests} People</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1"><Phone size={12} /> {item.phone}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1"><CalendarDays size={12} /> {item.checkOutDate}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className={`p-3 rounded-lg border ${item.balanceCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${item.balanceCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Balance (80%) {item.balanceCollected ? '✓ Collected' : '⏳ Pending'}
                                </p>
                                {item.balanceCollected && (
                                    <p className="text-xs font-medium text-slate-600 mt-1">
                                        via {item.balanceMode} · {item.balanceTime}
                                    </p>
                                )}
                            </div>
                            <div className={`p-3 rounded-lg border ${item.depositCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${item.depositCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Security Deposit {item.depositCollected ? '✓ Collected' : '⏳ Pending'}
                                </p>
                                {item.depositCollected && (
                                    <p className="text-xs font-medium text-slate-600 mt-1">
                                        via {item.depositMode} · {item.depositTime}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Extra Guests Display */}
                        {item.extraGuests && item.extraGuests.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extra Guests Added ({item.extraGuests.length})</h4>
                                <div className="space-y-2">
                                    {item.extraGuests.map((eg: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                    <Users size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{eg.name}</p>
                                                    <p className="text-[9px] font-medium text-slate-500">{eg.idType}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-600">+₹{eg.amount}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{eg.paymentMode}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isExpanded && !item.checkedIn && (
                    <div className="p-4 pt-0 border-t border-slate-100">
                        <p className="text-sm text-slate-400 font-medium py-4 text-center">No active check-in at this property.</p>
                    </div>
                )}
            </div>
        );
    };

    // ─── TAB: DASHBOARD ──────────────────────────────────────────────────
    const renderDashboard = () => {
        // KPI cards data
        const totalRevenue = dashboardKPIs?.kpis?.staycationRevenue || 0;
        const totalNights = dashboardKPIs?.kpis?.totalNightsBooked || 0;
        const occupancyRate = totalNights > 0 ? 80 : 0; // Estimated
        const avgNightlyRate = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

        // Live calendar helpers
        const calendarYear = calendarViewMonth.getFullYear();
        const calendarMonth = calendarViewMonth.getMonth();
        const calFirstDay = new Date(calendarYear, calendarMonth, 1).getDay();
        const calDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        // Mock booked dates for the selected property
        const mockBookedDays = [1, 2, 3, 4, 8, 9, 15, 16, 22, 23, 25, 28, 29];

        return (
            <div className="space-y-8">
                {/* Time Range + Sub-tab Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
                        {timeRanges.map(tr => (
                            <button
                                key={tr.key}
                                onClick={() => setTimeRange(tr.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeRange === tr.key
                                    ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                            >
                                {tr.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {([["insights", "Insights"], ["reports", "Advanced Reports"], ["calendar", "Live Calendar"]] as const).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setDashboardSubTab(key)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${dashboardSubTab === key
                                    ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub-tab Content */}
                {dashboardSubTab === "insights" && (
                    <>
                        {/* Occupancy Alerts  */}
                        {(ambroseVillaStatus.filter(v => v.checkedIn).length === ambroseVillaStatus.length ||
                            amstelVillaStatus.filter(v => v.checkedIn).length === amstelVillaStatus.length) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                                    <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                                        <CheckCircle size={18} className="text-amber-600" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800 tracking-tight">Fully Booked Properties Alert</h4>
                                        <div className="mt-1 space-y-1">
                                            {ambroseVillaStatus.filter(v => v.checkedIn).length === ambroseVillaStatus.length && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Ambrose is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">5/5 VILLAS FULL</span>
                                                </p>
                                            )}
                                            {amstelVillaStatus.filter(v => v.checkedIn).length === amstelVillaStatus.length && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Amstel Nest is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">14/14 VILLAS FULL</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* Staycation KPI Cards */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Staycation Overview</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-xl font-bold text-emerald-700 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium mt-1">↑ 12% vs last period</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
                                    <p className="text-xl font-bold text-purple-700 mt-1">{occupancyRate}%</p>
                                    <p className="text-[10px] text-purple-500 font-medium mt-1">{ambroseVillaStatus.filter(v => v.checkedIn).length + amstelVillaStatus.filter(v => v.checkedIn).length + propertyStatusData.filter((p: any) => p.checkedIn).length} / {ambroseVillaStatus.length + amstelVillaStatus.length + propertyStatusData.length} units occupied</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Nightly Rate</p>
                                    <p className="text-xl font-bold text-indigo-700 mt-1">₹{avgNightlyRate.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-indigo-500 font-medium mt-1">Across all properties</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Nights Booked</p>
                                    <p className="text-xl font-bold text-amber-700 mt-1">{totalNights}</p>
                                    <p className="text-[10px] text-amber-500 font-medium mt-1">↑ 8% vs last period</p>
                                </div>
                            </div>
                        </div>

                        {/* Digital Diaries KPI Cards */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Digital Diaries Overview</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DD Revenue</p>
                                    <p className="text-xl font-bold text-violet-700 mt-1">₹{(dashboardKPIs?.kpis?.ddRevenue || 0).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-violet-500 font-medium mt-1">↑ 18% vs last period</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                                    <p className="text-xl font-bold text-sky-700 mt-1">{dashboardKPIs?.kpis?.totalDdBookings || 0}</p>
                                    <p className="text-[10px] text-sky-500 font-medium mt-1">Across all screens</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Booking Value</p>
                                    <p className="text-xl font-bold text-teal-700 mt-1">₹{dashboardKPIs?.kpis?.totalDdBookings > 0 ? Math.round((dashboardKPIs?.kpis?.ddRevenue || 0) / dashboardKPIs.kpis.totalDdBookings).toLocaleString('en-IN') : 0}</p>
                                    <p className="text-[10px] text-teal-500 font-medium mt-1">Per reservation</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancellation Rate</p>
                                    <p className="text-xl font-bold text-rose-700 mt-1">0%</p>
                                    <p className="text-[10px] text-rose-500 font-medium mt-1">0 of {dashboardKPIs?.kpis?.totalDdBookings || 0} bookings</p>
                                </div>
                            </div>
                        </div>
                        {/* STAYCATION SECTION */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Staycation — Resort-wise Insights</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Revenue and occupancy performance breakdown.</p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Ambrose Pie Chart */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Ambrose — Villa Performance</h3>
                                    <p className="text-xs text-slate-400 font-medium mb-4">Hover to see total sales & nights booked</p>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie data={ambroseData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="sales" nameKey="name" stroke="none">
                                                {ambroseData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<AmbroseTooltip />} />
                                            <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-xs font-semibold text-slate-600">{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Amstel Nest Bar Charts */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Amstel Nest — Total Sales by Villa</h3>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={amstelSalesData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="villa" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, "Sales"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }} />
                                                <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Amstel Nest — Total Nights by Villa</h3>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={amstelNightsData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="villa" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                                                <Tooltip formatter={(value: any) => [value, "Nights"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }} />
                                                <Bar dataKey="nights" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STANDALONE VILLAS INSIGHTS */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Standalone Villas — Performance</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Total sales and nights booked for Hill View, Mount View, La Paraiso & Euphoria.</p>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Total Sales by Villa</h3>
                                <p className="text-xs text-slate-400 font-medium mb-4">Hover to see nights spent at each villa</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={standaloneVillaData} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                        <Tooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg">
                                                            <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                                                            <p className="text-xs text-emerald-600 font-semibold mt-1">Sales: ₹{d.sales.toLocaleString('en-IN')}</p>
                                                            <p className="text-xs text-indigo-600 font-semibold">Nights Booked: {d.nights}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                                            {standaloneVillaData.map((entry, index) => (
                                                <Cell key={`standalone-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* OVERALL EARNINGS LINE CHART */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Overall Earnings Trend</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Combined revenue across all properties filtered by selected time range.</p>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Monthly Earnings</h3>
                                    <span className="text-xs text-slate-400 font-medium">Showing: {timeRange === '1m' ? 'Last 1 Month (Daily)' : timeRange === '3m' ? 'Last 3 Months' : timeRange === '6m' ? 'Last 6 Months' : 'Full Year'}</span>
                                </div>
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={timeRange === '1m' ? earnings1Month : earningsYearly.slice(timeRange === '3m' ? -3 : timeRange === '6m' ? -6 : 0)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                                        <Tooltip
                                            content={({ active, payload, label }: any) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg">
                                                            <p className="font-bold text-slate-800 text-sm mb-2">{label}</p>
                                                            {payload.map((p: any, i: number) => (
                                                                <p key={i} className="text-xs font-semibold" style={{ color: p.stroke }}>
                                                                    {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5, fill: '#7c3aed' }} name="Total" />
                                        <Line type="monotone" dataKey="staycation" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Staycation" strokeDasharray="5 5" />
                                        <Line type="monotone" dataKey="dd" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} name="Digital Diaries" strokeDasharray="5 5" />
                                        <Legend formatter={(value: string) => <span className="text-xs font-semibold text-slate-600">{value}</span>} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DIGITAL DIARIES SECTION */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Digital Diaries — Revenue Insights</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Screen-level and package-level revenue breakdown.</p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue by Screen</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={ddScreenData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="screen" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                                            <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                            <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }} />
                                            <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue by Package</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={ddPackageData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="package" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                                            <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                            <Tooltip
                                                formatter={(value: any, name: any) => {
                                                    if (name === "revenue") return [`₹${Number(value).toLocaleString('en-IN')}`, "Revenue"];
                                                    return [value, "Bookings"];
                                                }}
                                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }}
                                            />
                                            <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="revenue" />
                                            <Bar dataKey="bookings" fill="#c4b5fd" radius={[4, 4, 0, 0]} name="bookings" />
                                            <Legend formatter={(value: string) => <span className="text-xs font-semibold text-slate-600 capitalize">{value}</span>} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Digital Diaries Booking Source — Website vs Walk-in */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Digital Diaries Booking Source — Website vs Walk-in</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={ddBookingSourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={6} dataKey="value" nameKey="name" stroke="none">
                                            {ddBookingSourceData.map((entry, index) => (
                                                <Cell key={`ddsrc-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    const total = ddBookingSourceData.reduce((s, e) => s + e.value, 0);
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
                                                            <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                                                            <p className="text-xs text-indigo-600 font-semibold mt-1">{d.value} bookings ({Math.round((d.value / total) * 100)}%)</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-xs font-semibold text-slate-600">{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ADDITIONAL INSIGHTS */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Additional Insights</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Occupancy trends and property revenue comparison.</p>

                            {/* Occupancy Trend Area Chart — full width */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Occupancy Trend (%)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={timeRange === '1m' ? occupancy1Month : occupancyYearly.slice(timeRange === '3m' ? -3 : timeRange === '6m' ? -6 : 0)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                                        <Tooltip
                                            content={({ active, payload, label }: any) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
                                                            <p className="font-bold text-slate-800 text-sm mb-1">{label}</p>
                                                            {payload.map((p: any, i: number) => (
                                                                <p key={i} className="text-xs font-semibold" style={{ color: p.stroke }}>{p.name}: {p.value}%</p>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area type="monotone" dataKey="ambrose" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name="Ambrose" />
                                        <Area type="monotone" dataKey="amstel" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} name="Amstel Nest" />
                                        <Area type="monotone" dataKey="standalone" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} name="Standalone" />
                                        <Legend formatter={(value: string) => <span className="text-xs font-semibold text-slate-600">{value}</span>} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Property Revenue Comparison Bar Chart */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue Comparison — Current vs Previous Period</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={propertyRevenueComparison} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="property" tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                                        <Tooltip
                                            content={({ active, payload, label }: any) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
                                                            <p className="font-bold text-slate-800 text-sm mb-1">{label}</p>
                                                            <p className="text-xs text-emerald-600 font-semibold">Current: ₹{Number(payload[0]?.value).toLocaleString('en-IN')}</p>
                                                            <p className="text-xs text-slate-500 font-semibold">Previous: ₹{Number(payload[1]?.value).toLocaleString('en-IN')}</p>
                                                            <p className="text-xs text-indigo-600 font-bold mt-1">Growth: +{Math.round(((payload[0]?.value - payload[1]?.value) / payload[1]?.value) * 100)}%</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="current" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Current Period" />
                                        <Bar dataKey="previous" fill="#c4b5fd" radius={[4, 4, 0, 0]} name="Previous Period" />
                                        <Legend formatter={(value: string) => <span className="text-xs font-semibold text-slate-600">{value}</span>} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}

                {dashboardSubTab === "reports" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Advanced Report Generation</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Generate custom reports based on specific criteria.</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Report Type</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-600/20">
                                        <option>Revenue Report</option>
                                        <option>Occupancy Report</option>
                                        <option>Guest Analytics</option>
                                        <option>Payment Summary</option>
                                        <option>Cancellation Report</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Property</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-600/20">
                                        <option>All Properties</option>
                                        <option>Ambrose</option>
                                        <option>Amstel Nest</option>
                                        <option>Hill View</option>
                                        <option>Mount View</option>
                                        <option>Euphoria</option>
                                        <option>La Paraiso</option>
                                        <option>Digital Diaries</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Date From</label>
                                    <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Date To</label>
                                    <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Payment Mode</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-600/20">
                                        <option>All</option>
                                        <option>Cash</option>
                                        <option>UPI</option>
                                        <option>Online</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Booking Source</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-600/20">
                                        <option>All Sources</option>
                                        <option>Website</option>
                                        <option>Walk-in</option>
                                        <option>Phone</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-sm hover:bg-purple-700 transition-colors">
                                        Generate Report
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Report preview placeholder */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
                            <LayoutDashboard size={48} className="text-slate-300 mb-4" />
                            <h3 className="text-sm font-bold text-slate-500">Select criteria and generate a report</h3>
                            <p className="text-xs text-slate-400 mt-1">Reports will appear here with downloadable PDF/Excel options.</p>
                        </div>
                    </div>
                )}

                {dashboardSubTab === "calendar" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Live Property Calendar</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">View booked and free dates for each property.</p>
                            </div>
                            <CustomSelect
                                value={calendarProperty}
                                onChange={setCalendarProperty}
                                options={[
                                    "Hill View", "Mount View", "La Paraiso", "Euphoria",
                                    ...ambroseData.map(v => `Ambrose — ${v.name}`),
                                    ...Array.from({ length: 14 }, (_, i) => `Amstel Nest — Villa ${i + 1}`)
                                ]}
                            />
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={() => setCalendarViewMonth(new Date(calendarYear, calendarMonth - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                    <ChevronRight size={20} className="rotate-180" />
                                </button>
                                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                                    {calendarViewMonth.toLocaleString('default', { month: 'long' })} {calendarYear}
                                </h3>
                                <button onClick={() => setCalendarViewMonth(new Date(calendarYear, calendarMonth + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-2 mb-3">
                                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(d => (
                                    <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: calFirstDay }, (_, i) => <div key={`e-${i}`} className="h-16" />)}
                                {Array.from({ length: calDaysInMonth }, (_, i) => {
                                    const d = i + 1;
                                    const date = new Date(calendarYear, calendarMonth, d);
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    const isBooked = mockBookedDays.includes(d);
                                    const isToday = new Date().getDate() === d && new Date().getMonth() === calendarMonth && new Date().getFullYear() === calendarYear;
                                    return (
                                        <div
                                            key={d}
                                            className={`h-16 rounded-xl flex flex-col items-center justify-center text-sm font-semibold border transition-all
                                                ${isToday ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200' :
                                                    isBooked ? 'bg-red-50 border-red-200 text-red-600' :
                                                        isWeekend ? 'bg-amber-50/70 border-amber-200 text-amber-700' :
                                                            'bg-emerald-50/50 border-emerald-200 text-emerald-700'}`}
                                        >
                                            <span className={`font-bold ${isToday ? 'text-purple-700' : ''}`}>{d}</span>
                                            <span className={`text-[9px] font-medium ${isBooked ? 'text-red-500' : isWeekend ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {isBooked ? 'Booked' : 'Free'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-xs font-medium text-slate-500">Free</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs font-medium text-slate-500">Booked</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs font-medium text-slate-500">Weekend</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400" /><span className="text-xs font-medium text-slate-500">Today</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─── TAB: PROPERTIES ─────────────────────────────────────────────────
    const renderProperties = () => (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Live Property Check-in Status</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Click a property to view guest details and payment status.</p>
                </div>
                <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
            </div>

            <div className="space-y-3">
                {propertyStatusData.map(item => (
                    <StatusRow key={item.name} item={item} />
                ))}

                {/* Ambrose (opens modal) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setVillaModal({ type: "ambrose", open: true })}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-sm">Ambrose</span>
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase">
                                {ambroseVillaStatus.filter(v => v.checkedIn).length}/{ambroseVillaStatus.length} Occupied
                            </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Amstel Nest (opens modal) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setVillaModal({ type: "amstel", open: true })}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-sm">Amstel Nest</span>
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase">
                                {amstelVillaStatus.filter(v => v.checkedIn).length}/{amstelVillaStatus.length} Occupied
                            </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Villa Modal */}
            {villaModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setVillaModal({ ...villaModal, open: false }); setExpandedVilla(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800">
                                {villaModal.type === "ambrose" ? "Ambrose — Villa Status" : "Amstel Nest — Villa Status"}
                            </h3>
                            <button onClick={() => { setVillaModal({ ...villaModal, open: false }); setExpandedVilla(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            {(villaModal.type === "ambrose" ? ambroseVillaStatus : amstelVillaStatus).map(villa => (
                                <div key={villa.name} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedVilla(expandedVilla === villa.name ? null : villa.name)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800 text-sm">{villa.name}</span>
                                            {villa.checkedIn ? (
                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase">Checked In</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase">Vacant</span>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedVilla === villa.name ? "rotate-90" : ""}`} />
                                    </button>
                                    {expandedVilla === villa.name && villa.checkedIn && (
                                        <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{villa.guest}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{villa.guests} People</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{villa.phone}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{villa.checkOutDate}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                <div className={`p-3 rounded-lg border ${villa.balanceCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${villa.balanceCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        Balance {villa.balanceCollected ? '✓ Collected' : '⏳ Pending'}
                                                    </p>
                                                    {villa.balanceCollected && <p className="text-xs font-medium text-slate-600 mt-1">via {villa.balanceMode} · {villa.balanceTime}</p>}
                                                </div>
                                                <div className={`p-3 rounded-lg border ${villa.depositCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${villa.depositCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        Security Deposit {villa.depositCollected ? '✓ Collected' : '⏳ Pending'}
                                                    </p>
                                                    {villa.depositCollected && <p className="text-xs font-medium text-slate-600 mt-1">via {villa.depositMode} · {villa.depositTime}</p>}
                                                </div>
                                            </div>

                                            {/* Extra Guests Display */}
                                            {villa.extraGuests && villa.extraGuests.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extra Guests Added ({villa.extraGuests.length})</h4>
                                                    <div className="space-y-2">
                                                        {villa.extraGuests.map((eg: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                                        <Users size={12} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-800">{eg.name}</p>
                                                                        <p className="text-[9px] font-medium text-slate-500">{eg.idType}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs font-bold text-emerald-600">+₹{eg.amount}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{eg.paymentMode}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {expandedVilla === villa.name && !villa.checkedIn && (
                                        <div className="p-4 pt-0 border-t border-slate-100">
                                            <p className="text-sm text-slate-400 font-medium py-4 text-center">No active check-in.</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ─── TAB: DD (Read-only) ─────────────────────────────────────────────
    const renderDD = () => {
        // Group bookings by screen
        const screenGroups: Record<string, typeof ddBookings> = {};
        ddBookings.forEach(b => {
            if (!screenGroups[b.screen]) screenGroups[b.screen] = [];
            screenGroups[b.screen].push(b);
        });

        return (
            <div className="space-y-6">
                {/* Date View Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Digital Diaries — Bookings</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Read-only view grouped by screen.</p>
                    </div>
                    <CustomDatePicker date={ddViewDate} onDateChange={setDdViewDate} />
                </div>

                {/* DD Detail Modal */}
                {ddSelectedBooking && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDdSelectedBooking(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">Booking Details</h3>
                                <button onClick={() => setDdSelectedBooking(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Booking ID</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.id}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.customer}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Screen</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.screen}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.date}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Slot</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.slot}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Source</p><p className="text-sm font-bold text-slate-800">{ddSelectedBooking.source}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Upfront (50%)</p>
                                        <p className="text-sm font-bold text-emerald-800">{ddSelectedBooking.upfrontAmt}</p>
                                        <p className="text-[10px] text-emerald-600 mt-0.5">via {ddSelectedBooking.upfrontMode}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg border ${ddSelectedBooking.remainingStatus === "Paid" ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <p className={`text-[10px] font-bold uppercase ${ddSelectedBooking.remainingStatus === "Paid" ? 'text-emerald-600' : 'text-amber-600'}`}>Remaining (50%)</p>
                                        <p className={`text-sm font-bold ${ddSelectedBooking.remainingStatus === "Paid" ? 'text-emerald-800' : 'text-amber-800'}`}>{ddSelectedBooking.remainingAmt}</p>
                                        <p className={`text-[10px] mt-0.5 ${ddSelectedBooking.remainingStatus === "Paid" ? 'text-emerald-600' : 'text-amber-600'}`}>{ddSelectedBooking.remainingStatus}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${ddSelectedBooking.status === "Confirmed" ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {ddSelectedBooking.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Screen-wise grouped bookings */}
                {Object.entries(screenGroups).map(([screenName, bookings]) => (
                    <div key={screenName} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-3 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wider">{screenName}</h3>
                            <p className="text-xs text-purple-500 font-medium">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Slot</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Upfront</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookings.map(b => (
                                        <tr key={b.id} onClick={() => setDdSelectedBooking(b)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-bold text-slate-800">{b.customer}</p>
                                                <p className="text-xs text-slate-400 font-medium">{b.id}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-semibold text-slate-700">{b.date}</p>
                                                <p className="text-xs text-slate-400">{b.slot}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-bold text-emerald-700">{b.upfrontAmt}</p>
                                                <p className="text-[10px] text-slate-400">{b.upfrontMode}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <p className={`text-sm font-bold ${b.remainingStatus === "Paid" ? 'text-emerald-700' : 'text-amber-700'}`}>{b.remainingAmt}</p>
                                                <p className={`text-[10px] ${b.remainingStatus === "Paid" ? 'text-emerald-500' : 'text-amber-500'}`}>{b.remainingStatus}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${b.status === "Confirmed" ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ─── TAB: WEBSITE ────────────────────────────────────────────────────
    const renderWebsite = () => (
        <div className="space-y-8">
            {/* Photo Management */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Website Photo Manager</h2>
                <p className="text-sm text-slate-500 font-medium mb-6">Upload, replace, or delete photos for each website section.</p>

                <div className="space-y-6">
                    {websiteSections.map(sec => (
                        <div key={sec.section} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">{sec.section}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {sec.photos.map((photo, idx) => (
                                    <div key={idx} className="relative group border-2 border-slate-200 rounded-xl aspect-square bg-slate-100 flex items-center justify-center overflow-hidden transition-all hover:border-purple-300 hover:shadow-sm">
                                        <ImageIcon size={24} className="text-slate-400" />
                                        <p className="absolute bottom-0 left-0 right-0 bg-slate-800/80 text-white text-[9px] font-semibold px-2 py-1 text-center truncate">{photo}</p>
                                        <button className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                                {/* Upload placeholder */}
                                <div className="border-2 border-dashed border-slate-300 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer group">
                                    <Upload size={20} className="group-hover:text-purple-500" />
                                    <span className="text-[9px] font-bold mt-1 group-hover:text-purple-600">Upload</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Blackout Calendar */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Blackout / Block Calendar</h2>
                <p className="text-sm text-slate-500 font-medium mb-6">Block any property or villa for private events, maintenance, or blackout dates.</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Property Selector + Reason */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Select Property / Villa</label>
                                <CustomSelect
                                    value={blackoutProperty}
                                    onChange={setBlackoutProperty}
                                    options={[
                                        { label: "Standalone Properties", options: ["Hill View", "Mount View", "Euphoria", "La Paraiso"] },
                                        { label: "Ambrose Villas", options: ["Ambrose — TAKE-1", "Ambrose — ALTA", "Ambrose — SANTORINI", "Ambrose — BAMBOOSA", "Ambrose — CYPRESS"] },
                                        { label: "Amstel Nest", options: Array.from({ length: 14 }, (_, i) => `Amstel Nest — Villa ${i + 1}`) }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase">Reason</label>
                                <CustomSelect
                                    value={blackoutReason}
                                    onChange={setBlackoutReason}
                                    options={[
                                        "Private Event",
                                        "Maintenance",
                                        "Owner Reservation",
                                        "Seasonal Closure",
                                        "Other"
                                    ]}
                                />
                            </div>
                            {blackoutDates.length > 0 && (
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                                    <p className="text-xs text-purple-600 font-bold uppercase">Selected Dates ({blackoutDates.length})</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {blackoutDates.map((d, idx) => (
                                            <span key={idx} className="bg-white px-2 py-1 flex items-center gap-1 rounded border border-purple-200 text-[10px] font-bold text-purple-800 shadow-sm">
                                                {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                <X
                                                    size={10}
                                                    className="cursor-pointer hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBlackoutDates(blackoutDates.filter((_, i) => i !== idx));
                                                    }}
                                                />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (blackoutDates.length > 0 && blackoutReason) {
                                        const newBlocks = blackoutDates.map((d, i) => ({
                                            id: Date.now() + i,
                                            property: blackoutProperty,
                                            dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                                            reason: blackoutReason
                                        }));
                                        setActiveBlocks([...newBlocks, ...activeBlocks]);
                                        setBlackoutDates([]);
                                        setBlackoutReason("");
                                    } else {
                                        alert("Please select at least one date and choose a reason.");
                                    }
                                }}
                                disabled={blackoutDates.length === 0 || !blackoutReason}
                                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                <Ban size={16} /> Block Property
                            </button>
                        </div>

                        {/* Center: Inline Calendar */}
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setBlackoutViewMonth(new Date(blackoutViewMonth.getFullYear(), blackoutViewMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    {blackoutViewMonth.toLocaleString('default', { month: 'long' })} {blackoutViewMonth.getFullYear()}
                                </h3>
                                <button onClick={() => setBlackoutViewMonth(new Date(blackoutViewMonth.getFullYear(), blackoutViewMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                    const year = blackoutViewMonth.getFullYear();
                                    const month = blackoutViewMonth.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const cells: React.ReactNode[] = [];
                                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="h-10" />);
                                    // Mock blocked dates
                                    const blockedDays = [5, 10, 11, 12];
                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const date = new Date(year, month, d);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        const isBlocked = blockedDays.includes(d);
                                        const isSelected = blackoutDates.some(bd => bd.getDate() === d && bd.getMonth() === month && bd.getFullYear() === year);
                                        const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
                                        cells.push(
                                            <button
                                                key={d}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setBlackoutDates(blackoutDates.filter(bd => !(bd.getDate() === d && bd.getMonth() === month && bd.getFullYear() === year)));
                                                    } else {
                                                        setBlackoutDates([...blackoutDates, date]);
                                                    }
                                                }}
                                                className={`h-10 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all
                                                    ${isSelected ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300' :
                                                        isBlocked ? 'bg-red-50 text-red-400 border border-red-200' :
                                                            isToday ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                                isWeekend ? 'bg-amber-50/50 text-amber-700 hover:bg-amber-100' :
                                                                    'text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                <span>{d}</span>
                                                {isBlocked && <span className="text-[8px] text-red-400">Blocked</span>}
                                            </button>
                                        );
                                    }
                                    return cells;
                                })()}
                            </div>
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="text-[10px] font-medium text-slate-500">Weekday</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[10px] font-medium text-slate-500">Weekend</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-[10px] font-medium text-slate-500">Blocked</span></div>
                            </div>
                        </div>

                        {/* Right: Active Blocks */}
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Active Blocks</h4>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {activeBlocks.length === 0 ? (
                                    <p className="text-sm font-medium text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">No active blocks.</p>
                                ) : (
                                    activeBlocks.map(block => (
                                        <div key={block.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{block.property}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{block.dateStr} <span className="text-[10px] text-red-500 font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100 ml-1">{block.reason}</span></p>
                                            </div>
                                            <button
                                                onClick={() => setActiveBlocks(activeBlocks.filter(b => b.id !== block.id))}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ─── MAIN RENDER ─────────────────────────────────────────────────────
    const pageTitles: Record<string, { title: string; subtitle: string }> = {
        dashboard: { title: "Owner Dashboard", subtitle: "Complete overview of all business operations." },
        properties: { title: "Properties", subtitle: "Live check-in status across all staycation properties." },
        dd: { title: "Digital Diaries", subtitle: "Read-only view of all Digital Diaries reservations." },
        website: { title: "Website Management", subtitle: "Manage website photos and property blackout dates." },
    };

    const page = pageTitles[activeTab] || pageTitles.dashboard;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{page.title}</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">{page.subtitle}</p>
            </div>

            {/* Tab Content */}
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "properties" && renderProperties()}
            {activeTab === "dd" && renderDD()}
            {activeTab === "website" && renderWebsite()}
        </div>
    );
}
