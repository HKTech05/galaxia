"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, X, IndianRupee, CalendarDays, Users, Phone, Mail, Film, Trash2, Pencil, Download, FileText, ArrowRightLeft, Plus } from "lucide-react";


import { api } from "../../../lib/api";
import CustomDatePicker from "../../components/CustomDatePicker";
import ManualBookingModal from "../../components/ManualBookingModal";


interface StayBooking {
    id: number;
    bookingRef: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    propertyName: string;
    subPropertyName: string | null;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    kids: number;
    pets: number;
    numCottages: number;
    totalAmount: number;
    advanceAmount: number;
    balanceAmount: number;
    securityDeposit: number;
    status: string;
    source: string;
    bookedAt: string;
    nightlyRate: number;
    basePrice: number;
    extraPersonCharge: number;
    extraAdultCharge: number;
    extraKidsCharge: number;
    gstAmount: number;
    discountAmount: number;
    advancePaid: boolean;
    advanceMethod: string | null;
    balanceCollected: boolean;
    balanceMethod: string | null;
    depositCollected: boolean;
    depositMethod: string | null;
    couponCode: string | null;
    extraGuests: any[];
    addons: any[] | null;
    foodBills: any[] | null;
    isDd?: boolean;
    subPropertyId?: number | null;
    startHour?: number;
    durationHours?: number;
    screenId?: number;
    packageId?: number;
    occasion?: string;
    cakeMessage?: string;
    specialRequests?: string;
    bookingDate?: string;
    assignedUnit?: string | null;
}

const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-50 border-emerald-200 text-emerald-700",
    checked_in: "bg-blue-50 border-blue-200 text-blue-700",
    checked_out: "bg-slate-100 border-slate-300 text-slate-600",
    completed: "bg-slate-100 border-slate-300 text-slate-600",
    cancelled: "bg-red-50 border-red-200 text-red-700",
    no_show: "bg-amber-50 border-amber-200 text-amber-700",
    transferred: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

const statusIcons: Record<string, any> = {
    confirmed: CheckCircle,
    checked_in: Clock,
    checked_out: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    no_show: AlertCircle,
    transferred: ArrowRightLeft,
};

