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
import BulkBookingsTab from "./BulkBookingsTab";

// â”€â”€â”€ CUSTOM SELECT COMPONENT (Fixes Windows native font rendering bug) â”€â”€â”€
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



// Website Photo Sections — hierarchical: group â†’ sub-sections
interface ImageSubSection { id: string; label: string; maxImages?: number; }
interface ImageGroup { id: string; label: string; subSections: ImageSubSection[]; }

const staycationGroups: ImageGroup[] = [
    { id: "landing", label: "Landing Page (galaxiaresorts.com)", subSections: [
        { id: "landing/celebration", label: "Celebration Card Background", maxImages: 1 },
        { id: "landing/staycation", label: "Staycation Card Background", maxImages: 1 },
    ]},
    { id: "staycation-hero", label: "Staycation Landing Page", subSections: [
        { id: "staycation-hero/banner", label: "Hero Banner", maxImages: 1 },
    ]},
    { id: "hill-view", label: "Hill View", subSections: [
        { id: "hill-view/slideshow", label: "Slideshow Images" },
        { id: "hill-view/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "hill-view/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "hill-view/celebration", label: "Celebration Add-on Image", maxImages: 1 },
    ]},
    { id: "mount-view", label: "Mount View", subSections: [
        { id: "mount-view/slideshow", label: "Slideshow Images" },
        { id: "mount-view/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "mount-view/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "mount-view/celebration", label: "Celebration Add-on Image", maxImages: 1 },
    ]},
    { id: "heavenly-villa", label: "Heavenly Villa", subSections: [
        { id: "heavenly-villa/slideshow", label: "Slideshow Images" },
        { id: "heavenly-villa/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "heavenly-villa/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "heavenly-villa/celebration", label: "Celebration Add-on Image", maxImages: 1 },
    ]},
    { id: "la-paraiso", label: "La Paraiso", subSections: [
        { id: "la-paraiso/slideshow", label: "Slideshow Images" },
        { id: "la-paraiso/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "la-paraiso/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "la-paraiso/celebration", label: "Celebration Add-on Image", maxImages: 1 },
    ]},
    { id: "ambrose", label: "Ambrose", subSections: [
        { id: "ambrose/slideshow", label: "Slideshow Images" },
        { id: "ambrose/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "ambrose/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        // Per-villa sections
        { id: "ambrose/take-1/slideshow", label: "TAKE-1 — Slideshow" },
        { id: "ambrose/take-1/thumbnail", label: "TAKE-1 — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/take-1/celebration", label: "TAKE-1 — Celebration Add-on Image", maxImages: 1 },
        { id: "ambrose/alta/slideshow", label: "ALTA — Slideshow" },
        { id: "ambrose/alta/thumbnail", label: "ALTA — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/alta/celebration", label: "ALTA — Celebration Add-on Image", maxImages: 1 },
        { id: "ambrose/santorini/slideshow", label: "SANTORINI — Slideshow" },
        { id: "ambrose/santorini/thumbnail", label: "SANTORINI — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/santorini/celebration", label: "SANTORINI — Celebration Add-on Image", maxImages: 1 },
        { id: "ambrose/bamboosa/slideshow", label: "BAMBOOSA — Slideshow" },
        { id: "ambrose/bamboosa/thumbnail", label: "BAMBOOSA — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/bamboosa/celebration", label: "BAMBOOSA — Celebration Add-on Image", maxImages: 1 },
        { id: "ambrose/cypress/slideshow", label: "CYPRESS — Slideshow" },
        { id: "ambrose/cypress/thumbnail", label: "CYPRESS — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/cypress/celebration", label: "CYPRESS — Celebration Add-on Image", maxImages: 1 },
    ]},
    { id: "amstel-nest", label: "Amstel Nest", subSections: [
        { id: "amstel-nest/slideshow", label: "Slideshow Images" },
        { id: "amstel-nest/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "amstel-nest/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "amstel-nest/standard-cottage/slideshow", label: "Standard Cottage — Slideshow" },
        { id: "amstel-nest/standard-cottage/thumbnail", label: "Standard Cottage — Main Thumbnail", maxImages: 1 },
        { id: "amstel-nest/standard-cottage/celebration", label: "Standard Cottage — Celebration Add-on Image", maxImages: 1 },
        { id: "amstel-nest/family-cottage/slideshow", label: "Family Cottage — Slideshow" },
        { id: "amstel-nest/family-cottage/thumbnail", label: "Family Cottage — Main Thumbnail", maxImages: 1 },
        { id: "amstel-nest/family-cottage/celebration", label: "Family Cottage — Celebration Add-on Image", maxImages: 1 },
    ]},
];

const ddGroups: ImageGroup[] = [
    { id: "dd/landing", label: "Digital Diaries Landing Page", subSections: [
        { id: "dd/landing/movie-time", label: "Movie Time — Card Image", maxImages: 1 },
        { id: "dd/landing/celebration", label: "Decoration + Movie Time — Card Image", maxImages: 1 },
    ]},
    // Per-screen sections — each screen has Movie Time and Deco+Movie Time sub-sections
    { id: "dd/sandy-screen", label: "Sandy Screen", subSections: [
        { id: "dd/sandy-screen/movie-time/slideshow", label: "Movie Time — Slideshow" },
        { id: "dd/sandy-screen/movie-time/thumbnail", label: "Movie Time — Thumbnail", maxImages: 1 },
        { id: "dd/sandy-screen/celebration/slideshow", label: "Deco + Movie Time — Slideshow" },
        { id: "dd/sandy-screen/celebration/thumbnail", label: "Deco + Movie Time — Thumbnail", maxImages: 1 },
    ]},
    { id: "dd/cine-love", label: "Cine Love", subSections: [
        { id: "dd/cine-love/movie-time/slideshow", label: "Movie Time — Slideshow" },
        { id: "dd/cine-love/movie-time/thumbnail", label: "Movie Time — Thumbnail", maxImages: 1 },
        { id: "dd/cine-love/celebration/slideshow", label: "Deco + Movie Time — Slideshow" },
        { id: "dd/cine-love/celebration/thumbnail", label: "Deco + Movie Time — Thumbnail", maxImages: 1 },
    ]},
    { id: "dd/park-n-watch", label: "Park N Watch", subSections: [
        { id: "dd/park-n-watch/movie-time/slideshow", label: "Movie Time — Slideshow" },
        { id: "dd/park-n-watch/movie-time/thumbnail", label: "Movie Time — Thumbnail", maxImages: 1 },
        { id: "dd/park-n-watch/celebration/slideshow", label: "Deco + Movie Time — Slideshow" },
        { id: "dd/park-n-watch/celebration/thumbnail", label: "Deco + Movie Time — Thumbnail", maxImages: 1 },
    ]},
    { id: "dd/baywatch", label: "Baywatch", subSections: [
        { id: "dd/baywatch/movie-time/slideshow", label: "Movie Time — Slideshow" },
        { id: "dd/baywatch/movie-time/thumbnail", label: "Movie Time — Thumbnail", maxImages: 1 },
        { id: "dd/baywatch/celebration/slideshow", label: "Deco + Movie Time — Slideshow" },
        { id: "dd/baywatch/celebration/thumbnail", label: "Deco + Movie Time — Thumbnail", maxImages: 1 },
    ]},
];


// â”€â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "properties", label: "Properties", icon: Building },
    { key: "dd", label: "Digital Diaries", icon: Film },
    { key: "website", label: "Website", icon: Globe },
];

