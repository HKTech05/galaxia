"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Upload, IndianRupee, Clock, Users, Calendar as CalendarIcon, MoreVertical, CreditCard, Ticket, CheckCircle2, ChevronRight, ChevronLeft, CalendarDays, Search, Camera, ArrowLeft, Ban, User, FileText } from "lucide-react";
import CustomDatePicker from "../../components/CustomDatePicker";
import IdProofModal from "../../components/IdProofModal";
import Link from "next/link";
import { api } from "../../../lib/api";

type Occasion = "Happy Birthday" | "Proposal" | "Anniversary" | "Better Together";
type PackageType = "Movie Time" | "Celebration";

const hours = [
    "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
    "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
];

const mobileHours = [
    "10 AM", "11 AM", "12 PM", "1 PM",
    "2 PM", "3 PM", "4 PM", "5 PM",
    "6 PM", "7 PM", "8 PM", "9 PM", "10 PM"
];

// Screen Color Mappings:
// Sandy Screen = yellow
// Cine Love = pink
// Park N Watch = orange
// Baywatch = light blue (sky)

type Event = {
    id: string;
    day: number;
    startHour: number;
    duration: number;
    title: string;
    color: string;
    screen: "Cine Love" | "Sandy Screen" | "Park N Watch" | "Baywatch";
    customerName: string;
    phone: string;
    email: string;
    dateBooked: string;
    reservationDate: string;
    packageType: "Movie Time" | "Celebration" | "Maintenance";
    occasion?: string;
    cakeMessage?: string;
    specialRequests?: string;
    amountPaid: string;
    amountToCollect: string;
    paymentDetails: string;
    paymentMethod?: string;
    bookingRef?: string;
    status?: string;
    isMaintenance?: boolean;
    addOns?: {
        balloons?: boolean;
        ledBanner?: boolean;
        ledBannerType?: string;
        cake?: boolean;
        cakeMessage?: string;
    };
    rawAddons?: Array<{
        id: number;
        addonType: string;
        addonValue: string | null;
        price: number;
        isPaid: boolean;
        paymentMethod: string | null;
    }>;
    guestIds?: Array<{
        id: number;
        fileName: string | null;
        fileType: string | null;
        uploadedAt: string;
    }>;
    // Raw DB fields for editing
    rawScreenId?: number;
    rawPackageId?: number;
    rawNumGuests?: number;
    rawTotalAmount?: number;
    rawAmountPaid?: number;
    rawAmountToCollect?: number;
    rawGstAmount?: number;
    rawBasePrice?: number;
    rawExtraPersonCharge?: number;
    rawBookingDate?: string;
};

const events: Event[] = [
    { id: "EV-01", day: 0, startHour: 10, duration: 3, title: "Cine Love - Neha G.", color: "bg-green-100 text-green-700 border-green-200", screen: "Cine Love", customerName: "Neha Gupta", phone: "+91 99887 76655", email: "neha@example.com", dateBooked: "25 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Celebration", occasion: "Better Together", cakeMessage: "Happy Anniversary!", amountPaid: "₹1,750 (50%)", amountToCollect: "₹1,750", paymentDetails: "Paid via UPI on 25 Feb 2026 14:30" },
    { id: "EV-02", day: 0, startHour: 16, duration: 3, title: "Sandy Screen - Priya P.", color: "bg-amber-100 text-amber-900 border-amber-300", screen: "Sandy Screen", customerName: "Priya Patel", phone: "+91 87654 32109", email: "priya@example.com", dateBooked: "26 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Movie Time", amountPaid: "₹4,200 (100%)", amountToCollect: "₹0", paymentDetails: "Paid via Card on 26 Feb 2026 10:15", addOns: { balloons: true, cake: true, cakeMessage: "Happy Birthday Priya!" } },
    { id: "EV-03", day: 0, startHour: 19, duration: 3, title: "Cine Love - Rahul S.", color: "bg-green-100 text-green-700 border-green-200", screen: "Cine Love", customerName: "Rahul Sharma", phone: "+91 98765 43210", email: "rahul@example.com", dateBooked: "20 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Celebration", occasion: "Proposal", cakeMessage: "Marry Me?", amountPaid: "₹1,750 (50%)", amountToCollect: "₹1,750", paymentDetails: "Paid via UPI on 20 Feb 2026 09:00" },
    { id: "EV-04", day: 1, startHour: 11, duration: 2, title: "Park N Watch - Amit S.", color: "bg-orange-100 text-orange-700 border-orange-200", screen: "Park N Watch", customerName: "Amit Singh", phone: "+91 91234 56780", email: "amit.s@example.com", dateBooked: "27 Feb, 2026", reservationDate: "01 Mar, 2026", packageType: "Movie Time", amountPaid: "₹1,400 (50%)", amountToCollect: "₹1,400", paymentDetails: "Paid via UPI on 27 Feb 2026 16:45", addOns: { ledBanner: true, ledBannerType: "Better Together" } },
    { id: "EV-05", day: 2, startHour: 14, duration: 3, title: "Baywatch - Karan J.", color: "bg-blue-100 text-blue-700 border-blue-200", screen: "Baywatch", customerName: "Karan Johar", phone: "+91 99999 88888", email: "kj@example.com", dateBooked: "21 Feb, 2026", reservationDate: "02 Mar, 2026", packageType: "Celebration", occasion: "Happy Birthday", cakeMessage: "Happy Birthday Karan!", amountPaid: "₹2,500 (50%)", amountToCollect: "₹2,500", paymentDetails: "Paid via UPI on 21 Feb 2026 11:20" },
];

