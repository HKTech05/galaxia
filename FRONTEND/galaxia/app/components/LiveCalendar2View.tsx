"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, ChevronRight, X, Lock, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Property {
    id: number;
    name: string;
    slug: string;
    subProperties?: any[];
}

export default function LiveCalendar2View() {
    const [propertyList, setPropertyList] = useState<Property[]>([]);
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

    // Multi-select mode
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [blockReasonType, setBlockReasonType] = useState<"owner" | "maintenance">("maintenance");
    const [blockCustomNote, setBlockCustomNote] = useState("");
    const [blockActionLoading, setBlockActionLoading] = useState(false);

    // Fetch properties on mount
    useEffect(() => {
        api.get("/properties").then((data: any) => {
            if (Array.isArray(data)) setPropertyList(data);
        }).catch((err: any) => console.error("Failed to fetch properties for calendar:", err));
    }, []);

    // Fetch calendar data
    const fetchCalendarData = useCallback(() => {
        setCalendar2Loading(true);
        const year = calendar2Month.getFullYear();
        const month = calendar2Month.getMonth() + 1;

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const sDateStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-01`;
        const eDateStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

        Promise.all([
            api.get(`/bookings/staycation?status=confirmed&startDate=${sDateStr}&endDate=${eDateStr}`).catch(() => []),
            api.get(`/blocked-dates?year=${year}&month=${month}`).catch(() => []),
        ]).then(([bookingsData, blocksData]) => {
            setCalendar2Bookings(Array.isArray(bookingsData) ? bookingsData : []);
            setCalendar2Blocks(Array.isArray(blocksData) ? blocksData : []);
            setCalendar2Loading(false);
        }).catch(err => {
            console.error("Fetch calendar data error:", err);
            setCalendar2Loading(false);
        });
    }, [calendar2Month]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    const makeCellKey = (date: Date, colType: string, colName: string, unitIndex?: number) =>
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${colType}|${colName}${unitIndex !== undefined ? `|${unitIndex}` : ''}`;

    const toggleCellSelection = (key: string) => {
        setSelectedCells(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const clearMultiSelect = () => { setSelectedCells(new Set()); };

    const getLocalDateString = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const parseLocalDateStr = (dateInput: any) => {
        if (!dateInput) return "";
        const str = typeof dateInput === "string" ? dateInput : new Date(dateInput).toISOString();
        return str.slice(0, 10);
    };

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
            fetchCalendarData();
            setSelectedCell(null);
            setBlockCustomNote("");
        } catch (err: any) {
            alert(err?.message || "Failed to block cell");
        } finally {
            setBlockActionLoading(false);
        }
    };

    const handleBatchBlockSubmit = async () => {
        if (selectedCells.size === 0) return;
        setBlockActionLoading(true);

        const reasonText = blockReasonType === "owner"
            ? `Owner Reservation: ${blockCustomNote}`
            : `Maintenance: ${blockCustomNote}`;

        try {
            const vacantGroups = new Map<string, { propertyId: number; subPropertyId: number | null; dates: string[] }>();
            const blockIdsToUnblock = new Set<number>();

            for (const key of selectedCells) {
                const parts = key.split('|');
                const [y, m, d] = parts[0].split('-').map(Number);
                const colType = parts[1] as "all" | "amstelnest";
                const colName = parts[2];
                const date = new Date(y, m, d);
                const dateStr = getLocalDateString(date);
                const unitIdx = parts[3] ? parseInt(parts[3]) : undefined;
                const cellStatus = getCellStatus(date, colType, colName, unitIdx);

                if (cellStatus.status === "vacant") {
                    const info = getColumnInfo(colType, colName);
                    if (!info.propertyId) continue;
                    const gKey = `${info.propertyId}|${info.subPropertyId || 'null'}`;
                    if (!vacantGroups.has(gKey)) {
                        vacantGroups.set(gKey, { propertyId: info.propertyId, subPropertyId: info.subPropertyId, dates: [] });
                    }
                    vacantGroups.get(gKey)!.dates.push(dateStr);
                } else if ((cellStatus.status === "owner_reserved" || cellStatus.status === "maintenance") && cellStatus.block?.id) {
                    blockIdsToUnblock.add(cellStatus.block.id);
                }
            }

            for (const bId of blockIdsToUnblock) {
                await api.delete(`/blocked-dates/${bId}`);
            }

            for (const group of vacantGroups.values()) {
                await api.post("/blocked-dates", {
                    propertyId: group.propertyId,
                    subPropertyId: group.subPropertyId,
                    dates: group.dates,
                    reason: reasonText,
                    numUnits: 1
                });
            }

            fetchCalendarData();
            clearMultiSelect();
            setBlockCustomNote("");
        } catch (err: any) {
            alert(err?.message || "Failed to update selected cells");
        } finally {
            setBlockActionLoading(false);
        }
    };

    const handleUnblockCellSubmit = async (blockId: number) => {
        if (!confirm("Are you sure you want to remove this block?")) return;
        setBlockActionLoading(true);
        try {
            await api.delete(`/blocked-dates/${blockId}`);
            fetchCalendarData();
            setSelectedCell(null);
        } catch (err: any) {
            alert(err?.message || "Failed to remove block");
        } finally {
            setBlockActionLoading(false);
        }
    };

    const downloadCalendarPDF = () => {
        try {
            const doc = new jsPDF("landscape", "mm", "a4");
            const monthLabel = calendar2Month.toLocaleString('default', { month: 'long', year: 'numeric' });
            const viewLabel = calendar2View === "all" ? "All Properties" : "Amstelnest";

            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text(`GALAXIA - Live Calendar (${monthLabel} - ${viewLabel})`, 14, 15);

            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 21);

            const year = calendar2Month.getFullYear();
            const mIdx = calendar2Month.getMonth();
            const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

            let headRow: string[] = [];
            let bodyRows: string[][] = [];

            if (calendar2View === "all") {
                headRow = ["Date", "Day", "TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS", "LA PARAISO", "MOUNT VIEW", "HEAVENLY VILLA", "HILL VIEW"];
                const columns = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS", "LA PARAISO", "MOUNT VIEW", "HEAVENLY VILLA", "HILL VIEW"];

                for (let i = 0; i < daysInMonth; i++) {
                    const date = new Date(year, mIdx, i + 1);
                    const dateLabel = `${i + 1}-${calendar2Month.toLocaleString('default', { month: 'short' }).replace(' ', '-')}`;
                    const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
                    const row = [dateLabel, dayLabel];

                    for (const col of columns) {
                        const res = getCellStatus(date, "all", col);
                        if (res.status === "maintenance") row.push("M");
                        else if (res.status === "owner_reserved") row.push("OR");
                        else if (res.status === "booked") row.push("B");
                        else row.push("");
                    }
                    bodyRows.push(row);
                }
            } else {
                headRow = ["Date", "Day", ...Array.from({ length: 14 }, (_, idx) => String(idx + 1)), "FAMILY UNIT"];
                for (let i = 0; i < daysInMonth; i++) {
                    const date = new Date(year, mIdx, i + 1);
                    const dateLabel = `${i + 1}-${calendar2Month.toLocaleString('default', { month: 'short' }).replace(' ', '-')}`;
                    const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
                    const row = [dateLabel, dayLabel];

                    for (let idx = 1; idx <= 14; idx++) {
                        const res = getCellStatus(date, "amstelnest", "Standard", idx);
                        if (res.status === "maintenance") row.push("M");
                        else if (res.status === "owner_reserved") row.push("OR");
                        else if (res.status === "booked") row.push("B");
                        else row.push("");
                    }
                    const resFamily = getCellStatus(date, "amstelnest", "FAMILY UNIT");
                    if (resFamily.status === "maintenance") row.push("M");
                    else if (resFamily.status === "owner_reserved") row.push("OR");
                    else if (resFamily.status === "booked") row.push("B");
                    else row.push("");

                    bodyRows.push(row);
                }
            }

            autoTable(doc, {
                startY: 26,
                head: [headRow],
                body: bodyRows,
                theme: "grid",
                styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: (dataCell) => {
                    if (dataCell.section === "body" && dataCell.column.index >= 2) {
                        const val = dataCell.cell.raw;
                        if (val === "M") {
                            dataCell.cell.styles.fillColor = [254, 226, 226];
                            dataCell.cell.styles.textColor = [220, 38, 38];
                            dataCell.cell.styles.fontStyle = "bold";
                        } else if (val === "OR") {
                            dataCell.cell.styles.fillColor = [219, 234, 254];
                            dataCell.cell.styles.textColor = [37, 99, 235];
                            dataCell.cell.styles.fontStyle = "bold";
                        } else if (val === "B") {
                            dataCell.cell.styles.fillColor = [241, 245, 249];
                            dataCell.cell.styles.textColor = [30, 41, 59];
                            dataCell.cell.styles.fontStyle = "bold";
                        }
                    }
                }
            });

            const fileName = `Galaxia_Calendar_${monthLabel.replace(/\s+/g, '_')}_${viewLabel.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error("Failed to download calendar PDF:", err);
            alert("Failed to download PDF");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header + Month Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Live Calendar</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Recreated matrix view showing occupancy, maintenance, and owner reservations.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCalendarPDF}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Download size={14} /> Download PDF
                    </button>
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
                        <div className="w-5 h-5 rounded border border-slate-200 bg-slate-100 text-slate-800 font-black flex items-center justify-center text-[10px]">B</div>
                        <span>Booked</span>
                    </div>
                </div>
            </div>

            {/* Multi-Select Toggle */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setMultiSelectMode(prev => !prev); clearMultiSelect(); }}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                            multiSelectMode ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            multiSelectMode ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                        Multi-Select Mode
                    </span>
                    {multiSelectMode && selectedCells.size > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {selectedCells.size} selected
                        </span>
                    )}
                </div>
                {multiSelectMode && selectedCells.size > 0 && (
                    <button
                        onClick={clearMultiSelect}
                        className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
                    >
                        Clear All
                    </button>
                )}
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
                                                        let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50 border-slate-200";
                                                        let content = "";
                                                        if (res.status === "maintenance") {
                                                            cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                            content = "M";
                                                        } else if (res.status === "owner_reserved") {
                                                            cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                            content = "OR";
                                                        } else if (res.status === "booked") {
                                                            cellClass = "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200/50 font-black";
                                                            content = "B";
                                                        }

                                                        const cellKey = makeCellKey(date, "all", col);
                                                        const isMultiSelected = multiSelectMode && selectedCells.has(cellKey);

                                                        return (
                                                            <td
                                                                key={col}
                                                                onClick={() => {
                                                                    if (multiSelectMode) {
                                                                        if (res.status !== "booked") toggleCellSelection(cellKey);
                                                                    } else {
                                                                        setSelectedCell({ date, colType: "all", colName: col, ...res });
                                                                    }
                                                                }}
                                                                className={`px-2 py-2.5 text-center text-xs border-r border-b cursor-pointer select-none transition-colors border-dashed ${
                                                                    isMultiSelected
                                                                        ? (res.status === "owner_reserved" || res.status === "maintenance")
                                                                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/50 ring-inset'
                                                                            : 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-400/50 ring-inset'
                                                                        : cellClass
                                                                }`}
                                                            >
                                                                {isMultiSelected ? '✓' : content}
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
                                                        let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50 border-slate-200";
                                                        let content = "";
                                                        if (res.status === "maintenance") {
                                                            cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                            content = "M";
                                                        } else if (res.status === "owner_reserved") {
                                                            cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                            content = "OR";
                                                        } else if (res.status === "booked") {
                                                            cellClass = "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200/50 font-black";
                                                            content = "B";
                                                        }

                                                        const cellKey = makeCellKey(date, "amstelnest", "Standard", unitIndex);
                                                        const isMultiSelected = multiSelectMode && selectedCells.has(cellKey);

                                                        return (
                                                            <td
                                                                key={unitIndex}
                                                                onClick={() => {
                                                                    if (multiSelectMode) {
                                                                        if (res.status !== "booked") toggleCellSelection(cellKey);
                                                                    } else {
                                                                        setSelectedCell({ date, colType: "amstelnest", colName: "Standard", unitIndex, ...res });
                                                                    }
                                                                }}
                                                                className={`px-1 py-2.5 text-center text-xs border-r border-b cursor-pointer select-none transition-colors border-dashed ${
                                                                    isMultiSelected
                                                                        ? (res.status === "owner_reserved" || res.status === "maintenance")
                                                                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/50 ring-inset'
                                                                            : 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-400/50 ring-inset'
                                                                        : cellClass
                                                                }`}
                                                            >
                                                                {isMultiSelected ? '✓' : content}
                                                            </td>
                                                        );
                                                    })}
                                                    {(() => {
                                                        const res = getCellStatus(date, "amstelnest", "FAMILY UNIT");
                                                        let cellClass = "bg-white text-slate-700 hover:bg-slate-100/50 border-slate-200";
                                                        let content = "";
                                                        if (res.status === "maintenance") {
                                                            cellClass = "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50 font-black";
                                                            content = "M";
                                                        } else if (res.status === "owner_reserved") {
                                                            cellClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/50 font-black";
                                                            content = "OR";
                                                        } else if (res.status === "booked") {
                                                            cellClass = "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200/50 font-black";
                                                            content = "B";
                                                        }

                                                        const cellKey = makeCellKey(date, "amstelnest", "FAMILY UNIT");
                                                        const isMultiSelected = multiSelectMode && selectedCells.has(cellKey);

                                                        return (
                                                            <td
                                                                onClick={() => {
                                                                    if (multiSelectMode) {
                                                                        if (res.status !== "booked") toggleCellSelection(cellKey);
                                                                    } else {
                                                                        setSelectedCell({ date, colType: "amstelnest", colName: "FAMILY UNIT", ...res });
                                                                    }
                                                                }}
                                                                className={`px-2 py-2.5 text-center text-xs border-r border-b cursor-pointer select-none transition-colors border-dashed ${
                                                                    isMultiSelected
                                                                        ? (res.status === "owner_reserved" || res.status === "maintenance")
                                                                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/50 ring-inset'
                                                                            : 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-400/50 ring-inset'
                                                                        : cellClass
                                                                }`}
                                                            >
                                                                {isMultiSelected ? '✓' : content}
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

            {/* Multi-Select Action Banner */}
            {multiSelectMode && selectedCells.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 min-w-[340px] max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            {selectedCells.size} Cells Selected
                        </span>
                        <button onClick={clearMultiSelect} className="text-slate-400 hover:text-white p-1 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="batchReasonType"
                                    value="maintenance"
                                    checked={blockReasonType === "maintenance"}
                                    onChange={() => setBlockReasonType("maintenance")}
                                    className="accent-red-500"
                                />
                                <span className="text-red-400">Maintenance (M)</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="batchReasonType"
                                    value="owner"
                                    checked={blockReasonType === "owner"}
                                    onChange={() => setBlockReasonType("owner")}
                                    className="accent-blue-500"
                                />
                                <span className="text-blue-400">Owner Reserved (OR)</span>
                            </label>
                        </div>

                        <input
                            type="text"
                            placeholder="Optional note / reason..."
                            value={blockCustomNote}
                            onChange={e => setBlockCustomNote(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={handleBatchBlockSubmit}
                                disabled={blockActionLoading}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                {blockActionLoading ? "Processing..." : "Apply Action to Selected"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Cell Action Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCell(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">
                                    {selectedCell.colName} {selectedCell.unitIndex ? `#${selectedCell.unitIndex}` : ''}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {selectedCell.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setSelectedCell(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {selectedCell.status === "vacant" && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                        <span>Status: VACANT — Available for booking or reservation</span>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Block Reason Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setBlockReasonType("maintenance")}
                                                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                                                    blockReasonType === "maintenance"
                                                        ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                Maintenance (M)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBlockReasonType("owner")}
                                                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                                                    blockReasonType === "owner"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                Owner Reserved (OR)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600 block mb-1">Custom Note / Reason (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Painting, Plumbing, Owner Guest..."
                                            value={blockCustomNote}
                                            onChange={e => setBlockCustomNote(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                                        />
                                    </div>

                                    <button
                                        onClick={handleBlockCellSubmit}
                                        disabled={blockActionLoading}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {blockActionLoading ? "Blocking..." : "Confirm Block Cell"}
                                    </button>
                                </div>
                            )}

                            {(selectedCell.status === "owner_reserved" || selectedCell.status === "maintenance") && (
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-xl border ${
                                        selectedCell.status === "owner_reserved"
                                            ? "bg-blue-50 border-blue-200 text-blue-900"
                                            : "bg-red-50 border-red-200 text-red-900"
                                    }`}>
                                        <div className="flex items-center gap-2 font-bold text-xs">
                                            {selectedCell.status === "owner_reserved" ? <ShieldAlert size={16} className="text-blue-600" /> : <AlertTriangle size={16} className="text-red-600" />}
                                            <span>{selectedCell.status === "owner_reserved" ? "OWNER RESERVED (OR)" : "MAINTENANCE (M)"}</span>
                                        </div>
                                        <p className="text-xs mt-2 font-medium opacity-90">
                                            Reason: {selectedCell.block?.reason || "No notes"}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => selectedCell.block?.id && handleUnblockCellSubmit(selectedCell.block.id)}
                                        disabled={blockActionLoading || !selectedCell.block?.id}
                                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {blockActionLoading ? "Unblocking..." : "Remove Block & Mark Vacant"}
                                    </button>
                                </div>
                            )}

                            {selectedCell.status === "booked" && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold flex items-center gap-2">
                                        <Lock size={16} className="text-slate-600" />
                                        <span>Status: BOOKED</span>
                                    </div>

                                    {selectedCell.bookings && selectedCell.bookings.map((b: any) => (
                                        <div key={b.id || b.bookingRef} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                            <p className="font-bold text-slate-800">{b.customerName}</p>
                                            <p className="text-slate-500">Ref: {b.bookingRef}</p>
                                            <p className="text-slate-500">
                                                Dates: {parseLocalDateStr(b.checkInDate)} to {parseLocalDateStr(b.checkOutDate)} ({b.numNights} night{b.numNights > 1 ? 's' : ''})
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