// â”€â”€â”€ CUSTOM TOOLTIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OwnerDashboard({ initialTab = "dashboard" }: { initialTab?: string }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [timeRange, setTimeRange] = useState("1m");
    const [dashboardSubTab, setDashboardSubTab] = useState<"insights" | "reports" | "calendar" | "bulk" | "calendar2">("insights");
    const [propertyStatusMode, setPropertyStatusMode] = useState<"checkin" | "checkout">("checkin");

    // Live Calendar 2 states
    const [calendar2Month, setCalendar2Month] = useState<Date>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [calendar2View, setCalendar2View] = useState<"all" | "amstelnest">("all");
    const [calendar2Bookings, setCalendar2Bookings] = useState<any[]>([]);
    const [calendar2Blocks, setCalendar2Blocks] = useState<any[]>([]);
    const [calendar2Loading, setCalendar2Loading] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{
        date: Date;
        colType: "all" | "amstelnest";
        colName: string;
        unitIndex?: number;
        status: string;
        block?: any;
        bookings?: any[];
    } | null>(null);

    const [blockReasonType, setBlockReasonType] = useState<"owner" | "maintenance">("maintenance");
    const [blockCustomNote, setBlockCustomNote] = useState("");
    const [blockActionLoading, setBlockActionLoading] = useState(false);

    // Fetch Calendar 2 Bookings & Blocks
    const fetchCalendar2Data = useCallback(() => {
        if (dashboardSubTab !== "calendar2") return;
        setCalendar2Loading(true);

        const year = calendar2Month.getFullYear();
        const month = calendar2Month.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        const propIds = [1, 2, 3, 4, 5, 6];
        Promise.all([
            ...propIds.map(id => api.get(`/blocked-dates/bookings?propertyId=${id}&month=${monthStr}`).catch(() => [])),
            api.get(`/blocked-dates`).catch(() => [])
        ]).then((results) => {
            const bookingsList = results.slice(0, 6).flat();
            const blocksList = results[6] as any[];

            setCalendar2Bookings(bookingsList);
            const filteredBlocks = blocksList.filter(b => {
                const bDate = new Date(b.blockedDate);
                return bDate.getFullYear() === year && (bDate.getMonth() + 1) === month;
            });
            setCalendar2Blocks(filteredBlocks);
        }).finally(() => {
            setCalendar2Loading(false);
        });
    }, [calendar2Month, dashboardSubTab]);

    useEffect(() => {
        fetchCalendar2Data();
    }, [fetchCalendar2Data]);

    const getColumnInfo = (colType: "all" | "amstelnest", colName: string) => {
        if (colType === "amstelnest") {
            const amstel = propertyList.find(p => p.slug === "amstel-nest" || p.name === "Amstel Nest");
            const amstelId = amstel?.id || 5;
            if (colName === "BIG" || colName === "FAMILY UNIT") {
                const sp = amstel?.subProperties?.find((s: any) => s.slug === "family-cottage" || s.name.toUpperCase() === "FAMILY COTTAGE");
                return { propertyId: amstelId, subPropertyId: sp?.id || null, isMultiUnit: false, capacity: 1 };
            } else {
                const sp = amstel?.subProperties?.find((s: any) => s.slug === "standard-cottage" || s.name.toUpperCase() === "STANDARD COTTAGE");
                return { propertyId: amstelId, subPropertyId: sp?.id || null, isMultiUnit: true, capacity: 14 };
            }
        } else {
            const nameUpper = colName.toUpperCase();
            if (["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"].includes(nameUpper)) {
                const ambrose = propertyList.find(p => p.slug === "ambrose" || p.name === "Ambrose");
                const ambroseId = ambrose?.id || 6;
                const mapSlug: Record<string, string> = {
                    "TAKE-1": "take-1",
                    "ALTA": "alta",
                    "SANTORINI": "santorini",
                    "BAMBOOSA": "bamboosa",
                    "CYPRESS": "cypress"
                };
                const targetSlug = mapSlug[nameUpper];
                const sp = ambrose?.subProperties?.find((s: any) => s.slug === targetSlug || s.name.toUpperCase().includes(nameUpper));
                return { propertyId: ambroseId, subPropertyId: sp?.id || null, isMultiUnit: false, capacity: 1 };
            } else {
                const mapProperty: Record<string, string> = {
                    "LA PARAISO": "la-paraiso",
                    "MOUNT VIEW": "mount-view",
                    "HEAVENLY VILLA": "heavenly-villa",
                    "HILL VIEW": "hill-view"
                };
                const targetSlug = mapProperty[nameUpper];
                const prop = propertyList.find(p => p.slug === targetSlug || p.name === colName);
                return { propertyId: prop?.id || null, subPropertyId: null, isMultiUnit: false, capacity: 1 };
            }
        }
    };

    const getLocalDateString = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const parseLocalDateStr = (dateInput: any) => {
        if (!dateInput) return "";
        const str = typeof dateInput === "string" ? dateInput : new Date(dateInput).toISOString();
        return str.slice(0, 10);
    };

    const getCellStatus = (date: Date, colType: "all" | "amstelnest", colName: string, unitIndex?: number) => {
        const dateStr = getLocalDateString(date);
        const info = getColumnInfo(colType, colName);
        if (!info.propertyId) return { status: "vacant" };

        const blocks = calendar2Blocks.filter(b => {
            const bDateStr = parseLocalDateStr(b.blockedDate);
            if (bDateStr !== dateStr) return false;
            if (b.propertyId !== info.propertyId) return false;
            if (info.subPropertyId) {
                return b.subPropertyId === info.subPropertyId;
            } else {
                return b.subPropertyId === null;
            }
        });

        const bookings = calendar2Bookings.filter(b => {
            if (b.propertyId !== info.propertyId) return false;
            if (info.subPropertyId) {
                if (b.subPropertyId !== info.subPropertyId) return false;
            } else {
                if (b.subPropertyId !== null) return false;
            }
            const bStartStr = parseLocalDateStr(b.checkInDate);
            const bEndStr = parseLocalDateStr(b.checkOutDate);
            return dateStr >= bStartStr && dateStr < bEndStr;
        });

        if (colType === "amstelnest" && colName !== "BIG" && colName !== "FAMILY UNIT") {
            const totalBookedCottages = bookings.reduce((sum, b) => sum + (b.numCottages || 1), 0);
            const totalBlockedCottages = blocks.reduce((sum, b) => sum + (b.numUnits || 1), 0);

            if (unitIndex !== undefined) {
                if (unitIndex <= totalBookedCottages) {
                    let count = 0;
                    let matchedBooking = bookings[0];
                    for (const b of bookings) {
                        count += (b.numCottages || 1);
                        if (unitIndex <= count) {
                            matchedBooking = b;
                            break;
                        }
                    }
                    return { status: "booked", bookings: [matchedBooking] };
                } else if (unitIndex <= totalBookedCottages + totalBlockedCottages) {
                    let blockIdx = unitIndex - totalBookedCottages - 1;
                    const matchedBlock = blocks[blockIdx] || blocks[0];
                    const isOR = matchedBlock?.reason?.toLowerCase().startsWith("owner") || matchedBlock?.reason?.toLowerCase().startsWith("or");
                    return { 
                        status: isOR ? "owner_reserved" : "maintenance", 
                        block: matchedBlock,
                        reason: matchedBlock?.reason || "Blocked"
                    };
                } else {
                    return { status: "vacant" };
                }
            }
        }

        if (bookings.length > 0) {
            return { status: "booked", bookings };
        }

        if (blocks.length > 0) {
            const bl = blocks[0];
            const isOR = bl.reason?.toLowerCase().startsWith("owner") || bl.reason?.toLowerCase().startsWith("or");
            return { 
                status: isOR ? "owner_reserved" : "maintenance", 
                block: bl,
                reason: bl.reason || "Blocked"
            };
        }

        return { status: "vacant" };
    };

    const handleBlockCellSubmit = async () => {
        if (!selectedCell) return;
        const info = getColumnInfo(selectedCell.colType, selectedCell.colName);
        if (!info.propertyId) return;

        setBlockActionLoading(true);
        const dateStr = getLocalDateString(selectedCell.date);
        const reasonText = blockReasonType === "owner" 
            ? `Owner Reservation: ${blockCustomNote}` 
            : `Maintenance: ${blockCustomNote}`;

        try {
            await api.post("/blocked-dates", {
                propertyId: info.propertyId,
                subPropertyId: info.subPropertyId,
                dates: [dateStr],
                reason: reasonText,
                numUnits: 1
            });
            fetchCalendar2Data();
            setSelectedCell(null);
            setBlockCustomNote("");
        } catch (err: any) {
            alert(err?.message || "Failed to block cell");
        } finally {
            setBlockActionLoading(false);
        }
    };

    const handleUnblockCellSubmit = async (blockId: number) => {
        if (!confirm("Are you sure you want to remove this block?")) return;
        setBlockActionLoading(true);
        try {
            await api.delete(`/blocked-dates/${blockId}`);
            fetchCalendar2Data();
            setSelectedCell(null);
        } catch (err: any) {
            alert(err?.message || "Failed to remove block");
        } finally {
            setBlockActionLoading(false);
        }
    };

    // Properties tab
    const [propertyDate, setPropertyDate] = useState(new Date());
    const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
    const [villaModal, setVillaModal] = useState<{ type: "ambrose" | "amstel"; open: boolean }>({ type: "ambrose", open: false });
    const [expandedVilla, setExpandedVilla] = useState<string | null>(null);

    // DD tab
    const [ddSelectedBooking, setDdSelectedBooking] = useState<any | null>(null);
    const [ddViewDate, setDdViewDate] = useState(new Date());

    // Fetch dashboard data from API
    useEffect(() => {
        // Map frontend timeRange to backend period format
        const periodMap: Record<string, string> = { '1m': '1month', '3m': '3months', '6m': '6months', '1y': 'year' };
        const periodParam = periodMap[timeRange] || '1month';

        api.get(`/admin/dashboard?period=${periodParam}`).then(data => {
            setDashboardKPIs(data);
        }).catch(err => console.error("Dashboard KPIs:", err));

        api.get(`/admin/dashboard/earnings?period=${periodParam}`).then(data => {
            if (Array.isArray(data) && data.length > 0) setEarningsData(data);
        }).catch(err => console.error("Earnings:", err));

        const fmtLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const selectedDateStr = fmtLocalDate(propertyDate);
        api.get(`/admin/dashboard/property-status?date=${selectedDateStr}`).then(data => {
            if (data?.properties && data.properties.length > 0) {
                const bookings = data.activeBookings || [];
                // Enrich properties client-side with booked/bookingStatus from activeBookings
                const enriched = data.properties.map((p: any) => {
                    // Find bookings for this property (no sub-property)
                    const propBookings = bookings.filter((b: any) => b.propertyId === p.id && !b.subPropertyId);
                    // Separate checkout-only bookings from active/checkin bookings
                    const propCheckoutOnlyBookings = propBookings.filter((b: any) => b.checkOutDate?.slice(0, 10) === selectedDateStr && b.checkInDate?.slice(0, 10) !== selectedDateStr);
                    const propActiveBookings = propBookings.filter((b: any) => b.checkOutDate?.slice(0, 10) !== selectedDateStr);
                    const propCheckinBookings = propBookings.filter((b: any) => b.checkInDate?.slice(0, 10) === selectedDateStr);
                    const propBooking = propActiveBookings[0] || null;
                    const propCheckoutBooking = propCheckoutOnlyBookings[0] || null;
                    const propCheckinBooking = propCheckinBookings[0] || null;

                    // Collect ALL bookings for this property's sub-properties
                    const propSubBookings = bookings.filter((b: any) => b.propertyId === p.id && b.subPropertyId);
                    const enrichedVillas = (p.villas || []).map((v: any) => {
                        const villaBookings = bookings.filter((b: any) => b.subPropertyId === v.id);
                        // Separate checkout-only vs active bookings for this villa
                        const checkoutOnlyBookings = villaBookings.filter((b: any) => b.checkOutDate?.slice(0, 10) === selectedDateStr && b.checkInDate?.slice(0, 10) !== selectedDateStr);
                        const activeBookings = villaBookings.filter((b: any) => b.checkOutDate?.slice(0, 10) !== selectedDateStr);
                        const checkinBookings = villaBookings.filter((b: any) => b.checkInDate?.slice(0, 10) === selectedDateStr);
                        const villaBooking = activeBookings[0] || null;
                        const checkoutBooking = checkoutOnlyBookings[0] || null;
                        const checkinBooking = checkinBookings[0] || null;
                        // booked = true only if there's an active (non-checkout-only) booking
                        const isBooked = villaBooking ? true : (checkinBooking ? true : false);
                        // Use active/checkin booking for details, fallback to checkout booking for display
                        const primaryBooking = villaBooking || checkinBooking;
                        return {
                            ...v,
                            booked: isBooked,
                            bookingStatus: v.bookingStatus ?? (primaryBooking?.status || null),
                            isCheckinDay: v.isCheckinDay ?? (checkinBooking ? true : false),
                            isCheckoutDay: v.isCheckoutDay ?? (checkoutBooking ? true : false),
                            guest: v.guest ?? (primaryBooking?.customerName || null),
                            guests: v.guests || (primaryBooking?.numGuests || 0),
                            kids: v.kids ?? (primaryBooking?.numKids || 0),
                            balanceAmount: v.balanceAmount ?? (primaryBooking?.balanceAmount || null),
                            depositAmount: v.depositAmount ?? (primaryBooking?.securityDeposit || null),
                            totalAmount: v.totalAmount ?? (primaryBooking?.totalAmount || null),
                            addons: v.addons ?? (primaryBooking?.addons || null),
                            phone: v.phone ?? (primaryBooking?.customerPhone || null),
                            depositRefunded: v.depositRefunded ?? (primaryBooking?.depositRefunded || false),
                            depositRefundMethod: v.depositRefundMethod ?? (primaryBooking?.depositRefundMethod || null),
                            depositRefundedAt: v.depositRefundedAt ?? (primaryBooking?.depositRefundedAt || null),
                            _allBookings: villaBookings, // Store all bookings for this sub-property
                            _checkoutBooking: checkoutBooking, // Separate checkout booking for badge
                        };
                    });
                    // Standalone property: same checkout-day logic
                    const isPropBooked = propBooking ? true : (propCheckinBooking ? true : false);
                    const primaryPropBooking = propBooking || propCheckinBooking;
                    return {
                        ...p,
                        booked: isPropBooked,
                        bookingStatus: p.bookingStatus ?? (primaryPropBooking?.status || null),
                        isCheckinDay: p.isCheckinDay ?? (propCheckinBooking ? true : false),
                        isCheckoutDay: p.isCheckoutDay ?? (propCheckoutBooking ? true : false),
                        balanceAmount: p.balanceAmount ?? (primaryPropBooking?.balanceAmount || null),
                        depositAmount: p.depositAmount ?? (primaryPropBooking?.securityDeposit || null),
                        totalAmount: p.totalAmount ?? (primaryPropBooking?.totalAmount || null),
                        addons: p.addons ?? (primaryPropBooking?.addons || null),
                        _checkoutBooking: propCheckoutBooking,
                        villas: enrichedVillas,
                    };
                });
                setPropertyStatusLive(enriched);
            }
        }).catch(err => console.error("Property status:", err));

        api.get("/bookings/dd").then(data => {
            if (Array.isArray(data) && data.length > 0) setDdBookingsLive(data);
        }).catch(err => console.error("DD bookings:", err));
    }, [propertyDate, ddViewDate, timeRange]);

    // API-loaded dashboard data
    const [dashboardKPIs, setDashboardKPIs] = useState<any>(null);
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [propertyStatusLive, setPropertyStatusLive] = useState<any[]>([]);
    const [ddBookingsLive, setDdBookingsLive] = useState<any[]>([]);

    // Website tab — Blackout Calendar
    const [blackoutPropertyKey, setBlackoutPropertyKey] = useState("");
    const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
    const [blackoutReason, setBlackoutReason] = useState("");
    const [blackoutViewMonth, setBlackoutViewMonth] = useState(new Date());
    const [activeBlocks, setActiveBlocks] = useState<any[]>([]);
    const [propertyList, setPropertyList] = useState<any[]>([]);
    const [blackoutLoading, setBlackoutLoading] = useState(false);
    const [blockNumUnits, setBlockNumUnits] = useState(1);
    const [blockDateFilter, setBlockDateFilter] = useState<'current' | 'past'>('current');

    // Fetch list of properties for dropdown
    useEffect(() => {
        api.get("/properties").then(data => {
            if (Array.isArray(data)) setPropertyList(data);
        }).catch(() => {});
    }, []);

    // Build dropdown options from real property data
    const propertyOptions = (() => {
        const standalone: string[] = [];
        const ambroseVillas: string[] = [];
        const amstelNest: string[] = [];
        propertyList.forEach(p => {
            // Exclude Digital Diaries from the calendar dropdown
            if (p.slug === 'digital-diaries' || p.name === 'Digital Diaries') return;
            if (p.subProperties && p.subProperties.length > 0) {
                p.subProperties.forEach((sp: any) => {
                    const label = `${p.name} — ${sp.name}`;
                    if (p.slug === 'ambrose') ambroseVillas.push(label);
                    else if (p.slug === 'amstel-nest') amstelNest.push(label);
                });
            } else {
                standalone.push(p.name);
            }
        });
        const opts: any[] = [];
        if (standalone.length) opts.push({ label: "Standalone Properties", options: standalone });
        if (ambroseVillas.length) opts.push({ label: "Ambrose Villas", options: ambroseVillas });
        if (amstelNest.length) opts.push({ label: "Amstel Nest", options: amstelNest });
        return opts;
    })();

    // Resolve selected dropdown label to propertyId + subPropertyId
    const resolvePropertyIds = (label: string) => {
        for (const p of propertyList) {
            if (p.subProperties && p.subProperties.length > 0) {
                for (const sp of p.subProperties) {
                    if (`${p.name} — ${sp.name}` === label) return { propertyId: p.id, subPropertyId: sp.id };
                }
            }
            if (p.name === label) return { propertyId: p.id, subPropertyId: null };
        }
        return { propertyId: null, subPropertyId: null };
    };

    // Fetch blocked dates
    const fetchBlockedDates = async () => {
        try {
            const data = await api.get("/blocked-dates");
            if (Array.isArray(data)) setActiveBlocks(data);
        } catch {}
    };

    useEffect(() => { fetchBlockedDates(); }, []);

    // Helper: format local Date as YYYY-MM-DD without timezone shift
    const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Helper: parse "2026-03-30T00:00:00.000Z" as day 30 (not shifted by timezone)
    const parseDateDay = (iso: string) => {
        const parts = iso.split('T')[0].split('-');
        return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) };
    };

    // Create blocked dates
    const handleBlockDates = async () => {
        if (blackoutDates.length === 0 || !blackoutReason || !blackoutPropertyKey) {
            alert("Please select a property, at least one date, and a reason.");
            return;
        }
        const { propertyId, subPropertyId } = resolvePropertyIds(blackoutPropertyKey);
        if (!propertyId) { alert("Invalid property selected."); return; }
        setBlackoutLoading(true);
        try {
            await api.post("/blocked-dates", {
                propertyId,
                subPropertyId,
                dates: blackoutDates.map(d => formatLocalDate(d)),
                reason: blackoutReason,
                numUnits: isMultiUnitProperty ? blockNumUnits : 1,
            });
            setBlackoutDates([]);
            setBlackoutReason("");
            setBlockNumUnits(1);
            fetchBlockedDates();
            fetchBookedDays();
        } catch (err) {
            alert("Failed to block dates. Please try again.");
        }
        setBlackoutLoading(false);
    };

    // Delete a blocked date
    const handleUnblockDate = async (id: number) => {
        try {
            await api.delete(`/blocked-dates/${id}`);
            fetchBlockedDates();
        } catch {
            alert("Failed to unblock date.");
        }
    };

    const filteredBlocks = (() => {
        let blocks = activeBlocks;
        if (blackoutPropertyKey) {
            const { propertyId, subPropertyId } = resolvePropertyIds(blackoutPropertyKey);
            blocks = blocks.filter(b => {
                if (subPropertyId) return b.subPropertyId === subPropertyId;
                if (propertyId) return b.propertyId === propertyId;
                return true;
            });
        }
        // Apply date filter
        const todayStr = formatLocalDate(new Date());
        if (blockDateFilter === 'current') {
            blocks = blocks.filter(b => b.blockedDate.split('T')[0] >= todayStr);
        } else {
            blocks = blocks.filter(b => b.blockedDate.split('T')[0] < todayStr);
        }
        return blocks;
    })();

    // Get blocked day numbers for the calendar for the current month + selected property
    const getBlockedDaysForMonth = () => {
        const year = blackoutViewMonth.getFullYear();
        const month = blackoutViewMonth.getMonth();
        return filteredBlocks
            .filter(b => {
                const p = parseDateDay(b.blockedDate);
                return p.year === year && p.month === month;
            })
            .map(b => parseDateDay(b.blockedDate).day);
    };

    // Booked days from actual bookings (cannot be blocked, shown as grey/booked)
    const [bookedDays, setBookedDays] = useState<number[]>([]);
    const fetchBookedDays = async () => {
        if (!blackoutPropertyKey) { setBookedDays([]); return; }
        const { propertyId, subPropertyId } = resolvePropertyIds(blackoutPropertyKey);
        if (!propertyId) { setBookedDays([]); return; }
        const year = blackoutViewMonth.getFullYear();
        const month = String(blackoutViewMonth.getMonth() + 1).padStart(2, '0');
        try {
            const bookings = await api.get(`/blocked-dates/bookings?propertyId=${propertyId}${subPropertyId ? `&subPropertyId=${subPropertyId}` : ''}&month=${year}-${month}`);
            if (!Array.isArray(bookings)) { setBookedDays([]); return; }
            const days = new Set<number>();
            const monthStart = new Date(year, blackoutViewMonth.getMonth(), 1);
            const monthEnd = new Date(year, blackoutViewMonth.getMonth() + 1, 0);
            for (const b of bookings) {
                const checkIn = new Date(b.checkInDate);
                const checkOut = new Date(b.checkOutDate);
                const start = checkIn < monthStart ? monthStart : checkIn;
                const end = checkOut > monthEnd ? monthEnd : checkOut;
                for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    days.add(d.getDate());
                }
            }
            setBookedDays(Array.from(days));
        } catch { setBookedDays([]); }
    };

    useEffect(() => { fetchBookedDays(); }, [blackoutPropertyKey, blackoutViewMonth]);

    // Site images
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    const [uploadingSection, setUploadingSection] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
        const allIds = new Set<string>();
        [...staycationGroups, ...ddGroups].forEach(g => {
            allIds.add(g.id);
            g.subSections.forEach(s => allIds.add(s.id));
        });
        return allIds;
    });

    const fetchSiteImages = useCallback(() => {
        api.get("/site-images").then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(err => console.error("Site images:", err));
    }, []);

    useEffect(() => {
        if (activeTab === "website") fetchSiteImages();
    }, [activeTab, fetchSiteImages]);

    const handleImageUpload = async (section: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploadingSection(section);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("section", section);
                // Videos are too large for Vercel's rewrite proxy (4.5MB limit)
                // Upload directly to EC2 backend for video files
                const isVideo = file.type.startsWith('video/');
                if (isVideo) {
                    const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token");
                    const headers: Record<string, string> = {};
                    if (token) headers["Authorization"] = `Bearer ${token}`;
                    const res = await fetch("http://65.1.183.241:4000/api/site-images", {
                        method: "POST", headers, body: formData,
                    });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
                } else {
                    await api.upload("/site-images", formData);
                }
            }
            fetchSiteImages();
        } catch (err) {
            console.error("Upload failed:", err);
        }
        setUploadingSection(null);
    };

    const handleImageDelete = async (id: number) => {
        try {
            await api.delete(`/site-images/${id}`);
            fetchSiteImages();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete image. Please try again.");
        }
    };

    const toggleSection = (id: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Live calendar view
    const [calendarProperty, setCalendarProperty] = useState("Heavenly Villa");
    const [calendarViewMonth, setCalendarViewMonth] = useState(new Date());
    const [calendarBookedDays, setCalendarBookedDays] = useState<number[]>([]);
    const [calendarDayCounts, setCalendarDayCounts] = useState<Record<number, number>>({});
    const [calendarCapacity, setCalendarCapacity] = useState(1);
    // Determine if the current calendar property is a multi-unit property
    const isMultiUnitProperty = calendarCapacity > 1;
    // Sync blackout property key with calendar property on initial load
    useEffect(() => { if (!blackoutPropertyKey) setBlackoutPropertyKey("Heavenly Villa"); }, []);

    // Fetch booked days for the live calendar (separate from blackout calendar)
    useEffect(() => {
        const fetchCalendarBookings = async () => {
            if (!calendarProperty || propertyList.length === 0) { setCalendarBookedDays([]); setCalendarDayCounts({}); setCalendarCapacity(1); return; }
            const { propertyId, subPropertyId } = resolvePropertyIds(calendarProperty);
            if (!propertyId) { setCalendarBookedDays([]); setCalendarDayCounts({}); setCalendarCapacity(1); return; }
            
            // Get capacity for this property/sub-property
            const prop = propertyList.find((p: any) => p.id === propertyId);
            let cap = 1;
            if (prop && prop.subProperties && subPropertyId) {
                const sp = prop.subProperties.find((s: any) => s.id === subPropertyId);
                cap = sp?.unitCount || 1;
            }
            setCalendarCapacity(cap);
            
            const year = calendarViewMonth.getFullYear();
            const month = String(calendarViewMonth.getMonth() + 1).padStart(2, '0');
            try {
                const bookings = await api.get(`/blocked-dates/bookings?propertyId=${propertyId}${subPropertyId ? `&subPropertyId=${subPropertyId}` : ''}&month=${year}-${month}`);
                if (!Array.isArray(bookings)) { setCalendarBookedDays([]); setCalendarDayCounts({}); return; }
                const dayCounts: Record<number, number> = {};
                const monthStart = new Date(year, calendarViewMonth.getMonth(), 1);
                const monthEnd = new Date(year, calendarViewMonth.getMonth() + 1, 0);
                for (const b of bookings) {
                    const ciParts = b.checkInDate.split('T')[0].split('-');
                    const coParts = b.checkOutDate.split('T')[0].split('-');
                    const checkIn = new Date(parseInt(ciParts[0]), parseInt(ciParts[1]) - 1, parseInt(ciParts[2]));
                    const checkOut = new Date(parseInt(coParts[0]), parseInt(coParts[1]) - 1, parseInt(coParts[2]));
                    const start = checkIn < monthStart ? monthStart : checkIn;
                    const end = checkOut > monthEnd ? monthEnd : checkOut;
                    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                        dayCounts[d.getDate()] = (dayCounts[d.getDate()] || 0) + (b.numCottages || 1);
                    }
                }
                // Also count blocked dates towards occupancy (for multi-unit properties)
                if (cap > 1) {
                    const blocksForProperty = activeBlocks.filter(bl => {
                        if (subPropertyId && bl.subPropertyId !== subPropertyId) return false;
                        if (!subPropertyId && bl.propertyId !== propertyId) return false;
                        const p = parseDateDay(bl.blockedDate);
                        return p.year === year && p.month === calendarViewMonth.getMonth();
                    });
                    for (const bl of blocksForProperty) {
                        const p = parseDateDay(bl.blockedDate);
                        dayCounts[p.day] = (dayCounts[p.day] || 0) + (bl.numUnits || 1);
                    }
                }
                // A day is "fully booked" when count >= capacity
                const fullyBooked = Object.entries(dayCounts)
                    .filter(([, count]) => count >= cap)
                    .map(([day]) => parseInt(day));
                setCalendarBookedDays(fullyBooked);
            } catch { setCalendarBookedDays([]); setCalendarDayCounts({}); }
        };
        fetchCalendarBookings();
        // Auto-refresh every 30s so new bookings are reflected in real-time
        const interval = setInterval(fetchCalendarBookings, 30000);
        return () => clearInterval(interval);
    }, [calendarProperty, calendarViewMonth, propertyList, activeBlocks]);


    const timeRanges = [
        { key: "1m", label: "1 Month" },
        { key: "3m", label: "3 Months" },
        { key: "6m", label: "6 Months" },
        { key: "1y", label: "Yearly" },
    ];

    // ─── STATUS ROW COMPONENT ──────────────────────────────────────────────────
    const StatusRow = ({ item }: { item: any }) => {
        const isExpanded = expandedProperty === item.name || expandedVilla === item.name;
        const toggle = () => {
            if (expandedVilla !== null) setExpandedVilla(isExpanded ? null : item.name);
            else setExpandedProperty(isExpanded ? null : item.name);
        };

        const displayBooking = propertyStatusMode === "checkin"
            ? (item.booked ? item : null)
            : (item._checkoutBooking || (item.booked && item.isCheckoutDay ? item : null));

        const isBooked = !!displayBooking;

        // Unified Status Badge (No check-in/out pending flags in headers)
        const renderStatusBadges = () => {
            if (isBooked) {
                return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase font-black">Booked</span>;
            }
            return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase font-black">Vacant</span>;
        };

        // Dynamically resolve properties based on displayBooking
        const guestName = displayBooking === item
            ? item.guest
            : (item._checkoutBooking?.customerName || item.guest);

        const guestsCount = displayBooking === item
            ? item.guests
            : (item._checkoutBooking?.numGuests || item.guests);

        const kidsCount = displayBooking === item
            ? item.kids
            : (item._checkoutBooking?.numKids || item.kids || 0);

        const guestPhone = displayBooking === item
            ? item.phone
            : (item._checkoutBooking?.customerPhone || item.phone);

        const checkOutDateStr = displayBooking === item
            ? item.checkOutDate
            : (item._checkoutBooking?.checkOutDate
                ? new Date(item._checkoutBooking.checkOutDate).toLocaleDateString('en-IN')
                : item.checkOutDate);

        const balanceAmt = displayBooking === item
            ? item.balanceAmount
            : (item._checkoutBooking?.balanceAmount ?? item.balanceAmount);

        const isBalanceCollected = displayBooking === item
            ? item.balanceCollected
            : (item._checkoutBooking?.status === 'checked_out' || item._checkoutBooking?.balanceAmount === 0 || (item._checkoutBooking?.collectedAmount > 0));

        const depositAmt = displayBooking === item
            ? item.depositAmount
            : (item._checkoutBooking?.securityDeposit ?? item.depositAmount);

        const isDepositCollected = displayBooking === item
            ? item.depositCollected
            : (item._checkoutBooking?.status === 'checked_out' || item._checkoutBooking?.depositRefunded);

        const isDepositRefunded = displayBooking === item
            ? item.depositRefunded
            : (item._checkoutBooking?.depositRefunded ?? item.depositRefunded);

        const depositRefundMethod = displayBooking === item
            ? item.depositRefundMethod
            : (item._checkoutBooking?.depositRefundMethod ?? item.depositRefundMethod);

        const depositRefundedAt = displayBooking === item
            ? item.depositRefundedAt
            : (item._checkoutBooking?.depositRefundedAt ?? item.depositRefundedAt);

        const addonsList = displayBooking === item
            ? item.addons
            : (item._checkoutBooking?.addons ?? item.addons);

        const extraGuestsList = displayBooking === item
            ? item.extraGuests
            : (item._checkoutBooking?.extraGuests ?? item.extraGuests);

        const resolvedStatus = propertyStatusMode === "checkin"
            ? (item.checkedIn ? "Checked In" : "Pending")
            : ((displayBooking?.bookingStatus === "checked_out" || displayBooking?.status === "checked_out" || item.bookingStatus === "checked_out") ? "Checked Out" : "Pending");

        const showContinueRed = propertyStatusMode === "checkin" && item.booked && !item.isCheckinDay;

        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={toggle} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                        {renderStatusBadges()}
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                {isExpanded && isBooked && (
                    <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                    <UserIcon size={12} />
                                    {guestName}
                                    {showContinueRed && (
                                        <span className="text-red-600 font-extrabold ml-1 animate-pulse">(Continue)</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                    <Users size={12} />
                                    {guestsCount} adult{guestsCount !== 1 ? 's' : ''}
                                    {kidsCount > 0 && <span className="text-blue-600 ml-1">{kidsCount} child{kidsCount !== 1 ? 'ren' : ''}</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate max-w-[180px]">
                                    <Phone size={12} />
                                    {guestPhone && guestPhone.length < 20 ? guestPhone : 'On file'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                    <CalendarDays size={12} />
                                    {checkOutDateStr || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                                        resolvedStatus === 'Checked In' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                        resolvedStatus === 'Checked Out' ? 'bg-slate-100 border-slate-300 text-slate-600' :
                                        'bg-amber-50 border-amber-200 text-amber-700'
                                    }`}>
                                        {resolvedStatus}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className={`p-3 rounded-lg border ${isBalanceCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isBalanceCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Balance {isBalanceCollected ? '✓ Collected' : '⏳ Pending'}
                                </p>
                                {balanceAmt && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(balanceAmt).toLocaleString('en-IN')}</p>}
                                {isBalanceCollected && item.balanceCollected && (
                                    <p className="text-xs font-medium text-slate-600 mt-1">
                                        via {item.balanceMode} · {item.balanceTime}
                                    </p>
                                )}
                            </div>
                            <div className={`p-3 rounded-lg border ${isDepositCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDepositCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Security Deposit {isDepositCollected ? '✓ Collected' : '⏳ Pending'}
                                </p>
                                {depositAmt && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(depositAmt).toLocaleString('en-IN')}</p>}
                                {isDepositCollected && item.depositCollected && (
                                    <p className="text-xs font-medium text-slate-600 mt-1">
                                        via {item.depositMode} · {item.depositTime}
                                    </p>
                                )}
                            </div>
                            {isDepositRefunded && (
                                <div className="p-3 rounded-lg border bg-rose-50 border-rose-200">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                                        Security Deposit ↩ Refunded
                                    </p>
                                    {depositAmt && <p className="text-xs font-bold text-rose-700 mt-0.5">₹{Number(depositAmt).toLocaleString('en-IN')}</p>}
                                    <p className="text-xs font-medium text-slate-600 mt-1">
                                        via {(depositRefundMethod || 'N/A').toUpperCase()}{depositRefundedAt ? ` · ${new Date(depositRefundedAt).toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                    </p>
                                </div>
                            )}
                            {addonsList && Array.isArray(addonsList) && addonsList.length > 0 && (
                                <div className="col-span-2 p-3 rounded-lg border bg-purple-50 border-purple-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Celebration Add-on</p>
                                    <p className="text-xs font-bold text-purple-800 mt-0.5">₹{Number(addonsList[0].price || 1200).toLocaleString('en-IN')}</p>
                                    {addonsList[0].cakeMessage && <p className="text-[10px] text-slate-600 mt-1">Cake: {addonsList[0].cakeMessage}</p>}
                                    {addonsList[0].occasion && <p className="text-[10px] text-slate-600">Occasion: {addonsList[0].occasion}</p>}
                                </div>
                            )}
                        </div>

                        {/* Extra Guests Display */}
                        {extraGuestsList && extraGuestsList.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extra Guests Added ({extraGuestsList.length})</h4>
                                <div className="space-y-2">
                                    {extraGuestsList.map((eg: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                    <Users size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{eg.guestName || eg.name}</p>
                                                    <p className="text-[9px] font-medium text-slate-500">{eg.idProofType || eg.idType}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-600">+₹{eg.chargeAmount || eg.amount || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{eg.paymentMethod || eg.paymentMode}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isExpanded && !isBooked && (
                    <div className="p-4 pt-0 border-t border-slate-100">
                        <p className="text-sm text-slate-400 font-medium py-4 text-center">No active booking for this property.</p>
                    </div>
                )}
            </div>
        );
    };

    // â”€â”€â”€ TAB: DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const renderDashboard = () => {
        const liveProperties = propertyStatusLive.length > 0 ? propertyStatusLive : [];
        const liveAmbrose = propertyStatusLive.length > 0 ? propertyStatusLive.find((p: any) => p.name === 'Ambrose')?.villas || [] : [];
        const liveAmstel = propertyStatusLive.length > 0 ? propertyStatusLive.find((p: any) => p.name === 'Amstel Nest')?.villas || [] : [];
        const liveStandalone = liveProperties.filter((p: any) => !['Ambrose', 'Amstel Nest'].includes(p.name));

        const occupiedAmbroseCount = liveAmbrose.filter((v: any) => v.booked).length;
        // Amstel Nest: Standard Cottage may have multiple bookings (14 units), count them
        const amstelStdCottage = liveAmstel.find((v: any) => v.name === 'Standard Cottage');
        const amstelStdBooked = amstelStdCottage?._allBookings?.reduce((sum: number, b: any) => sum + (b.numCottages || 1), 0) || (amstelStdCottage?.booked ? 1 : 0);
        const amstelOthersBooked = liveAmstel.filter((v: any) => v.name !== 'Standard Cottage' && v.booked).length;
        const occupiedAmstelCount = amstelStdBooked + amstelOthersBooked;
        const totalAmstelUnits = 14 + liveAmstel.filter((v: any) => v.name !== 'Standard Cottage').length;
        const occupiedStandaloneCount = liveStandalone.filter((p: any) => p.booked).length;

        const totalOccupied = occupiedAmbroseCount + occupiedAmstelCount + occupiedStandaloneCount;
        const totalUnits = liveAmbrose.length + totalAmstelUnits + liveStandalone.length;

        // KPI cards data
        const totalRevenue = dashboardKPIs?.kpis?.totalRevenue || 0;
        const staycationRevenue = dashboardKPIs?.kpis?.staycationRevenue || 0;
        const totalNights = dashboardKPIs?.kpis?.totalNightsBooked || 0;
        const totalStayBookings = dashboardKPIs?.kpis?.totalStayBookings || 0;
        const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
        const avgNightlyRate = totalNights > 0 ? Math.round(staycationRevenue / totalNights) : 0;

        // Live calendar helpers
        const calendarYear = calendarViewMonth.getFullYear();
        const calendarMonth = calendarViewMonth.getMonth();
        const calFirstDay = new Date(calendarYear, calendarMonth, 1).getDay();
        const calDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        
        // Calculate dynamic booked dates for the selected property (from API)
        const bookedDaysSet = new Set<number>(calendarBookedDays);

        return (
            <div className="space-y-8">
                {/* Time Range + Sub-tab Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {([["insights", "Insights"], ["calendar", "Live Calendar"], ["bulk", "Bulk Bookings"], ["calendar2", "Live Calendar 2"]] as const).map(([key, label]) => (
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
                    {dashboardSubTab === "insights" && (
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
                    )}
                </div>

                {/* Sub-tab Content */}
                {dashboardSubTab === "insights" && (
                    <>
                        {/* Occupancy Alerts  */}
                        {(occupiedAmbroseCount > 0 && occupiedAmbroseCount === liveAmbrose.length ||
                            occupiedAmstelCount > 0 && occupiedAmstelCount === totalAmstelUnits) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                                    <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                                        <CheckCircle size={18} className="text-amber-600" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800 tracking-tight">Fully Booked Properties Alert</h4>
                                        <div className="mt-1 space-y-1">
                                            {occupiedAmbroseCount > 0 && occupiedAmbroseCount === liveAmbrose.length && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Ambrose is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">{occupiedAmbroseCount}/{liveAmbrose.length} VILLAS FULL</span>
                                                </p>
                                            )}
                                            {occupiedAmstelCount > 0 && occupiedAmstelCount === totalAmstelUnits && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Amstel Nest is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">{occupiedAmstelCount}/{totalAmstelUnits} VILLAS FULL</span>
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
                                    <p className="text-xl font-bold text-emerald-700 mt-1">₹{staycationRevenue.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium mt-1">this period</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
                                    <p className="text-xl font-bold text-purple-700 mt-1">{occupancyRate}%</p>
                                    <p className="text-[10px] text-purple-500 font-medium mt-1">{totalOccupied} / {totalUnits} units occupied</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Nightly Rate</p>
                                    <p className="text-xl font-bold text-indigo-700 mt-1">₹{avgNightlyRate.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-indigo-500 font-medium mt-1">Across all properties</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                                    <p className="text-xl font-bold text-amber-700 mt-1">{totalStayBookings}</p>
                                    <p className="text-[10px] text-amber-500 font-medium mt-1">this period</p>
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
                                    <p className="text-[10px] text-violet-500 font-medium mt-1">this period</p>
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
                                            <Pie data={dashboardKPIs?.charts?.ambrose || []} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="sales" nameKey="name" stroke="none">
                                                {(dashboardKPIs?.charts?.ambrose || []).map((entry: any, index: number) => (
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
                                            <BarChart data={dashboardKPIs?.charts?.amstelSales || []}>
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
                                            <BarChart data={dashboardKPIs?.charts?.amstelNights || []}>
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
                            <p className="text-sm text-slate-500 font-medium mb-6">Total sales and nights booked for Hill View, Mount View, La Paraiso & Heavenly Villa.</p>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Total Sales by Villa</h3>
                                <p className="text-xs text-slate-400 font-medium mb-4">Hover to see nights spent at each villa</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dashboardKPIs?.charts?.standaloneVillas || []} barCategoryGap="20%">
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
                                            {(dashboardKPIs?.charts?.standaloneVillas || []).map((entry: any, index: number) => (
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
                                    <LineChart data={timeRange === '1m' ? (dashboardKPIs?.charts?.earnings1Month || []) : (dashboardKPIs?.charts?.earningsYearly || []).slice(timeRange === '3m' ? -3 : timeRange === '6m' ? -6 : 0)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} />
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
                                {/* DD Booking Source — now in left column */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Digital Diaries Booking Source — Website vs Walk-in</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={(() => {
                                                const src = dashboardKPIs?.ddBookingSources;
                                                if (!src) return [];
                                                return [
                                                    { name: 'Website', value: src.website || 0, fill: '#7c3aed' },
                                                    { name: 'Walk-in', value: src.walkIn || 0, fill: '#c4b5fd' },
                                                ].filter((d: any) => d.value > 0);
                                            })()} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={6} dataKey="value" nameKey="name" stroke="none">
                                                {[{ fill: '#7c3aed' }, { fill: '#c4b5fd' }].map((entry, index) => (
                                                    <Cell key={`ddsrc-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }: any) => {
                                                    if (active && payload && payload.length) {
                                                        const d = payload[0].payload;
                                                        const src = dashboardKPIs?.ddBookingSources;
                                                        const total = (src?.website || 0) + (src?.walkIn || 0);
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

                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue by Package</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={dashboardKPIs?.charts?.ddPackage || []}>
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

                            {/* Revenue by Screen — now full width below */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue by Screen</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={dashboardKPIs?.charts?.ddScreen || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="screen" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                        <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }} />
                                        <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                    </BarChart>
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
                                    <AreaChart data={timeRange === '1m' ? (dashboardKPIs?.charts?.earnings1Month || []).map((e: any) => ({ period: e.period, ambrose: Math.round(e.staycation * 0.4 / 65), amstel: Math.round(e.staycation * 0.35 / 50), standalone: Math.round(e.staycation * 0.25 / 40) })) : (dashboardKPIs?.charts?.earningsYearly || []).slice(timeRange === '3m' ? -3 : timeRange === '6m' ? -6 : 0).map((e: any) => ({ period: e.period, ambrose: Math.min(100, Math.round(e.staycation * 0.4 / 650)), amstel: Math.min(100, Math.round(e.staycation * 0.35 / 500)), standalone: Math.min(100, Math.round(e.staycation * 0.25 / 400)) }))}>
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
                                    <BarChart data={(() => {
                                        const ambrose = dashboardKPIs?.charts?.ambrose || [];
                                        const amstel = dashboardKPIs?.charts?.amstelSales || [];
                                        const standalone = dashboardKPIs?.charts?.standaloneVillas || [];
                                        const ddScreen = dashboardKPIs?.charts?.ddScreen || [];
                                        const ambroseTotal = ambrose.reduce((s: number, e: any) => s + (e.sales || 0), 0);
                                        const amstelTotal = amstel.reduce((s: number, e: any) => s + (e.sales || 0), 0);
                                        const ddTotal = ddScreen.reduce((s: number, e: any) => s + (e.revenue || 0), 0);
                                        const result: any[] = [
                                            { property: 'Ambrose', current: ambroseTotal, previous: Math.round(ambroseTotal * 0.85) },
                                            { property: 'Amstel Nest', current: amstelTotal, previous: Math.round(amstelTotal * 0.9) },
                                        ];
                                        // Add individual standalone villas by name
                                        standalone.forEach((v: any) => {
                                            result.push({ property: v.name || v.villa || 'Villa', current: v.sales || 0, previous: Math.round((v.sales || 0) * 0.8) });
                                        });
                                        // Add Digital Diaries
                                        result.push({ property: 'Digital Diaries', current: ddTotal, previous: Math.round(ddTotal * 0.75) });
                                        return result;
                                    })()} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="property" tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} />
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
                                        <option>Heavenly Villa</option>
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
                                <p className="text-sm text-slate-500 font-medium mt-1">View booked, blocked, and free dates. Click dates to block them.</p>
                            </div>
                            <CustomSelect
                                value={calendarProperty}
                                onChange={(val: string) => { setCalendarProperty(val); setBlackoutPropertyKey(val); }}
                                options={propertyOptions.length > 0 ? propertyOptions : [
                                    "Hill View", "Mount View", "La Paraiso", "Heavenly Villa",
                                    ...(dashboardKPIs?.charts?.ambrose || []).map((v: any) => `Ambrose — ${v.name}`),
                                    ...Array.from({ length: 14 }, (_, i) => `Amstel Nest — Villa ${i + 1}`)
                                ]}
                            />
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={() => { setCalendarViewMonth(new Date(calendarYear, calendarMonth - 1, 1)); setBlackoutViewMonth(new Date(calendarYear, calendarMonth - 1, 1)); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                    <ChevronRight size={20} className="rotate-180" />
                                </button>
                                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                                    {calendarViewMonth.toLocaleString('default', { month: 'long' })} {calendarYear}
                                </h3>
                                <button onClick={() => { setCalendarViewMonth(new Date(calendarYear, calendarMonth + 1, 1)); setBlackoutViewMonth(new Date(calendarYear, calendarMonth + 1, 1)); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
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
                                {(() => {
                                    const blockedDays = getBlockedDaysForMonth();
                                    return Array.from({ length: calDaysInMonth }, (_, i) => {
                                        const d = i + 1;
                                        const date = new Date(calendarYear, calendarMonth, d);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        const isBookedLive = bookedDaysSet.has(d);
                                        const isBookedApi = bookedDays.includes(d);
                                        const isBooked = isBookedLive || isBookedApi;
                                        const isBlocked = blockedDays.includes(d);
                                        const isSelected = blackoutDates.some(bd => bd.getDate() === d && bd.getMonth() === calendarMonth && bd.getFullYear() === calendarYear);
                                        const isToday = new Date().getDate() === d && new Date().getMonth() === calendarMonth && new Date().getFullYear() === calendarYear;
                                        // For multi-unit properties (e.g., Amstel Nest), allow clicking on partially booked dates
                                        const dayCount = calendarDayCounts[d] || 0;
                                        const isFullyBooked = calendarCapacity <= 1
                                            ? (isBooked || isBlocked)
                                            : (dayCount >= calendarCapacity);
                                        const isClickable = !isFullyBooked;
                                        const showOccupancy = calendarCapacity > 1 && dayCount > 0;
                                        return (
                                            <button
                                                key={d}
                                                disabled={!isFullyBooked ? false : true}
                                                onClick={() => {
                                                    if (isFullyBooked) return;
                                                    if (isSelected) {
                                                        setBlackoutDates(blackoutDates.filter(bd => !(bd.getDate() === d && bd.getMonth() === calendarMonth && bd.getFullYear() === calendarYear)));
                                                    } else {
                                                        setBlackoutDates([...blackoutDates, date]);
                                                    }
                                                }}
                                                className={`h-16 rounded-xl flex flex-col items-center justify-center text-sm font-semibold border transition-all
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md cursor-pointer' :
                                                        isToday && !isBlocked && !isFullyBooked ? 'border-indigo-400 bg-white ring-2 ring-indigo-200 text-indigo-700 cursor-pointer' :
                                                            isFullyBooked ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-not-allowed opacity-60' :
                                                                (isBooked && calendarCapacity > 1) ? 'bg-blue-50/50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer' :
                                                                    isBlocked ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer' :
                                                                        isWeekend ? 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer' :
                                                                            'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
                                            >
                                                <span className={`font-bold ${isToday && !isSelected ? 'text-indigo-700' : ''}`}>{d}</span>
                                                {showOccupancy ? (
                                                    <span className={`text-[8px] font-black ${
                                                        isBooked ? 'text-blue-600' :
                                                        dayCount >= calendarCapacity * 0.8 ? 'text-amber-600' :
                                                        'text-emerald-600'}`}>
                                                        {dayCount}/{calendarCapacity}
                                                    </span>
                                                ) : (
                                                    <span className={`text-[9px] font-medium ${
                                                        isSelected ? 'text-indigo-200' :
                                                        isBooked ? 'text-blue-500' :
                                                        isBlocked ? 'text-rose-500' :
                                                        isWeekend ? 'text-stone-400' : 'text-slate-400'}`}>
                                                        {isSelected ? 'Selected' : isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Free'}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 flex-wrap">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400" /><span className="text-xs font-medium text-slate-500">Free</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400" /><span className="text-xs font-medium text-slate-500">Booked</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-400" /><span className="text-xs font-medium text-slate-500">Blocked</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-stone-300" /><span className="text-xs font-medium text-slate-500">Weekend</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-xs font-medium text-slate-500">Selected</span></div>
                            </div>
                        </div>

                        {/* Blackout Controls Panel */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Block / Unblock Dates</h3>
                            <p className="text-sm text-slate-500 font-medium mb-5">Click dates on the calendar above to select them, then choose a reason and block.</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Reason + Units + Selected + Button */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Reason</label>
                                        <CustomSelect
                                            value={blackoutReason}
                                            onChange={setBlackoutReason}
                                            options={["Private Event", "Maintenance", "Owner Reservation", "Seasonal Closure", "Other"]}
                                        />
                                    </div>
                                    {isMultiUnitProperty && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 uppercase">Cottages to Block</label>
                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                                                <button
                                                    onClick={() => setBlockNumUnits(Math.max(1, blockNumUnits - 1))}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-lg transition-colors"
                                                >−</button>
                                                <div className="flex-1 text-center">
                                                    <span className="text-lg font-bold text-slate-800">{blockNumUnits}</span>
                                                    <span className="text-xs text-slate-400 font-medium ml-1">/ {calendarCapacity}</span>
                                                </div>
                                                <button
                                                    onClick={() => setBlockNumUnits(Math.min(calendarCapacity, blockNumUnits + 1))}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-lg transition-colors"
                                                >+</button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">Select how many cottages to block (out of {calendarCapacity} total)</p>
                                        </div>
                                    )}
                                    {blackoutDates.length > 0 && (
                                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                                            <p className="text-xs text-purple-600 font-bold uppercase">Selected Dates ({blackoutDates.length})</p>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {blackoutDates.map((d, idx) => (
                                                    <span key={idx} className="bg-white px-2 py-1 flex items-center gap-1 rounded border border-purple-200 text-[10px] font-bold text-purple-800 shadow-sm">
                                                        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        <X size={10} className="cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); setBlackoutDates(blackoutDates.filter((_, i) => i !== idx)); }} />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleBlockDates}
                                        disabled={blackoutDates.length === 0 || !blackoutReason || !blackoutPropertyKey || blackoutLoading}
                                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {blackoutLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <><Ban size={16} /> {isMultiUnitProperty ? `Block ${blockNumUnits} Cottage${blockNumUnits > 1 ? 's' : ''}` : 'Block Property'}</>
                                        )}
                                    </button>
                                </div>

                                {/* Right: Active Blocks for selected property */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Active Blocks — {calendarProperty || 'Select Property'}</h4>
                                    <div className="flex gap-1 mb-3">
                                        <button onClick={() => setBlockDateFilter('current')} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${blockDateFilter === 'current' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>Current</button>
                                        <button onClick={() => setBlockDateFilter('past')} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${blockDateFilter === 'past' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>Past</button>
                                    </div>
                                    <div className="space-y-2 flex-1 overflow-y-auto max-h-64 pr-1">
                                        {filteredBlocks.length === 0 ? (
                                            <p className="text-sm font-medium text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">No active blocks.</p>
                                        ) : (
                                            filteredBlocks.map(block => (
                                                <div key={block.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{block.subProperty ? `${block.property?.name} — ${block.subProperty.name}` : block.property?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center flex-wrap gap-1">
                                                            {(() => { const p = parseDateDay(block.blockedDate); return new Date(p.year, p.month, p.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })()}
                                                            {block.reason && <span className="text-[10px] text-red-500 font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{block.reason}</span>}
                                                            {(block.numUnits || 1) > 1 && <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">×{block.numUnits} cottages</span>}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => handleUnblockDate(block.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shrink-0">
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
                )}

                {/* BULK BOOKINGS TAB */}
                {dashboardSubTab === "bulk" && (
                    <BulkBookingsTab />
                )}

                {/* LIVE CALENDAR 2 TAB */}
                {dashboardSubTab === "calendar2" && (
                    <div className="space-y-6">
                        {/* Header + Month Picker */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Live Calendar 2</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Recreated matrix view showing occupancy, maintenance, and owner reservations.</p>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                                <button
                                    onClick={() => {
                                        setCalendar2Month(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider min-w-[140px] text-center select-none">
                                    {calendar2Month.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => {
                                        setCalendar2Month(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Format Switcher Selector & Color Code Legend */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/60 rounded-xl p-1 w-fit">
                                <button
                                    onClick={() => setCalendar2View("all")}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        calendar2View === "all" ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    All Properties
                                </button>
                                <button
                                    onClick={() => setCalendar2View("amstelnest")}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        calendar2View === "amstelnest" ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Amstelnest
                                </button>
                            </div>

                            {/* Color Legend Key */}
                            <div className="flex items-center gap-4 flex-wrap text-xs font-bold text-slate-500 select-none">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded border border-slate-300 bg-white" />
                                    <span>Vacant</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded border border-red-200 bg-red-50 text-red-600 font-black flex items-center justify-center text-[10px]">M</div>
                                    <span>Maintenance</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded border border-blue-200 bg-blue-50 text-blue-600 font-black flex items-center justify-center text-[10px]">OR</div>
                                    <span>Owner Reserved</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded border border-slate-300 bg-slate-200 text-slate-700 font-black flex items-center justify-center text-[10px]">B</div>
                                    <span>Booked</span>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid Table */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:overflow-hidden overflow-visible">
                            {calendar2Loading ? (
                                <div className="p-16 flex items-center justify-center text-slate-500 font-bold gap-3">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Loading calendar data...</span>
                                </div>
                            ) : (
                                <div className="overflow-auto max-h-[70vh] lg:max-h-none lg:overflow-x-auto max-w-full">
                                    {calendar2View === "all" ? (
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-24 max-lg:sticky max-lg:top-0 max-lg:left-0 max-lg:z-40 max-lg:bg-slate-50 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] max-lg:min-w-[96px] max-lg:max-w-[96px]">Date</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-16 max-lg:sticky max-lg:top-0 max-lg:left-[96px] max-lg:z-40 max-lg:bg-slate-50 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] max-lg:min-w-[64px] max-lg:max-w-[64px]">Day</th>
                                                    {["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS", "LA PARAISO", "MOUNT VIEW", "HEAVENLY VILLA", "HILL VIEW"].map(col => (
                                                        <th key={col} className="px-2 py-3 text-center text-[10px] font-black text-slate-700 border-r border-slate-200 uppercase tracking-tight min-w-[72px] max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:bg-slate-50 max-lg:min-w-[120px]">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const year = calendar2Month.getFullYear();
                                                    const mIdx = calendar2Month.getMonth();
                                                    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
                                                    const columns = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS", "LA PARAISO", "MOUNT VIEW", "HEAVENLY VILLA", "HILL VIEW"];

                                                    return Array.from({ length: daysInMonth }, (_, i) => {
                                                        const date = new Date(year, mIdx, i + 1);
                                                        const dateLabel = `${i + 1}-${calendar2Month.toLocaleString('default', { month: 'short' }).replace(' ', '-')}`;
                                                        const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
                                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                                        return (
                                                            <tr key={i} className={`border-b border-slate-200 hover:bg-slate-50/40 transition-colors ${isWeekend ? 'bg-slate-50/20' : ''}`}>
                                                                <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-800 border-r border-slate-200 bg-slate-50/50 max-lg:sticky max-lg:left-0 max-lg:z-20 max-lg:bg-slate-50 max-lg:min-w-[96px] max-lg:max-w-[96px] max-lg:w-24 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">{dateLabel}</td>
                                                                <td className={`px-3 py-2.5 text-center text-xs font-black border-r border-slate-200 bg-slate-50/30 max-lg:sticky max-lg:left-[96px] max-lg:z-20 max-lg:bg-slate-50 max-lg:min-w-[64px] max-lg:max-w-[64px] max-lg:w-16 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${isWeekend ? 'text-orange-500' : 'text-slate-500'}`}>{dayLabel}</td>
                                                                {columns.map(col => {
                                                                    const res = getCellStatus(date, "all", col);
                                                                    let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50";
                                                                    let content = "";
                                                                    if (res.status === "maintenance") {
                                                                        cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                                        content = "M";
                                                                    } else if (res.status === "owner_reserved") {
                                                                        cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                                        content = "OR";
                                                                    } else if (res.status === "booked") {
                                                                        cellClass = "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300/50 font-bold";
                                                                        content = "B";
                                                                    }

                                                                    return (
                                                                        <td
                                                                            key={col}
                                                                            onClick={() => setSelectedCell({ date, colType: "all", colName: col, ...res })}
                                                                            className={`px-2 py-2.5 text-center text-xs border-r border-b border-slate-200 cursor-pointer select-none transition-colors border-dashed ${cellClass}`}
                                                                        >
                                                                            {content}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-24 max-lg:sticky max-lg:top-0 max-lg:left-0 max-lg:z-40 max-lg:bg-slate-50 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] max-lg:min-w-[96px] max-lg:max-w-[96px]">Date</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-16 max-lg:sticky max-lg:top-0 max-lg:left-[96px] max-lg:z-40 max-lg:bg-slate-50 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] max-lg:min-w-[64px] max-lg:max-w-[64px]">Day</th>
                                                    {Array.from({ length: 14 }, (_, idx) => (
                                                        <th key={idx + 1} className="px-1 py-3 text-center text-xs font-black text-slate-700 border-r border-slate-200 min-w-[36px] max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:bg-slate-50">
                                                            {idx + 1}
                                                        </th>
                                                    ))}
                                                    <th className="px-2 py-3 text-center text-xs font-black text-slate-700 border-r border-slate-200 min-w-[50px] uppercase max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:bg-slate-50 max-lg:min-w-[100px]">FAMILY UNIT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const year = calendar2Month.getFullYear();
                                                    const mIdx = calendar2Month.getMonth();
                                                    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

                                                    return Array.from({ length: daysInMonth }, (_, i) => {
                                                        const date = new Date(year, mIdx, i + 1);
                                                        const dateLabel = `${i + 1}-${calendar2Month.toLocaleString('default', { month: 'short' }).replace(' ', '-')}`;
                                                        const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
                                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                                        return (
                                                            <tr key={i} className={`border-b border-slate-200 hover:bg-slate-50/40 transition-colors ${isWeekend ? 'bg-slate-50/20' : ''}`}>
                                                                <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-800 border-r border-slate-200 bg-slate-50/50 max-lg:sticky max-lg:left-0 max-lg:z-20 max-lg:bg-slate-50 max-lg:min-w-[96px] max-lg:max-w-[96px] max-lg:w-24 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">{dateLabel}</td>
                                                                <td className={`px-3 py-2.5 text-center text-xs font-black border-r border-slate-200 bg-slate-50/30 max-lg:sticky max-lg:left-[96px] max-lg:z-20 max-lg:bg-slate-50 max-lg:min-w-[64px] max-lg:max-w-[64px] max-lg:w-16 max-lg:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${isWeekend ? 'text-orange-500' : 'text-slate-500'}`}>{dayLabel}</td>
                                                                {Array.from({ length: 14 }, (_, idx) => {
                                                                    const unitIndex = idx + 1;
                                                                    const res = getCellStatus(date, "amstelnest", "Standard", unitIndex);
                                                                    let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50";
                                                                    let content = "";
                                                                    if (res.status === "maintenance") {
                                                                        cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                                        content = "M";
                                                                    } else if (res.status === "owner_reserved") {
                                                                        cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                                        content = "OR";
                                                                    } else if (res.status === "booked") {
                                                                        cellClass = "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300/50 font-bold";
                                                                        content = "B";
                                                                    }

                                                                    return (
                                                                        <td
                                                                            key={unitIndex}
                                                                            onClick={() => setSelectedCell({ date, colType: "amstelnest", colName: "Standard", unitIndex, ...res })}
                                                                            className={`px-1 py-2.5 text-center text-xs border-r border-b border-slate-200 cursor-pointer select-none transition-colors border-dashed ${cellClass}`}
                                                                        >
                                                                            {content}
                                                                        </td>
                                                                    );
                                                                })}
                                                                {(() => {
                                                                    const res = getCellStatus(date, "amstelnest", "FAMILY UNIT");
                                                                    let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50";
                                                                    let content = "";
                                                                    if (res.status === "maintenance") {
                                                                        cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                                        content = "M";
                                                                    } else if (res.status === "owner_reserved") {
                                                                        cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                                        content = "OR";
                                                                    } else if (res.status === "booked") {
                                                                        cellClass = "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300/50 font-bold";
                                                                        content = "B";
                                                                    }

                                                                    return (
                                                                        <td
                                                                            onClick={() => setSelectedCell({ date, colType: "amstelnest", colName: "FAMILY UNIT", ...res })}
                                                                            className={`px-2 py-2.5 text-center text-xs border-r border-b border-slate-200 cursor-pointer select-none transition-colors border-dashed ${cellClass}`}
                                                                        >
                                                                            {content}
                                                                        </td>
                                                                    );
                                                                })()}
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* BULK BOOKINGS TAB */}
                {dashboardSubTab === "bulk" && (
                    <BulkBookingsTab />
                )}
            </div>
        );
    };

    // ─── TAB: PROPERTIES ─────────────────────────────────────────────────────
    const renderProperties = () => {
        // Group live properties by cluster
        const liveProperties = propertyStatusLive.length > 0 ? propertyStatusLive : [];
        const liveAmbrose = propertyStatusLive.length > 0 ? propertyStatusLive.find((p: any) => p.name === 'Ambrose')?.villas || [] : [];
        const liveAmstel = propertyStatusLive.length > 0 ? propertyStatusLive.find((p: any) => p.name === 'Amstel Nest')?.villas || [] : [];
        const liveStandalone = liveProperties.filter((p: any) => !['Ambrose', 'Amstel Nest'].includes(p.name));

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Live Property Check-in Status</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Click a property to view guest details and payment status.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                            <button
                                onClick={() => setPropertyStatusMode("checkin")}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    propertyStatusMode === "checkin"
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Checkins
                            </button>
                            <button
                                onClick={() => setPropertyStatusMode("checkout")}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    propertyStatusMode === "checkout"
                                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Checkouts
                            </button>
                        </div>
                        <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
                    </div>
                </div>

                <div className="space-y-3">
                    {liveStandalone.map((item: any) => (
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
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase font-extrabold tracking-wider">
                                    {liveAmbrose.filter((v: any) => v.booked).length}/{liveAmbrose.length} Occupied
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
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase font-extrabold tracking-wider">
                                    {(() => {
                                        const stdCottage = liveAmstel.find((v: any) => v.name === 'Standard Cottage');
                                        const stdBooked = stdCottage?._allBookings?.reduce((sum: number, b: any) => sum + (b.numCottages || 1), 0) || (stdCottage?.booked ? 1 : 0);
                                        const othersBooked = liveAmstel.filter((v: any) => v.name !== 'Standard Cottage' && v.booked).length;
                                        const othersTotal = liveAmstel.filter((v: any) => v.name !== 'Standard Cottage').length;
                                        return `${stdBooked + othersBooked}/${14 + othersTotal} Occupied`;
                                    })()}
                                </span>
                            </div>
                            <ChevronRight size={16} className="text-slate-400" />
                        </button>
                    </div>
            </div>

            {/* Villa Modal */}
            {villaModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setVillaModal({ ...villaModal, open: false }); setExpandedVilla(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800">
                                {villaModal.type === "ambrose" ? "Ambrose — Villa Status" : "Amstel Nest — Villa Status"}
                            </h3>
                            <button onClick={() => { setVillaModal({ ...villaModal, open: false }); setExpandedVilla(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
                            {(() => {
                                const selectedDateStr = `${propertyDate.getFullYear()}-${String(propertyDate.getMonth() + 1).padStart(2, '0')}-${String(propertyDate.getDate()).padStart(2, '0')}`;
                                const rawVillas = villaModal.type === "ambrose" ? liveAmbrose : liveAmstel;
                                // For Amstel Nest: expand Standard Cottage into 14 individual units
                                let displayVillas = rawVillas;
                                if (villaModal.type === "amstel") {
                                    const expanded: any[] = [];
                                    // Get the Standard Cottage sub-property (has _allBookings from enrichment)
                                    const stdCottage = rawVillas.find((v: any) => v.name === 'Standard Cottage');
                                    const STANDARD_UNITS = 14;
                                    if (stdCottage) {
                                        // Expand bookings by numCottages: a booking with numCottages=2 fills 2 unit slots
                                        const stdBookings = stdCottage._allBookings || [];
                                        const filteredStdBookings = propertyStatusMode === "checkin"
                                            ? stdBookings.filter((bk: any) => bk.checkOutDate?.slice(0, 10) !== selectedDateStr || bk.checkInDate?.slice(0, 10) === selectedDateStr)
                                            : stdBookings.filter((bk: any) => bk.checkOutDate?.slice(0, 10) === selectedDateStr);

                                        const expandedBookings: any[] = [];
                                        for (const bk of filteredStdBookings) {
                                            const nc = bk.numCottages || 1;
                                            for (let c = 0; c < nc; c++) expandedBookings.push(bk);
                                        }
                                        for (let i = 1; i <= STANDARD_UNITS; i++) {
                                            const booking = expandedBookings[i - 1]; // Assign bookings sequentially to units
                                            if (booking) {
                                                expanded.push({
                                                    ...stdCottage,
                                                    name: `Standard Cottage ${i}`,
                                                    booked: true,
                                                    _isCottageUnit: true,
                                                    bookingStatus: booking.status,
                                                    checkedIn: booking.status === 'checked_in',
                                                    guest: booking.customerName || stdCottage.guest,
                                                    guests: booking.numGuests || stdCottage.guests,
                                                    kids: booking.numKids || stdCottage.kids || 0,
                                                    phone: booking.customerPhone || stdCottage.phone,
                                                    checkInDate: booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN') : null,
                                                    checkOutDate: booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-IN') : null,
                                                    isCheckinDay: booking.checkInDate ? booking.checkInDate.slice(0, 10) === selectedDateStr : false,
                                                    isCheckoutDay: booking.checkOutDate ? booking.checkOutDate.slice(0, 10) === selectedDateStr : false,
                                                    balanceAmount: booking.balanceAmount ?? stdCottage.balanceAmount,
                                                    depositAmount: booking.securityDeposit ?? stdCottage.depositAmount,
                                                    totalAmount: booking.totalAmount ?? stdCottage.totalAmount,
                                                    _numCottages: booking.numCottages || 1,
                                                });
                                            } else {
                                                expanded.push({
                                                    ...stdCottage,
                                                    name: `Standard Cottage ${i}`,
                                                    booked: false,
                                                    _isCottageUnit: true,
                                                    bookingStatus: null,
                                                    guest: null,
                                                    guests: 0,
                                                    phone: null,
                                                    checkedIn: false,
                                                    isCheckinDay: false,
                                                    isCheckoutDay: false,
                                                    balanceAmount: null,
                                                    depositAmount: null,
                                                    totalAmount: null,
                                                });
                                            }
                                        }
                                    }
                                    // Add remaining non-standard cottages (e.g., Family Cottage)
                                    for (const v of rawVillas) {
                                        if (v.name !== 'Standard Cottage') expanded.push(v);
                                    }
                                    displayVillas = expanded;
                                }
                                return displayVillas;
                            })()
                                .map((villa: any) => {
                                const displayBooking = villa._isCottageUnit
                                    ? (villa.booked ? villa : null)
                                    : (propertyStatusMode === "checkin"
                                        ? (villa.booked ? villa : null)
                                        : (villa._checkoutBooking || (villa.booked && villa.isCheckoutDay ? villa : null)));
                                const isBooked = !!displayBooking;

                                const renderVillaStatusBadges = () => {
                                    if (isBooked) {
                                        return <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase">Booked</span>;
                                    }
                                    return <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Vacant</span>;
                                };

                                const guestName = displayBooking === villa
                                    ? villa.guest
                                    : (villa._checkoutBooking?.customerName || villa.guest);

                                const guestsCount = displayBooking === villa
                                    ? villa.guests
                                    : (villa._checkoutBooking?.numGuests || villa.guests);

                                const kidsCount = displayBooking === villa
                                    ? villa.kids
                                    : (villa._checkoutBooking?.numKids || villa.kids || 0);

                                const guestPhone = displayBooking === villa
                                    ? villa.phone
                                    : (villa._checkoutBooking?.customerPhone || villa.phone);

                                const checkOutDateStr = displayBooking === villa
                                    ? villa.checkOutDate
                                    : (villa._checkoutBooking?.checkOutDate
                                        ? new Date(villa._checkoutBooking.checkOutDate).toLocaleDateString('en-IN')
                                        : villa.checkOutDate);

                                const balanceAmt = displayBooking === villa
                                    ? villa.balanceAmount
                                    : (villa._checkoutBooking?.balanceAmount ?? villa.balanceAmount);

                                const isBalanceCollected = displayBooking === villa
                                    ? villa.balanceCollected
                                    : (villa._checkoutBooking?.status === 'checked_out' || villa._checkoutBooking?.balanceAmount === 0 || (villa._checkoutBooking?.collectedAmount > 0));

                                const depositAmt = displayBooking === villa
                                    ? villa.depositAmount
                                    : (villa._checkoutBooking?.securityDeposit ?? villa.depositAmount);

                                const isDepositCollected = displayBooking === villa
                                    ? villa.depositCollected
                                    : (villa._checkoutBooking?.status === 'checked_out' || villa._checkoutBooking?.depositRefunded);

                                const isDepositRefunded = displayBooking === villa
                                    ? villa.depositRefunded
                                    : (villa._checkoutBooking?.depositRefunded ?? villa.depositRefunded);

                                const depositRefundMethod = displayBooking === villa
                                    ? villa.depositRefundMethod
                                    : (villa._checkoutBooking?.depositRefundMethod ?? villa.depositRefundMethod);

                                const depositRefundedAt = displayBooking === villa
                                    ? villa.depositRefundedAt
                                    : (villa._checkoutBooking?.depositRefundedAt ?? villa.depositRefundedAt);

                                const addonsList = displayBooking === villa
                                    ? villa.addons
                                    : (villa._checkoutBooking?.addons ?? villa.addons);

                                const extraGuestsList = displayBooking === villa
                                    ? villa.extraGuests
                                    : (villa._checkoutBooking?.extraGuests ?? villa.extraGuests);

                                const resolvedStatus = propertyStatusMode === "checkin"
                                    ? (villa.checkedIn ? "Checked In" : "Pending")
                                    : ((displayBooking?.bookingStatus === "checked_out" || displayBooking?.status === "checked_out" || villa.bookingStatus === "checked_out") ? "Checked Out" : "Pending");

                                const showContinueRed = propertyStatusMode === "checkin" && villa.booked && !villa.isCheckinDay;

                                return (
                                <div key={villa.name} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedVilla(expandedVilla === villa.name ? null : villa.name)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800 text-sm">{villa.name}</span>
                                            {renderVillaStatusBadges()}
                                        </div>
                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedVilla === villa.name ? "rotate-90" : ""}`} />
                                    </button>
                                    {expandedVilla === villa.name && isBooked && (
                                        <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guest</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                                        <UserIcon size={12} />
                                                        {guestName}
                                                        {showContinueRed && (
                                                            <span className="text-red-600 font-extrabold ml-1 animate-pulse">(Continue)</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guests</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                                        <Users size={12} />
                                                        {guestsCount} adult{guestsCount !== 1 ? 's' : ''}
                                                        {kidsCount > 0 && <span className="text-blue-600 ml-1">{kidsCount} child{kidsCount !== 1 ? 'ren' : ''}</span>}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate max-w-[180px]">
                                                        <Phone size={12} />
                                                        {guestPhone && guestPhone.length < 20 ? guestPhone : 'On file'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                                                        <CalendarDays size={12} />
                                                        {checkOutDateStr || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                                                            resolvedStatus === 'Checked In' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                                            resolvedStatus === 'Checked Out' ? 'bg-slate-100 border-slate-300 text-slate-600' :
                                                            'bg-amber-50 border-amber-200 text-amber-700'
                                                        }`}>
                                                            {resolvedStatus}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                <div className={`p-3 rounded-lg border ${isBalanceCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isBalanceCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        Balance {isBalanceCollected ? '✓ Collected' : '⏳ Pending'}
                                                    </p>
                                                    {balanceAmt && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(balanceAmt).toLocaleString('en-IN')}</p>}
                                                    {isBalanceCollected && villa.balanceCollected && (
                                                        <p className="text-xs font-medium text-slate-600 mt-1">
                                                            via {villa.balanceMode} · {villa.balanceTime}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={`p-3 rounded-lg border ${isDepositCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDepositCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        Security Deposit {isDepositCollected ? '✓ Collected' : '⏳ Pending'}
                                                    </p>
                                                    {depositAmt && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(depositAmt).toLocaleString('en-IN')}</p>}
                                                    {isDepositCollected && villa.depositCollected && (
                                                        <p className="text-xs font-medium text-slate-600 mt-1">
                                                            via {villa.depositMode} · {villa.depositTime}
                                                        </p>
                                                    )}
                                                </div>
                                                {isDepositRefunded && (
                                                    <div className="p-3 rounded-lg border bg-rose-50 border-rose-200">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                                                            Security Deposit ↩ Refunded
                                                        </p>
                                                        {depositAmt && <p className="text-xs font-bold text-rose-700 mt-0.5">₹{Number(depositAmt).toLocaleString('en-IN')}</p>}
                                                        <p className="text-xs font-medium text-slate-600 mt-1">
                                                            via {(depositRefundMethod || 'N/A').toUpperCase()}{depositRefundedAt ? ` · ${new Date(depositRefundedAt).toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                                        </p>
                                                    </div>
                                                )}
                                                {addonsList && Array.isArray(addonsList) && addonsList.length > 0 && (
                                                    <div className="col-span-2 p-3 rounded-lg border bg-purple-50 border-purple-100">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Celebration Add-on</p>
                                                        <p className="text-xs font-bold text-purple-800 mt-0.5">₹{Number(addonsList[0].price || 1200).toLocaleString('en-IN')}</p>
                                                        {addonsList[0].cakeMessage && <p className="text-[10px] text-slate-600 mt-1">Cake: {addonsList[0].cakeMessage}</p>}
                                                        {addonsList[0].occasion && <p className="text-[10px] text-slate-600">Occasion: {addonsList[0].occasion}</p>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Extra Guests Display */}
                                            {extraGuestsList && extraGuestsList.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extra Guests Added ({extraGuestsList.length})</h4>
                                                    <div className="space-y-2">
                                                        {extraGuestsList.map((eg: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <Users size={12} className="text-slate-400" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-800">{eg.guestName || eg.name}</p>
                                                                        <p className="text-[9px] font-medium text-slate-500">{eg.idProofType || eg.idType}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs font-bold text-emerald-600">+₹{eg.chargeAmount || eg.amount || 0}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{eg.paymentMethod || eg.paymentMode}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {expandedVilla === villa.name && !isBooked && (
                                        <div className="p-4 pt-0 border-t border-slate-100">
                                            <p className="text-sm text-slate-400 font-medium py-4 text-center">No active booking.</p>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
        );
    };

    // â”€â”€â”€ TAB: DD (Read-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const renderDD = () => {
        // Group bookings by screen — filtered by selected date
        const screenGroups: Record<string, any[]> = {};
        const selectedDateStr = `${ddViewDate.getFullYear()}-${String(ddViewDate.getMonth()+1).padStart(2,'0')}-${String(ddViewDate.getDate()).padStart(2,'0')}`;
        
        // Use live DD bookings, filtered by ddViewDate
        const allMapped = ddBookingsLive.length > 0 ? ddBookingsLive.map((b: any) => {
            const totalAmt = Number(b.totalAmount || 0);
            const amtToCollect = Number(b.amountToCollect || 0);
            // Original advance = total - original balance (amountToCollect at creation)
            // After balance collection, amountToCollect becomes 0 and amountPaid becomes total
            // Use collectedAmount from backend to figure out original state
            const collected = Number(b.collectedAmount || 0);
            const originalAdvance = totalAmt - (amtToCollect + collected);
            const originalBalance = totalAmt - originalAdvance;
            const remainingUnpaid = Math.max(0, originalBalance - collected);

            // Determine remaining payment method from payments array
            let remainingPayMethod = '';
            if (collected > 0 && b.payments && Array.isArray(b.payments)) {
                const balancePayment = b.payments.find((p: any) => p.paymentType === 'balance');
                if (balancePayment) remainingPayMethod = (balancePayment.method || '').toUpperCase();
            }

            return {
            id: b.bookingRef || `#DD-${b.id}`,
            customer: b.customerName,
            phone: b.customerPhone,
            screen: b.screen?.name || "Unknown Screen",
            date: new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: b.bookingDate ? (() => { const d = new Date(b.bookingDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : '',
            slot: b.startHour != null ? `${b.startHour > 12 ? b.startHour - 12 : b.startHour}:00 ${b.startHour >= 12 ? 'PM' : 'AM'} - ${b.startHour + (b.durationHours || 3) > 12 ? b.startHour + (b.durationHours || 3) - 12 : b.startHour + (b.durationHours || 3)}:00 ${b.startHour + (b.durationHours || 3) >= 12 ? 'PM' : 'AM'}` : 'N/A',
            source: b.source === 'website' ? 'Online' : 'Walk-in',
            upfrontAmt: `₹${originalAdvance.toLocaleString('en-IN')}`,
            upfrontMode: b.paymentMethod || "Online",
            remainingAmt: `₹${originalBalance.toLocaleString('en-IN')}`,
            remainingStatus: remainingUnpaid <= 0 ? (remainingPayMethod ? `Paid by ${remainingPayMethod}` : "Paid") : "Pending",
            status: b.status === "confirmed" ? "Confirmed" : b.status === "cancelled" ? "Cancelled" : "Draft",
            raw: b
            };
        }) : [];

        // Filter by selected date
        const bookingsToDisplay = allMapped.filter((b: any) => b.rawDate === selectedDateStr);

        bookingsToDisplay.forEach((b: any) => {
            const cleanScreen = (b.screen || '').replace(/\s*\(.*?\)/g, '').trim();
            if (!screenGroups[cleanScreen]) screenGroups[cleanScreen] = [];
            screenGroups[cleanScreen].push(b);
        });

        return (
            <div className="space-y-6">
                {/* Date View Selector */}
                <div className="flex items-center justify-end">
                    <CustomDatePicker date={ddViewDate} onDateChange={setDdViewDate} />
                </div>

                {/* Per-Screen Booking Counter — P C S B */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { name: "Park N Watch", short: "P", color: "bg-orange-50 border-orange-200 text-orange-700" },
                        { name: "Cine Love", short: "C", color: "bg-green-50 border-green-200 text-green-700" },
                        { name: "Sandy Screen", short: "S", color: "bg-amber-50 border-amber-200 text-amber-800" },
                        { name: "Baywatch", short: "B", color: "bg-blue-50 border-blue-200 text-blue-700" },
                    ].map(screen => {
                        const count = (screenGroups[screen.name] || []).length;
                        return (
                            <div key={screen.name} className={`${screen.color} border rounded-xl p-3 text-center`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{screen.name}</p>
                                <p className="text-2xl font-black mt-0.5">{count}</p>
                            </div>
                        );
                    })}
                    <div className="bg-slate-800 text-white border border-slate-700 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Total</p>
                        <p className="text-2xl font-black mt-0.5">{bookingsToDisplay.length}</p>
                    </div>
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
                                    <div className={`p-3 rounded-lg border ${ddSelectedBooking.remainingStatus !== "Pending" ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <p className={`text-[10px] font-bold uppercase ${ddSelectedBooking.remainingStatus !== "Pending" ? 'text-emerald-600' : 'text-amber-600'}`}>Remaining (50%)</p>
                                        <p className={`text-sm font-bold ${ddSelectedBooking.remainingStatus !== "Pending" ? 'text-emerald-800' : 'text-amber-800'}`}>{ddSelectedBooking.remainingAmt}</p>
                                        <p className={`text-[10px] mt-0.5 ${ddSelectedBooking.remainingStatus !== "Pending" ? 'text-emerald-600' : 'text-amber-600'}`}>{ddSelectedBooking.remainingStatus}</p>
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

                {Object.entries(screenGroups).length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
                        <p className="text-sm font-bold text-slate-600">No bookings today</p>
                        <p className="text-xs text-slate-400 mt-1">All screens are available for this date.</p>
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
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
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
                                                <p className={`text-sm font-bold ${b.remainingStatus !== "Pending" ? 'text-emerald-700' : 'text-amber-700'}`}>{b.remainingAmt}</p>
                                                <p className={`text-[10px] ${b.remainingStatus !== "Pending" ? 'text-emerald-500' : 'text-amber-500'}`}>{b.remainingStatus}</p>
                                            </td>
                                            <td className="px-6 py-3 hidden sm:table-cell">
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

    // â”€â”€â”€ TAB: WEBSITE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const renderImageSubSection = (sub: ImageSubSection) => {
        const images = siteImages[sub.id] || [];
        const isOpen = !collapsedSections.has(sub.id);
        const isUploading = uploadingSection === sub.id;
        const atLimit = sub.maxImages ? images.length >= sub.maxImages : false;

        return (
            <div key={sub.id} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                    onClick={() => toggleSection(sub.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/80 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <span className="text-xs font-semibold text-slate-700">{sub.label}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${images.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                            {images.length}{sub.maxImages ? `/${sub.maxImages}` : ''}
                        </span>
                    </div>
                </button>
                {isOpen && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
                            {images.map(img => (
                                <div key={img.id} className="relative group border border-slate-200 rounded-lg aspect-square bg-white overflow-hidden hover:border-purple-300 hover:shadow-sm transition-all">
                                    {/\.(mp4|webm|mov)$/i.test(img.url) ? (
                                        <video src={img.url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                    ) : (
                                        <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    )}
                                    <button
                                        onClick={() => handleImageDelete(img.id)}
                                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                            {!atLimit && (
                                <label className={`border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                                    isUploading ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50'
                                }`}>
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[8px] font-bold mt-1 text-purple-600">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} className="text-slate-400 group-hover:text-purple-500" />
                                            <span className="text-[8px] font-bold mt-0.5 text-slate-400 group-hover:text-purple-600">Upload</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept={sub.id.includes('hero') || sub.id.includes('banner') ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*'}
                                        multiple={!sub.maxImages || sub.maxImages > 1}
                                        className="hidden"
                                        onChange={e => handleImageUpload(sub.id, e.target.files)}
                                        disabled={isUploading}
                                    />
                                </label>
                            )}
                        </div>
                        {images.length === 0 && !isUploading && (
                            <p className="text-[10px] text-slate-400 mt-2 italic">No images uploaded yet. Click upload to add.</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderImageGroup = (group: ImageGroup) => {
        const isOpen = !collapsedSections.has(group.id);
        const totalImages = group.subSections.reduce((sum, sub) => sum + (siteImages[sub.id]?.length || 0), 0);

        return (
            <div key={group.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection(group.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <ChevronRight size={18} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-bold text-slate-800">{group.label}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">{totalImages} photos</span>
                    </div>
                </button>
                {isOpen && (
                    <div className="px-5 pb-5 border-t border-slate-100 space-y-3 mt-3">
                        {group.subSections.map(sub => renderImageSubSection(sub))}
                    </div>
                )}
            </div>
        );
    };

    const renderWebsite = () => (
        <div className="space-y-8">
            {/* Staycation Images */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Staycation — Photo Manager</h2>
                <p className="text-sm text-slate-500 font-medium mb-4">Manage photos for each staycation property. All uploads auto-compress to WebP.</p>
                <div className="space-y-3">
                    {staycationGroups.map(group => renderImageGroup(group))}
                </div>
            </div>

            {/* Digital Diaries Images */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Digital Diaries — Photo Manager</h2>
                <p className="text-sm text-slate-500 font-medium mb-4">Manage photos for DD screens and packages.</p>
                <div className="space-y-3">
                    {ddGroups.map(group => renderImageGroup(group))}
                </div>
            </div>

        </div>
    );

    // â”€â”€â”€ MAIN RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pageTitles: Record<string, { title: string; subtitle: string }> = {
        dashboard: { title: "Owner Dashboard", subtitle: "Complete overview of all business operations." },
        properties: { title: "Properties", subtitle: "Live check-in status across all staycation properties." },
        dd: { title: "Digital Diaries", subtitle: "Day-wise and Screen-wise display of all digital diaries bookings." },
        website: { title: "Photo Manager", subtitle: "" },
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

            {/* Live Calendar 2 Cell Interactive Dialog Modal */}
            {selectedCell && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base">
                                    {selectedCell.status === "booked" ? "Booking Details" : selectedCell.status !== "vacant" ? "Block Details" : "Block Unit"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedCell.colName} {selectedCell.unitIndex ? `— Cottage ${selectedCell.unitIndex}` : ''} on {selectedCell.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedCell(null); setBlockCustomNote(""); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors bg-white shadow-sm border border-slate-200/60"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {selectedCell.status === "booked" ? (
                                <div className="space-y-3">
                                    {selectedCell.bookings && selectedCell.bookings.map((b: any, idx: number) => (
                                        <div key={idx} className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-indigo-900">{b.customerName || "Guest"}</p>
                                                    <p className="text-xs text-indigo-700 mt-0.5">{`Booking ID: #${b.bookingRef || (b.id?.toString().slice(0, 8) || "")}`}</p>
                                                </div>
                                                <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Booked</span>
                                            </div>
                                            <div className="pt-2 border-t border-indigo-200/40 text-xs text-indigo-800 space-y-1">
                                                <p><span className="font-bold">Check-in:</span> {new Date(b.checkInDate).toLocaleDateString('en-IN')}</p>
                                                <p><span className="font-bold">Check-out:</span> {new Date(b.checkOutDate).toLocaleDateString('en-IN')}</p>
                                                {b.numGuests && <p><span className="font-bold">Guests:</span> {b.numGuests} Adults {b.numKids ? `, ${b.numKids} Kids` : ''}</p>}
                                                {b.numCottages && b.numCottages > 1 && <p><span className="font-bold">Units Booked:</span> {b.numCottages} Cottages</p>}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setSelectedCell(null)}
                                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : selectedCell.status !== "vacant" ? (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                                                selectedCell.status === "owner_reserved" 
                                                    ? "bg-blue-50 border-blue-200 text-blue-700" 
                                                    : "bg-red-50 border-red-200 text-red-700"
                                            }`}>
                                                {selectedCell.status === "owner_reserved" ? "Owner Reservation" : "Maintenance"}
                                            </span>
                                        </div>
                                        {selectedCell.block?.reason && (
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason / Note</p>
                                                <p className="font-semibold text-slate-800 mt-1 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                                                    {selectedCell.block.reason}
                                                </p>
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 font-medium pt-1">
                                            Blocked on: {new Date(selectedCell.block?.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setSelectedCell(null)}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => handleUnblockCellSubmit(selectedCell.block.id)}
                                            disabled={blockActionLoading}
                                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                        >
                                            {blockActionLoading ? "..." : "Remove Block"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Selection Toggle */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Block Type</label>
                                        <div className="bg-slate-50 rounded-xl p-1 flex border border-slate-200/60">
                                            <button
                                                type="button"
                                                onClick={() => setBlockReasonType("maintenance")}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                                    blockReasonType === 'maintenance' ? 'bg-red-600 text-white shadow-sm font-black' : 'text-slate-500 font-bold'
                                                }`}
                                            >
                                                Maintenance
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBlockReasonType("owner")}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                                    blockReasonType === 'owner' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-slate-500 font-bold'
                                                }`}
                                            >
                                                Owner Reservation
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom note */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reason / Custom Note</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. AC Repair, Owner family visit"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            value={blockCustomNote}
                                            onChange={e => setBlockCustomNote(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedCell(null); setBlockCustomNote(""); }}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBlockCellSubmit}
                                            disabled={blockActionLoading}
                                            className={`flex-1 py-2.5 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all ${
                                                blockReasonType === "owner" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                                            }`}
                                        >
                                            {blockActionLoading ? "..." : "Confirm Block"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
