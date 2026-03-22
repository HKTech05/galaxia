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
    ]},
    { id: "mount-view", label: "Mount View", subSections: [
        { id: "mount-view/slideshow", label: "Slideshow Images" },
        { id: "mount-view/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "mount-view/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
    ]},
    { id: "heavenly-villa", label: "Heavenly Villa", subSections: [
        { id: "heavenly-villa/slideshow", label: "Slideshow Images" },
        { id: "heavenly-villa/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "heavenly-villa/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
    ]},
    { id: "la-paraiso", label: "La Paraiso", subSections: [
        { id: "la-paraiso/slideshow", label: "Slideshow Images" },
        { id: "la-paraiso/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "la-paraiso/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
    ]},
    { id: "ambrose", label: "Ambrose", subSections: [
        { id: "ambrose/slideshow", label: "Slideshow Images" },
        { id: "ambrose/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "ambrose/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        // Per-villa sections
        { id: "ambrose/take-1/slideshow", label: "TAKE-1 — Slideshow" },
        { id: "ambrose/take-1/thumbnail", label: "TAKE-1 — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/alta/slideshow", label: "ALTA — Slideshow" },
        { id: "ambrose/alta/thumbnail", label: "ALTA — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/santorini/slideshow", label: "SANTORINI — Slideshow" },
        { id: "ambrose/santorini/thumbnail", label: "SANTORINI — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/bamboosa/slideshow", label: "BAMBOOSA — Slideshow" },
        { id: "ambrose/bamboosa/thumbnail", label: "BAMBOOSA — Main Thumbnail", maxImages: 1 },
        { id: "ambrose/cypress/slideshow", label: "CYPRESS — Slideshow" },
        { id: "ambrose/cypress/thumbnail", label: "CYPRESS — Main Thumbnail", maxImages: 1 },
    ]},
    { id: "amstel-nest", label: "Amstel Nest", subSections: [
        { id: "amstel-nest/slideshow", label: "Slideshow Images" },
        { id: "amstel-nest/thumbnail", label: "Main Thumbnail (Booking Card)", maxImages: 1 },
        { id: "amstel-nest/activities", label: "Activity Images (3 Mini Thumbnails)", maxImages: 3 },
        { id: "amstel-nest/standard-cottage/slideshow", label: "Standard Cottage — Slideshow" },
        { id: "amstel-nest/standard-cottage/thumbnail", label: "Standard Cottage — Main Thumbnail", maxImages: 1 },
        { id: "amstel-nest/family-cottage/slideshow", label: "Family Cottage — Slideshow" },
        { id: "amstel-nest/family-cottage/thumbnail", label: "Family Cottage — Main Thumbnail", maxImages: 1 },
    ]},
];

const ddGroups: ImageGroup[] = [
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
    const [dashboardSubTab, setDashboardSubTab] = useState<"insights" | "reports" | "calendar">("insights");

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
        api.get("/admin/dashboard").then(data => {
            setDashboardKPIs(data);
        }).catch(err => console.error("Dashboard KPIs:", err));

        api.get("/admin/dashboard/earnings").then(data => {
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
                    const propBooking = bookings.find((b: any) => b.propertyId === p.id && !b.subPropertyId);
                    const enrichedVillas = (p.villas || []).map((v: any) => {
                        const villaBooking = bookings.find((b: any) => b.subPropertyId === v.id);
                        return {
                            ...v,
                            booked: v.booked ?? (villaBooking ? true : false),
                            bookingStatus: v.bookingStatus ?? (villaBooking?.status || null),
                            isCheckinDay: v.isCheckinDay ?? (villaBooking ? villaBooking.checkInDate?.slice(0, 10) === selectedDateStr : false),
                            isCheckoutDay: v.isCheckoutDay ?? (villaBooking ? villaBooking.checkOutDate?.slice(0, 10) === selectedDateStr : false),
                            guest: v.guest ?? (villaBooking?.customerName || null),
                            guests: v.guests || (villaBooking?.numGuests || 0),
                            balanceAmount: v.balanceAmount ?? (villaBooking?.balanceAmount || null),
                            depositAmount: v.depositAmount ?? (villaBooking?.securityDeposit || null),
                        };
                    });
                    return {
                        ...p,
                        booked: p.booked ?? (propBooking ? true : false),
                        bookingStatus: p.bookingStatus ?? (propBooking?.status || null),
                        isCheckinDay: p.isCheckinDay ?? (propBooking ? propBooking.checkInDate?.slice(0, 10) === selectedDateStr : false),
                        isCheckoutDay: p.isCheckoutDay ?? (propBooking ? propBooking.checkOutDate?.slice(0, 10) === selectedDateStr : false),
                        balanceAmount: p.balanceAmount ?? (propBooking?.balanceAmount || null),
                        depositAmount: p.depositAmount ?? (propBooking?.securityDeposit || null),
                        villas: enrichedVillas,
                    };
                });
                setPropertyStatusLive(enriched);
            }
        }).catch(err => console.error("Property status:", err));

        api.get("/bookings/dd").then(data => {
            if (Array.isArray(data) && data.length > 0) setDdBookingsLive(data);
        }).catch(err => console.error("DD bookings:", err));
    }, [propertyDate, ddViewDate]);

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
            });
            setBlackoutDates([]);
            setBlackoutReason("");
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

    // Filter active blocks for the currently selected property
    const filteredBlocks = (() => {
        if (!blackoutPropertyKey) return activeBlocks;
        const { propertyId, subPropertyId } = resolvePropertyIds(blackoutPropertyKey);
        return activeBlocks.filter(b => {
            if (subPropertyId) return b.subPropertyId === subPropertyId;
            if (propertyId) return b.propertyId === propertyId;
            return true;
        });
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
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
                await api.upload("/site-images", formData);
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
    // Sync blackout property key with calendar property on initial load
    useEffect(() => { if (!blackoutPropertyKey) setBlackoutPropertyKey("Heavenly Villa"); }, []);


    const timeRanges = [
        { key: "1m", label: "1 Month" },
        { key: "3m", label: "3 Months" },
        { key: "6m", label: "6 Months" },
        { key: "1y", label: "Yearly" },
    ];

    // â”€â”€â”€ STATUS ROW COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const StatusRow = ({ item }: { item: any }) => {
        const isExpanded = expandedProperty === item.name || expandedVilla === item.name;
        const toggle = () => {
            if (expandedVilla !== null) setExpandedVilla(isExpanded ? null : item.name);
            else setExpandedProperty(isExpanded ? null : item.name);
        };

        // Status badges
        const renderStatusBadges = () => {
            if (!item.booked) {
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Vacant</span>;
            }
            const badges = [];
            // Booking status badge
            if (item.bookingStatus === 'confirmed' && !item.checkedIn) {
                badges.push(<span key="booked" className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase">Booked</span>);
                if (item.isCheckinDay) {
                    badges.push(<span key="ci-pending" className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200 uppercase">Check-in Pending</span>);
                }
            } else if (item.checkedIn) {
                badges.push(<span key="booked" className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase">Booked</span>);
                badges.push(<span key="checked-in" className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 uppercase">Checked In</span>);
                if (item.isCheckoutDay) {
                    badges.push(<span key="co-pending" className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-md border border-orange-200 uppercase">Checkout Today</span>);
                }
            } else if (item.bookingStatus === 'checked_out') {
                badges.push(<span key="co" className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Checked Out</span>);
            }
            return <div className="flex items-center gap-1.5 flex-wrap">{badges}</div>;
        };

        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={toggle} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                        {renderStatusBadges()}
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                {isExpanded && item.booked && (
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
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1 truncate max-w-[180px]"><Phone size={12} /> {item.phone && item.phone.length < 20 ? item.phone : 'On file'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1"><CalendarDays size={12} /> {item.checkOutDate || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className={`p-3 rounded-lg border ${item.balanceCollected ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${item.balanceCollected ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Balance {item.balanceCollected ? '✓ Collected' : '⏳ Pending'}
                                </p>
                                {item.balanceAmount && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(item.balanceAmount).toLocaleString('en-IN')}</p>}
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
                                {item.depositAmount && <p className="text-xs font-bold text-slate-700 mt-0.5">₹{Number(item.depositAmount).toLocaleString('en-IN')}</p>}
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
                {isExpanded && !item.booked && (
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

        const occupiedAmbroseCount = liveAmbrose.filter((v: any) => v.checkedIn).length;
        const occupiedAmstelCount = liveAmstel.filter((v: any) => v.checkedIn).length;
        const occupiedStandaloneCount = liveStandalone.filter((p: any) => p.checkedIn).length;

        const totalOccupied = occupiedAmbroseCount + occupiedAmstelCount + occupiedStandaloneCount;
        const totalUnits = liveAmbrose.length + liveAmstel.length + liveStandalone.length;

        // KPI cards data
        const totalRevenue = dashboardKPIs?.kpis?.totalRevenue || 0;
        const totalNights = dashboardKPIs?.kpis?.totalNightsBooked || 0;
        const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
        const avgNightlyRate = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

        // Live calendar helpers
        const calendarYear = calendarViewMonth.getFullYear();
        const calendarMonth = calendarViewMonth.getMonth();
        const calFirstDay = new Date(calendarYear, calendarMonth, 1).getDay();
        const calDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        
        // Calculate dynamic booked dates for the selected property
        const bookedDaysSet = new Set<number>();
        
        if (calendarProperty.startsWith("Ambrose")) {
            const propName = calendarProperty.split("—")[1]?.trim();
            const villa = liveAmbrose.find((v: any) => v.name === propName);
            if (villa && villa.checkedIn) {
                // Approximate booking length or use actual checkIn/checkOut bounds
                const inDate = new Date(villa.checkInTime);
                const outDate = new Date(villa.checkOutDate);
                for (let d = 1; d <= calDaysInMonth; d++) {
                    const current = new Date(calendarYear, calendarMonth, d);
                    if (current >= inDate && current <= outDate) bookedDaysSet.add(d);
                }
            }
        } else if (calendarProperty.startsWith("Amstel Nest")) {
            const propName = calendarProperty.split("—")[1]?.trim();
            const villa = liveAmstel.find((v: any) => v.name === propName);
            if (villa && villa.checkedIn) {
                const inDate = new Date(villa.checkInTime);
                const outDate = new Date(villa.checkOutDate);
                for (let d = 1; d <= calDaysInMonth; d++) {
                    const current = new Date(calendarYear, calendarMonth, d);
                    if (current >= inDate && current <= outDate) bookedDaysSet.add(d);
                }
            }
        } else {
            // Standalone
            const prop = liveStandalone.find((p: any) => p.name === calendarProperty);
            if (prop && prop.checkedIn) {
                const inDate = new Date(prop.checkInTime);
                const outDate = new Date(prop.checkOutDate);
                for (let d = 1; d <= calDaysInMonth; d++) {
                    const current = new Date(calendarYear, calendarMonth, d);
                    if (current >= inDate && current <= outDate) bookedDaysSet.add(d);
                }
            }
        }

        return (
            <div className="space-y-8">
                {/* Time Range + Sub-tab Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                        {(occupiedAmbroseCount === liveAmbrose.length ||
                            occupiedAmstelCount === liveAmstel.length) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                                    <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                                        <CheckCircle size={18} className="text-amber-600" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800 tracking-tight">Fully Booked Properties Alert</h4>
                                        <div className="mt-1 space-y-1">
                                            {occupiedAmbroseCount === liveAmbrose.length && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Ambrose is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">{liveAmbrose.length}/{liveAmbrose.length} VILLAS FULL</span>
                                                </p>
                                            )}
                                            {occupiedAmstelCount === liveAmstel.length && (
                                                <p className="text-xs text-amber-700 font-medium font-semibold flex flex-wrap items-center gap-1.5">
                                                    <span>Amstel Nest is <span className="underline decoration-amber-400 underline-offset-2">100% occupied</span> today.</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-200/50 text-[9px] font-bold tracking-wider">{liveAmstel.length}/{liveAmstel.length} VILLAS FULL</span>
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
                                    <p className="text-[10px] text-purple-500 font-medium mt-1">{totalOccupied} / {totalUnits} units occupied</p>
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
                                        <BarChart data={dashboardKPIs?.charts?.ddScreen || []}>
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

                            {/* Digital Diaries Booking Source — Website vs Walk-in */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Digital Diaries Booking Source — Website vs Walk-in</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={dashboardKPIs?.charts?.ddSource || []} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={6} dataKey="value" nameKey="name" stroke="none">
                                            {(dashboardKPIs?.charts?.ddSource || []).map((entry: any, index: number) => (
                                                <Cell key={`ddsrc-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    const total = (dashboardKPIs?.charts?.ddSource || []).reduce((s: number, e: any) => s + e.value, 0);
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
                                    <AreaChart data={timeRange === '1m' ? (dashboardKPIs?.charts?.occupancy1Month || []) : (dashboardKPIs?.charts?.occupancyYearly || []).slice(timeRange === '3m' ? -3 : timeRange === '6m' ? -6 : 0)}>
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
                                    <BarChart data={dashboardKPIs?.charts?.propertyRevenue || []} barCategoryGap="15%">
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
                                        const isClickable = !isBooked;
                                        return (
                                            <button
                                                key={d}
                                                disabled={!isClickable}
                                                onClick={() => {
                                                    if (!isClickable) return;
                                                    if (isSelected) {
                                                        setBlackoutDates(blackoutDates.filter(bd => !(bd.getDate() === d && bd.getMonth() === calendarMonth && bd.getFullYear() === calendarYear)));
                                                    } else {
                                                        setBlackoutDates([...blackoutDates, date]);
                                                    }
                                                }}
                                                className={`h-16 rounded-xl flex flex-col items-center justify-center text-sm font-semibold border transition-all
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md' :
                                                        isToday && !isBlocked && !isBooked ? 'border-indigo-400 bg-white ring-2 ring-indigo-200 text-indigo-700' :
                                                            isBooked ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-not-allowed' :
                                                                isBlocked ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer' :
                                                                    isWeekend ? 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer' :
                                                                        'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'}`}
                                            >
                                                <span className={`font-bold ${isToday && !isSelected ? 'text-indigo-700' : ''}`}>{d}</span>
                                                <span className={`text-[9px] font-medium ${
                                                    isSelected ? 'text-indigo-200' :
                                                    isBooked ? 'text-blue-500' :
                                                    isBlocked ? 'text-rose-500' :
                                                    isWeekend ? 'text-stone-400' : 'text-slate-400'}`}>
                                                    {isSelected ? 'Selected' : isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Free'}
                                                </span>
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Reason + Selected + Button */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Reason</label>
                                        <CustomSelect
                                            value={blackoutReason}
                                            onChange={setBlackoutReason}
                                            options={["Private Event", "Maintenance", "Owner Reservation", "Seasonal Closure", "Other"]}
                                        />
                                    </div>
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
                                            <><Ban size={16} /> Block Property</>
                                        )}
                                    </button>
                                </div>

                                {/* Middle: Active Blocks for selected property */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Active Blocks — {calendarProperty || 'Select Property'}</h4>
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {filteredBlocks.length === 0 ? (
                                            <p className="text-sm font-medium text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">No active blocks.</p>
                                        ) : (
                                            filteredBlocks.map(block => (
                                                <div key={block.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{block.subProperty ? `${block.property?.name} — ${block.subProperty.name}` : block.property?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {(() => { const p = parseDateDay(block.blockedDate); return new Date(p.year, p.month, p.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })()}
                                                            {block.reason && <span className="text-[10px] text-red-500 font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100 ml-1">{block.reason}</span>}
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

                                {/* Right: All Properties Active Blocks */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">All Active Blocks (All Properties)</h4>
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {activeBlocks.length === 0 ? (
                                            <p className="text-sm font-medium text-slate-500 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">No active blocks.</p>
                                        ) : (
                                            activeBlocks.map(block => (
                                                <div key={block.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{block.subProperty ? `${block.property?.name} — ${block.subProperty.name}` : block.property?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {(() => { const p = parseDateDay(block.blockedDate); return new Date(p.year, p.month, p.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })()}
                                                            {block.reason && <span className="text-[10px] text-red-500 font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded border border-red-100 ml-1">{block.reason}</span>}
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
            </div>
        );
    };

    // â”€â”€â”€ TAB: PROPERTIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    <CustomDatePicker date={propertyDate} onDateChange={setPropertyDate} />
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
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase">
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
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 uppercase">
                                {liveAmstel.filter((v: any) => v.booked).length}/{liveAmstel.length} Occupied
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
                            {(villaModal.type === "ambrose" ? liveAmbrose : liveAmstel)
                                .filter((villa: any) => villa.name !== "Standard Cottage")
                                .map((villa: any) => {
                                const villaBadges = () => {
                                    if (!villa.booked) return <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Vacant</span>;
                                    const b = [];
                                    if (villa.bookingStatus === 'confirmed' && !villa.checkedIn) {
                                        b.push(<span key="bk" className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase">Booked</span>);
                                        if (villa.isCheckinDay) b.push(<span key="ci" className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200 uppercase">Check-in Pending</span>);
                                    } else if (villa.checkedIn) {
                                        b.push(<span key="bk" className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200 uppercase">Booked</span>);
                                        b.push(<span key="ci" className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 uppercase">Checked In</span>);
                                        if (villa.isCheckoutDay) b.push(<span key="co" className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-md border border-orange-200 uppercase">Checkout Today</span>);
                                    } else if (villa.bookingStatus === 'checked_out') {
                                        b.push(<span key="co" className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Checked Out</span>);
                                    }
                                    return <div className="flex items-center gap-1.5 flex-wrap">{b}</div>;
                                };
                                return (
                                <div key={villa.name} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedVilla(expandedVilla === villa.name ? null : villa.name)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800 text-sm">{villa.name}</span>
                                            {villaBadges()}
                                        </div>
                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedVilla === villa.name ? "rotate-90" : ""}`} />
                                    </button>
                                    {expandedVilla === villa.name && villa.booked && (
                                        <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
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
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5 truncate max-w-[180px]">{villa.phone && villa.phone.length < 20 ? villa.phone : 'On file'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-out</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{villa.checkOutDate || 'N/A'}</p>
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
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extra Guests ({villa.extraGuests.length})</h4>
                                                    <div className="space-y-2">
                                                        {villa.extraGuests.map((eg: any, idx: number) => (
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
                                    {expandedVilla === villa.name && !villa.booked && (
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
        const allMapped = ddBookingsLive.length > 0 ? ddBookingsLive.map((b: any) => ({
            id: b.bookingRef || `#DD-${b.id}`,
            customer: b.customerName,
            phone: b.customerPhone,
            screen: b.screen?.name || "Unknown Screen",
            date: new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: b.bookingDate ? (() => { const d = new Date(b.bookingDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : '',
            slot: b.startHour != null ? `${b.startHour > 12 ? b.startHour - 12 : b.startHour}:00 ${b.startHour >= 12 ? 'PM' : 'AM'} - ${b.startHour + (b.durationHours || 3) > 12 ? b.startHour + (b.durationHours || 3) - 12 : b.startHour + (b.durationHours || 3)}:00 ${b.startHour + (b.durationHours || 3) >= 12 ? 'PM' : 'AM'}` : 'N/A',
            source: b.source === 'website' ? 'Online' : 'Walk-in',
            upfrontAmt: `₹${(b.amountPaid || 0).toLocaleString('en-IN')}`,
            upfrontMode: b.paymentMethod || "Online",
            remainingAmt: `₹${(b.amountToCollect || 0).toLocaleString('en-IN')}`,
            remainingStatus: b.amountToCollect <= 0 ? "Paid" : "Pending",
            status: b.status === "confirmed" ? "Confirmed" : b.status === "cancelled" ? "Cancelled" : "Draft",
            raw: b
        })) : [];

        // Filter by selected date
        const bookingsToDisplay = allMapped.filter((b: any) => b.rawDate === selectedDateStr);

        bookingsToDisplay.forEach((b: any) => {
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
                                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    <button
                                        onClick={() => handleImageDelete(img.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
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
                                        accept="image/*"
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
        dd: { title: "Digital Diaries", subtitle: "Read-only view of all Digital Diaries reservations." },
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
        </div>
    );
}
