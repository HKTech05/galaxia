"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Upload, IndianRupee, Clock, Users, Calendar as CalendarIcon, MoreVertical, CreditCard, Ticket, CheckCircle2, ChevronRight, ChevronLeft, CalendarDays, Search, Camera, ArrowLeft, Ban, User, FileText } from "lucide-react";
import CustomDatePicker from "../../components/CustomDatePicker";
import Link from "next/link";
import { api } from "../../../lib/api";

type Occasion = "Happy Birthday" | "Proposal" | "Anniversary" | "Better Together";
type PackageType = "Movie Time" | "Celebration";

const hours = [
    "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
    "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"
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
    amountPaid: string;
    amountToCollect: string;
    paymentDetails: string;
    isMaintenance?: boolean;
    addOns?: {
        balloons?: boolean;
        ledBanner?: boolean;
        ledBannerType?: string;
        cake?: boolean;
        cakeMessage?: string;
    };
};

const events: Event[] = [
    { id: "EV-01", day: 0, startHour: 10, duration: 3, title: "Cine Love - Neha G.", color: "bg-pink-100 text-pink-700 border-pink-200", screen: "Cine Love", customerName: "Neha Gupta", phone: "+91 99887 76655", email: "neha@example.com", dateBooked: "25 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Celebration", occasion: "Better Together", cakeMessage: "Happy Anniversary!", amountPaid: "₹1,750 (50%)", amountToCollect: "₹1,750", paymentDetails: "Paid via UPI on 25 Feb 2026 14:30" },
    { id: "EV-02", day: 0, startHour: 16, duration: 3, title: "Sandy Screen - Priya P.", color: "bg-yellow-100 text-yellow-700 border-yellow-200", screen: "Sandy Screen", customerName: "Priya Patel", phone: "+91 87654 32109", email: "priya@example.com", dateBooked: "26 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Movie Time", amountPaid: "₹4,200 (100%)", amountToCollect: "₹0", paymentDetails: "Paid via Card on 26 Feb 2026 10:15", addOns: { balloons: true, cake: true, cakeMessage: "Happy Birthday Priya!" } },
    { id: "EV-03", day: 0, startHour: 19, duration: 3, title: "Cine Love - Rahul S.", color: "bg-pink-100 text-pink-700 border-pink-200", screen: "Cine Love", customerName: "Rahul Sharma", phone: "+91 98765 43210", email: "rahul@example.com", dateBooked: "20 Feb, 2026", reservationDate: "28 Feb, 2026", packageType: "Celebration", occasion: "Proposal", cakeMessage: "Marry Me?", amountPaid: "₹1,750 (50%)", amountToCollect: "₹1,750", paymentDetails: "Paid via UPI on 20 Feb 2026 09:00" },
    { id: "EV-04", day: 1, startHour: 11, duration: 2, title: "Park N Watch - Amit S.", color: "bg-orange-100 text-orange-700 border-orange-200", screen: "Park N Watch", customerName: "Amit Singh", phone: "+91 91234 56780", email: "amit.s@example.com", dateBooked: "27 Feb, 2026", reservationDate: "01 Mar, 2026", packageType: "Movie Time", amountPaid: "₹1,400 (50%)", amountToCollect: "₹1,400", paymentDetails: "Paid via UPI on 27 Feb 2026 16:45", addOns: { ledBanner: true, ledBannerType: "Better Together" } },
    { id: "EV-05", day: 2, startHour: 14, duration: 3, title: "Baywatch - Karan J.", color: "bg-sky-100 text-sky-700 border-sky-200", screen: "Baywatch", customerName: "Karan Johar", phone: "+91 99999 88888", email: "kj@example.com", dateBooked: "21 Feb, 2026", reservationDate: "02 Mar, 2026", packageType: "Celebration", occasion: "Happy Birthday", cakeMessage: "Happy Birthday Karan!", amountPaid: "₹2,500 (50%)", amountToCollect: "₹2,500", paymentDetails: "Paid via UPI on 21 Feb 2026 11:20" },
];