export default function Admin1Dashboard() {
    const [eventsList, setEventsList] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [username, setUsername] = useState<string>("");

    useEffect(() => {
        api.get<any>("/auth/me").then(data => {
            setUserRole(data?.role || "");
            setUsername(data?.username || "");
        }).catch(() => {});
    }, []);

    // Dynamic Calendar State
    const [startDate, setStartDate] = useState(new Date());
    const [previewGuestId, setPreviewGuestId] = useState<{ id: number; fileName: string | null; fileType: string | null } | null>(null);

    // Mobile detection for event positioning
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const screens = ["Cine Love", "Sandy Screen", "Park N Watch", "Baywatch"] as const;

    // Fetch DD calendar events from API
    const fetchEvents = useCallback(async (date: Date) => {
        try {
            // Use local date parts to avoid UTC timezone offset issues
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const data = await api.get(`/bookings/dd?date=${dateStr}&includeMaintenance=true`);
            if (Array.isArray(data)) {
                const mapped: Event[] = data.map((b: any) => ({
                    id: b.id.toString(),
                    day: 0, // Placeholder as required by type
                    title: `${b.screen?.name || "Sandy Screen"} - ${b.customerName}`,
                    customerName: b.customerName,
                    phone: b.customerPhone || "—",
                    email: b.customerEmail || "—",
                    screen: ((b.screen?.name || "Sandy Screen") as string).replace(" (Digital Diaries)", "").replace(/ \(15 x 8 sq ft\)/g, "") as any,
                    startHour: b.startHour,
                    duration: b.durationHours,
                    reservationDate: b.bookingDate,
                    packageType: b.package?.name || "Movie Time",
                    color: (() => {
                        const sName = ((b.screen?.name || "") as string).replace(" (Digital Diaries)", "").replace(/ \(15 x 8 sq ft\)/g, "");
                        if (sName === "Cine Love") return "bg-green-100 text-green-700 border-green-200";
                        if (sName === "Sandy Screen") return "bg-amber-100 text-amber-900 border-amber-300";
                        if (sName === "Park N Watch") return "bg-orange-100 text-orange-700 border-orange-200";
                        return "bg-blue-100 text-blue-700 border-blue-200";
                    })(),
                    amountPaid: `₹${(b.amountPaid || 0).toLocaleString()}`,
                    amountToCollect: `₹${(b.amountToCollect || 0).toLocaleString()}`,
                    paymentDetails: b.paymentDetails || "N/A",
                    paymentMethod: b.paymentMethod,
                    bookingRef: b.bookingRef || "",
                    status: b.status || "confirmed",
                    isMaintenance: b.customerName.toLowerCase().includes("maintenance") || b.status === "maintenance",
                    dateBooked: new Date(b.bookedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                    rawAddons: b.addons || [],
                    guestIds: b.guestIds || [],
                    occasion: b.occasion || '',
                    cakeMessage: b.cakeMessage || '',
                    specialRequests: b.specialRequests || '',
                    addOns: {
                        balloons: b.addons?.some((a: any) => a.addonType === "balloons"),
                        ledBanner: b.addons?.some((a: any) => a.addonType === "ledBanner" || a.addonType === "led_banner"),
                        ledBannerType: b.addons?.find((a: any) => a.addonType === "ledBanner" || a.addonType === "led_banner")?.addonValue || b.occasion || "Happy Birthday",
                        cake: b.addons?.some((a: any) => a.addonType === "cake") || (b.package?.slug === "celebration" || b.package?.name?.toLowerCase().includes("celebration")),
                        cakeMessage: b.addons?.find((a: any) => a.addonType === "cake")?.addonValue || b.cakeMessage || ""
                    },
                    rawScreenId: b.screenId,
                    rawPackageId: b.packageId,
                    rawNumGuests: b.numGuests,
                    rawTotalAmount: b.totalAmount,
                    rawAmountPaid: b.amountPaid,
                    rawAmountToCollect: b.amountToCollect,
                    rawGstAmount: b.gstAmount,
                    rawBasePrice: b.basePrice,
                    rawExtraPersonCharge: b.extraPersonCharge,
                    rawBookingDate: b.bookingDate?.split('T')[0] || '',
                    comments: b.comments || '',
                }));
                setEventsList(mapped.filter(ev => (ev as any).status !== 'cancelled' && (ev as any).status !== 'no_show' && (ev as any).status !== 'transferred'));
            }
        } catch (err) {
            console.error("Failed to fetch DD events:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(startDate); }, [startDate, fetchEvents]);

    // Ensure events are fetched on initial mount even if first call races with hydration
    useEffect(() => {
        const timer = setTimeout(() => fetchEvents(new Date()), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shiftDates = (daysToShift: number) => {
        setStartDate(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + daysToShift);
            return next;
        });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const [y, m, d] = e.target.value.split('-').map(Number);
            setStartDate(new Date(y, m - 1, d));
        }
    };

    const formatHtmlDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    };

    const [draftSlot, setDraftSlot] = useState<{ screenIndex: number, hour: number, dateStr: string, timeStr: string } | null>(null);
    const [draftMode, setDraftMode] = useState<"booking" | "maintenance">("booking");

    // Maintenance form states
    const [maintScreen, setMaintScreen] = useState<"Cine Love" | "Sandy Screen" | "Park N Watch" | "Baywatch">("Cine Love");
    const [maintDuration, setMaintDuration] = useState("1");
    const [maintSubmitting, setMaintSubmitting] = useState(false);
    const [closeOfficeLoading, setCloseOfficeLoading] = useState(false);

    const handleSubmitMaintenance = async () => {
        if (!draftSlot) return;
        setMaintSubmitting(true);
        try {
            const screenMap: Record<string, number> = { "Sandy Screen": 1, "Cine Love": 2, "Park N Watch": 3, "Baywatch": 4 };
            const screenId = screenMap[maintScreen] || 1;

            await api.post("/bookings/dd", {
                screenId,
                packageId: 1,
                bookingDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
                startHour: draftSlot.hour,
                durationHours: parseInt(maintDuration),
                customerName: "Maintenance Block",
                customerPhone: "0000000000",
                basePrice: 0,
                totalAmount: 0,
                amountPaid: 0,
                source: "admin",
                isMaintenance: true,
            });

            setDraftSlot(null);
            fetchEvents(startDate);
        } catch (err: any) {
            console.error("Maintenance block error:", err);
            alert(err.message || "Failed to create maintenance block");
        } finally {
            setMaintSubmitting(false);
        }
    };

    const handleCloseOffice = async () => {
        const todayStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

        if (!confirm(`Are you sure you want to close the office? This will block all remaining empty slots after the last booking across all screens.`)) return;

        setCloseOfficeLoading(true);
        const screenMap: Record<string, number> = { "Cine Love": 2, "Sandy Screen": 1, "Park N Watch": 3, "Baywatch": 4 };
        const allScreens = ["Cine Love", "Sandy Screen", "Park N Watch", "Baywatch"] as const;
        const LAST_HOUR = 22; // 10 PM

        try {
            // Find the GLOBAL last booked (non-maintenance) slot end time across ALL screens
            let globalLastEnd = 0;
            for (const screenName of allScreens) {
                const screenEvents = eventsList.filter(ev => ev.screen === screenName && !ev.isMaintenance);
                for (const ev of screenEvents) {
                    const evEnd = ev.startHour + ev.duration;
                    if (evEnd > globalLastEnd) globalLastEnd = evEnd;
                }
            }

            // If no bookings at all, block from opening time (10 AM) onwards
            if (globalLastEnd === 0) {
                globalLastEnd = 10;
            }

            // Block from globalLastEnd onwards on ALL screens
            for (const screenName of allScreens) {
                // Build occupied hours for this screen (both bookings and existing maintenance)
                const screenEvents = eventsList.filter(ev => ev.screen === screenName);
                const occupiedHours = new Set<number>();
                for (const ev of screenEvents) {
                    for (let h = ev.startHour; h < ev.startHour + ev.duration; h++) {
                        occupiedHours.add(h);
                    }
                }

                for (let hour = globalLastEnd; hour < LAST_HOUR; hour++) {
                    if (occupiedHours.has(hour)) continue; // Skip already occupied slots

                    try {
                        await api.post("/bookings/dd", {
                            screenId: screenMap[screenName],
                            packageId: 1,
                            bookingDate: todayStr,
                            startHour: hour,
                            durationHours: 1,
                            customerName: "Maintenance Block",
                            customerPhone: "0000000000",
                            basePrice: 0,
                            totalAmount: 0,
                            amountPaid: 0,
                            source: "admin",
                            isMaintenance: true,
                        });
                    } catch (slotErr: any) {
                        // Skip conflicts (slot already taken)
                        if (slotErr?.status !== 409) {
                            console.error(`Failed to block ${screenName} at ${hour}:00`, slotErr);
                        }
                    }
                }
            }

            fetchEvents(startDate);
        } catch (err: any) {
            console.error("Close office error:", err);
            alert(err.message || "Failed to close office");
        } finally {
            setCloseOfficeLoading(false);
        }
    };

    const handleOpenOffice = async () => {
        if (!confirm("Are you sure you want to open the office? This will remove ALL maintenance blocks for this day.")) return;

        setCloseOfficeLoading(true);
        try {
            // Find all maintenance block events for this day and cancel them
            const maintEvents = eventsList.filter(ev => ev.isMaintenance);
            for (const ev of maintEvents) {
                try {
                    await api.patch(`/bookings/dd/${ev.id}/status`, { status: "cancelled" });
                } catch (err: any) {
                    console.error(`Failed to unblock event ${ev.id}:`, err);
                }
            }
            fetchEvents(startDate);
        } catch (err: any) {
            console.error("Open office error:", err);
            alert(err.message || "Failed to open office");
        } finally {
            setCloseOfficeLoading(false);
        }
    };

    const handleUnblock = async (bookingId: string) => {
        if (!confirm("Are you sure you want to unblock this slot?")) return;
        try {
            await api.patch(`/bookings/dd/${bookingId}/status`, { status: "cancelled" });
            setSelectedEventId(null);
            fetchEvents(startDate);
        } catch (err: any) {
            console.error("Unblock error:", err);
            alert(err.message || "Failed to unblock");
        }
    };

    // Walk-in form states
    const [guestsCount, setGuestsCount] = useState(2);
    const [packageType, setPackageType] = useState<"Movie Time" | "Celebration">("Movie Time");
    const [duration, setDuration] = useState("3");
    const [selectedScreen, setSelectedScreen] = useState<"Cine Love" | "Sandy Screen" | "Park N Watch" | "Baywatch">("Cine Love");

    // UI warnings
    const [showOverlapWarning, setShowOverlapWarning] = useState(false);

    // Add-on state for walk-in booking
    const [addBalloons, setAddBalloons] = useState(false);
    const [addLedBanner, setAddLedBanner] = useState(false);
    const [ledBannerType, setLedBannerType] = useState("Happy Birthday");
    const [addCake, setAddCake] = useState(false);
    const [addOnCakeMessage, setAddOnCakeMessage] = useState("");
    const [walkInOccasion, setWalkInOccasion] = useState("Happy Birthday");
    const [walkInCakeMessage, setWalkInCakeMessage] = useState("");
    const [walkInIdFiles, setWalkInIdFiles] = useState<(File | null)[]>([null, null]);
    const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<"Cash" | "UPI">("Cash");
    const [walkInUpiProof, setWalkInUpiProof] = useState<File | null>(null);
    const [customPaymentMode, setCustomPaymentMode] = useState(false);
    const [customPrepaid, setCustomPrepaid] = useState("");
    const [customOnArrival, setCustomOnArrival] = useState("");
    // Coupon state for walk-in
    const [walkInCouponCode, setWalkInCouponCode] = useState("");
    const [walkInAppliedCoupon, setWalkInAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [walkInCouponError, setWalkInCouponError] = useState("");
    const [walkInCouponLoading, setWalkInCouponLoading] = useState(false);

    // Add-on state for editing existing bookings
    const [editingAddOns, setEditingAddOns] = useState(false);
    const [upiProofFile, setUpiProofFile] = useState<File | null>(null);
    const [showUpiProofPicker, setShowUpiProofPicker] = useState<'balance' | 'addons' | null>(null);

    const [ddCollectedMethod, setDdCollectedMethod] = useState<"Cash" | "UPI" | "Split" | null>(null);
    const [splitCashBalance, setSplitCashBalance] = useState<number>(0);
    const [splitUpiBalance, setSplitUpiBalance] = useState<number>(0);

    useEffect(() => {
        setDdCollectedMethod(null);
        setSplitCashBalance(0);
        setSplitUpiBalance(0);
        setUpiProofFile(null);
        setShowUpiProofPicker(null);
    }, [selectedEventId]);

    // No Show / Transfer states
    const [showNoShowModal, setShowNoShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferDate, setTransferDate] = useState("");
    const [transferHour, setTransferHour] = useState("10");
    const [transferScreen, setTransferScreen] = useState("");
    const [transferLoading, setTransferLoading] = useState(false);

    // Edit Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [editLoading, setEditLoading] = useState(false);

    // Calculate pricing based on selection
    let basePrice = 0;
    const durNum = parseInt(duration);

    if (packageType === "Movie Time") {
        if (durNum === 1) basePrice = 999;
        else if (durNum === 2) basePrice = 1500;
        else if (durNum === 3) basePrice = 2500;
        else basePrice = 2500 + ((durNum - 3) * 1000);
    } else {
        const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
        if (durNum === 1) basePrice = 2200;
        else if (durNum === 2) basePrice = 2950;
        else if (durNum === 3) basePrice = isWeekend ? 3950 : 3450;
        else basePrice = (isWeekend ? 3950 : 3450) + ((durNum - 3) * 1000);
    }

    const extraGuestFee = guestsCount > 2 ? (guestsCount - 2) * 300 : 0;
    const addOnsCharge = (addBalloons ? 400 : 0) + (addLedBanner ? 400 : 0) + (addCake ? 400 : 0);
    // Walk-in coupon discount
    let walkInCouponDiscount = 0;
    if (walkInAppliedCoupon) {
        const subtotalForCoupon = basePrice + extraGuestFee + addOnsCharge;
        if (walkInAppliedCoupon.discountType === "percentage") {
            walkInCouponDiscount = Math.round(subtotalForCoupon * walkInAppliedCoupon.discountValue / 100);
        } else {
            walkInCouponDiscount = Number(walkInAppliedCoupon.discountValue);
        }
    }
    const totalPrice = basePrice + extraGuestFee + addOnsCharge - walkInCouponDiscount;

    const handleSlotClick = (screenIndex: number, hourIndex: number) => {
        setDraftSlot({
            screenIndex: screenIndex,
            hour: hourIndex + 10,
            dateStr: `${startDate.getDate().toString().padStart(2, '0')} ${startDate.toLocaleString('en-US', { month: 'short' })}`,
            timeStr: hours[hourIndex]
        });
        setSelectedScreen(screens[screenIndex]);
        setMaintScreen(screens[screenIndex]);
        setShowOverlapWarning(false);
        setDuration(packageType === "Celebration" ? "2" : "3");
    };

    const handleEventClick = (e: React.MouseEvent, ev: Event) => {
        e.stopPropagation();
        setSelectedEventId(ev.id);
    };

    const activeEvent = eventsList.find(e => e.id === selectedEventId);

    const checkOverlap = () => {
        if (!draftSlot) return false;

        const newStart = draftSlot.hour;
        const newEnd = newStart + durNum;

        return eventsList.some(ev => {
            const evDate = new Date(ev.reservationDate);
            const isSameDate = evDate.getDate() === startDate.getDate() &&
                evDate.getMonth() === startDate.getMonth() &&
                evDate.getFullYear() === startDate.getFullYear();

            if (!isSameDate || ev.screen !== selectedScreen) return false;

            const evStart = ev.startHour;
            const evEnd = evStart + ev.duration;

            return (newStart < evEnd && newEnd > evStart);
        });
    };

    const handleSubmitDraft = async () => {
        if (!draftSlot) return;

        if (checkOverlap()) {
            setShowOverlapWarning(true);
            return;
        }

        const screenMap: Record<string, number> = {
            "Sandy Screen": 1,
            "Cine Love": 2,
            "Park N Watch": 3,
            "Baywatch": 4
        };
        const packageMap: Record<string, number> = {
            "Movie Time": 1,
            "Celebration": 2
        };

        const screenId = screenMap[selectedScreen] || 1;
        const packageId = packageMap[packageType] || 1;

        try {
            const actualAmountPaid = customPaymentMode ? parseInt(customPrepaid || '0') : totalPrice;
            const actualAmountToCollect = customPaymentMode ? parseInt(customOnArrival || '0') : 0;
            const result = await api.post("/bookings/dd", {
                screenId,
                packageId,
                bookingDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
                startHour: draftSlot.hour,
                durationHours: durNum,
                customerName: (document.querySelector('input[placeholder="John Doe"]') as HTMLInputElement)?.value || "Walk-in Guest",
                customerPhone: (document.querySelector('input[placeholder="+91"]') as HTMLInputElement)?.value || "0000000000",
                customerEmail: (document.querySelector('input[placeholder="john@example.com"]') as HTMLInputElement)?.value || "",
                occasion: packageType === "Celebration" ? walkInOccasion : undefined,
                cakeMessage: packageType === "Celebration" ? walkInCakeMessage : (addCake ? addOnCakeMessage : undefined),
                numGuests: guestsCount,
                basePrice,
                extraPersonCharge: extraGuestFee,
                gstAmount: 0,
                totalAmount: Number(totalPrice) + Number(walkInCouponDiscount),
                discountAmount: walkInCouponDiscount,
                amountPaid: actualAmountPaid,
                amountToCollect: actualAmountToCollect,
                paymentMethod: walkInPaymentMethod,
                paymentDetails: customPaymentMode
                    ? `Custom split — Prepaid ₹${customPrepaid || '0'} via ${walkInPaymentMethod}, ₹${customOnArrival || '0'} on arrival`
                    : `Walk-in, full payment via ${walkInPaymentMethod}`,
                source: "reception",
                couponCode: walkInAppliedCoupon?.code || null,
                addons: [
                    ...(addBalloons ? [{ type: "balloons", value: "yes", price: 400 }] : []),
                    ...(addLedBanner ? [{ type: "led_banner", value: ledBannerType, price: 400 }] : []),
                    ...(addCake ? [{ type: "cake", value: addOnCakeMessage || "Yes", price: 400 }] : []),
                    ...(packageType === "Celebration" ? [{ type: "cake", value: walkInCakeMessage || "Yes", price: 0 }] : [])
                ]
            });

            // Upload walk-in ID files after booking (fire-and-forget)
            if (result?.id) {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                for (const file of walkInIdFiles) {
                    if (file) {
                        try {
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("ddBookingId", String(result.id));
                            await fetch("/api/uploads/guest-id", {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                                body: formData,
                            });
                        } catch (e) { console.error("Walk-in ID upload failed:", e); }
                    }
                }

                // Upload UPI proof if payment method is UPI
                if (walkInPaymentMethod === "UPI" && walkInUpiProof) {
                    try {
                        const props = await api.get("/properties");
                        const ddProp = Array.isArray(props) ? props.find((p: any) => p.slug === "digital-diaries") : null;
                        const employees = ddProp ? await api.get(`/employees?propertyId=${ddProp.id}`).catch(() => null) : [];
                        const empId = Array.isArray(employees) && employees[0] ? employees[0].id : null;
                        
                        const fd = new FormData();
                        if (empId) fd.append("employeeId", String(empId));
                        fd.append("propertySlug", "digital-diaries");
                        fd.append("bookingRef", result.bookingRef || `DD-${result.id}`);
                        fd.append("guestName", (document.querySelector('input[placeholder="John Doe"]') as HTMLInputElement)?.value || "Walk-in Guest");
                        fd.append("amount", String(customPaymentMode ? parseInt(customPrepaid || '0') : totalPrice));
                        fd.append("paymentType", "balance");
                        fd.append("note", `DD Walk-in UPI payment — ${selectedScreen}`);
                        fd.append("file", walkInUpiProof, walkInUpiProof.name);
                        await api.upload("/upi-payments/upload", fd);
                    } catch (e) { console.error("UPI proof upload failed:", e); }
                }
            }

            fetchEvents(startDate);
            setDraftSlot(null);
            // Reset ALL walk-in form state to prevent data persistence
            setGuestsCount(2);
            setPackageType("Movie Time");
            setDuration("3");
            setSelectedScreen("Cine Love");
            setAddBalloons(false);
            setAddLedBanner(false);
            setLedBannerType("Happy Birthday");
            setAddCake(false);
            setAddOnCakeMessage("");
            setWalkInOccasion("Happy Birthday");
            setWalkInCakeMessage("");
            setWalkInIdFiles([null, null]);
            setWalkInUpiProof(null);
            setWalkInPaymentMethod("Cash");
            setCustomPaymentMode(false);
            setCustomPrepaid("");
            setCustomOnArrival("");
            setWalkInCouponCode("");
            setWalkInAppliedCoupon(null);
            setWalkInCouponError("");
            setShowOverlapWarning(false);
            alert("Booking created successfully!");
        } catch (err: any) {
            console.error("Failed to create manual booking:", err);
            alert(err.message || "Failed to create manual booking");
        }
    };

    const handleCollectAll = async (mode: "Cash" | "UPI" | "Split", proofFile?: File) => {
        if (!activeEvent) return;
        if ((mode === "UPI" || (mode === "Split" && splitUpiBalance > 0)) && !proofFile) {
            setShowUpiProofPicker('balance');
            return;
        }
        try {
            let totalCollected = 0;

            // Step 1: Collect booking balance (if any)
            const balanceStr = activeEvent.amountToCollect.replace(/[₹,]/g, '');
            const balanceInt = parseInt(balanceStr);
            if (balanceInt > 0) {
                if (mode === "Split") {
                    if (splitCashBalance > 0) {
                        await api.post(`/bookings/dd/${activeEvent.id}/payment`, {
                            amount: splitCashBalance,
                            method: "Cash"
                        });
                        totalCollected += splitCashBalance;
                    }
                    if (splitUpiBalance > 0) {
                        await api.post(`/bookings/dd/${activeEvent.id}/payment`, {
                            amount: splitUpiBalance,
                            method: "UPI"
                        });
                        totalCollected += splitUpiBalance;
                    }
                } else {
                    await api.post(`/bookings/dd/${activeEvent.id}/payment`, {
                        amount: balanceInt,
                        method: mode
                    });
                    totalCollected += balanceInt;
                }
            }

            // Step 2: Collect unpaid add-ons (sequentially, after balance)
            const allAddons = activeEvent.rawAddons || [];
            const unpaidAddons = allAddons.filter(a => !a.isPaid);
            for (const addon of unpaidAddons) {
                const addonMethod = mode === "Split" ? "Cash" : mode;
                await api.patch(`/bookings/dd/addons/${addon.id}/collect`, { method: addonMethod });
                // Only count addon price if it's genuinely extra (no paid duplicate of same type)
                const hasPaidDuplicate = allAddons.some(a => a.id !== addon.id && a.addonType === addon.addonType && a.isPaid);
                if (!hasPaidDuplicate) {
                    totalCollected += addon.price;
                }
            }

            // Step 3: Create UPI payment records for tracking
            const actualUpiBalanceAmt = mode === "UPI" ? balanceInt : splitUpiBalance;
            if ((mode === "UPI" || (mode === "Split" && splitUpiBalance > 0)) && proofFile && actualUpiBalanceAmt > 0) {
                try {
                    // Log booking balance as a separate UPI entry
                    const fd = new FormData();
                    fd.append("propertySlug", "digital-diaries");
                    fd.append("bookingRef", activeEvent.bookingRef || `DD-${activeEvent.id}`);
                    fd.append("guestName", activeEvent.customerName || '');
                    fd.append("amount", String(actualUpiBalanceAmt));
                    fd.append("paymentType", "balance");
                    fd.append("note", `DD Balance Collection — ${activeEvent.screen} via UPI`);
                    fd.append("file", proofFile, proofFile.name);
                    await api.upload("/upi-payments/upload", fd);

                    // Log addon payments as a separate UPI entry if mode was fully UPI (addons collected as UPI too)
                    if (mode === "UPI") {
                        const extraAddons = unpaidAddons.filter(a => !allAddons.some(x => x.id !== a.id && x.addonType === a.addonType && x.isPaid));
                        const addonTotal = extraAddons.reduce((sum, a) => sum + a.price, 0);
                        if (addonTotal > 0) {
                            const fd2 = new FormData();
                            fd2.append("propertySlug", "digital-diaries");
                            fd2.append("bookingRef", activeEvent.bookingRef || `DD-${activeEvent.id}`);
                            fd2.append("guestName", activeEvent.customerName || '');
                            fd2.append("amount", String(addonTotal));
                            fd2.append("paymentType", "addon");
                            fd2.append("note", `DD Addon Collection — ${extraAddons.map(a => a.addonType).join(', ')} via UPI`);
                            fd2.append("file", proofFile, proofFile.name);
                            await api.upload("/upi-payments/upload", fd2);
                        }
                    }
                } catch (trackErr) {
                    console.error("Failed to record UPI payment:", trackErr);
                }
            }

            alert(`Collected ₹${totalCollected.toLocaleString()} via ${mode}`);
            setUpiProofFile(null);
            setShowUpiProofPicker(null);
            setDdCollectedMethod(null);
            fetchEvents(startDate);
        } catch (err: any) {
            console.error("Failed to collect payment:", err);
            alert(err.response?.data?.error || "Failed to collect payment");
        }
    };

    // No-show handler
    const handleNoShow = async () => {
        if (!activeEvent) return;
        if (!confirm(`Mark ${activeEvent.customerName}'s booking as No Show?`)) return;
        try {
            await api.patch(`/bookings/dd/${activeEvent.id}/no-show`);
            alert(`${activeEvent.customerName} marked as No Show.`);
            setShowNoShowModal(false);
            setSelectedEventId(null);
            fetchEvents(startDate);
        } catch (err: any) {
            alert(err.message || "Failed to mark no-show");
        }
    };

    // Transfer booking handler
    const handleTransfer = async () => {
        if (!activeEvent || !transferDate || !transferHour) return;
        setTransferLoading(true);
        try {
            const screenMap: Record<string, number> = { "Cine Love": 2, "Sandy Screen": 1, "Park N Watch": 3, "Baywatch": 4 };
            const payload: any = {
                newDate: transferDate,
                newStartHour: parseInt(transferHour),
            };
            if (transferScreen && transferScreen !== activeEvent.screen) {
                payload.newScreenId = screenMap[transferScreen];
            }
            const result = await api.post(`/bookings/dd/${activeEvent.id}/transfer`, payload);
            alert(`Booking transferred to ${new Date(transferDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${parseInt(transferHour) > 12 ? parseInt(transferHour) - 12 : parseInt(transferHour)}:00 ${parseInt(transferHour) >= 12 ? "PM" : "AM"}${transferScreen && transferScreen !== activeEvent.screen ? ` on ${transferScreen}` : ''}.\n\nNew Ref: ${result.newBooking.bookingRef}\n₹400 transfer fee added to pending.`);
            setShowTransferModal(false);
            setShowNoShowModal(false);
            setSelectedEventId(null);
            setTransferDate("");
            setTransferHour("10");
            setTransferScreen("");
            fetchEvents(startDate);
        } catch (err: any) {
            alert(err.message || "Failed to transfer booking");
        } finally {
            setTransferLoading(false);
        }
    };

    // Open edit modal with current values
    const openEditModal = () => {
        if (!activeEvent) return;
        const screenMap: Record<string, number> = { "Cine Love": 2, "Sandy Screen": 1, "Park N Watch": 3, "Baywatch": 4 };
        const packageMap: Record<string, number> = { "Movie Time": 1, "Celebration": 2 };
        setEditForm({
            customerName: activeEvent.customerName,
            customerPhone: activeEvent.phone,
            customerEmail: activeEvent.email === '—' ? '' : activeEvent.email,
            screenId: activeEvent.rawScreenId || screenMap[activeEvent.screen] || 1,
            packageId: activeEvent.rawPackageId || packageMap[activeEvent.packageType] || 1,
            bookingDate: activeEvent.rawBookingDate || '',
            startHour: activeEvent.startHour,
            durationHours: activeEvent.duration,
            numGuests: activeEvent.rawNumGuests || 2,
            occasion: activeEvent.occasion || '',
            cakeMessage: activeEvent.cakeMessage || '',
            specialRequests: activeEvent.specialRequests?.replace(/\[TRANSFER:.*?\]/g, '').replace(/\[Transferred[^\]]*\]/g, '').trim() || '',
            totalAmount: activeEvent.rawTotalAmount || 0,
            amountPaid: activeEvent.rawAmountPaid || 0,
            amountToCollect: activeEvent.rawAmountToCollect || 0,
            gstAmount: activeEvent.rawGstAmount || 0,
            basePrice: activeEvent.rawBasePrice || 0,
            extraPersonCharge: activeEvent.rawExtraPersonCharge || 0,
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!activeEvent) return;
        setEditLoading(true);
        try {
            await api.patch(`/bookings/dd/${activeEvent.id}`, editForm);
            alert('Booking updated successfully. Confirmation email resent.');
            setShowEditModal(false);
            fetchEvents(startDate);
        } catch (err: any) {
            alert(err.message || 'Failed to update booking');
        } finally {
            setEditLoading(false);
        }
    };

    const handleUpdateComments = async (bookingId: number | string, newComments: string) => {
        try {
            await api.patch(`/bookings/dd/${bookingId}`, {
                comments: newComments
            });
            setEventsList(prev => prev.map(ev => ev.id === bookingId ? { ...ev, comments: newComments } : ev));
        } catch (err) {
            console.error("Failed to update comments:", err);
            alert("Failed to update comments.");
        }
    };

    // Auto-calculate DD pricing when guests, package, duration, or date change
    useEffect(() => {
        if (!showEditModal) return;
        const durNum = editForm.durationHours || 3;
        const pkgId = editForm.packageId || 1;
        const guests = editForm.numGuests || 2;
        const bookingDateStr = editForm.bookingDate || '';
        let calcBase = 0;
        if (pkgId === 1) { // Movie Time
            if (durNum === 1) calcBase = 999;
            else if (durNum === 2) calcBase = 1500;
            else if (durNum === 3) calcBase = 2500;
            else calcBase = 2500 + ((durNum - 3) * 1000);
        } else { // Celebration
            let isWeekend = false;
            if (bookingDateStr) {
                const d = new Date(bookingDateStr + 'T12:00:00');
                isWeekend = d.getDay() === 0 || d.getDay() === 6;
            }
            if (durNum <= 2) calcBase = 2950;
            else if (durNum === 3) calcBase = isWeekend ? 3950 : 3450;
            else calcBase = (isWeekend ? 3950 : 3450) + ((durNum - 3) * 1000);
        }
        const extraFee = guests > 2 ? (guests - 2) * 300 : 0;
        const newTotal = calcBase + extraFee;
        const paid = editForm.amountPaid || 0;
        setEditForm((prev: any) => ({
            ...prev,
            basePrice: calcBase,
            extraPersonCharge: extraFee,
            totalAmount: newTotal,
            amountToCollect: Math.max(0, newTotal - paid),
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showEditModal, editForm.numGuests, editForm.packageId, editForm.durationHours, editForm.bookingDate]);

    // 1. EVENT DETAIL VIEW
    if (activeEvent) {
        return (
            <>
                <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={() => setSelectedEventId(null)}
                        className="flex items-center gap-2 text-indigo-600 font-semibold mb-6 hover:text-indigo-700 transition-colors"
                    >
                        <ArrowLeft size={18} /> Back to Schedule
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className={`${activeEvent.color.split(' ')[0]} p-6 md:p-8 border-b border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                            <div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${activeEvent.color.split(' ')[1]}`}>{activeEvent.customerName}</h1>
                                    <span className={`px-4 py-1.5 rounded-lg text-sm md:text-base font-black uppercase tracking-widest bg-white/60 border-2 shadow-sm ${activeEvent.color}`}>
                                        {activeEvent.screen}
                                    </span>
                                    {activeEvent.isMaintenance && (
                                        <span className="px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest bg-red-100 text-red-700 border-2 border-red-200 flex items-center gap-1 shadow-sm">
                                            <Ban size={16} /> Maintenance
                                        </span>
                                    )}
                                    {activeEvent.status === 'no_show' && (
                                        <span className="px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest bg-red-100 text-red-700 border-2 border-red-200 shadow-sm">
                                            No Show
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={`text-right ${activeEvent.color.split(' ')[1]}`}>
                                <p className="text-sm font-bold">{activeEvent.reservationDate}</p>
                                <p className="text-xl font-bold flex items-center gap-1.5"><Clock size={18} /> {hours[activeEvent.startHour - 10]} ({activeEvent.duration} hrs)</p>
                            </div>
                        </div>

                        {/* Unblock Button for Maintenance */}
                        {activeEvent.isMaintenance && (
                            <div className="px-8 py-4 bg-red-50 border-b border-red-100">
                                <button
                                    onClick={() => handleUnblock(activeEvent.id)}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ban size={18} /> Unblock This Screen Slot
                                </button>
                            </div>
                        )}

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50">
                            {/* Customer Details */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><User size={16} /> Contact Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500 font-medium">Phone Number</span>
                                            <span className="text-sm font-bold text-slate-800">{activeEvent.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500 font-medium">Email Address</span>
                                            <span className="text-sm font-bold text-slate-800">{activeEvent.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500 font-medium">Date Booked</span>
                                            <span className="text-sm font-bold text-slate-800">{activeEvent.dateBooked}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><FileText size={16} /> Package / Event Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500 font-medium">Package Type</span>
                                            <span className="text-sm font-bold text-slate-800">{activeEvent.packageType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500 font-medium">Number of People</span>
                                            <span className="text-sm font-bold text-slate-800">{activeEvent.rawNumGuests || 2} Guest{(activeEvent.rawNumGuests || 2) !== 1 ? 's' : ''}</span>
                                        </div>
                                        {(activeEvent.packageType !== "Movie Time") && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-slate-500 font-medium">Occasion</span>
                                                    <span className="text-sm font-bold text-slate-800">{activeEvent.occasion}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-slate-500 font-medium">Cake Message</span>
                                                    <span className="text-sm font-bold text-slate-800 italic">"{activeEvent.cakeMessage}"</span>
                                                </div>
                                            </>
                                        )}
                                        {(() => {
                                            const raw = activeEvent.specialRequests || '';
                                            // Extract transfer metadata
                                            const transferMatch = raw.match(/\[TRANSFER:([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]/);
                                            const legacyMatch = !transferMatch && raw.match(/\[Transferred from ([^\]]+)\]/);
                                            // Clean special requests (remove transfer tags)
                                            const cleanRequests = raw.replace(/\[TRANSFER:.*?\]/g, '').replace(/\[Transferred from[^\]]*\]/g, '').replace(/\[Transferred to[^\]]*\]/g, '').trim();
                                            return (
                                                <>
                                                    {transferMatch && (
                                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mt-1 space-y-1">
                                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">🔄 Transferred Booking</p>
                                                            <p className="text-xs text-indigo-700 font-medium">From <strong>{transferMatch[1]}</strong> on <strong>{new Date(transferMatch[2]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></p>
                                                            <p className="text-xs text-indigo-700 font-medium">Original Slot: <strong>{transferMatch[3]}</strong></p>
                                                            <p className="text-xs text-amber-600 font-bold">₹{transferMatch[4]} transfer fee included</p>
                                                        </div>
                                                    )}
                                                    {legacyMatch && (
                                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mt-1">
                                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">🔄 Transferred Booking</p>
                                                            <p className="text-xs text-indigo-700 font-medium">{legacyMatch[0].replace(/[\[\]]/g, '')}</p>
                                                        </div>
                                                    )}
                                                    {cleanRequests && (
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-slate-500 font-medium">Special Requests</span>
                                                            <span className="text-sm font-bold text-amber-700 italic max-w-[60%] text-right">&quot;{cleanRequests}&quot;</span>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        {/* Booking Comments Section */}
                                        <div className="pt-4 border-t-2 border-indigo-100 mt-4">
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <FileText size={14} className="text-slate-400" />
                                                Comments / Notes
                                            </p>
                                            {(["H&H", "devi", "ranjit", "M&L"].includes(username) || userRole === "receptionist") ? (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                                                    {activeEvent.comments || "No comments added by owner."}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        defaultValue={activeEvent.comments || ""}
                                                        onBlur={(e) => handleUpdateComments(activeEvent.id, e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateComments(activeEvent.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
                                                        placeholder="Add a comment for receptionist (press Enter or click outside to save)..."
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Add-Ons Section — Separate from Financials */}
                                        {!activeEvent.isMaintenance && (
                                            <div className="pt-4 border-t-2 border-indigo-100">
                                                {(() => {
                                                    const rawAddons = activeEvent.rawAddons || [];
                                                    const paidAddons = rawAddons.filter(a => a.isPaid);
                                                    const unpaidAddons = rawAddons.filter(a => !a.isPaid);
                                                    const unpaidTotal = unpaidAddons.reduce((sum, a) => sum + a.price, 0);
                                                    const paidTotal = paidAddons.reduce((sum, a) => sum + a.price, 0);
                                                    const hasAnyAddon = activeEvent.addOns && (activeEvent.addOns.balloons || activeEvent.addOns.ledBanner || activeEvent.addOns.cake);

                                                    const isCelebration = activeEvent.packageType !== 'Movie Time' && activeEvent.packageType !== 'Maintenance';

                                                    const addonLabel = (type: string) => {
                                                        if (type === 'balloons') return '🎈 Balloons';
                                                        if (type === 'ledBanner' || type === 'led_banner') return '💡 LED Banner';
                                                        if (type === 'cake') return '🎂 Cake';
                                                        return type;
                                                    };

                                                    return (
                                                        <>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                                    <Ticket size={14} /> Add-Ons {isCelebration && <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 normal-case tracking-normal">Included in package</span>}
                                                                </p>
                                                                {!isCelebration && (
                                                                    <button
                                                                        onClick={() => setEditingAddOns(!editingAddOns)}
                                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                                                    >
                                                                        {editingAddOns ? '✕ Close' : '+ Add / Edit'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Currently active addons — or default set for Celebration */}
                                                            {(() => {
                                                                if (isCelebration) {
                                                                    // Celebration: always show all 3 addons as included
                                                                    return (
                                                                        <div className="space-y-2 mb-3">
                                                                            <div className="flex justify-between items-center p-2.5 rounded-lg border bg-slate-50 border-slate-200">
                                                                                <span className="text-sm font-medium">🎈 Balloons</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center p-2.5 rounded-lg border bg-slate-50 border-slate-200">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-medium">💡 LED Banner</span>
                                                                                    <span className="text-[10px] text-slate-500">— {activeEvent.addOns?.ledBannerType || activeEvent.occasion || 'Happy Birthday'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-between items-center p-2.5 rounded-lg border bg-slate-50 border-slate-200">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-medium">🎂 Cake</span>
                                                                                    {(activeEvent.cakeMessage || activeEvent.addOns?.cakeMessage) && <span className="text-[10px] text-slate-500 italic">— "{activeEvent.cakeMessage || activeEvent.addOns?.cakeMessage}"</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                if (!hasAnyAddon) return null;
                                                                return (
                                                                    <div className="space-y-2 mb-3">
                                                                        {rawAddons.map(addon => (
                                                                            <div key={addon.id} className={`flex justify-between items-center p-2.5 rounded-lg border ${addon.isPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-medium">{addonLabel(addon.addonType)}</span>
                                                                                    {(addon.addonType === 'ledBanner' || addon.addonType === 'led_banner')
                                                                                        ? <span className="text-[10px] text-slate-500">— {addon.addonValue || activeEvent.addOns?.ledBannerType || 'Happy Birthday'}</span>
                                                                                        : (addon.addonValue && <span className="text-[10px] text-slate-500">— {addon.addonValue}</span>)
                                                                                    }
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-bold">₹{addon.price.toLocaleString()}</span>
                                                                                    {addon.isPaid ? (
                                                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">PAID{addon.paymentMethod ? ` · ${addon.paymentMethod}` : ''}</span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">UNPAID</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Tally — only for Movie Time */}
                                                            {hasAnyAddon && !isCelebration && (
                                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-center">
                                                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Paid</p>
                                                                        <p className="text-sm font-black text-emerald-700">₹{paidTotal.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className={`p-2.5 rounded-lg border text-center ${unpaidTotal > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                                                        <p className={`text-[9px] font-bold uppercase tracking-wider ${unpaidTotal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>To Collect</p>
                                                                        <p className={`text-sm font-black ${unpaidTotal > 0 ? 'text-amber-700' : 'text-slate-400'}`}>₹{unpaidTotal.toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Edit Add-Ons Panel — only for Movie Time */}
                                                            {editingAddOns && !isCelebration && (
                                                                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                                    {/* Only show addons that don't already exist as unpaid */}
                                                                    {!rawAddons.some(a => a.addonType === 'balloons' && !a.isPaid) && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await api.post(`/bookings/dd/${activeEvent.id}/addons`, {
                                                                                        addons: [{ type: 'balloons', price: 400 }]
                                                                                    });
                                                                                    fetchEvents(startDate);
                                                                                } catch (e) { alert('Failed to add addon'); }
                                                                            }}
                                                                            className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <span>🎈</span>
                                                                                <span className="text-sm font-medium text-slate-700">Add Balloons (₹400)</span>
                                                                            </div>
                                                                            <Plus size={16} className="text-indigo-600" />
                                                                        </button>
                                                                    )}
                                                                    {!rawAddons.some(a => (a.addonType === 'ledBanner' || a.addonType === 'led_banner') && !a.isPaid) && (
                                                                        <div>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    const bannerType = (document.getElementById('new-banner-type') as HTMLSelectElement)?.value || 'Happy Birthday';
                                                                                    try {
                                                                                        await api.post(`/bookings/dd/${activeEvent.id}/addons`, {
                                                                                            addons: [{ type: 'ledBanner', value: bannerType, price: 400 }]
                                                                                        });
                                                                                        fetchEvents(startDate);
                                                                                    } catch (e) { alert('Failed to add addon'); }
                                                                                }}
                                                                                className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <span>💡</span>
                                                                                    <span className="text-sm font-medium text-slate-700">Add LED Banner (₹400)</span>
                                                                                </div>
                                                                                <Plus size={16} className="text-indigo-600" />
                                                                            </button>
                                                                            <select id="new-banner-type" className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                                                                <option>Happy Birthday</option>
                                                                                <option>Better Together</option>
                                                                                <option>Happy Anniversary</option>
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                    {!rawAddons.some(a => a.addonType === 'cake' && !a.isPaid) && (
                                                                        <div>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    const cakeMsg = (document.getElementById('new-cake-msg') as HTMLInputElement)?.value || '';
                                                                                    try {
                                                                                        await api.post(`/bookings/dd/${activeEvent.id}/addons`, {
                                                                                            addons: [{ type: 'cake', value: cakeMsg, price: 400 }]
                                                                                        });
                                                                                        fetchEvents(startDate);
                                                                                    } catch (e) { alert('Failed to add addon'); }
                                                                                }}
                                                                                className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-pink-50 hover:border-pink-200 transition-colors"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <span>🎂</span>
                                                                                    <span className="text-sm font-medium text-slate-700">Add Cake (₹400)</span>
                                                                                </div>
                                                                                <Plus size={16} className="text-indigo-600" />
                                                                            </button>
                                                                            <input
                                                                                id="new-cake-msg"
                                                                                type="text"
                                                                                placeholder="Cake message (optional)"
                                                                                maxLength={50}
                                                                                className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <p className="text-[10px] text-slate-400 font-medium">Click an add-on to add it. Collect payment separately below.</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financials & IDs */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><CreditCard size={16} /> Financials</h3>
                                    {(() => {
                                        const balanceInt = parseInt(activeEvent.amountToCollect.replace(/[₹,]/g, ''));
                                        const rawAddonsAll = activeEvent.rawAddons || [];
                                        const unpaidAddonsTotal = rawAddonsAll.filter(a => !a.isPaid).reduce((s, a) => s + a.price, 0);
                                        const fullTotal = balanceInt;
                                        return (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                    <div>
                                                        <span className="text-xs text-emerald-600 font-bold block">Amount Paid</span>
                                                        <span className="text-[10px] text-emerald-500 font-medium line-clamp-2">
                                                            {activeEvent.paymentMethod === "CASH & UPI" ? "Collected via CASH & UPI" : activeEvent.paymentDetails}
                                                        </span>
                                                    </div>
                                                    <span className="text-base font-bold text-emerald-700 whitespace-nowrap ml-4">{activeEvent.amountPaid}</span>
                                                </div>

                                                <div className="flex justify-between items-center bg-rose-50 p-3 rounded-lg border border-rose-100">
                                                    <span className="text-xs text-rose-600 font-bold">Amount to Collect</span>
                                                    <span className={`text-base font-bold ${fullTotal === 0 ? 'text-slate-400' : 'text-rose-700'}`}>₹{fullTotal.toLocaleString()}</span>
                                                </div>
                                                {unpaidAddonsTotal > 0 && (
                                                    <p className="text-[10px] text-slate-500 font-medium">+ ₹{unpaidAddonsTotal.toLocaleString()} in unpaid add-ons (collect separately above)</p>
                                                )}

                                                {fullTotal > 0 && (
                                                    <>
                                                        <div className="flex gap-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDdCollectedMethod("Cash");
                                                                    setSplitCashBalance(balanceInt);
                                                                    setSplitUpiBalance(0);
                                                                }}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                                                    ddCollectedMethod === "Cash"
                                                                        ? "bg-rose-600 border-rose-700 text-white shadow-sm hover:bg-rose-700"
                                                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                Collect Cash
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDdCollectedMethod("UPI");
                                                                    setSplitCashBalance(0);
                                                                    setSplitUpiBalance(balanceInt);
                                                                }}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                                                    ddCollectedMethod === "UPI"
                                                                        ? "bg-indigo-700 border-indigo-800 text-white shadow-sm hover:bg-indigo-800"
                                                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                Collect UPI
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDdCollectedMethod("Split");
                                                                    setSplitCashBalance(balanceInt);
                                                                    setSplitUpiBalance(0);
                                                                }}
                                                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                                                    ddCollectedMethod === "Split"
                                                                        ? "bg-amber-600 border-amber-700 text-white shadow-sm hover:bg-amber-700"
                                                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                Custom Split
                                                            </button>
                                                        </div>

                                                        {ddCollectedMethod === "Split" && (
                                                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cash Amount</label>
                                                                        <input
                                                                            type="number"
                                                                            value={splitCashBalance || ''}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                setSplitCashBalance(val);
                                                                                setSplitUpiBalance(Math.max(0, balanceInt - val));
                                                                            }}
                                                                            className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">UPI Amount</label>
                                                                        <input
                                                                            type="number"
                                                                            value={splitUpiBalance || ''}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                setSplitUpiBalance(val);
                                                                                setSplitCashBalance(Math.max(0, balanceInt - val));
                                                                            }}
                                                                            className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs font-bold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-500">
                                                                    Total: ₹{splitCashBalance + splitUpiBalance} (Required: ₹{balanceInt.toLocaleString()})
                                                                </p>
                                                            </div>
                                                        )}

                                                        {((ddCollectedMethod === "UPI") || (ddCollectedMethod === "Split" && splitUpiBalance > 0)) && (
                                                            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200 animate-in fade-in">
                                                                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2">Upload UPI Proof</p>
                                                                {upiProofFile ? (
                                                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                                                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{upiProofFile.name}</span>
                                                                        <button type="button" onClick={() => setUpiProofFile(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer transition-colors">
                                                                            <Camera size={18} className="text-indigo-500" />
                                                                            <span className="text-[10px] font-bold text-indigo-700">Take Photo</span>
                                                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setUpiProofFile(file); e.target.value = ''; }} />
                                                                        </label>
                                                                        <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer transition-colors">
                                                                            <Upload size={18} className="text-indigo-500" />
                                                                            <span className="text-[10px] font-bold text-indigo-700">From Gallery</span>
                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setUpiProofFile(file); e.target.value = ''; }} />
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {ddCollectedMethod && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCollectAll(ddCollectedMethod, upiProofFile || undefined)}
                                                                disabled={(ddCollectedMethod === "Split" && (splitCashBalance + splitUpiBalance !== balanceInt)) || ((ddCollectedMethod === "UPI" || (ddCollectedMethod === "Split" && splitUpiBalance > 0)) && !upiProofFile)}
                                                                className="w-full mt-3 bg-rose-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {ddCollectedMethod === "Split" && (splitCashBalance + splitUpiBalance !== balanceInt)
                                                                    ? `Total must equal ₹${balanceInt.toLocaleString()}`
                                                                    : ((ddCollectedMethod === "UPI" || (ddCollectedMethod === "Split" && splitUpiBalance > 0)) && !upiProofFile)
                                                                        ? "Please upload UPI Proof"
                                                                        : `Confirm Collection (₹${balanceInt.toLocaleString()})`}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><Camera size={16} /> Photo IDs Uploaded</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {activeEvent.guestIds && activeEvent.guestIds.length > 0 ? (
                                            activeEvent.guestIds.map((gid) => (
                                                <div
                                                    key={gid.id}
                                                    onClick={() => setPreviewGuestId(gid)}
                                                    className="border border-emerald-200 rounded-lg bg-emerald-50 h-24 flex flex-col items-center justify-center text-emerald-700 group cursor-pointer hover:border-emerald-400 hover:bg-emerald-100 transition-colors"
                                                >
                                                    <CheckCircle2 size={20} className="mb-1" />
                                                    <span className="text-xs font-medium truncate max-w-[120px] px-1">{gid.fileName || `ID-${gid.id}`}</span>
                                                    <span className="text-[10px] text-emerald-500 mt-0.5">Click to view</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center py-4 text-slate-400">
                                                <Camera size={24} className="mx-auto mb-2 opacity-50" />
                                                <span className="text-xs font-medium">No IDs uploaded yet</span>
                                            </div>
                                        )}
                                        {/* Upload button for receptionist */}
                                        <label className="border border-slate-200 border-dashed rounded-lg bg-white h-24 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                            <Upload size={20} className="mb-1 group-hover:text-indigo-500" />
                                            <span className="text-xs font-bold group-hover:text-indigo-600">+ Upload ID</span>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file || !activeEvent) return;
                                                    try {
                                                        const token = localStorage.getItem("galaxia_token") || localStorage.getItem("adminToken");
                                                        const formData = new FormData();
                                                        formData.append("file", file);
                                                        formData.append("ddBookingId", activeEvent.id);
                                                        const res = await fetch("/api/uploads/guest-id", {
                                                            method: "POST",
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            body: formData,
                                                        });
                                                        if (res.ok) {
                                                            alert("ID uploaded successfully!");
                                                            fetchEvents(startDate);
                                                        } else {
                                                            alert("Upload failed");
                                                        }
                                                    } catch { alert("Upload failed"); }
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions — at the bottom */}
                    {!activeEvent.isMaintenance && (
                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 space-y-3">
                            {/* Edit Booking Button */}
                            <button
                                onClick={openEditModal}
                                className="w-full py-3 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={16} /> Edit Booking
                            </button>
                            {/* No Show Button */}
                            <button
                                onClick={() => setShowNoShowModal(true)}
                                className="w-full py-3 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Ban size={16} /> No Show
                            </button>
                            {/* Delete Button */}
                            <button
                                onClick={async () => {
                                    if (!confirm(`Are you sure you want to PERMANENTLY DELETE this booking for ${activeEvent.customerName}? This will also reverse any collected cash/UPI and cannot be undone.`)) return;
                                    try {
                                        await api.delete(`/bookings/dd/${activeEvent.id}`);
                                        alert('Booking deleted successfully.');
                                        setSelectedEventId(null);
                                        fetchEvents(startDate);
                                    } catch (err: any) {
                                        console.error('Delete booking error:', err);
                                        alert(err.message || 'Failed to delete booking');
                                    }
                                }}
                                className="w-full py-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={16} /> Delete Booking Permanently
                            </button>
                        </div>
                    )}
                </div>

                {/* No Show Modal — choose between No Show vs Transfer */}
                {showNoShowModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                            <h3 className="text-xl font-black text-slate-800 mb-2">Customer No Show</h3>
                            <p className="text-sm text-slate-500 mb-6">What would you like to do with <strong>{activeEvent.customerName}</strong>&apos;s booking?</p>
                            {activeEvent.status === 'no_show' && (
                                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 flex items-center gap-2">
                                    <Ban size={14} /> Already marked as No Show
                                </div>
                            )}
                            <div className="space-y-3">
                                {activeEvent.status !== 'no_show' && (
                                    <button
                                        onClick={handleNoShow}
                                        className="w-full py-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Ban size={16} /> Mark as No Show
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowNoShowModal(false); setShowTransferModal(true); }}
                                    className="w-full py-3.5 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <CalendarIcon size={16} /> Transfer Booking
                                </button>
                            </div>
                            <button onClick={() => setShowNoShowModal(false)} className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-slate-600 font-medium">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Transfer Booking Modal */}
                {showTransferModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                            <h3 className="text-xl font-black text-slate-800 mb-1">Transfer Booking</h3>
                            <p className="text-sm text-slate-500 mb-1">Reschedule <strong>{activeEvent.customerName}</strong>&apos;s booking.</p>
                            <p className="text-xs text-amber-600 font-bold mb-5 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                <IndianRupee size={13} /> ₹400 transfer fee will be added to pending payment
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Date</label>
                                    <input
                                        type="date"
                                        value={transferDate}
                                        onChange={(e) => setTransferDate(e.target.value)}
                                        min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Start Time</label>
                                    <select
                                        value={transferHour}
                                        onChange={(e) => setTransferHour(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors"
                                    >
                                        {Array.from({ length: 13 }, (_, i) => i + 10).map((h) => (
                                            <option key={h} value={h}>
                                                {h > 12 ? h - 12 : h}:00 {h >= 12 ? "PM" : "AM"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-500 space-y-1">
                                    <p><strong>Current Screen:</strong> {activeEvent.screen}</p>
                                    <p><strong>Duration:</strong> {activeEvent.duration} hours</p>
                                    <p><strong>Package:</strong> {activeEvent.packageType}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Screen (optional)</label>
                                    <select
                                        value={transferScreen || activeEvent.screen}
                                        onChange={(e) => setTransferScreen(e.target.value)}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-400 focus:outline-none transition-colors"
                                    >
                                        {["Cine Love", "Sandy Screen", "Park N Watch", "Baywatch"].map(s => (
                                            <option key={s} value={s}>{s}{s === activeEvent.screen ? ' (current)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={() => { setShowTransferModal(false); setShowNoShowModal(true); }}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    disabled={!transferDate || transferLoading}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {transferLoading ? "Transferring..." : "Confirm Transfer"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Booking Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xl font-black text-slate-800">Edit Booking</h3>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Screen */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Screen</label>
                                    <select value={editForm.screenId} onChange={e => setEditForm({...editForm, screenId: parseInt(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none">
                                        <option value={1}>Sandy Screen</option>
                                        <option value={2}>Cine Love</option>
                                        <option value={3}>Park N Watch</option>
                                        <option value={4}>Baywatch</option>
                                    </select>
                                </div>
                                {/* Package */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Package</label>
                                    <select value={editForm.packageId} onChange={e => setEditForm({...editForm, packageId: parseInt(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none">
                                        <option value={1}>Movie Time</option>
                                        <option value={2}>Celebration</option>
                                    </select>
                                </div>
                                {/* Date */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Booking Date</label>
                                    <input type="date" value={editForm.bookingDate} onChange={e => setEditForm({...editForm, bookingDate: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Start Hour */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Time</label>
                                    <select value={editForm.startHour} onChange={e => setEditForm({...editForm, startHour: parseInt(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none">
                                        {Array.from({ length: 13 }, (_, i) => i + 10).map(h => (
                                            <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Duration */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (hours)</label>
                                    <select value={editForm.durationHours} onChange={e => setEditForm({...editForm, durationHours: parseInt(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none">
                                        {[1, 2, 3, 4, 5, 6].map(h => (<option key={h} value={h}>{h} hr{h > 1 ? 's' : ''}</option>))}
                                    </select>
                                </div>
                                {/* Guests */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Guests</label>
                                    <input type="number" min={1} max={50} value={editForm.numGuests} onChange={e => setEditForm({...editForm, numGuests: parseInt(e.target.value) || 1})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>

                                {/* Divider */}
                                <div className="col-span-full border-t border-slate-200 my-1" />

                                {/* Customer Name */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
                                    <input type="text" value={editForm.customerName} onChange={e => setEditForm({...editForm, customerName: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Phone */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                                    <input type="text" value={editForm.customerPhone} onChange={e => setEditForm({...editForm, customerPhone: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Email */}
                                <div className="col-span-full">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                    <input type="email" value={editForm.customerEmail} onChange={e => setEditForm({...editForm, customerEmail: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>

                                {/* Divider */}
                                <div className="col-span-full border-t border-slate-200 my-1" />

                                {/* Occasion */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Occasion</label>
                                    <select value={editForm.occasion} onChange={e => setEditForm({...editForm, occasion: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none">
                                        <option value="">None</option>
                                        <option value="Happy Birthday">Happy Birthday</option>
                                        <option value="Proposal">Proposal</option>
                                        <option value="Anniversary">Anniversary</option>
                                        <option value="Better Together">Better Together</option>
                                    </select>
                                </div>
                                {/* Cake Message */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cake Message</label>
                                    <input type="text" value={editForm.cakeMessage} onChange={e => setEditForm({...editForm, cakeMessage: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Special Requests */}
                                <div className="col-span-full">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Special Requests</label>
                                    <textarea value={editForm.specialRequests} onChange={e => setEditForm({...editForm, specialRequests: e.target.value})} rows={2} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none resize-none" />
                                </div>

                                {/* Divider */}
                                <div className="col-span-full border-t border-slate-200 my-1" />
                                <div className="col-span-full"><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Financials</p></div>

                                {/* Total Amount */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount (₹)</label>
                                    <input type="number" value={editForm.totalAmount} onChange={e => setEditForm({...editForm, totalAmount: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Amount Paid */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount Paid (₹)</label>
                                    <input type="number" value={editForm.amountPaid} onChange={e => setEditForm({...editForm, amountPaid: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Amount to Collect */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount to Collect (₹)</label>
                                    <input type="number" value={editForm.amountToCollect} onChange={e => setEditForm({...editForm, amountToCollect: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* GST */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Amount (₹)</label>
                                    <input type="number" value={editForm.gstAmount} onChange={e => setEditForm({...editForm, gstAmount: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Base Price */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Base Price (₹)</label>
                                    <input type="number" value={editForm.basePrice} onChange={e => setEditForm({...editForm, basePrice: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                                {/* Extra Person Charge */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extra Person Charge (₹)</label>
                                    <input type="number" value={editForm.extraPersonCharge} onChange={e => setEditForm({...editForm, extraPersonCharge: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none" />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                <button onClick={handleEditSave} disabled={editLoading} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {previewGuestId && (
                    <IdProofModal
                        guestId={previewGuestId}
                        onClose={() => setPreviewGuestId(null)}
                        onDelete={async (id) => {
                            const token = localStorage.getItem("galaxia_token") || localStorage.getItem("adminToken");
                            const res = await fetch(`/api/uploads/guest-id/${id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) throw new Error("Delete failed");
                            fetchEvents(startDate);
                        }}
                    />
                )}
            </>
        );
    }

    // 2. DRAFT NEW BOOKING / MAINTENANCE VIEW
    if (draftSlot) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={() => setDraftSlot(null)}
                    className="flex items-center gap-2 text-indigo-600 font-semibold mb-6 hover:text-indigo-700 transition-colors"
                >
                    <ArrowLeft size={18} /> Cancel & Return
                </button>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Assign Slot</h1>
                            <p className="text-sm font-medium text-slate-500">{draftSlot.dateStr} @ {draftSlot.timeStr}</p>
                        </div>
                        <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            <button
                                onClick={() => setDraftMode("booking")}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${draftMode === 'booking' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Walk-in Booking
                            </button>
                            <button
                                onClick={() => setDraftMode("maintenance")}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${draftMode === 'maintenance' ? 'bg-red-500 shadow-sm text-white' : 'text-slate-500 hover:text-red-700'}`}
                            >
                                Block Maintenance
                            </button>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {draftMode === "maintenance" ? (
                            <div className="max-w-lg mx-auto space-y-6 text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Ban size={32} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">Block Screen for Cleaning/Maintenance</h2>
                                <div className="text-left space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Select Screen</label>
                                        <select
                                            value={maintScreen}
                                            onChange={(e) => setMaintScreen(e.target.value as any)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                                        >
                                            <option value="Cine Love">Cine Love (Green)</option>
                                            <option value="Sandy Screen">Sandy Screen (Brown)</option>
                                            <option value="Park N Watch">Park N Watch (Orange)</option>
                                            <option value="Baywatch">Baywatch (Blue)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Duration (Hours)</label>
                                        <select
                                            value={maintDuration}
                                            onChange={(e) => setMaintDuration(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                                        >
                                            <option value="1">1 Hour</option>
                                            <option value="2">2 Hours</option>
                                            <option value="3">3 Hours</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleSubmitMaintenance}
                                        disabled={maintSubmitting}
                                        className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors mt-4 disabled:opacity-60"
                                    >
                                        {maintSubmitting ? "Blocking..." : "Confirm Maintenance Block"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Walk in form elements */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Select Screen</label>
                                        <select
                                            value={selectedScreen}
                                            onChange={(e) => setSelectedScreen(e.target.value as any)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                        >
                                            <option value="Cine Love">Cine Love (Pink)</option>
                                            <option value="Sandy Screen">Sandy Screen (Yellow)</option>
                                            <option value="Park N Watch">Park N Watch (Orange)</option>
                                            <option value="Baywatch">Baywatch (Light Blue)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Package Type</label>
                                        <select
                                            value={packageType}
                                            onChange={(e) => {
                                                setPackageType(e.target.value as "Movie Time" | "Celebration");
                                                setDuration(e.target.value === "Celebration" && parseInt(duration) < 2 ? "2" : duration);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                        >
                                            <option value="Movie Time">Movie Time</option>
                                            <option value="Celebration">Celebration</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Celebration Extra Options */}
                                {packageType === "Celebration" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-indigo-900 uppercase">Occasion</label>
                                            <select value={walkInOccasion} onChange={(e) => setWalkInOccasion(e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                                <option>Happy Birthday</option>
                                                <option>Anniversary</option>
                                                <option>Proposal / Marry Me</option>
                                                <option>Better Together</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-indigo-900 uppercase">Cake Message</label>
                                            <input type="text" value={walkInCakeMessage} onChange={(e) => setWalkInCakeMessage(e.target.value)} placeholder="e.g. Happy Birthday Karan!" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Duration</label>
                                        <select
                                            value={duration}
                                            onChange={(e) => {
                                                setDuration(e.target.value);
                                                setShowOverlapWarning(false);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                        >
                                            {packageType === "Movie Time"
                                                ? Array.from({ length: 10 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>)
                                                : Array.from({ length: 10 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-6 py-3 border border-slate-900 h-[46px]">
                                        <span className="text-xs font-bold uppercase text-slate-300">Total Price</span>
                                        <span className="text-lg font-bold">₹{totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Customer Name</label>
                                    <input type="text" placeholder="John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Phone Number (Optional)</label>
                                        <input type="tel" placeholder="+91" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Email (Optional)</label>
                                        <input type="email" placeholder="john@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Number of Guests</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={guestsCount}
                                            onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Add-Ons Section — BEFORE payment so total includes add-ons */}
                                {packageType === "Movie Time" && (
                                    <div className="bg-violet-50/50 p-6 rounded-xl border border-violet-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">Add-Ons (Optional)</h3>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>🎈</span>
                                                <span className="text-sm font-medium text-slate-700">Balloons (₹400)</span>
                                            </div>
                                            <input type="checkbox" checked={addBalloons} onChange={(e) => setAddBalloons(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>💡</span>
                                                <span className="text-sm font-medium text-slate-700">LED Banner (₹400)</span>
                                            </div>
                                            <input type="checkbox" checked={addLedBanner} onChange={(e) => setAddLedBanner(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                                        </label>
                                        {addLedBanner && (
                                            <select value={ledBannerType} onChange={(e) => setLedBannerType(e.target.value)} className="w-full bg-white border border-violet-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                                <option>Happy Birthday</option>
                                                <option>Better Together</option>
                                                <option>Happy Anniversary</option>
                                            </select>
                                        )}
                                        <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>🎂</span>
                                                <span className="text-sm font-medium text-slate-700">Cake (₹400)</span>
                                            </div>
                                            <input type="checkbox" checked={addCake} onChange={(e) => setAddCake(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                                        </label>
                                        {addCake && (
                                            <input type="text" value={addOnCakeMessage} onChange={(e) => setAddOnCakeMessage(e.target.value)} maxLength={50} placeholder="Cake message (optional)" className="w-full bg-white border border-violet-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Payment Type</label>
                                        <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                            <button type="button" onClick={() => { setCustomPaymentMode(false); }} className={`flex-1 py-3 text-sm font-bold transition-colors ${!customPaymentMode ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Full (100%)</button>
                                            <button type="button" onClick={() => { setCustomPaymentMode(true); setCustomPrepaid(String(totalPrice)); setCustomOnArrival('0'); }} className={`flex-1 py-3 text-sm font-bold transition-colors ${customPaymentMode ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Custom Split</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Mode of Payment</label>
                                        <select value={walkInPaymentMethod} onChange={(e) => { setWalkInPaymentMethod(e.target.value as "Cash" | "UPI"); setWalkInUpiProof(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                    </div>
                                </div>

                                {walkInPaymentMethod === "UPI" && (
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-2">
                                            <Upload size={14} /> Upload UPI Payment Proof
                                        </label>
                                        {walkInUpiProof ? (
                                            <div className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50">
                                                <CheckCircle2 size={20} className="text-emerald-600" />
                                                <span className="text-sm font-bold text-emerald-700 truncate max-w-[200px]">{walkInUpiProof.name}</span>
                                                <button type="button" onClick={() => setWalkInUpiProof(null)} className="text-xs text-red-500 font-bold ml-2 hover:text-red-700">Remove</button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer transition-colors">
                                                    <Camera size={22} className="text-indigo-500" />
                                                    <span className="text-xs font-bold text-indigo-700">Take Photo</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) setWalkInUpiProof(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer transition-colors">
                                                    <Upload size={22} className="text-indigo-500" />
                                                    <span className="text-xs font-bold text-indigo-700">From Gallery</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) setWalkInUpiProof(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {customPaymentMode && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-amber-800 uppercase">Amount Prepaid (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={totalPrice}
                                                value={customPrepaid}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomPrepaid(val);
                                                    const prepaidNum = parseInt(val || '0');
                                                    setCustomOnArrival(String(Math.max(0, totalPrice - prepaidNum)));
                                                }}
                                                placeholder="0"
                                                className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-amber-800 uppercase">Amount on Arrival (₹)</label>
                                            <input
                                                type="number"
                                                readOnly
                                                value={customOnArrival}
                                                className="w-full bg-amber-100/50 border border-amber-300 rounded-xl px-4 py-3 text-sm font-bold text-amber-900 outline-none cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="md:col-span-2 text-xs font-medium text-amber-700">
                                            Total: ₹{totalPrice.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                )}

                                {/* Coupon Code Section */}
                                <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">🎟 Apply Coupon (Optional)</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={walkInCouponCode}
                                            onChange={(e) => { setWalkInCouponCode(e.target.value.toUpperCase()); setWalkInCouponError(""); }}
                                            placeholder="Enter coupon code"
                                            disabled={!!walkInAppliedCoupon}
                                            className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none disabled:opacity-50"
                                        />
                                        {walkInAppliedCoupon ? (
                                            <button
                                                type="button"
                                                onClick={() => { setWalkInAppliedCoupon(null); setWalkInCouponCode(""); setWalkInCouponError(""); }}
                                                className="px-4 py-3 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                                            >Remove</button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={walkInCouponLoading || !walkInCouponCode.trim()}
                                                onClick={async () => {
                                                    if (!walkInCouponCode.trim()) return;
                                                    setWalkInCouponLoading(true);
                                                    setWalkInCouponError("");
                                                    try {
                                                        const result = await api.post("/coupons/validate", { code: walkInCouponCode });
                                                        if (result && result.valid) {
                                                            setWalkInAppliedCoupon({ code: result.code, discountType: result.discountType, discountValue: Number(result.discountValue) });
                                                        } else {
                                                            setWalkInCouponError("Invalid or expired coupon code");
                                                        }
                                                    } catch (err: any) {
                                                        setWalkInCouponError(err?.message || "Invalid or expired coupon code");
                                                    } finally { setWalkInCouponLoading(false); }
                                                }}
                                                className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                            >{walkInCouponLoading ? "..." : "Apply"}</button>
                                        )}
                                    </div>
                                    {walkInCouponError && <p className="text-xs text-red-500 font-medium">{walkInCouponError}</p>}
                                    {walkInAppliedCoupon && (
                                        <p className="text-xs text-emerald-700 font-bold">✅ Coupon "{walkInAppliedCoupon.code}" applied — {walkInAppliedCoupon.discountType === "percentage" ? `${walkInAppliedCoupon.discountValue}% off` : `₹${walkInAppliedCoupon.discountValue} off`} (−₹{walkInCouponDiscount.toLocaleString()})</p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-700 uppercase border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <Upload size={16} /> Identity Verification (Upload IDs)
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        {Array.from({ length: guestsCount }).map((_, idx) => (
                                            <label key={idx} className={`border-2 ${walkInIdFiles[idx] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 border-dashed bg-slate-50'} rounded-xl h-32 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors`}>
                                                {walkInIdFiles[idx] ? (
                                                    <>
                                                        <CheckCircle2 size={20} className="mb-2 text-emerald-600" />
                                                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[100px] px-1">{walkInIdFiles[idx]!.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={20} className="mb-2 group-hover:text-indigo-500" />
                                                        <span className="text-xs font-bold group-hover:text-indigo-600">Upload ID {idx + 1}</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setWalkInIdFiles(prev => {
                                                                const next = [...prev];
                                                                while (next.length <= idx) next.push(null);
                                                                next[idx] = file;
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {showOverlapWarning && (
                                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3 mt-6 animate-in slide-in-from-bottom-2">
                                        <Ban size={20} className="text-red-600 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-red-800">Booking Slot Overlap Detected!</h4>
                                            <p className="text-xs font-medium text-red-600 mt-0.5">There is already a booking scheduled during the {duration}-hour duration you've selected for {selectedScreen}. Please change the Screen assignment or decrease the duration length.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={handleSubmitDraft}
                                        className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
                                    >
                                        Submit to Database
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >
        );
    }

    // 3. MAIN CALENDAR VIEW
    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Digital Diaries Sub-Nav */}
            <div className="flex gap-4 sm:gap-6 border-b border-slate-200 pb-1 mb-2 overflow-x-auto">
                <Link href="/admin3/digital-diaries" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                    Daily Schedule
                </Link>
                <Link href="/admin3/digital-diaries/bookings" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    All Walk-ins & Bookings
                </Link>
                <Link href="/admin3/digital-diaries/food-billing" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Create Food Bill
                </Link>
                <Link href="/admin3/digital-diaries/food-history" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Food Bill History
                </Link>
                <Link href="/admin3/digital-diaries/expenses" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
                    Expenses
                </Link>
            </div>

            {/* Header Info */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Digital Diaries Schedule</h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-sm font-medium text-slate-500">Review theater bookings and upcoming slots day-by-day.</p>
                        {eventsList.filter(e => e.addOns?.cake).length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('cake-tooltip');
                                        if (el) el.classList.toggle('hidden');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 border border-pink-200 text-pink-700 rounded-full text-xs font-semibold cursor-pointer hover:bg-pink-100 transition-colors"
                                >
                                    🎂 {eventsList.filter(e => e.addOns?.cake).length} Cake{eventsList.filter(e => e.addOns?.cake).length > 1 ? 's' : ''} Today
                                </button>
                                <div id="cake-tooltip" className="hidden absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cake Orders</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {eventsList.filter(e => e.addOns?.cake).map((ev) => (
                                            <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg bg-pink-50/50">
                                                <span className="text-xs">🎂</span>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-700">{ev.customerName}</p>
                                                    {(ev.addOns?.cakeMessage || ev.cakeMessage) && (
                                                        <p className="text-[11px] text-pink-600 italic mt-0.5">&quot;{ev.addOns?.cakeMessage || ev.cakeMessage}&quot;</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{ev.startHour > 12 ? (ev.startHour - 12) : ev.startHour}:00 {ev.startHour >= 12 ? 'PM' : 'AM'} · {ev.screen}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        onClick={handleCloseOffice}
                        disabled={closeOfficeLoading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white shadow-lg shadow-red-600/25 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Ban size={16} />
                        {closeOfficeLoading ? "Processing..." : "Close Office"}
                    </button>
                    <button
                        onClick={handleOpenOffice}
                        disabled={closeOfficeLoading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <CheckCircle2 size={16} />
                        {closeOfficeLoading ? "Processing..." : "Open Office"}
                    </button>
                    <CustomDatePicker
                        date={startDate}
                        onDateChange={(d) => {
                            setStartDate(d);
                        }}
                    />
                </div>
            </div>

            {/* Main Content Area: Calendar */}
            <div className="flex items-start justify-center w-full pt-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col w-full">

                    {/* Centered Date Header */}
                    <div className="bg-indigo-50/40 py-3.5 border-b border-slate-200 flex items-center justify-center">
                        <h2 className="text-base sm:text-lg font-bold text-indigo-900 uppercase tracking-widest whitespace-nowrap">
                            {startDate.toLocaleString('en-US', { weekday: 'long' })}, {startDate.getDate().toString().padStart(2, '0')} {startDate.toLocaleString('en-US', { month: 'long' })} {startDate.getFullYear()}
                        </h2>
                    </div>

                    <div className="overflow-auto max-h-[75vh]">
                        <div className="min-w-[900px]">
                            {/* Calendar Header */}
                            <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr] md:grid-cols-5 border-b border-slate-200 bg-slate-50 sticky top-0 z-30">
                                <div className="p-4 border-r border-slate-200 flex items-end justify-center sticky left-0 bg-slate-50 z-40">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
                                </div>
                                {screens.map((screen, i) => (
                                    <div key={i} className={`p-4 border-r border-slate-200 text-center last:border-r-0 bg-slate-50`}>
                                        <div className="text-xs md:text-sm font-bold uppercase text-slate-800 whitespace-nowrap">{screen}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="relative">
                                {hours.map((hour, hourIndex) => (
                                    <div key={hourIndex} className={`grid grid-cols-[50px_1fr_1fr_1fr_1fr] md:grid-cols-5 border-b border-slate-100 min-h-[70px] ${hourIndex === 0 ? 'mt-3' : ''}`}>
                                        <div className="p-1 md:p-2 border-r border-slate-200 text-center relative bg-white z-[35] sticky left-0 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                                            <span className="text-[10px] md:text-xs font-bold text-slate-500 left-1/2 -translate-x-1/2 absolute -top-2.5 bg-white px-1 md:px-2 tracking-tight whitespace-nowrap">
                                                <span className="md:hidden">{mobileHours[hourIndex]}</span>
                                                <span className="hidden md:inline">{hour}</span>
                                            </span>
                                        </div>
                                        {screens.map((_, screenIndex) => (
                                            <div
                                                key={screenIndex}
                                                onClick={() => handleSlotClick(screenIndex, hourIndex)}
                                                className="border-r border-slate-100 last:border-r-0 relative group hover:bg-slate-50 transition-colors cursor-pointer"
                                            >
                                                {/* empty slot indicator on hover */}
                                                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center">
                                                    <span className="text-[11px] font-bold text-indigo-400 opacity-60 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">+ Add</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {/* Event overlays */}
                                {eventsList.map((ev) => {
                                    // Filter by current date — parse as local to avoid UTC timezone shift
                                    const dateParts = ev.reservationDate.toString().split('T')[0].split('-');
                                    const evYear = parseInt(dateParts[0]);
                                    const evMonth = parseInt(dateParts[1]) - 1;
                                    const evDay = parseInt(dateParts[2]);
                                    if (evDay !== startDate.getDate() ||
                                        evMonth !== startDate.getMonth() ||
                                        evYear !== startDate.getFullYear()) return null;

                                    // Find which dynamic column this event belongs to
                                    const colIndex = screens.indexOf(ev.screen);
                                    if (colIndex === -1) return null;

                                    // Calculate positioning based on index
                                    const top = (ev.startHour - 10) * 70; // 70px per hour row
                                    const height = ev.duration * 70;
                                    // Mobile: 50px time col + equal remaining. Desktop: equal 20% cols
                                    const left = isMobile
                                        ? `calc(50px + ${colIndex} * ((100% - 50px) / 4) + 4px)`
                                        : `calc(${(colIndex + 1) * 20}% + 4px)`;
                                    const width = isMobile
                                        ? `calc((100% - 50px) / 4 - 8px)`
                                        : `calc(20% - 8px)`;

                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={(e) => handleEventClick(e, ev)}
                                            className={`absolute rounded-xl ${ev.duration === 1 ? 'p-1.5' : 'p-3'} border shadow-sm flex flex-col items-start overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] ${ev.color}`}
                                            style={{
                                                top: `${top + 4}px`,
                                                height: `${height - 8}px`,
                                                left: left,
                                                width: width,
                                                zIndex: 20
                                            }}
                                        >
                                            {ev.duration === 1 ? (
                                                /* Compact layout for 1hr slots */
                                                <>
                                                    <div className="flex items-center gap-1 w-full">
                                                        <div className="w-1 h-1 rounded-full bg-current opacity-70 shrink-0"></div>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider truncate">{ev.screen}</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold leading-tight truncate w-full">{ev.customerName}</span>
                                                    {ev.status === 'no_show' && <span className="text-[8px] font-bold text-red-600 uppercase">No Show</span>}
                                                    <span className="text-[9px] font-semibold opacity-70 truncate w-full">{hours[ev.startHour - 10]} • 1hr</span>
                                                </>
                                            ) : (
                                                /* Standard layout for 2hr+ slots */
                                                <>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{ev.screen}</span>
                                                    </div>
                                                    <span className="text-sm font-bold leading-tight line-clamp-2">{ev.customerName}</span>
                                                    {ev.status === 'no_show' && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 uppercase">No Show</span>}

                                                    {ev.isMaintenance ? (
                                                        <div className="mt-auto flex items-center gap-1">
                                                            <Ban size={12} /> <span className="text-[11px] font-bold">Maintenance</span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-auto flex flex-col">
                                                            <span className="text-[11px] font-bold opacity-80">{hours[ev.startHour - 10]} • {ev.duration} hrs</span>
                                                            <span className="text-[10px] font-semibold opacity-60">{ev.packageType}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}


                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