export default function StayBookingsPage() {
    const [bookings, setBookings] = useState<StayBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [isCollabBookingOpen, setIsCollabBookingOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [ddSourceFilter, setDdSourceFilter] = useState("All");
    const [propertyFilter, setPropertyFilter] = useState("All");
    const [bookedOnFrom, setBookedOnFrom] = useState("");
    const [bookedOnTo, setBookedOnTo] = useState("");
    const [datesFrom, setDatesFrom] = useState("");
    const [datesTo, setDatesTo] = useState("");
    const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<StayBooking | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<StayBooking | null>(null);
    const [editBooking, setEditBooking] = useState<StayBooking | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editSaving, setEditSaving] = useState(false);

    const updateStayFormAndRecalculate = (newPartialFields: any) => {
        const merged = { ...editForm, ...newPartialFields };
        if (editBooking?.isDd) {
            setEditForm(merged);
            return;
        }

        // Calculate nights
        const checkIn = new Date(merged.checkInDate + 'T00:00:00');
        const checkOut = new Date(merged.checkOutDate + 'T00:00:00');
        const nights = isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) 
            ? 1 
            : Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

        // Recalculate nightlyRate or basePrice?
        // If the change includes nightlyRate, checkInDate, checkOutDate, or numCottages,
        // we should auto-derive the basePrice.
        // Otherwise, we preserve whatever basePrice is currently in the form.
        let basePrice = Number(merged.basePrice) || 0;
        if (newPartialFields.nightlyRate !== undefined || 
            newPartialFields.checkInDate !== undefined || 
            newPartialFields.checkOutDate !== undefined || 
            newPartialFields.numCottages !== undefined) {
            const nightlyRate = Number(merged.nightlyRate) || 0;
            const numCottages = Number(merged.numCottages) || 1;
            basePrice = nightlyRate * nights * numCottages;
        }

        // Recalculate extra guest charges
        // If the change includes numGuests, numKids, checkInDate, or checkOutDate,
        // we should auto-derive extraPersonCharge.
        // Otherwise, we preserve whatever extraPersonCharge is currently in the form.
        let extraPersonCharge = Number(merged.extraPersonCharge) || 0;
        let extraAdultCharge = Number(merged.extraAdultCharge) || 0;
        let extraKidsCharge = Number(merged.extraKidsCharge) || 0;

        if (newPartialFields.numGuests !== undefined || 
            newPartialFields.numKids !== undefined ||
            newPartialFields.checkInDate !== undefined || 
            newPartialFields.checkOutDate !== undefined) {
            
            const propertyName = editBooking?.propertyName || "";
            let baseGuests = 2;
            let extraAdultPrice = 0;
            let kidsPrice = 0;

            if (propertyName.includes("Hill View")) {
                extraAdultPrice = 600;
                kidsPrice = 400;
                baseGuests = 2;
            } else if (propertyName.includes("Mount View")) {
                extraAdultPrice = 800;
                kidsPrice = 500;
                baseGuests = 2;
            } else if (propertyName.includes("Heavenly")) {
                extraAdultPrice = 800;
                kidsPrice = 500;
                baseGuests = 2;
            } else if (propertyName.includes("La Paraiso")) {
                extraAdultPrice = 1200;
                kidsPrice = 800;
                const startDay = checkIn.getDay();
                const isWeekend = startDay === 0 || startDay === 5 || startDay === 6;
                baseGuests = isWeekend ? 4 : 2;
            } else if (propertyName.includes("Amstel")) {
                extraAdultPrice = 2000;
                kidsPrice = 1000;
                baseGuests = 2;
            } else if (propertyName.includes("Ambrose")) {
                extraAdultPrice = 2000;
                kidsPrice = 1000;
                baseGuests = 4;
            }

            const numGuests = Number(merged.numGuests) || 0;
            const numKids = Number(merged.numKids) || 0;
            
            const extraAdults = Math.max(0, numGuests - baseGuests);
            const freeKidsSlots = Math.max(0, baseGuests - numGuests);
            const extraKids = Math.max(0, numKids - freeKidsSlots);

            extraAdultCharge = extraAdults * extraAdultPrice * nights;
            extraKidsCharge = extraKids * kidsPrice * nights;
            extraPersonCharge = extraAdultCharge + extraKidsCharge;
        }

        // Addons Total
        let addonsTotal = 0;
        if (merged.addons && Array.isArray(merged.addons)) {
            merged.addons.forEach((addon: any) => {
                if (addon.name === 'Celebration Add-on') {
                    addonsTotal += Number(addon.price) || 0;
                }
            });
        }

        const discountAmount = Number(merged.discountAmount) || 0;
        const petCharge = (Number(merged.numPets) || 0) * 600;

        const subtotal = Math.max(0, basePrice + extraPersonCharge + addonsTotal - discountAmount);

        // GST Amount (Taxes)
        let gstAmount = Number(merged.gstAmount) || 0;
        if (newPartialFields.gstAmount === undefined) {
            gstAmount = Math.round(subtotal * 0.05);
        }

        // Total Amount
        let totalAmount = Number(merged.totalAmount) || 0;
        if (newPartialFields.totalAmount === undefined) {
            totalAmount = subtotal + gstAmount + petCharge;
            totalAmount = Math.round(totalAmount / 10) * 10;
        }

        // Balance Amount (totalAmount - advanceAmount)
        const advanceAmount = Number(merged.advanceAmount) || 0;
        const balanceAmount = Math.max(0, totalAmount - advanceAmount);

        setEditForm({
            ...merged,
            basePrice,
            extraPersonCharge,
            extraAdultCharge,
            extraKidsCharge,
            gstAmount,
            totalAmount,
            balanceAmount,
        });
    };
    const [sortField, setSortField] = useState<"bookedAt" | "checkIn">("bookedAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [viewTab, setViewTab] = useState<"staycation" | "dd" | "all">("staycation");
    const [ddBookings, setDdBookings] = useState<StayBooking[]>([]);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferCheckIn, setTransferCheckIn] = useState('');
    const [transferCheckOut, setTransferCheckOut] = useState('');
    const [transferPropertyId, setTransferPropertyId] = useState('');
    const [transferSubPropertyId, setTransferSubPropertyId] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferProperties, setTransferProperties] = useState<any[]>([]);
    const [ddLoading, setDdLoading] = useState(false);

    // Daily Report Modal state
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportDate, setReportDate] = useState("");
    const [reportProperty, setReportProperty] = useState<"ambrose" | "amstel-nest" | "both">("both");
    const [reportLoading, setReportLoading] = useState(false);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== "All") params.set("status", statusFilter.toLowerCase().replace(" ", "_"));
            // Booked On range filters by bookedAt on backend
            if (bookedOnFrom) params.set("bookedOnFrom", bookedOnFrom);
            if (bookedOnTo) params.set("bookedOnTo", bookedOnTo);
            // Dates range filters by checkInDate on backend
            if (datesFrom) params.set("startDate", datesFrom);
            if (datesTo) params.set("endDate", datesTo);
            
            const data = await api.get(`/bookings/staycation?${params.toString()}`);
            const mapped: StayBooking[] = (Array.isArray(data) ? data : []).map((b: any) => ({
                id: b.id,
                bookingRef: b.bookingRef || `ST-${b.id}`,
                customerName: b.customerName || "Unknown",
                customerPhone: b.customerPhone || "",
                customerEmail: b.customerEmail || null,
                propertyName: b.property?.name || "Unknown",
                subPropertyName: b.subProperty?.name || null,
                subPropertyId: b.subPropertyId || null,
                checkIn: b.checkInDate,
                checkOut: b.checkOutDate,
                nights: b.numNights || 1,
                guests: b.numGuests || 2,
                kids: b.numKids || 0,
                pets: b.numPets || 0,
                numCottages: b.numCottages || 1,
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.advanceAmount || 0,
                balanceAmount: b.balanceAmount || 0,
                securityDeposit: b.securityDeposit || 0,
                status: b.status || "confirmed",
                source: b.source || "website",
                bookedAt: b.bookedAt || b.createdAt,
                nightlyRate: b.nightlyRate || 0,
                basePrice: b.basePrice || 0,
                extraPersonCharge: b.extraPersonCharge || 0,
                extraAdultCharge: b.extraAdultCharge || 0,
                extraKidsCharge: b.extraKidsCharge || 0,
                gstAmount: b.gstAmount || 0,
                discountAmount: b.discountAmount || 0,
                advancePaid: b.advancePaid || false,
                advanceMethod: b.advanceMethod || null,
                balanceCollected: b.balanceCollected || false,
                balanceMethod: b.balanceMethod || null,
                depositCollected: b.depositCollected || false,
                depositMethod: b.depositMethod || null,
                couponCode: b.coupon?.code || null,
                extraGuests: b.extraGuests || [],
                addons: b.addons || null,
                foodBills: b.foodBills || null,
                assignedUnit: b.assignedUnit || null,
                isDd: false,
            }));
            setBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch stay bookings:", err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, bookedOnFrom, bookedOnTo, datesFrom, datesTo]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    // Fetch DD bookings
    const fetchDdBookings = useCallback(async () => {
        try {
            setDdLoading(true);
            const params = new URLSearchParams();
            if (bookedOnFrom) { params.set('startDate', bookedOnFrom); params.set('filterBy', 'bookedAt'); }
            if (bookedOnTo) { params.set('endDate', bookedOnTo); if (!bookedOnFrom) params.set('filterBy', 'bookedAt'); }
            if (datesFrom) { params.set('startDate', datesFrom); params.set('filterBy', 'bookingDate'); }
            if (datesTo) { params.set('endDate', datesTo); if (!datesFrom) params.set('filterBy', 'bookingDate'); }
            if (!bookedOnFrom && !bookedOnTo && !datesFrom && !datesTo) params.set('filterBy', 'bookedAt');
            const data = await api.get(`/bookings/dd?${params.toString()}`);
            const mapped: StayBooking[] = (Array.isArray(data) ? data : []).map((b: any) => ({
                id: b.id,
                bookingRef: b.bookingRef || `DD-${b.id}`,
                customerName: b.customerName || "Unknown",
                customerPhone: b.customerPhone || "",
                customerEmail: b.customerEmail || null,
                propertyName: `DD: ${(b.screen?.name || 'Unknown Screen').replace(/\s*\(.*?\)/g, '')}`,
                subPropertyName: b.package?.name || null,
                checkIn: b.bookingDate,
                checkOut: b.bookingDate,
                nights: 0,
                guests: b.numGuests || 1,
                kids: 0,
                pets: 0,
                numCottages: 1,
                totalAmount: b.totalAmount || 0,
                advanceAmount: b.amountPaid || 0,
                balanceAmount: b.amountToCollect || 0,
                securityDeposit: 0,
                status: b.status || "confirmed",
                source: b.source || "website",
                bookedAt: b.bookedAt || b.createdAt,
                nightlyRate: 0,
                basePrice: b.basePrice || 0,
                extraPersonCharge: b.extraPersonCharge || 0,
                extraAdultCharge: 0,
                extraKidsCharge: 0,
                gstAmount: b.gstAmount || 0,
                discountAmount: b.discountAmount || 0,
                advancePaid: (b.amountPaid || 0) > 0,
                advanceMethod: b.paymentMethod || null,
                balanceCollected: (b.amountToCollect || 0) <= 0,
                balanceMethod: null,
                depositCollected: false,
                depositMethod: null,
                couponCode: b.coupon?.code || null,
                extraGuests: [],
                addons: b.addons || null,
                foodBills: null,
                isDd: true,
                startHour: b.startHour,
                durationHours: b.durationHours,
                screenId: b.screenId,
                packageId: b.packageId,
                occasion: b.occasion || '',
                cakeMessage: b.cakeMessage || '',
                specialRequests: b.specialRequests || '',
                bookingDate: b.bookingDate?.split('T')[0] || '',
            }));
            setDdBookings(mapped);
        } catch (err) {
            console.error("Failed to fetch DD bookings:", err);
        } finally {
            setDdLoading(false);
        }
    }, [bookedOnFrom, bookedOnTo, datesFrom, datesTo]);

    useEffect(() => {
        if (viewTab === 'dd' || viewTab === 'all') fetchDdBookings();
    }, [viewTab, fetchDdBookings]);

    useEffect(() => {
        api.get('/properties').then((data: any) => setTransferProperties(data || [])).catch(() => {});
    }, []);

    // Combine based on active tab
    const sourceBookings = viewTab === 'staycation' ? bookings : viewTab === 'dd' ? ddBookings : [...bookings, ...ddBookings];

    const filteredBookings = sourceBookings.filter(b => {
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase())
            || b.bookingRef.toLowerCase().includes(searchTerm.toLowerCase())
            || b.customerPhone.includes(searchTerm);
        const matchesProperty = propertyFilter === "All" || b.propertyName === propertyFilter;
        // DD & Staycation tabs use both status filter AND source filter
        let matchesFilter = true;
        if (viewTab === 'dd') {
            // Status filter
            if (statusFilter !== 'All') matchesFilter = b.status === statusFilter.toLowerCase().replace(' ', '_');
            // Source filter
            if (matchesFilter && ddSourceFilter !== 'All') {
                if (ddSourceFilter === 'Website') matchesFilter = b.source === 'website';
                else if (ddSourceFilter === 'Walk-in') matchesFilter = b.source !== 'website';
            }
        } else if (viewTab === 'staycation') {
            if (statusFilter === 'Collab') {
                matchesFilter = b.source === 'collab';
            } else {
                matchesFilter = statusFilter === 'All' || b.status === statusFilter.toLowerCase().replace(' ', '_');
                if (matchesFilter && ddSourceFilter !== 'All') {
                    if (ddSourceFilter === 'Website') matchesFilter = b.source === 'website';
                    else if (ddSourceFilter === 'Walk-in') matchesFilter = b.source !== 'website';
                }
            }
        } else {
            // 'all' tab
            matchesFilter = statusFilter === 'All' || b.status === statusFilter.toLowerCase().replace(' ', '_');
        }
        return matchesSearch && matchesProperty && matchesFilter;
    });

    const sortedBookings = [...filteredBookings].sort((a, b) => {
        let valA: number, valB: number;
        if (sortField === "bookedAt") {
            valA = new Date(a.bookedAt).getTime();
            valB = new Date(b.bookedAt).getTime();
        } else {
            valA = new Date(a.checkIn).getTime();
            valB = new Date(b.checkIn).getTime();
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
    });

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
    const formatSlot = (startHour: number, durationHours: number) => {
        const fmt = (h: number) => { const p = h >= 12 ? "PM" : "AM"; const hr = h > 12 ? h - 12 : h === 0 ? 12 : h; return `${hr}:00 ${p}`; };
        return `${fmt(startHour)} – ${fmt(startHour + durationHours)}`;
    };
    const formatDateTime = (d: string) => {
        if (!d) return "N/A";
        const dt = new Date(d);
        return `${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    };
    const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const properties = [...new Set(sourceBookings.map(b => b.propertyName))];

    // Generate PDF from daily report data
    const generateDailyReportPDF = async () => {
        if (!reportDate) { alert("Please select a date"); return; }
        setReportLoading(true);
        try {
            const data = await api.get(`/bookings/staycation/daily-report?date=${reportDate}&property=${reportProperty}`);
            if (!data || !data.bookings) { alert("No data returned"); setReportLoading(false); return; }

            const { default: jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();

            // Title
            const propLabel = reportProperty === "ambrose" ? "Ambrose" : reportProperty === "amstel-nest" ? "Amstel Nest" : "Ambrose + Amstel Nest";
            const dateFormatted = new Date(reportDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Galaxia Resorts — Daily Guest Report", pageWidth / 2, 15, { align: "center" });

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Date: ${dateFormatted}  |  Property: ${propLabel}`, pageWidth / 2, 23, { align: "center" });

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, pageWidth / 2, 28, { align: "center" });
            doc.setTextColor(0);

            // Guest table — show "Continue" in red for guests who checked in on a prior date
            const tableRows = data.bookings.map((b: any, idx: number) => [
                idx + 1,
                b.isCheckInToday ? b.customerName : b.customerName,
                b.propertyName + (b.subPropertyName ? ` (${b.subPropertyName})` : ""),
                b.numCottages,
                new Date(b.checkInDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                new Date(b.checkOutDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                b.numNights,
                b.numAdults,
                b.numChildren,
                b.foodPreference,
            ]);

            const margin = 14;
            autoTable(doc, {
                startY: 33,
                margin: { left: margin, right: margin },
                head: [[
                    "#", "Guest Name", "Property", "Villas", "Check-in", "Check-out", "Nights", "Adults", "Children", "Food Pref"
                ]],
                body: tableRows,
                theme: "grid",
                headStyles: { fillColor: [55, 48, 107], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
                bodyStyles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { halign: "center", cellWidth: 10 },
                    1: { cellWidth: 62 },
                    2: { cellWidth: 55 },
                    3: { halign: "center", cellWidth: 14 },
                    4: { halign: "center", cellWidth: 30 },
                    5: { halign: "center", cellWidth: 30 },
                    6: { halign: "center", cellWidth: 16 },
                    7: { halign: "center", cellWidth: 16 },
                    8: { halign: "center", cellWidth: 18 },
                    9: { halign: "center", cellWidth: 18 },
                },
                alternateRowStyles: { fillColor: [245, 245, 250] },
                didParseCell: function(hookData: any) {
                    // Highlight check-in date cells for today's check-ins
                    if (hookData.section === "body" && hookData.column.index === 4) {
                        const booking = data.bookings[hookData.row.index];
                        if (booking && booking.isCheckInToday) {
                            hookData.cell.styles.fillColor = [220, 252, 231];
                            hookData.cell.styles.fontStyle = "bold";
                        }
                    }
                },
                didDrawCell: function(hookData: any) {
                    // Draw "Continue" in red next to guest name for non-check-in-today guests
                    if (hookData.section === "body" && hookData.column.index === 1) {
                        const booking = data.bookings[hookData.row.index];
                        if (booking && !booking.isCheckInToday) {
                            const cellX = hookData.cell.x;
                            const cellY = hookData.cell.y;
                            const cellH = hookData.cell.height;
                            const nameText = hookData.cell.text?.join(" ") || "";
                            const nameWidth = doc.getTextWidth(nameText);
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(7);
                            doc.setTextColor(200, 30, 30);
                            doc.text("  Continue", cellX + 2 + nameWidth, cellY + cellH / 2 + 0.5);
                            doc.setTextColor(0);
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(8);
                        }
                    }
                }
            });

            // ─── Summary section — rounded colored cards ───
            const finalY = (doc as any).lastAutoTable?.finalY || 180;
            let yPos = finalY + 12;

            // Check if we need a new page for summary
            if (yPos > doc.internal.pageSize.getHeight() - 65) {
                doc.addPage();
                yPos = 15;
            }

            const s = data.summary;

            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 60);
            doc.text("Summary", 14, yPos);
            yPos += 8;

            // Helper: draw a rounded card (valueFontSize defaults to 16)
            const drawCard = (x: number, y: number, w: number, h: number, bgColor: number[], borderColor: number[], label: string, value: string, labelColor: number[], valueColor: number[], valueFontSize = 16) => {
                doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
                doc.setLineWidth(0.4);
                doc.roundedRect(x, y, w, h, 3, 3, "FD");
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
                doc.text(label, x + w / 2, y + 7, { align: "center" });
                doc.setFontSize(valueFontSize);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
                doc.text(value, x + w / 2, y + (valueFontSize >= 14 ? 17 : 16), { align: "center" });
            };

            const cardH = 24;
            const gap = 5;
            const usableWidth = pageWidth - 2 * margin;

            // --- Row 1: Ambrose Adults, Ambrose Kids, Amstel Adults, Amstel Kids, Total Guests ---
            const row1CardW = 48;
            const row1TotalW = row1CardW * 5 + gap * 4;
            const row1StartX = margin + (usableWidth - row1TotalW) / 2;

            // Ambrose Adults — green tint
            drawCard(row1StartX, yPos, row1CardW, cardH,
                [230, 250, 235], [160, 210, 170],
                "AMBROSE ADULTS", String(s.ambrose.adults),
                [40, 120, 60], [20, 100, 40]
            );
            // Ambrose Kids — lighter green
            drawCard(row1StartX + (row1CardW + gap), yPos, row1CardW, cardH,
                [240, 255, 240], [180, 220, 180],
                "AMBROSE KIDS", String(s.ambrose.children),
                [60, 130, 70], [30, 110, 40]
            );
            // Amstel Adults — blue tint
            drawCard(row1StartX + (row1CardW + gap) * 2, yPos, row1CardW, cardH,
                [230, 240, 255], [150, 180, 230],
                "AMSTEL ADULTS", String(s.amstelNest.adults),
                [40, 70, 150], [20, 50, 140]
            );
            // Amstel Kids — lighter blue
            drawCard(row1StartX + (row1CardW + gap) * 3, yPos, row1CardW, cardH,
                [238, 245, 255], [170, 195, 240],
                "AMSTEL KIDS", String(s.amstelNest.children),
                [60, 90, 160], [30, 60, 150]
            );
            // Total Guests — dark card
            drawCard(row1StartX + (row1CardW + gap) * 4, yPos, row1CardW, cardH,
                [35, 40, 65], [35, 40, 65],
                "TOTAL GUESTS", String(s.grandTotal.total),
                [180, 190, 220], [255, 255, 255]
            );

            yPos += cardH + 8;

            // --- Row 2: Check-ins Today, Jain, Regular ---
            const row2CardW = 60;
            const row2TotalW = row2CardW * 3 + gap * 2;
            const row2StartX = margin + (usableWidth - row2TotalW) / 2;

            // Check-ins today — orange tint
            drawCard(row2StartX, yPos, row2CardW, cardH,
                [255, 243, 230], [245, 200, 150],
                "CHECK-INS TODAY", String(s.totalCheckIns),
                [180, 100, 20], [200, 80, 0]
            );
            // Jain — warm yellow
            drawCard(row2StartX + row2CardW + gap, yPos, row2CardW, cardH,
                [255, 248, 230], [230, 200, 140],
                "JAIN", String(s.foodPreference.jain),
                [160, 120, 30], [180, 100, 0]
            );
            // Regular — light teal
            drawCard(row2StartX + (row2CardW + gap) * 2, yPos, row2CardW, cardH,
                [230, 248, 245], [160, 210, 200],
                "REGULAR (VEG)", String(s.foodPreference.regular),
                [40, 120, 110], [20, 100, 90]
            );

            // Force .pdf download using File API for maximum browser compatibility
            const fileName = `Galaxia_Daily_Report_${reportDate}_${propLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
            const pdfArrayBuffer = doc.output("arraybuffer");
            const pdfFile = new File([pdfArrayBuffer], fileName, { type: "application/pdf" });
            const fileUrl = URL.createObjectURL(pdfFile);
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = fileName;
            link.type = "application/pdf";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(fileUrl); }, 200);
        } catch (err) {
            console.error("Failed to generate report:", err);
            alert("Failed to generate report. Please try again.");
        } finally {
            setReportLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedBooking || !transferCheckIn || !transferCheckOut) return;
        setTransferLoading(true);
        try {
            const body: any = { newCheckIn: transferCheckIn, newCheckOut: transferCheckOut };
            if (transferPropertyId) body.newPropertyId = transferPropertyId;
            if (transferSubPropertyId) body.newSubPropertyId = transferSubPropertyId;
            await api.post(`/bookings/staycation/${selectedBooking.id}/transfer`, body);
            setShowTransferModal(false);
            setSelectedBooking(null);
            fetchBookings();
        } catch (err: any) {
            alert(err?.message || 'Transfer failed');
        } finally {
            setTransferLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bookings</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">All bookings across all properties</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCollabBookingOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus size={16} />
                        Collab Booking
                    </button>
                    <button
                        onClick={() => setIsManualBookingOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus size={16} />
                        Manual Booking
                    </button>
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <FileText size={16} />
                        Daily Report
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
                {(["staycation", "dd", "all"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setViewTab(tab); setStatusFilter('All'); setDdSourceFilter('All'); setBookedOnFrom(''); setBookedOnTo(''); setDatesFrom(''); setDatesTo(''); }}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                            viewTab === tab
                                ? 'bg-white shadow text-purple-700'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab === 'staycation' ? 'Staycation' : tab === 'dd' ? 'Digital Diaries' : 'All'}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                {/* Row 1: Search bar — full width on desktop */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search name, ID, or phone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                </div>

                {/* Row 2: Booked On date range */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Booked On</p>
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                            <CustomDatePicker
                                date={bookedOnFrom ? new Date(bookedOnFrom + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setBookedOnFrom(`${y}-${m}-${day}`);
                                    setDatesFrom(''); setDatesTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                        <div className="flex-1">
                            <CustomDatePicker
                                date={bookedOnTo ? new Date(bookedOnTo + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setBookedOnTo(`${y}-${m}-${day}`);
                                    setDatesFrom(''); setDatesTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        {(bookedOnFrom || bookedOnTo) && (
                            <button
                                onClick={() => { setBookedOnFrom(''); setBookedOnTo(''); }}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 3: Dates (check-in/booking date) range */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-in Dates</p>
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                            <CustomDatePicker
                                date={datesFrom ? new Date(datesFrom + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setDatesFrom(`${y}-${m}-${day}`);
                                    setBookedOnFrom(''); setBookedOnTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                        <div className="flex-1">
                            <CustomDatePicker
                                date={datesTo ? new Date(datesTo + 'T00:00:00') : new Date()}
                                onDateChange={(d) => {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setDatesTo(`${y}-${m}-${day}`);
                                    setBookedOnFrom(''); setBookedOnTo('');
                                }}
                                className="w-full"
                            />
                        </div>
                        {(datesFrom || datesTo) && (
                            <button
                                onClick={() => { setDatesFrom(''); setDatesTo(''); }}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 3: Property filter + Status pills — evenly spaced on desktop */}
                <div className="flex gap-3 items-center lg:justify-between">
                    <div className="relative flex-1 lg:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select
                            value={propertyFilter}
                            onChange={(e) => setPropertyFilter(e.target.value)}
                            className="w-full lg:w-auto pl-9 pr-8 py-2 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="All">All Properties</option>
                            {properties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                    </div>

                    {/* Filter pills — Status filter for all tabs */}
                    {(() => {
                        const filterOptions = viewTab === 'dd'
                            ? ["All", "Confirmed", "No Show", "Transferred", "Cancelled"]
                            : viewTab === 'staycation'
                                ? ["All", "Confirmed", "Checked In", "Checked Out", "Collab", "Transferred", "Cancelled"]
                                : ["All", "Confirmed", "Checked In", "Checked Out", "Transferred", "Cancelled"];
                        return (
                            <>
                                <div className="relative flex-1 lg:hidden">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full py-2 px-3 pr-8 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        {filterOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                                </div>
                                <div className="hidden lg:flex flex-1 items-center bg-slate-100 rounded-lg p-1 gap-1 ml-3">
                                    {filterOptions.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setStatusFilter(opt)}
                                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap text-center ${statusFilter === opt
                                                ? "bg-white text-indigo-700 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </>
                        );
                    })()}

                    {/* DD & Staycation Source dropdown — shows for both tabs */}
                    {(viewTab === 'dd' || viewTab === 'staycation') && (
                        <div className="relative flex-shrink-0 ml-3">
                            <select
                                value={ddSourceFilter}
                                onChange={(e) => setDdSourceFilter(e.target.value)}
                                className="pl-3 pr-8 py-2 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="All">All Sources</option>
                                <option value="Website">Website</option>
                                <option value="Walk-in">{viewTab === 'staycation' ? 'Manual' : 'Walk-in'}</option>
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                        </div>
                    )}
                </div>
            </div>


            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Bookings", value: filteredBookings.length, color: "text-slate-800" },
                    { label: "Confirmed", value: filteredBookings.filter(b => b.status === "confirmed").length, color: "text-emerald-600" },
                    { label: "Total Revenue", value: formatPrice(filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0)), color: "text-indigo-600" },
                    { label: "Advance Collected", value: formatPrice(filteredBookings.reduce((sum, b) => sum + b.advanceAmount, 0)), color: "text-sky-600" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Property</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => { if (sortField === "bookedAt") { setSortDir(d => d === "asc" ? "desc" : "asc"); } else { setSortField("bookedAt"); setSortDir("desc"); } }} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        Booked On
                                        <span className={`text-[10px] ${sortField === "bookedAt" ? "text-indigo-600" : "text-slate-300"}`}>{sortField === "bookedAt" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}</span>
                                    </button>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => { if (sortField === "checkIn") { setSortDir(d => d === "asc" ? "desc" : "asc"); } else { setSortField("checkIn"); setSortDir("desc"); } }} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        Dates
                                        <span className={`text-[10px] ${sortField === "checkIn" ? "text-indigo-600" : "text-slate-300"}`}>{sortField === "checkIn" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}</span>
                                    </button>
                                </th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Guests</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">Loading bookings...</td></tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">No bookings found.</td></tr>
                            ) : (
                                sortedBookings.map((b) => {
                                    const StatusIcon = statusIcons[b.status] || CheckCircle;
                                    return (
                                        <tr key={b.id} onClick={() => setSelectedBooking(b)} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-bold text-slate-800">{b.customerName}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                                            b.source === "collab"
                                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                : b.source === "website"
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                : b.source === "admin-bulk" || b.source === "bulk"
                                                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        }`}>
                                                            {b.source === "collab"
                                                                ? "Collab"
                                                                : b.source === "website"
                                                                ? "Online"
                                                                : b.source === "admin-bulk" || b.source === "bulk"
                                                                ? "Admin Bulk"
                                                                : (b.isDd ? "Walk-in" : "Manual")}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-400">{b.bookingRef}</span>
                                                    <span className="text-[11px] font-bold text-slate-400 mt-0.5">{b.customerPhone}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{b.propertyName}</span>
                                                {b.subPropertyName && (
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{b.subPropertyName}</p>
                                                )}
                                                {b.assignedUnit && b.assignedUnit !== b.subPropertyName && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                                        ✏️ Override: {b.assignedUnit}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-medium text-slate-700">{formatDateTime(b.bookedAt)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {b.isDd ? (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-800">{formatDate(b.checkIn)}</span>
                                                        <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{b.startHour !== undefined && b.durationHours !== undefined ? formatSlot(b.startHour, b.durationHours) : ""}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-bold text-slate-800">{formatDate(b.checkIn)}</span>
                                                        <span className="text-slate-400 mx-1">→</span>
                                                        <span className="text-sm font-medium text-slate-600">{formatDate(b.checkOut)}</span>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{b.guests} adult{b.guests !== 1 ? 's' : ''}{b.kids > 0 && <span className="text-xs font-medium text-blue-600 ml-1">{b.kids} child{b.kids !== 1 ? 'ren' : ''}</span>}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-bold text-slate-800">{formatPrice(b.totalAmount)}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[11px] font-bold text-emerald-600">Advance: {formatPrice(b.advanceAmount)}</span>
                                                    <span className="text-[11px] font-bold text-amber-600">Balance: {formatPrice(b.balanceAmount)}</span>
                                                    {b.securityDeposit > 0 && (
                                                        <span className="text-[11px] font-bold text-sky-600">Deposit: {formatPrice(b.securityDeposit)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[b.status] || "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                                    <StatusIcon size={14} />
                                                    {statusLabel(b.status)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Booking Details</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.bookingRef}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Customer Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Users size={14} className="text-indigo-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Name</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedBooking.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center"><Phone size={14} className="text-emerald-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Phone</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedBooking.customerPhone || "N/A"}</p>
                                        </div>
                                    </div>
                                    {selectedBooking.customerEmail && (
                                        <div className="flex items-center gap-3 min-w-0 col-span-2 sm:col-span-1">
                                            <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0"><Mail size={14} className="text-sky-600" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-slate-400 font-medium">Email</p>
                                                <p className="text-sm font-bold text-slate-800 truncate sm:break-all sm:whitespace-normal">{selectedBooking.customerEmail}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center"><CalendarDays size={14} className="text-amber-600" /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Booked On</p>
                                            <p className="text-sm font-bold text-slate-800">{formatDateTime(selectedBooking.bookedAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stay / Booking Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{selectedBooking.isDd ? "Booking Information" : "Stay Information"}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Property</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.propertyName}</p>
                                        {selectedBooking.subPropertyName && <p className="text-xs text-slate-500">{selectedBooking.subPropertyName}</p>}
                                    </div>
                                    {selectedBooking.isDd ? (
                                        <>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Date</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkIn)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Time Slot</p>
                                                <p className="text-sm font-bold text-indigo-700">{selectedBooking.startHour !== undefined && selectedBooking.durationHours !== undefined ? formatSlot(selectedBooking.startHour, selectedBooking.durationHours) : "N/A"}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Check-in</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkIn)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Check-out</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDate(selectedBooking.checkOut)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Nights</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedBooking.nights}</p>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Guests</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.guests} adult{selectedBooking.guests !== 1 ? 's' : ''}{selectedBooking.kids > 0 && <span className="text-blue-600 ml-1">{selectedBooking.kids} child{selectedBooking.kids !== 1 ? 'ren' : ''}</span>}</p>
                                    </div>
                                    {selectedBooking.numCottages > 1 && (
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Cottages</p>
                                            <p className="text-sm font-bold text-amber-700">{selectedBooking.numCottages}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Source</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedBooking.source === "collab" ? "Collab Booking" : selectedBooking.source === "website" ? "Online Booking" : selectedBooking.source === "admin-bulk" || selectedBooking.source === "bulk" ? "Admin Bulk" : (selectedBooking.isDd ? "Walk-in / Reception" : "Manual Booking")}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Breakdown */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing Breakdown</h4>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                                     {(() => {
                                         const calculatedRoomTotal = (selectedBooking.nightlyRate || 0) * (selectedBooking.nights || 1) * (selectedBooking.numCottages || 1);
                                         const isHistoricalReceptionDiscounted = selectedBooking.source === "reception" && 
                                             selectedBooking.discountAmount > 0 && 
                                             selectedBooking.basePrice < calculatedRoomTotal;

                                         const extraAdult = selectedBooking.extraAdultCharge || 0;
                                         const extraKids = selectedBooking.extraKidsCharge || 0;
                                         const extraPerson = selectedBooking.extraPersonCharge || 0;
                                         const petCharges = (selectedBooking.pets || 0) * 600;

                                         const displayBasePrice = isHistoricalReceptionDiscounted ? calculatedRoomTotal : (selectedBooking.basePrice || 0);

                                         let addonsTotal = 0;
                                         const addonRows: React.ReactNode[] = [];
                                         if (selectedBooking.addons && Array.isArray(selectedBooking.addons)) {
                                             selectedBooking.addons.forEach((addon: any, i: number) => {
                                                 if (addon.name === 'Celebration Add-on') {
                                                     addonsTotal += Number(addon.price || 0);
                                                     addonRows.push(
                                                         <div key={`addon-${i}`} className="space-y-1">
                                                             <div className="flex justify-between text-sm">
                                                                 <span className="text-amber-700">{addon.name}</span>
                                                                 <span className="font-bold text-amber-700">{formatPrice(addon.price || 0)}</span>
                                                             </div>
                                                             {addon.cakeMessage && <p className="text-xs text-slate-500 mt-0.5 ml-1">Cake: {addon.cakeMessage}</p>}
                                                             {addon.occasion && <p className="text-xs text-slate-500 ml-1">Occasion: {addon.occasion}</p>}
                                                         </div>
                                                     );
                                                 } else if (addon.name === 'Food Preference') {
                                                     addonRows.push(
                                                         <div key={`addon-${i}`} className="flex justify-between text-sm items-center">
                                                             <span className="text-emerald-700">Food Preference</span>
                                                             <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${addon.foodType === 'Jain' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                 {addon.foodType} (Veg){addon.count !== undefined && addon.count !== null && addon.count > 0 ? ` x ${addon.count}` : ''}
                                                             </span>
                                                         </div>
                                                     );
                                                 }
                                             });
                                         }

                                         const taxes = selectedBooking.gstAmount || 0;

                                         return (
                                             <>
                                                 {displayBasePrice > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Base Price</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(displayBasePrice)}</span>
                                                     </div>
                                                 )}
                                                 {extraAdult > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Extra Adult Charge</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(extraAdult)}</span>
                                                     </div>
                                                 )}
                                                 {extraKids > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Extra Child Charge</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(extraKids)}</span>
                                                     </div>
                                                 )}
                                                 {!extraAdult && !extraKids && extraPerson > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Extra Person Charge</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(extraPerson)}</span>
                                                     </div>
                                                 )}
                                                 {petCharges > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Pet Charges</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(petCharges)}</span>
                                                     </div>
                                                 )}
                                                 {selectedBooking.discountAmount > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-emerald-600">{selectedBooking.couponCode ? `Coupon Applied (${selectedBooking.couponCode})` : "Discount"}</span>
                                                         <span className="font-bold text-emerald-600">-{formatPrice(selectedBooking.discountAmount)}</span>
                                                     </div>
                                                 )}
                                                 {addonRows}
                                                 {taxes > 0 && (
                                                     <div className="flex justify-between text-sm">
                                                         <span className="text-slate-600">Taxes</span>
                                                         <span className="font-bold text-slate-800">{formatPrice(taxes)}</span>
                                                     </div>
                                                 )}
                                                 <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                                     <span className="font-bold text-slate-800">Total Amount</span>
                                                     <span className="font-black text-lg text-slate-900">{formatPrice(selectedBooking.totalAmount)}</span>
                                                 </div>
                                             </>
                                         );
                                     })()}
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Status</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className={`p-3 rounded-lg border ${selectedBooking.advancePaid ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.advancePaid ? "text-emerald-600" : "text-amber-600"}`}>
                                            Advance {selectedBooking.advancePaid ? "✓ Paid" : "⏳ Pending"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.advanceAmount)}</p>
                                        {selectedBooking.advanceMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.advanceMethod}</p>}
                                    </div>
                                    <div className={`p-3 rounded-lg border ${selectedBooking.balanceCollected ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.balanceCollected ? "text-emerald-600" : "text-amber-600"}`}>
                                            Balance {selectedBooking.balanceCollected ? "✓ Collected" : "⏳ Pending"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.balanceAmount)}</p>
                                        {selectedBooking.balanceMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.balanceMethod}</p>}
                                    </div>
                                    {!selectedBooking.isDd && (
                                    <div className={`p-3 rounded-lg border ${selectedBooking.depositCollected ? "bg-emerald-50 border-emerald-100" : "bg-sky-50 border-sky-100"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${selectedBooking.depositCollected ? "text-emerald-600" : "text-sky-600"}`}>
                                            Security Deposit {selectedBooking.depositCollected ? "✓ Collected" : "⏳ At Check-in"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(selectedBooking.securityDeposit)}</p>
                                        {selectedBooking.depositMethod && <p className="text-[10px] text-slate-500">via {selectedBooking.depositMethod}</p>}
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* Extra Guests */}
                            {selectedBooking.extraGuests && selectedBooking.extraGuests.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Extra Guests ({selectedBooking.extraGuests.length})</h4>
                                    <div className="space-y-2">
                                        {selectedBooking.extraGuests.map((eg: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-purple-600" />
                                                    <span className="text-sm font-bold text-slate-800">{eg.guestName}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-purple-600">+{formatPrice(eg.chargeAmount || 0)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase">{eg.paymentMethod}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Food Bills */}
                            {selectedBooking.foodBills && selectedBooking.foodBills.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Food Bills</h4>
                                    <div className="space-y-1.5">
                                        {selectedBooking.foodBills.map((fb: any, idx: number) => (
                                            <div key={idx} className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800">{fb.description}</p>
                                                    <p className="text-[10px] text-amber-600 mt-0.5">{fb.paymentMethod === 'upi' ? 'UPI' : 'Cash'}</p>
                                                </div>
                                                <p className="text-sm font-bold text-amber-800">₹{fb.amount.toLocaleString('en-IN')}</p>
                                            </div>
                                        ))}
                                        <div className="bg-amber-100 p-2 rounded-lg border border-amber-200 flex items-center justify-between">
                                            <p className="text-xs font-bold text-amber-900">Total Food Bills</p>
                                            <p className="text-sm font-black text-amber-900">₹{selectedBooking.foodBills.reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status + Delete */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[selectedBooking.status] || "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                    {(() => { const Icon = statusIcons[selectedBooking.status] || CheckCircle; return <Icon size={14} />; })()}
                                    {statusLabel(selectedBooking.status)}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 font-medium">DB ID: {selectedBooking.id}</span>
                                    <button
                                        onClick={() => {
                                            const b = selectedBooking;
                                            const addonsArr = b.addons || [];
                                            const regAddon = addonsArr.find((a: any) => a.name === 'Food Preference' && a.foodType === 'Regular');
                                            const jainAddon = addonsArr.find((a: any) => a.name === 'Food Preference' && a.foodType === 'Jain');

                                            setEditForm({
                                                customerName: b.customerName,
                                                customerPhone: b.customerPhone,
                                                customerEmail: b.customerEmail || '',
                                                numGuests: b.guests,
                                                numKids: b.kids,
                                                numPets: b.pets || 0,
                                                numCottages: b.numCottages || 1,
                                                checkInDate: b.checkIn ? b.checkIn.split('T')[0] : '',
                                                checkOutDate: b.checkOut ? b.checkOut.split('T')[0] : '',
                                                nightlyRate: b.nightlyRate,
                                                basePrice: b.basePrice,
                                                extraPersonCharge: b.extraPersonCharge,
                                                gstAmount: b.gstAmount,
                                                discountAmount: b.discountAmount || 0,
                                                totalAmount: b.totalAmount,
                                                advanceAmount: b.advanceAmount,
                                                balanceAmount: b.balanceAmount,
                                                securityDeposit: b.securityDeposit,
                                                status: b.status,
                                                source: b.source,
                                                addons: addonsArr,
                                                // DD-specific fields
                                                screenId: b.screenId || 1,
                                                packageId: b.packageId || 1,
                                                bookingDate: b.bookingDate || (b.checkIn ? b.checkIn.split('T')[0] : ''),
                                                startHour: b.startHour || 10,
                                                durationHours: b.durationHours || 3,
                                                occasion: b.occasion || '',
                                                cakeMessage: b.cakeMessage || '',
                                                specialRequests: b.specialRequests || '',
                                                foodRegular: regAddon ? regAddon.count : 0,
                                                foodJain: jainAddon ? jainAddon.count : 0,
                                                subPropertyId: b.subPropertyId || '',
                                            });
                                            setEditBooking(b);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                    >
                                        <Pencil size={13} /> Edit
                                    </button>
                                    {selectedBooking.status !== 'transferred' && selectedBooking.status !== 'cancelled' && (
                                        <button
                                            onClick={() => {
                                                setTransferCheckIn('');
                                                setTransferCheckOut('');
                                                setTransferPropertyId('');
                                                setTransferSubPropertyId('');
                                                setShowTransferModal(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors"
                                        >
                                            <ArrowRightLeft size={13} /> Transfer
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDeleteConfirmBooking(selectedBooking)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmBooking && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirmBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Booking</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Are you sure you want to <strong className="text-red-600">permanently</strong> delete booking <strong>{deleteConfirmBooking.bookingRef}</strong>?
                            </p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                This will remove the booking from the database along with all associated cash logs, UPI logs, payment records, and financial data. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 p-4 pt-0">
                            <button
                                onClick={() => setDeleteConfirmBooking(null)}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleting(true);
                                    try {
                                        const isDd = deleteConfirmBooking.isDd;
                                        const endpoint = isDd
                                            ? `/bookings/dd/${deleteConfirmBooking.id}`
                                            : `/bookings/staycation/${deleteConfirmBooking.id}`;
                                        await api.delete(endpoint);
                                        setDeleteConfirmBooking(null);
                                        setSelectedBooking(null);
                                        // Refresh
                                        if (isDd) fetchDdBookings();
                                        else fetchBookings();
                                    } catch (err) {
                                        console.error("Delete failed:", err);
                                        alert("Failed to delete booking. Please try again.");
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Booking Modal */}
            {editBooking && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !editSaving && setEditBooking(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Edit Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{editBooking.bookingRef}</p>
                            </div>
                            <button onClick={() => setEditBooking(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={editSaving}>
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Customer Info */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
                                        <input type="text" value={editForm.customerName || ''} onChange={e => setEditForm({...editForm, customerName: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                                        <input type="text" value={editForm.customerPhone || ''} onChange={e => setEditForm({...editForm, customerPhone: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                                        <input type="text" value={editForm.customerEmail || ''} onChange={e => setEditForm({...editForm, customerEmail: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            {/* DD Screening Info */}
                            {editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Screening Details</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Screen</label>
                                            <select value={editForm.screenId || 1} onChange={e => setEditForm({...editForm, screenId: parseInt(e.target.value)})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                                <option value={1}>Sandy Screen</option>
                                                <option value={2}>Cine Love</option>
                                                <option value={3}>Park N Watch</option>
                                                <option value={4}>Baywatch</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Package</label>
                                            <select value={editForm.packageId || 1} onChange={e => setEditForm({...editForm, packageId: parseInt(e.target.value)})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                                <option value={1}>Movie Time</option>
                                                <option value={2}>Celebration</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Booking Date</label>
                                            <input type="date" value={editForm.bookingDate || ''} onChange={e => setEditForm({...editForm, bookingDate: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                                            <select value={editForm.startHour || 10} onChange={e => setEditForm({...editForm, startHour: parseInt(e.target.value)})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                                {Array.from({ length: 13 }, (_, i) => i + 10).map(h => (
                                                    <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Duration</label>
                                            <select value={editForm.durationHours || 3} onChange={e => setEditForm({...editForm, durationHours: parseInt(e.target.value)})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                                {[1, 2, 3, 4, 5, 6].map(h => (<option key={h} value={h}>{h} hr{h > 1 ? 's' : ''}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Guests</label>
                                            <input type="number" min={1} max={50} value={editForm.numGuests || 1} onChange={e => setEditForm({...editForm, numGuests: parseInt(e.target.value) || 1})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Occasion</label>
                                            <select value={editForm.occasion || ''} onChange={e => setEditForm({...editForm, occasion: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                                <option value="">None</option>
                                                <option value="Happy Birthday">Happy Birthday</option>
                                                <option value="Proposal">Proposal</option>
                                                <option value="Anniversary">Anniversary</option>
                                                <option value="Better Together">Better Together</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Cake Message</label>
                                            <input type="text" value={editForm.cakeMessage || ''} onChange={e => setEditForm({...editForm, cakeMessage: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Special Requests</label>
                                            <textarea value={editForm.specialRequests || ''} onChange={e => setEditForm({...editForm, specialRequests: e.target.value})} rows={2}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stay Info */}
                            {!editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stay Information</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Check-in</label>
                                            <input type="date" value={editForm.checkInDate || ''} onChange={e => updateStayFormAndRecalculate({ checkInDate: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Check-out</label>
                                            <input type="date" value={editForm.checkOutDate || ''} onChange={e => updateStayFormAndRecalculate({ checkOutDate: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Guests</label>
                                            <input type="number" min={1} value={editForm.numGuests || ''} onChange={e => updateStayFormAndRecalculate({ numGuests: parseInt(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Kids</label>
                                            <input type="number" min={0} value={editForm.numKids || ''} onChange={e => updateStayFormAndRecalculate({ numKids: parseInt(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cottages (Amstel Nest only) */}
                            {editBooking && editBooking.propertyName?.includes('Amstel') && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cottages</h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Cottages</label>
                                        <input type="number" min={1} max={10} value={editForm.numCottages || 1} onChange={e => updateStayFormAndRecalculate({ numCottages: parseInt(e.target.value) || 1 })}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                </div>
                            )}

                            {/* Financial Details */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Financial Details</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {!editBooking.isDd && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Nightly Rate</label>
                                            <input type="number" value={editForm.nightlyRate ?? ''} onChange={e => updateStayFormAndRecalculate({ nightlyRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Base Price</label>
                                        <input type="number" value={editForm.basePrice ?? ''} onChange={e => updateStayFormAndRecalculate({ basePrice: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Extra Person</label>
                                        <input type="number" value={editForm.extraPersonCharge ?? ''} onChange={e => updateStayFormAndRecalculate({ extraPersonCharge: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">{editBooking.isDd ? "GST Amount" : "Taxes"}</label>
                                        <input type="number" value={editForm.gstAmount ?? ''} onChange={e => updateStayFormAndRecalculate({ gstAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                    </div>
                                    {!editBooking.isDd && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Discount</label>
                                            <input type="number" value={editForm.discountAmount ?? ''} onChange={e => updateStayFormAndRecalculate({ discountAmount: parseFloat(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase">Total Amount</label>
                                        <input type="number" value={editForm.totalAmount ?? ''} onChange={e => updateStayFormAndRecalculate({ totalAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-600 uppercase">Advance Paid</label>
                                        <input type="number" value={editForm.advanceAmount ?? ''} onChange={e => updateStayFormAndRecalculate({ advanceAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-600 uppercase">Balance</label>
                                        <input type="number" value={editForm.balanceAmount ?? ''} onChange={e => updateStayFormAndRecalculate({ balanceAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 px-3 py-2 border border-amber-200 rounded-lg text-sm font-bold text-amber-700 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                                    </div>
                                    {!editBooking.isDd && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit</label>
                                            <input type="number" value={editForm.securityDeposit ?? ''} onChange={e => updateStayFormAndRecalculate({ securityDeposit: parseFloat(e.target.value) || 0 })}
                                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status & Source */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status & Source</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                                        <select value={editForm.status || ''} onChange={e => setEditForm({...editForm, status: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                            <option value="confirmed">Confirmed</option>
                                            <option value="checked_in">Checked In</option>
                                            <option value="checked_out">Checked Out</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="no_show">No Show</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Source</label>
                                        <select value={editForm.source || ''} onChange={e => setEditForm({...editForm, source: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                            <option value="website">Website</option>
                                            <option value="reception">{editBooking.isDd ? "Reception" : "Manual"}</option>
                                            <option value="admin-bulk">Admin Bulk</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Ambrose Villa Selector (Staycation ONLY) */}
                            {editBooking && !editBooking.isDd && editBooking.propertyName?.includes('Ambrose') && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ambrose Villa Theme</h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Villa Theme</label>
                                        <select
                                            value={editForm.subPropertyId || ''}
                                            onChange={e => {
                                                const val = e.target.value ? parseInt(e.target.value) : '';
                                                setEditForm({ ...editForm, subPropertyId: val });
                                            }}
                                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                        >
                                            <option value="">Select Villa Theme</option>
                                            {(() => {
                                                const ambroseProp = transferProperties.find((p: any) => p.name.includes("Ambrose") || p.slug === "ambrose");
                                                const ambroseVillas = ambroseProp ? ambroseProp.subProperties || [] : [];
                                                return ambroseVillas.map((v: any) => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ));
                                            })()}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Food Preference Add-ons (Staycation ONLY) */}
                            {editBooking && !editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Food Preferences</h4>
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Regular Count</label>
                                            <input type="number" min={0} value={editForm.foodRegular ?? 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setEditForm({ ...editForm, foodRegular: val });
                                                }}
                                                className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Jain Count</label>
                                            <input type="number" min={0} value={editForm.foodJain ?? 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setEditForm({ ...editForm, foodJain: val });
                                                }}
                                                className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Addons — Staycation only, NOT DD */}
                            {!editBooking.isDd && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Add-ons</h4>
                                    {editForm.addons && editForm.addons.length > 0 ? (
                                        <div className="space-y-2">
                                            {editForm.addons.map((addon: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-purple-700">{addon.name || 'Add-on'}</span>
                                                        <button onClick={() => { const a = [...editForm.addons]; a.splice(idx, 1); updateStayFormAndRecalculate({ addons: a }); }}
                                                            className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                                                    </div>
                                                    {addon.name === 'Celebration Add-on' && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Price</label>
                                                                <input type="number" value={addon.price || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], price: parseInt(e.target.value) || 0}; updateStayFormAndRecalculate({ addons: a }); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Occasion</label>
                                                                <input type="text" value={addon.occasion || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], occasion: e.target.value}; setEditForm({...editForm, addons: a}); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-purple-500 uppercase">Cake Msg</label>
                                                                <input type="text" value={addon.cakeMessage || ''} onChange={e => { const a = [...editForm.addons]; a[idx] = {...a[idx], cakeMessage: e.target.value}; setEditForm({...editForm, addons: a}); }}
                                                                    className="w-full mt-0.5 px-2 py-1.5 border border-purple-200 rounded text-xs font-medium" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No add-ons</p>
                                    )}
                                    <button onClick={() => updateStayFormAndRecalculate({ addons: [...(editForm.addons || []), { name: 'Celebration Add-on', price: 1200, occasion: '', cakeMessage: '' }] })}
                                        className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">+ Add Celebration Add-on</button>
                                </div>
                            )}
                        </div>

                        {/* Save / Cancel */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={() => setEditBooking(null)} disabled={editSaving}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button
                                disabled={editSaving}
                                onClick={async () => {
                                    setEditSaving(true);
                                    try {
                                        if (editBooking.isDd) {
                                            // DD booking edit — use DD endpoint
                                            await api.patch(`/bookings/dd/${editBooking.id}`, {
                                                customerName: editForm.customerName,
                                                customerPhone: editForm.customerPhone,
                                                customerEmail: editForm.customerEmail || null,
                                                numGuests: editForm.numGuests,
                                                screenId: editForm.screenId,
                                                packageId: editForm.packageId,
                                                bookingDate: editForm.bookingDate,
                                                startHour: editForm.startHour,
                                                durationHours: editForm.durationHours,
                                                occasion: editForm.occasion || null,
                                                cakeMessage: editForm.cakeMessage || null,
                                                specialRequests: editForm.specialRequests || null,
                                                basePrice: editForm.basePrice,
                                                extraPersonCharge: editForm.extraPersonCharge,
                                                totalAmount: editForm.totalAmount,
                                                amountPaid: editForm.advanceAmount,
                                                amountToCollect: editForm.balanceAmount,
                                                gstAmount: editForm.gstAmount,
                                                status: editForm.status,
                                                source: editForm.source,
                                            });
                                        } else {
                                            // Staycation booking edit
                                            const finalAddons = [
                                                ...(editForm.addons || []).filter((a: any) => a.name !== 'Food Preference'),
                                            ];
                                            if (editForm.foodRegular > 0) {
                                                finalAddons.push({ name: 'Food Preference', foodType: 'Regular', count: editForm.foodRegular });
                                            }
                                            if (editForm.foodJain > 0) {
                                                finalAddons.push({ name: 'Food Preference', foodType: 'Jain', count: editForm.foodJain });
                                            }

                                            await api.patch(`/bookings/staycation/${editBooking.id}`, {
                                                customerName: editForm.customerName,
                                                customerPhone: editForm.customerPhone,
                                                customerEmail: editForm.customerEmail || null,
                                                numGuests: editForm.numGuests,
                                                numKids: editForm.numKids,
                                                numPets: editForm.numPets,
                                                numCottages: editForm.numCottages,
                                                checkInDate: editForm.checkInDate,
                                                checkOutDate: editForm.checkOutDate,
                                                nightlyRate: editForm.nightlyRate,
                                                basePrice: editForm.basePrice,
                                                extraPersonCharge: editForm.extraPersonCharge,
                                                gstAmount: editForm.gstAmount,
                                                discountAmount: editForm.discountAmount,
                                                totalAmount: editForm.totalAmount,
                                                advanceAmount: editForm.advanceAmount,
                                                balanceAmount: editForm.balanceAmount,
                                                securityDeposit: editForm.securityDeposit,
                                                status: editForm.status,
                                                source: editForm.source,
                                                addons: finalAddons.length > 0 ? finalAddons : null,
                                                subPropertyId: editForm.subPropertyId || null,
                                            });
                                        }
                                        setEditBooking(null);
                                        setSelectedBooking(null);
                                        if (editBooking.isDd) fetchDdBookings();
                                        else fetchBookings();
                                        alert('Booking updated successfully!');
                                    } catch (err) {
                                        console.error('Edit failed:', err);
                                        alert('Failed to update booking. Please try again.');
                                    } finally {
                                        setEditSaving(false);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !reportLoading && setShowReportModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Daily Guest Report</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Download a PDF of all guests staying on a specific date</p>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={reportLoading}>
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Instructions */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                                    Select a date and property to generate a PDF report of all guests <strong>staying</strong> on that date.
                                    Check-outs on the selected date are <strong>not included</strong> — only guests currently checked in or checking in.
                                </p>
                            </div>

                            {/* Date Picker */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Report Date</label>
                                <CustomDatePicker
                                    date={reportDate ? new Date(reportDate + 'T00:00:00') : new Date()}
                                    onDateChange={(d) => {
                                        const y = d.getFullYear();
                                        const m = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        setReportDate(`${y}-${m}-${day}`);
                                    }}
                                    className="w-full"
                                />
                            </div>

                            {/* Property Dropdown */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Property</label>
                                <div className="relative">
                                    <select
                                        value={reportProperty}
                                        onChange={(e) => setReportProperty(e.target.value as any)}
                                        className="w-full py-2.5 px-3 pr-8 appearance-none border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="both">Ambrose + Amstel Nest</option>
                                        <option value="ambrose">Ambrose</option>
                                        <option value="amstel-nest">Amstel Nest</option>
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={14} />
                                </div>
                            </div>

                            {/* Download Button */}
                            <button
                                onClick={generateDailyReportPDF}
                                disabled={reportLoading || !reportDate}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {reportLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download PDF Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Booking Modal */}
            {showTransferModal && selectedBooking && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => !transferLoading && setShowTransferModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-black text-slate-800 mb-1">Transfer Booking</h3>
                            <p className="text-sm text-slate-500 mb-1">Reschedule <strong>{selectedBooking.customerName}</strong>&apos;s booking to new dates.</p>
                            <p className="text-xs text-amber-600 font-bold mb-5 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                <IndianRupee size={13} /> ₹1,000 transfer fee will be added to balance due
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Check-in Date</label>
                                    <input
                                        type="date"
                                        value={transferCheckIn}
                                        onChange={(e) => setTransferCheckIn(e.target.value)}
                                        min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-400 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Check-out Date</label>
                                    <input
                                        type="date"
                                        value={transferCheckOut}
                                        onChange={(e) => setTransferCheckOut(e.target.value)}
                                        min={transferCheckIn || (() => { const n = new Date(); n.setDate(n.getDate()+1); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-400 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Property (optional change)</label>
                                    <select
                                        value={transferPropertyId}
                                        onChange={(e) => { setTransferPropertyId(e.target.value); setTransferSubPropertyId(''); }}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-400 focus:outline-none transition-colors"
                                    >
                                        <option value="">Keep current ({selectedBooking.propertyName})</option>
                                        {transferProperties.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {transferPropertyId && (() => {
                                    const prop = transferProperties.find((p: any) => p.id === parseInt(transferPropertyId));
                                    return prop?.subProperties?.length > 0 ? (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Villa / Cottage</label>
                                            <select
                                                value={transferSubPropertyId}
                                                onChange={(e) => setTransferSubPropertyId(e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-400 focus:outline-none transition-colors"
                                            >
                                                <option value="">Select...</option>
                                                {prop.subProperties.map((sp: any) => (
                                                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null;
                                })()}

                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-500 space-y-1">
                                    <p><strong>Current:</strong> {selectedBooking.propertyName}{selectedBooking.subPropertyName ? ` — ${selectedBooking.subPropertyName}` : ''}</p>
                                    <p><strong>Dates:</strong> {new Date(selectedBooking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} → {new Date(selectedBooking.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    <p><strong>Ref:</strong> {selectedBooking.bookingRef}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    disabled={transferLoading}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    disabled={!transferCheckIn || !transferCheckOut || transferLoading}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {transferLoading ? 'Transferring...' : 'Confirm Transfer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ManualBookingModal
                isOpen={isManualBookingOpen}
                onClose={() => setIsManualBookingOpen(false)}
                onSuccess={fetchBookings}
                properties={["Hill View", "Mount View", "Heavenly Villa", "La Paraiso", "Amstel Nest", "Ambrose"]}
            />

            <ManualBookingModal
                isOpen={isCollabBookingOpen}
                onClose={() => setIsCollabBookingOpen(false)}
                onSuccess={fetchBookings}
                properties={["Hill View", "Mount View", "Heavenly Villa", "La Paraiso", "Amstel Nest", "Ambrose"]}
                isCollab={true}
            />
        </div>

    );
}