export default function Admin1Dashboard() {
    const [eventsList, setEventsList] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Dynamic Calendar State
    const [startDate, setStartDate] = useState(new Date());

    const screens = ["Cine Love", "Sandy Screen", "Park N Watch", "Baywatch"] as const;

    // Fetch DD calendar events from API
    const fetchEvents = useCallback(async (date: Date) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const data = await api.get(`/bookings/dd?dateFrom=${dateStr}`);
            if (Array.isArray(data)) {
                setEventsList(data);
            }
        } catch (err) {
            console.error("Failed to fetch DD events:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(startDate); }, [startDate, fetchEvents]);

    const shiftDates = (daysToShift: number) => {
        setStartDate(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + daysToShift);
            return next;
        });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setStartDate(new Date(e.target.value));
        }
    };

    const formatHtmlDate = (date: Date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [draftSlot, setDraftSlot] = useState<{ screenIndex: number, hour: number, dateStr: string, timeStr: string } | null>(null);
    const [draftMode, setDraftMode] = useState<"booking" | "maintenance">("booking");

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

    // Add-on state for editing existing bookings
    const [editingAddOns, setEditingAddOns] = useState(false);

    // Calculate pricing based on selection
    let basePrice = 0;
    const durNum = parseInt(duration);

    if (packageType === "Movie Time") {
        if (durNum === 1) basePrice = 999;
        else if (durNum === 2) basePrice = 1500;
        else if (durNum === 3) basePrice = 1950;
        else basePrice = 1950 + ((durNum - 3) * 1000);
    } else {
        const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
        if (durNum === 2) basePrice = 2950;
        else if (durNum === 3) basePrice = isWeekend ? 3950 : 3450;
        else basePrice = (isWeekend ? 3950 : 3450) + ((durNum - 3) * 1000);
    }

    const extraGuestFee = guestsCount > 2 ? (guestsCount - 2) * 300 : 0;
    const addOnsCharge = (addBalloons ? 200 : 0) + (addLedBanner ? 200 : 0) + (addCake ? 400 : 0);
    const totalPrice = basePrice + extraGuestFee + addOnsCharge;

    const handleSlotClick = (screenIndex: number, hourIndex: number) => {
        setDraftSlot({
            screenIndex: screenIndex,
            hour: hourIndex + 10,
            dateStr: `${startDate.getDate().toString().padStart(2, '0')} ${startDate.toLocaleString('en-US', { month: 'short' })}`,
            timeStr: hours[hourIndex]
        });
        setSelectedScreen(screens[screenIndex]);
        setShowOverlapWarning(false);
        setDuration(packageType === "Celebration" ? "3" : "3");
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

    const handleSubmitDraft = () => {
        if (checkOverlap()) {
            setShowOverlapWarning(true);
            return;
        }

        // Success payload goes here (omitted for mocked front end unless saving to events array is desired)
        setDraftSlot(null);
    };

    const handleCollectPayment = (mode: "Cash" | "UPI") => {
        if (!activeEvent) return;

        const now = new Date();
        const dateStr = `${now.getDate()} ${now.toLocaleString('en-us', { month: 'short' })} ${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        const updatedEvents = eventsList.map(ev => {
            if (ev.id === activeEvent.id) {
                // Extract numeric part from amountPaid and amountToCollect
                const paidAmountMatch = ev.amountPaid.match(/₹([\d,]+)/);
                const toCollectAmountMatch = ev.amountToCollect.match(/₹([\d,]+)/);

                let currentPaid = paidAmountMatch ? parseInt(paidAmountMatch[1].replace(/,/g, '')) : 0;
                let currentToCollect = toCollectAmountMatch ? parseInt(toCollectAmountMatch[1].replace(/,/g, '')) : 0;

                const newTotalPaid = currentPaid + currentToCollect;

                return {
                    ...ev,
                    amountPaid: `₹${newTotalPaid.toLocaleString()} (100%)`,
                    amountToCollect: "₹0",
                    paymentDetails: `${ev.paymentDetails} | Remaining paid via ${mode} on ${dateStr}`
                };
            }
            return ev;
        });

        setEventsList(updatedEvents);
    };

    // 1. EVENT DETAIL VIEW
    if (activeEvent) {
        return (
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
                            </div>
                        </div>
                        <div className={`text-right ${activeEvent.color.split(' ')[1]}`}>
                            <p className="text-sm font-bold">{activeEvent.reservationDate}</p>
                            <p className="text-xl font-bold flex items-center gap-1.5"><Clock size={18} /> {hours[activeEvent.startHour - 10]} ({activeEvent.duration} hrs)</p>
                        </div>
                    </div>

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
                                    {activeEvent.packageType === "Celebration" && (
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

                                    {/* Add-Ons Section */}
                                    {activeEvent.addOns && (activeEvent.addOns.balloons || activeEvent.addOns.ledBanner || activeEvent.addOns.cake) && (
                                        <div className="pt-3 border-t border-slate-200">
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add-Ons</p>
                                            <div className="space-y-2">
                                                {activeEvent.addOns.balloons && (
                                                    <div className="flex justify-between items-center bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                                                        <span className="text-sm font-medium text-purple-800">🎈 Balloons</span>
                                                        <span className="text-sm font-bold text-purple-700">₹200</span>
                                                    </div>
                                                )}
                                                {activeEvent.addOns.ledBanner && (
                                                    <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                                                        <span className="text-sm font-medium text-amber-800">💡 LED Banner — {activeEvent.addOns.ledBannerType}</span>
                                                        <span className="text-sm font-bold text-amber-700">₹200</span>
                                                    </div>
                                                )}
                                                {activeEvent.addOns.cake && (
                                                    <div className="flex justify-between items-center bg-pink-50 p-2.5 rounded-lg border border-pink-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-pink-800">🎂 Cake</span>
                                                            {activeEvent.addOns.cakeMessage && <p className="text-[10px] text-pink-600 font-medium italic mt-0.5">"{activeEvent.addOns.cakeMessage}"</p>}
                                                        </div>
                                                        <span className="text-sm font-bold text-pink-700">₹400</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Receptionist: Add/Edit Add-Ons for existing booking */}
                                    {!activeEvent.isMaintenance && (
                                        <div className="pt-3 border-t border-slate-200">
                                            <button
                                                onClick={() => setEditingAddOns(!editingAddOns)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                            >
                                                {editingAddOns ? '✕ Close' : '+ Add / Edit Add-Ons'}
                                            </button>
                                            {editingAddOns && (
                                                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    {/* Balloons toggle */}
                                                    <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span>🎈</span>
                                                            <span className="text-sm font-medium text-slate-700">Balloons (₹200)</span>
                                                        </div>
                                                        <input type="checkbox" defaultChecked={activeEvent.addOns?.balloons} className="accent-indigo-600 w-4 h-4"
                                                            onChange={(e) => {
                                                                setEventsList(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, addOns: { ...ev.addOns, balloons: e.target.checked } } : ev));
                                                            }}
                                                        />
                                                    </label>
                                                    {/* LED Banner toggle */}
                                                    <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span>💡</span>
                                                            <span className="text-sm font-medium text-slate-700">LED Banner (₹200)</span>
                                                        </div>
                                                        <input type="checkbox" defaultChecked={activeEvent.addOns?.ledBanner} className="accent-indigo-600 w-4 h-4"
                                                            onChange={(e) => {
                                                                setEventsList(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, addOns: { ...ev.addOns, ledBanner: e.target.checked } } : ev));
                                                            }}
                                                        />
                                                    </label>
                                                    <select
                                                        defaultValue={activeEvent.addOns?.ledBannerType || "Happy Birthday"}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                                        onChange={(e) => {
                                                            setEventsList(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, addOns: { ...ev.addOns, ledBannerType: e.target.value } } : ev));
                                                        }}
                                                    >
                                                        <option>Happy Birthday</option>
                                                        <option>Better Together</option>
                                                        <option>Happy Anniversary</option>
                                                    </select>
                                                    {/* Cake toggle */}
                                                    <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span>🎂</span>
                                                            <span className="text-sm font-medium text-slate-700">Cake (₹400)</span>
                                                        </div>
                                                        <input type="checkbox" defaultChecked={activeEvent.addOns?.cake} className="accent-indigo-600 w-4 h-4"
                                                            onChange={(e) => {
                                                                setEventsList(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, addOns: { ...ev.addOns, cake: e.target.checked } } : ev));
                                                            }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Cake message (optional)"
                                                        defaultValue={activeEvent.addOns?.cakeMessage || ""}
                                                        maxLength={50}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                                                        onChange={(e) => {
                                                            setEventsList(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, addOns: { ...ev.addOns, cakeMessage: e.target.value } } : ev));
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-slate-400 font-medium">Changes are saved automatically. Collect add-on payment separately.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financials & IDs */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><CreditCard size={16} /> Financials</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                        <div>
                                            <span className="text-xs text-emerald-600 font-bold block">Amount Paid (Deposit)</span>
                                            <span className="text-[10px] text-emerald-500 font-medium line-clamp-2">{activeEvent.paymentDetails}</span>
                                        </div>
                                        <span className="text-base font-bold text-emerald-700 whitespace-nowrap ml-4">{activeEvent.amountPaid}</span>
                                    </div>

                                    <div className="flex justify-between items-center bg-rose-50 p-3 rounded-lg border border-rose-100 mt-2">
                                        <span className="text-xs text-rose-600 font-bold">Amount to Collect (Cash/UPI)</span>
                                        {(() => {
                                            const addOnTotal = (activeEvent.addOns?.balloons ? 200 : 0) + (activeEvent.addOns?.ledBanner ? 200 : 0) + (activeEvent.addOns?.cake ? 400 : 0);
                                            const baseCollect = activeEvent.amountToCollect.match(/₹([\d,]+)/);
                                            const baseAmount = baseCollect ? parseInt(baseCollect[1].replace(/,/g, '')) : 0;
                                            const totalCollect = baseAmount + addOnTotal;
                                            return <span className={`text-base font-bold ${totalCollect === 0 ? 'text-slate-400' : 'text-rose-700'}`}>₹{totalCollect.toLocaleString()}</span>;
                                        })()}
                                    </div>

                                    {activeEvent.amountToCollect !== '₹0' && (
                                        <div className="flex gap-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                            <button
                                                onClick={() => handleCollectPayment('Cash')}
                                                className="flex-1 bg-rose-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/20"
                                            >
                                                Collect Cash
                                            </button>
                                            <button
                                                onClick={() => handleCollectPayment('UPI')}
                                                className="flex-1 bg-white border-2 border-rose-600 text-rose-600 py-2 rounded-lg text-sm font-bold hover:bg-rose-50 transition-colors"
                                            >
                                                Collect UPI
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200 pb-2"><Camera size={16} /> Photo IDs Uploaded</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="border border-slate-200 border-dashed rounded-lg bg-white h-24 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                        <Camera size={20} className="mb-1 group-hover:text-indigo-500" />
                                        <span className="text-xs font-medium group-hover:text-indigo-600">Primary ID.jpg</span>
                                    </div>
                                    <div className="border border-slate-200 border-dashed rounded-lg bg-white h-24 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                        <Camera size={20} className="mb-1 group-hover:text-indigo-500" />
                                        <span className="text-xs font-medium group-hover:text-indigo-600">Secondary ID.jpg</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none">
                                            <option>Cine Love (Pink)</option>
                                            <option>Sandy Screen (Yellow)</option>
                                            <option>Park N Watch (Orange)</option>
                                            <option>Baywatch (Light Blue)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Duration (Hours)</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none">
                                            <option>1 Hour</option>
                                            <option>2 Hours</option>
                                            <option>3 Hours</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setDraftSlot(null)}
                                        className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors mt-4"
                                    >
                                        Confirm Maintenance Block
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
                                            <select className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                                <option>Happy Birthday</option>
                                                <option>Anniversary</option>
                                                <option>Proposal / Marry Me</option>
                                                <option>Better Together</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-indigo-900 uppercase">Cake Message</label>
                                            <input type="text" placeholder="e.g. Happy Birthday Karan!" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none" />
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
                                                : Array.from({ length: 9 }, (_, i) => i + 2).map(h => <option key={h} value={h}>{h} Hours</option>)
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
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase">Mode of Payment (100% Amount)</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none">
                                            <option>Cash</option>
                                            <option>UPI</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Add-Ons Section in Walk-in Form */}
                                {packageType === "Movie Time" && (
                                    <div className="bg-violet-50/50 p-6 rounded-xl border border-violet-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">Add-Ons (Optional)</h3>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>🎈</span>
                                                <span className="text-sm font-medium text-slate-700">Balloons (₹200)</span>
                                            </div>
                                            <input type="checkbox" checked={addBalloons} onChange={(e) => setAddBalloons(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>💡</span>
                                                <span className="text-sm font-medium text-slate-700">LED Banner (₹200)</span>
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

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-700 uppercase border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <Upload size={16} /> Identity Verification (Upload IDs)
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        {Array.from({ length: guestsCount }).map((_, idx) => (
                                            <div key={idx} className="border-2 border-slate-200 border-dashed rounded-xl bg-slate-50 h-32 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                                                <Upload size={20} className="mb-2 group-hover:text-indigo-500" />
                                                <span className="text-xs font-bold group-hover:text-indigo-600">Upload ID {idx + 1}</span>
                                            </div>
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
            <div className="flex gap-6 border-b border-slate-200 pb-1 mb-2">
                <Link href="/admin3/digital-diaries" className="text-indigo-600 border-b-2 border-indigo-600 pb-2 text-sm font-bold uppercase tracking-widest">
                    Daily Schedule
                </Link>
                <Link href="/admin3/digital-diaries/bookings" className="text-slate-500 hover:text-slate-800 pb-2 text-sm font-bold uppercase tracking-widest transition-colors">
                    All Walk-ins & Bookings
                </Link>
            </div>

            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Digital Diaries Schedule</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Review theater bookings and upcoming slots day-by-day.</p>
                </div>
                <div className="flex items-center gap-3">
                    <CustomDatePicker
                        date={startDate}
                        onDateChange={(d) => {
                            setStartDate(d);
                        }}
                    />
                </div>
            </div>

            {/* Main Content Area: Calendar */}
            <div className="flex items-start md:items-start justify-center gap-4 md:gap-8 lg:gap-12 w-full pt-4">
                {/* Floating Navigation Arrows - Outsides */}
                <button
                    onClick={() => shiftDates(-1)}
                    className="mt-[55px] bg-white shadow-md rounded-full p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 transition-all hidden md:block shrink-0"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col w-full flex-1">

                    {/* Centered Date Header */}
                    <div className="bg-indigo-50/40 py-3.5 border-b border-slate-200 flex items-center justify-center">
                        <h2 className="text-base sm:text-lg font-bold text-indigo-900 uppercase tracking-widest whitespace-nowrap">
                            {startDate.toLocaleString('en-US', { weekday: 'long' })}, {startDate.getDate().toString().padStart(2, '0')} {startDate.toLocaleString('en-US', { month: 'long' })} {startDate.getFullYear()}
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            {/* Calendar Header */}
                            <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50">
                                <div className="p-4 border-r border-slate-200 flex items-end justify-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
                                </div>
                                {screens.map((screen, i) => (
                                    <div key={i} className={`p-4 border-r border-slate-200 text-center last:border-r-0`}>
                                        <div className="text-sm font-bold uppercase text-slate-800">{screen}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="relative">
                                {hours.map((hour, hourIndex) => (
                                    <div key={hourIndex} className="grid grid-cols-5 border-b border-slate-100 min-h-[70px]">
                                        <div className="p-2 border-r border-slate-200 text-center relative bg-white z-20">
                                            <span className="text-xs font-bold text-slate-500 left-1/2 -translate-x-1/2 absolute -top-2.5 bg-white px-2 tracking-tight">{hour}</span>
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
                                    // Filter by current date
                                    const evDate = new Date(ev.reservationDate);
                                    if (evDate.getDate() !== startDate.getDate() ||
                                        evDate.getMonth() !== startDate.getMonth() ||
                                        evDate.getFullYear() !== startDate.getFullYear()) return null;

                                    // Find which dynamic column this event belongs to
                                    const colIndex = screens.indexOf(ev.screen);
                                    if (colIndex === -1) return null;

                                    // Calculate positioning based on index
                                    const top = (ev.startHour - 10) * 70; // 70px per hour row
                                    const height = ev.duration * 70;
                                    const left = `calc(${(colIndex + 1) * 20}% + 4px)`; // 1/5th width per col + padding
                                    const width = `calc(20% - 8px)`;

                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={(e) => handleEventClick(e, ev)}
                                            className={`absolute rounded-xl p-3 border shadow-sm flex flex-col items-start overflow-hidden cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] ${ev.color}`}
                                            style={{
                                                top: `${top + 4}px`,
                                                height: `${height - 8}px`,
                                                left: left,
                                                width: width,
                                                zIndex: 30
                                            }}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{ev.screen}</span>
                                            </div>
                                            <span className="text-sm font-bold leading-tight line-clamp-2">{ev.customerName}</span>

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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => shiftDates(1)}
                    className="mt-[55px] bg-white shadow-md rounded-full p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 transition-all hidden md:block shrink-0"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
}
