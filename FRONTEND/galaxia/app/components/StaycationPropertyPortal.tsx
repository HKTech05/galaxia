"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Info, Clock, CheckCircle, Ban, IndianRupee, RotateCcw, BedDouble, AlertTriangle, X, Plus, CalendarDays, Phone, User as UserIcon, Upload } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import { api } from "../../lib/api";

export default function StaycationPropertyPortal({ properties, portalName }: { properties: string[], portalName: string }) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Date Range Filters
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // Fetch bookings from API
    const fetchBookings = useCallback(async () => {
        try {
            const data = await api.get("/bookings/staycation");
            if (Array.isArray(data) && data.length > 0) {
                const mapped = data.map((b: any) => ({
                    id: b.bookingRef || `#ST-${b.id}`,
                    customer: b.customerName || "Unknown",
                    property: b.property?.name || b.subProperty?.name || "Unknown",
                    guests: b.numGuests || 0,
                    checkInDate: b.checkInDate ? new Date(b.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    checkOutDate: b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    checkInTime: "1:00 PM",
                    checkOutTime: "10:00 AM",
                    depositAmt: `₹${(b.amountPaid || 0).toLocaleString('en-IN')}`,
                    remainingAmt: `₹${(b.amountToCollect || 0).toLocaleString('en-IN')}`,
                    status: b.status === "confirmed" ? "Pending Arrival" : b.status === "checked_in" ? "Checked In" : b.status === "checked_out" ? "Checked Out" : b.status || "Pending Arrival",
                }));
                setBookings(mapped);
            }
        } catch (err) {
            console.error("Failed to fetch staycation bookings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [modalType, setModalType] = useState<"checkin" | "checkout">("checkin");

    // Payment collection states
    const [collected20, setCollected20] = useState<string | null>(null);
    const [collectedSec, setCollectedSec] = useState<string | null>(null);

    // Cancel modal state
    const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);

    // Add Extra Guest states
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [extraGuestForm, setExtraGuestForm] = useState({
        guests: 1,
        paymentMethod: "UPI",
        idFileName: ""
    });

    const calculateExtraGuestPrice = () => {
        if (!selectedBooking) return 0;

        // standard parser for "DD Mmm, YYYY"
        const startStr = selectedBooking.checkInDate.replace(',', '');
        const endStr = selectedBooking.checkOutDate.replace(',', '');
        const start = new Date(startStr);
        const end = new Date(endStr);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        let extraAdultPrice = 0;
        const prop = selectedBooking.property;
        if (prop.includes("Hill View")) extraAdultPrice = 600;
        else if (prop.includes("Mount View")) extraAdultPrice = 800;
        else if (prop.includes("Heavenly Villa")) extraAdultPrice = 800;
        else if (prop.includes("La Paraiso")) extraAdultPrice = 1200;
        else if (prop.includes("Amstel")) extraAdultPrice = 1000;
        else if (prop.includes("Ambrose")) extraAdultPrice = 2000;

        const total = extraAdultPrice * extraGuestForm.guests * nights;
        return Math.round(total + (total * 0.05));
    };

    const handleAddExtraGuestSubmit = async () => {
        if (!selectedBooking) return;
        const extraCharge = calculateExtraGuestPrice();
        try {
            await api.post(`/bookings/staycation/${selectedBooking.id.replace('#ST-', '')}/extra-guest`, {
                guestName: "Extra Guest",
                idProofType: "Uploaded",
                chargeAmount: extraCharge,
                paymentMethod: extraGuestForm.paymentMethod
            });
            fetchBookings();
            setIsAddGuestModalOpen(false);
        } catch (err) {
            alert("Failed to add extra guest");
        }
    };

    // Manual Booking states
    const AMBROSE_VILLAS = ["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"];
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        name: "",
        guests: 2,
        phone: "",
        checkInDate: new Date(),
        checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        property: properties[0] || "Hill View",
        villa: "TAKE-1",
        paymentMethod: "Cash"
    });

    const calculatePrice = () => {
        let total = 0;
        const start = new Date(manualForm.checkInDate);
        const end = new Date(manualForm.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        for (let i = 0; i < nights; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const day = currentDate.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
            const isWeekend = day === 0 || day === 5 || day === 6;
            const isSaturday = day === 6;

            let basePrice = 0;
            let extraAdultPrice = 0;
            let baseGuests = 2;

            const prop = manualForm.property;

            if (prop.includes("Hill View")) {
                basePrice = isWeekend ? 3950 : 2500;
                extraAdultPrice = 600;
            } else if (prop.includes("Mount View")) {
                basePrice = isWeekend ? 4950 : 3500;
                extraAdultPrice = 800;
            } else if (prop.includes("Heavenly Villa")) {
                basePrice = isWeekend ? 4950 : 3950;
                extraAdultPrice = 800;
            } else if (prop.includes("La Paraiso")) {
                if (isWeekend) {
                    basePrice = 7500;
                    baseGuests = 4;
                } else {
                    basePrice = manualForm.guests > 2 ? 6500 : 4950;
                    baseGuests = manualForm.guests > 2 ? 4 : 2;
                }
                extraAdultPrice = 1200;
            } else if (prop.includes("Amstel Nest")) {
                basePrice = isWeekend ? 6950 : 4950;
                extraAdultPrice = 2000;
            } else if (prop.includes("Ambrose")) {
                const villa = manualForm.villa;
                if (villa === "BAMBOOSA") {
                    baseGuests = 4;
                    if (isSaturday) basePrice = 13000;
                    else if (isWeekend) basePrice = 11500;
                    else basePrice = 10500;
                    extraAdultPrice = 2000;
                } else if (villa === "CYPRESS") {
                    basePrice = isWeekend ? 6500 : 5500;
                    extraAdultPrice = 2000;
                } else {
                    if (isSaturday) {
                        basePrice = 12000;
                        baseGuests = 4;
                    } else if (isWeekend) {
                        basePrice = manualForm.guests > 2 ? 10500 : 6500;
                        baseGuests = manualForm.guests > 2 ? 4 : 2;
                    } else {
                        basePrice = manualForm.guests > 2 ? 9500 : 5500;
                        baseGuests = manualForm.guests > 2 ? 4 : 2;
                    }
                    extraAdultPrice = 2000;
                }
            }

            let nightPrice = basePrice;
            if (manualForm.guests > baseGuests) {
                nightPrice += (manualForm.guests - baseGuests) * extraAdultPrice;
            }

            total += nightPrice;
        }

        // Add 5% GST
        total = total + (total * 0.05);
        return Math.round(total);
    };

    const handleManualBookingSubmit = async () => {
        const calculatedTotal = calculatePrice();
        const property = properties.find(p => portalName.includes(p)) || manualForm.property;
        // Find property ID (hacky for now, ideally passed in)
        // For now, let's just assume the API can handle name or we use a map
        
        try {
            // Need to find propertyId and subPropertyId
            // Simpler: Just refresh bookings after creation
            await api.post("/bookings/staycation", {
                customerName: manualForm.name,
                customerPhone: manualForm.phone,
                propertyId: manualForm.property.includes("Hill View") ? 1 : 
                           manualForm.property.includes("Heavenly Villa") ? 3 : 
                           manualForm.property.includes("Ambrose") ? 6 : 1,
                numGuests: manualForm.guests,
                checkInDate: manualForm.checkInDate.toISOString(),
                checkOutDate: manualForm.checkOutDate.toISOString(),
                totalAmount: calculatedTotal,
                advanceAmount: calculatedTotal,
                advancePaid: true,
                advanceMethod: manualForm.paymentMethod,
                source: "reception",
                status: "checked_in"
            });
            fetchBookings();
            setIsManualBookingOpen(false);
        } catch (err) {
            alert("Failed to create manual booking");
        }
    };

    useEffect(() => {
        if (!isActionModalOpen) {
            setCollected20(null);
            setCollectedSec(null);
        }
    }, [isActionModalOpen]);


    // Filter to logically evaluate if a booking intersects the query date range.
    const todaysBookings = bookings.filter(b => {
        if (!properties.includes(b.property)) return false;
        if (b.status === "Cancelled") return false;

        const rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);

        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        const bStart = new Date(b.checkInDate);
        bStart.setHours(0, 0, 0, 0);

        const bEnd = new Date(b.checkOutDate);
        bEnd.setHours(0, 0, 0, 0);

        // Overlap logic: A booking intersects the range if it starts before the range ends AND ends after the range starts.
        const overlaps = (bStart <= rangeEnd) && (bEnd >= rangeStart);

        return overlaps || b.status === "Checked In";
    });

    const handleAction = async (id: string, newStatus: string) => {
        try {
            const numericId = id.replace('#ST-', '');
            await api.patch(`/bookings/staycation/${numericId}/status`, { 
                status: newStatus === "Checked In" ? "checked_in" : 
                        newStatus === "Cancelled" ? "cancelled" : 
                        newStatus === "Checked Out" ? "checked_out" : "confirmed"
            });
            
            // Record payment if checking in
            if (newStatus === "Checked In" && selectedBooking) {
                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "balance",
                    amount: parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(',', '')),
                    method: collected20
                });
                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "deposit",
                    amount: parseInt(selectedBooking.depositAmt.replace('₹', '').replace(',', '')),
                    method: collectedSec
                });
            }

            fetchBookings();
        } catch (err) {
            alert("Failed to update booking status");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header Info */}
            <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {portalName.replace(" | Owner View", "")}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Bookings dashboard filtered by date range.</p>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <button
                        onClick={() => setIsManualBookingOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors mr-2"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Manual Booking</span><span className="sm:hidden">New Booking</span>
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest hidden xl:inline">From:</span>
                        <CustomDatePicker date={startDate} onDateChange={(d) => {
                            setStartDate(d);
                            if (d > endDate) setEndDate(d);
                        }} />
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">To:</span>
                        <CustomDatePicker date={endDate} onDateChange={(d) => {
                            setEndDate(d);
                            if (d < startDate) setStartDate(d);
                        }} />
                    </div>
                </div>
            </div>

            {todaysBookings.length === 0 ? (
                <div className="bg-white border text-center border-slate-200 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <BedDouble size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">No Bookings Found</h2>
                    <p className="text-sm font-medium text-slate-500">There are no bookings intersecting this date range.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {todaysBookings.map((booking) => (
                        <div key={booking.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">

                            {/* Left Col: Details */}
                            <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-800">{booking.id}</span>
                                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100 uppercase tracking-wider">
                                            {booking.property}
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${booking.status === 'Checked In' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        booking.status === 'Pending Checkout' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            booking.status === 'Completed' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                                'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Guest</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">{booking.customer}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Number of Guests</p>
                                        <p className="text-xl tracking-tight font-black text-slate-800">{booking.guests}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Check-in</p>
                                        <p className="text-sm font-bold text-slate-800">{booking.checkInDate}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5"><Clock size={12} className="inline mr-1" />{booking.checkInTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Check-out</p>
                                        <p className="text-sm font-bold text-slate-800">{booking.checkOutDate}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5"><Clock size={12} className="inline mr-1" />{booking.checkOutTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Security Deposit</p>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1"><IndianRupee size={14} className="text-emerald-600" /> {booking.depositAmt}</p>
                                    </div>

                                    {booking.extraGuestCharge > 0 && (
                                        <div className="mt-2 col-span-2 sm:col-span-4 bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Extra Guest Surcharge: Paid</p>
                                            </div>
                                            <p className="text-sm font-bold text-purple-800 flex items-center">
                                                <IndianRupee size={12} className="mr-0.5" />
                                                {booking.extraGuestCharge.toLocaleString('en-IN')}
                                                <span className="text-[9px] bg-purple-200 text-purple-800 px-1 py-0.5 rounded ml-1.5 uppercase">{booking.extraGuestPayment}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-4">
                                    <button className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
                                        <Info size={16} /> View ID Proofs
                                    </button>
                                </div>
                            </div>

                            {/* Right Col: Actions */}
                            <div className="p-6 md:w-1/3 bg-slate-50/50 flex flex-col justify-center space-y-3">
                                {booking.status === "Pending Arrival" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkin'); setIsActionModalOpen(true); }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-emerald-700">
                                            <CheckCircle size={18} /> Confirm Check-in
                                        </button>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                            <Users size={18} className="text-purple-600" /> Add Extra Guest
                                        </button>
                                        <button
                                            onClick={() => setCancelModalBooking(booking)}
                                            className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-red-200">
                                            <Ban size={18} /> Cancel Booking
                                        </button>
                                    </>
                                )}

                                {booking.status === "Checked In" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                            <RotateCcw size={18} /> Initiate Checkout
                                        </button>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 mt-2">
                                            <Users size={18} className="text-purple-600" /> Add Extra Guest
                                        </button>
                                    </>
                                )}

                                {booking.status === "Pending Checkout" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                            <RotateCcw size={18} /> Initiate Checkout
                                        </button>
                                    </>
                                )}

                                {booking.status === "Completed" && (
                                    <div className="text-center p-4">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                            <CheckCircle size={20} />
                                        </div>
                                        <h4 className="font-bold text-slate-800">Checkout Completed</h4>
                                        <p className="text-xs font-medium text-slate-500 mt-1">Guest has departed</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Modal for Payments & Checkins */}
            {isActionModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    {modalType === 'checkin' ? 'Check-in & Collection' : 'Checkout & Refund'}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.id} • {selectedBooking.customer}</p>
                            </div>
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {modalType === 'checkin' ? (
                                <>
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-amber-800">20% Remaining Balance</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.remainingAmt}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-amber-800">Security Deposit</span>
                                            <span className="text-lg font-black text-amber-700">{selectedBooking.depositAmt}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">20% BALANCE</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setCollected20("Cash")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors border outline outline-0 focus:outline ${collected20 === "Cash"
                                                            ? "bg-emerald-600 text-white border-emerald-700"
                                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 outline-emerald-500"
                                                            }`}
                                                    >
                                                        {collected20 === "Cash" ? <><CheckCircle size={12} className="inline mr-1" /> Collected Cash</> : "₹ Collect Cash"}
                                                    </button>
                                                    <button
                                                        onClick={() => setCollected20("UPI")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm outline outline-0 focus:outline ${collected20 === "UPI"
                                                            ? "bg-indigo-700 text-white"
                                                            : "bg-indigo-600 hover:bg-indigo-700 text-white outline-indigo-500"
                                                            }`}
                                                    >
                                                        {collected20 === "UPI" ? <><CheckCircle size={12} className="inline mr-1" /> Collected UPI</> : <><span className="bg-white text-indigo-600 px-1 py-0.5 rounded-sm mr-1">UPI</span> Collect</>}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">SECURITY DEPOSIT</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setCollectedSec("Cash")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors border outline outline-0 focus:outline ${collectedSec === "Cash"
                                                            ? "bg-emerald-600 text-white border-emerald-700"
                                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 outline-emerald-500"
                                                            }`}
                                                    >
                                                        {collectedSec === "Cash" ? <><CheckCircle size={12} className="inline mr-1" /> Collected Cash</> : "₹ Collect Cash"}
                                                    </button>
                                                    <button
                                                        onClick={() => setCollectedSec("UPI")}
                                                        className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors shadow-sm outline outline-0 focus:outline ${collectedSec === "UPI"
                                                            ? "bg-indigo-700 text-white"
                                                            : "bg-indigo-600 hover:bg-indigo-700 text-white outline-indigo-500"
                                                            }`}
                                                    >
                                                        {collectedSec === "UPI" ? <><CheckCircle size={12} className="inline mr-1" /> Collected UPI</> : <><span className="bg-white text-indigo-600 px-1 py-0.5 rounded-sm mr-1">UPI</span> Collect</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            disabled={!collected20 || !collectedSec}
                                            onClick={() => {
                                                handleAction(selectedBooking.id, "Checked In");
                                                setIsActionModalOpen(false);
                                            }}
                                            className={`w-full font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${(!collected20 || !collectedSec)
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-teal-600 hover:bg-teal-700 text-white border border-teal-700"
                                                }`}
                                        >
                                            <CheckCircle size={18} /> Confirm Check-in
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-indigo-800">Refund Security Deposit</span>
                                            <span className="text-lg font-black text-indigo-700">{selectedBooking.depositAmt}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Refund Method</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => {
                                                    handleAction(selectedBooking.id, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200 col-span-1"
                                            >
                                                <RotateCcw size={16} /> <span className="text-xs">Cash</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAction(selectedBooking.id, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200 col-span-1"
                                            >
                                                <span className="font-bold text-[10px] bg-indigo-200 text-indigo-800 px-1 py-0.5 rounded-sm leading-none">UPI</span> <span className="text-xs">UPI</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAction(selectedBooking.id, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold rounded-xl transition-colors border border-slate-200 hover:border-red-200 col-span-1 text-xs"
                                            >
                                                <Ban size={16} /> <span className="text-center px-1">Don't Refund<br />Deposit</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom UI Warning Cancel Modal */}
            {cancelModalBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-red-200">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-xl mb-2">Cancel Booking?</h3>
                            <p className="text-sm text-slate-600 font-medium">Are you sure you want to cancel the booking for <strong className="text-slate-800">{cancelModalBooking.customer}</strong>? This action cannot be reversed.</p>
                            <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-4 bg-red-50 p-2 rounded border border-red-100">Booking ID: {cancelModalBooking.id}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <button
                                onClick={() => setCancelModalBooking(null)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 bg-white shadow-sm"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={() => {
                                    handleAction(cancelModalBooking.id, 'Cancelled');
                                    setCancelModalBooking(null);
                                }}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Extra Guest Modal */}
            {isAddGuestModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Users className="text-purple-600" size={20} /> Add Extra Guests</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedBooking.id} • {selectedBooking.property}</p>
                            </div>
                            <button
                                onClick={() => setIsAddGuestModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors bg-white shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Number of Extra Guests</label>
                                    <div className="relative">
                                        <label className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500/20 outline-none flex items-center justify-between cursor-pointer">
                                            <span className={`truncate text-xs ${extraGuestForm.idFileName ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                                                {extraGuestForm.idFileName || "Upload ID Document"}
                                            </span>
                                            <Upload size={14} className="text-slate-400 shrink-0 ml-2" />
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={e => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setExtraGuestForm({ ...extraGuestForm, idFileName: e.target.files[0].name });
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 mt-1">Pricing dynamically computed by Property strictly for the booked nights.</p>
                                </div>
                            </div>

                            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Additional Cost (Inc. 5% GST)</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculateExtraGuestPrice().toLocaleString('en-IN')}
                                        </h2>
                                    </div>

                                    <div className="bg-white p-1 rounded-lg border border-purple-200 flex">
                                        <button
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, paymentMethod: "Cash" })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${extraGuestForm.paymentMethod === 'Cash' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, paymentMethod: "UPI" })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${extraGuestForm.paymentMethod === 'UPI' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            UPI
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddExtraGuestSubmit}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Collect Payment &amp; Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Booking Modal */}
            {isManualBookingOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="text-purple-600" size={20} /> Add Walk-in Booking</h3>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Full 100% payment collection required.</p>
                            </div>
                            <button
                                onClick={() => setIsManualBookingOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors bg-white shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Guest Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Guest Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Guest Name</label>
                                        <div className="relative">
                                            <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="e.g. Rahul Sharma" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone (Optional)</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="tel" value={manualForm.phone} onChange={e => setManualForm({ ...manualForm, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="+91" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Number of Guests</label>
                                        <div className="relative">
                                            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="number" min="1" max="15" value={manualForm.guests} onChange={e => setManualForm({ ...manualForm, guests: parseInt(e.target.value) || 2 })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Booking Info</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-in Date</label>
                                        <CustomDatePicker date={manualForm.checkInDate} onDateChange={(d) => setManualForm({ ...manualForm, checkInDate: d })} />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check-out Date</label>
                                        <CustomDatePicker date={manualForm.checkOutDate} onDateChange={(d) => setManualForm({ ...manualForm, checkOutDate: d })} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Property</label>
                                        <select value={manualForm.property} onChange={e => setManualForm({ ...manualForm, property: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                            {properties.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>

                                    {manualForm.property.includes("Ambrose") && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ambrose Villa Theme</label>
                                            <select value={manualForm.villa} onChange={e => setManualForm({ ...manualForm, villa: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none font-medium text-slate-800">
                                                {AMBROSE_VILLAS.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary & Payment */}
                            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100 mt-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Calculated Total (Inc. 5% GST)</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculatePrice().toLocaleString('en-IN')}
                                        </h2>
                                    </div>

                                    <div className="bg-white p-1 rounded-lg border border-purple-200 flex">
                                        <button
                                            onClick={() => setManualForm({ ...manualForm, paymentMethod: "Cash" })}
                                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${manualForm.paymentMethod === 'Cash' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => setManualForm({ ...manualForm, paymentMethod: "UPI" })}
                                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${manualForm.paymentMethod === 'UPI' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            UPI
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleManualBookingSubmit}
                                    disabled={!manualForm.name}
                                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Confirm Payment &amp; Check-in
                                </button>
                            </div>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    );
}
