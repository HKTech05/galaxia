"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Info, Clock, CheckCircle, CheckCircle2, Ban, IndianRupee, RotateCcw, BedDouble, AlertTriangle, X, Plus, CalendarDays, Phone, User as UserIcon, Upload, Camera } from "lucide-react";
import CustomDatePicker from "./CustomDatePicker";
import IdProofModal from "./IdProofModal";
import { api } from "../../lib/api";
import ManualBookingModal from "./ManualBookingModal";


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
                    rawId: b.id,
                    customer: b.customerName || "Unknown",
                    phone: b.customerPhone || "",
                    property: b.subProperty 
                        ? b.subProperty.name 
                        : (b.property?.name || "Unknown"),
                    parentProperty: b.property?.name || "Unknown",
                    guests: b.numGuests || 0,
                    kids: b.numKids || 0,
                    pets: b.numPets || 0,
                    checkInDate: b.checkInDate ? new Date(b.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    checkOutDate: b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
                    checkInTime: "1:00 PM",
                    checkOutTime: "10:00 AM",
                    depositAmt: `₹${(b.securityDeposit || 3000).toLocaleString('en-IN')}`,
                    remainingAmt: `₹${(b.balanceAmount || 0).toLocaleString('en-IN')}`,
                    idProofUrl: b.idProofUrl || null,
                    guestIds: (b.guestIds || []).map((g: any) => ({
                        id: g.id,
                        fileName: g.fileName,
                        fileType: g.fileType,
                    })),
                    status: b.status === "checked_out" ? "Completed" : 
                            b.status === "confirmed" ? "Pending Arrival" : 
                            b.status === "checked_in" ? "Checked In" : 
                            b.status || "Pending Arrival",
                    addons: b.addons || null,
                    totalAmount: b.totalAmount || 0,
                    numCottages: b.numCottages || 1,
                    propertyId: b.propertyId || null,
                    depositRefunded: b.depositRefunded || false,
                    depositRefundMethod: b.depositRefundMethod || null,
                    depositRefundedAt: b.depositRefundedAt || null,
                    foodBills: b.foodBills || [],
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
    const [previewGuestId, setPreviewGuestId] = useState<{ id: number; fileName: string | null; fileType: string | null } | null>(null);

    // Payment collection states
    const [collected20, setCollected20] = useState<string | null>(null);
    const [collectedSec, setCollectedSec] = useState<string | null>(null);
    // UPI proof files
    const [upiProofBalance, setUpiProofBalance] = useState<File | null>(null);
    const [upiProofDeposit, setUpiProofDeposit] = useState<File | null>(null);

    // Cancel modal state
    const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);

    // Add Extra Guest states
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [extraGuestForm, setExtraGuestForm] = useState({
        guests: 1,
        pets: 0,
        paymentMethod: "UPI",
        idFileName: ""
    });

    // Food Bill modal states
    const [isFoodBillModalOpen, setIsFoodBillModalOpen] = useState(false);
    const [foodBillBooking, setFoodBillBooking] = useState<any>(null);
    const [foodBillForm, setFoodBillForm] = useState({ description: "", amount: "", paymentMethod: "cash" });
    const [foodBillUpiProof, setFoodBillUpiProof] = useState<File | null>(null);
    const [foodBillSubmitting, setFoodBillSubmitting] = useState(false);

    const handleFoodBillSubmit = async () => {
        if (!foodBillBooking || !foodBillForm.description || !foodBillForm.amount) return;
        setFoodBillSubmitting(true);
        try {
            let upiProofUrl = null;
            let upiProofKey = null;
            if (foodBillForm.paymentMethod === "upi" && foodBillUpiProof) {
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const formData = new FormData();
                formData.append("file", foodBillUpiProof);
                formData.append("category", "food-bill-proofs");
                const uploadRes = await fetch("/api/uploads/general", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    upiProofUrl = uploadData.url;
                    upiProofKey = uploadData.url;
                }
            }
            await api.post("/stay-food-bills", {
                bookingId: foodBillBooking.rawId,
                description: foodBillForm.description,
                amount: parseInt(foodBillForm.amount),
                paymentMethod: foodBillForm.paymentMethod,
                upiProofUrl,
                upiProofKey,
            });
            setIsFoodBillModalOpen(false);
            setFoodBillForm({ description: "", amount: "", paymentMethod: "cash" });
            setFoodBillUpiProof(null);
            fetchBookings();
            alert("Food bill added successfully!");
        } catch (err) {
            alert("Failed to add food bill");
        } finally {
            setFoodBillSubmitting(false);
        }
    };

    const calculateExtraGuestPrice = (includeGuests = true, includePets = true) => {
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

        let total = 0;
        if (includeGuests) total += extraAdultPrice * extraGuestForm.guests * nights;
        if (includePets) total += 600 * extraGuestForm.pets * nights;

        return Math.round(total + (total * 0.05));
    };

    const handleAddExtraGuestSubmit = async () => {
        if (!selectedBooking) return;
        try {
            if (extraGuestForm.guests > 0) {
                const extraCharge = calculateExtraGuestPrice(true, false);
                await api.post(`/bookings/staycation/${selectedBooking.rawId}/extra-guest`, {
                    guestName: "Extra Guest",
                    idProofType: "Uploaded",
                    chargeAmount: extraCharge,
                    paymentMethod: extraGuestForm.paymentMethod
                });
            }
            if (extraGuestForm.pets > 0) {
                const petsCharge = calculateExtraGuestPrice(false, true);
                if (petsCharge > 0) {
                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/extra-guest`, {
                        guestName: `Pet (${extraGuestForm.pets})`,
                        idProofType: "None",
                        chargeAmount: petsCharge,
                        paymentMethod: extraGuestForm.paymentMethod
                    });
                }
            }
            fetchBookings();
            setIsAddGuestModalOpen(false);
        } catch (err) {
            alert("Failed to add extra guest / pet");
        }
    };

    // Manual Booking states
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);


    useEffect(() => {
        if (!isActionModalOpen) {
            setCollected20(null);
            setCollectedSec(null);
        }
    }, [isActionModalOpen]);


    // Filter to logically evaluate if a booking intersects the query date range.
    const todaysBookings = bookings.filter(b => {
        const matchesProperty = properties.some(p => b.property.includes(p) || (b.parentProperty && b.parentProperty === p));
        if (!matchesProperty) return false;
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

    const handleAction = async (booking: any, newStatus: string) => {
        try {
            const numericId = booking.rawId;
            await api.patch(`/bookings/staycation/${numericId}/status`, { 
                status: newStatus === "Checked In" ? "checked_in" : 
                        newStatus === "Cancelled" ? "cancelled" : 
                        (newStatus === "Checked Out" || newStatus === "Completed") ? "checked_out" : "confirmed"
            });
            
            // Record payment if checking in
            if (newStatus === "Checked In" && selectedBooking) {
                const balanceAmt = parseInt(selectedBooking.remainingAmt.replace('₹', '').replace(/,/g, '')) || 0;
                const depositAmt = parseInt(selectedBooking.depositAmt.replace('₹', '').replace(/,/g, '')) || 0;

                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "balance",
                    amount: balanceAmt,
                    method: collected20
                });
                await api.post(`/bookings/staycation/${numericId}/payment`, {
                    paymentType: "deposit",
                    amount: depositAmt,
                    method: collectedSec
                });

                // Upload UPI proof images if UPI was used
                const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                const employee = await api.get(`/employees?propertyId=${selectedBooking.propertyId || ''}`);
                const empId = Array.isArray(employee) && employee[0] ? employee[0].id : null;

                if (collected20 === "UPI" && upiProofBalance && empId) {
                    const fd = new FormData();
                    fd.append("file", upiProofBalance);
                    fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(balanceAmt));
                    fd.append("paymentType", "balance");
                    fd.append("note", `Balance — ${selectedBooking.property}`);
                    await fetch("/api/upi-payments/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    });
                }
                if (collectedSec === "UPI" && upiProofDeposit && empId) {
                    const fd = new FormData();
                    fd.append("file", upiProofDeposit);
                    fd.append("employeeId", String(empId));
                    fd.append("bookingRef", booking.id || '');
                    fd.append("guestName", booking.customer || '');
                    fd.append("amount", String(depositAmt));
                    fd.append("paymentType", "deposit");
                    fd.append("note", `Security deposit — ${selectedBooking.property}`);
                    await fetch("/api/upi-payments/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    });
                }
                // Reset proof states
                setUpiProofBalance(null);
                setUpiProofDeposit(null);
            }

            fetchBookings();
        } catch (err) {
            alert("Failed to update booking status");
        }
    };

    return (
        <>
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
                                        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-100 uppercase tracking-wider">
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
                                        {booking.phone && (
                                            <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Phone size={11} className="text-slate-400" />
                                                {booking.phone}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Number of Guests</p>
                                        <p className="text-xl tracking-tight font-black text-slate-800">{booking.guests} adults{booking.kids > 0 && <span className="text-sm font-bold text-blue-600 ml-2">+ {booking.kids} kid{booking.kids > 1 ? 's' : ''}</span>}{booking.pets > 0 && <span className="text-sm font-bold text-purple-600 ml-2">+ {booking.pets} pet{booking.pets > 1 ? 's' : ''}</span>}</p>
                                        {booking.numCottages > 1 && <p className="text-xs font-bold text-indigo-600 mt-1">× {booking.numCottages} cottages</p>}
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

                                    {booking.addons && Array.isArray(booking.addons) && booking.addons.length > 0 && (
                                        <div className="mt-2 col-span-2 sm:col-span-5 space-y-2">
                                            {booking.addons.filter((a: any) => a.name === 'Celebration Add-on').map((addon: any, i: number) => (
                                                <div key={i} className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Celebration Add-on</p>
                                                        <p className="text-sm font-bold text-amber-800 mt-0.5">₹{Number(addon.price || 1200).toLocaleString('en-IN')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {addon.cakeMessage && <p className="text-xs text-slate-700">Cake: <span className="font-bold">{addon.cakeMessage}</span></p>}
                                                        {addon.occasion && <p className="text-xs text-slate-700">Occasion: <span className="font-bold">{addon.occasion}</span></p>}
                                                    </div>
                                                </div>
                                            ))}
                                            {booking.addons.filter((a: any) => a.name === 'Food Preference').map((addon: any, i: number) => (
                                                <div key={`food-${i}`} className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Food:</span>
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${addon.foodType === 'Jain' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{addon.foodType} (Veg){addon.count ? ` × ${addon.count}` : ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Food Bills Summary */}
                                {booking.foodBills && booking.foodBills.length > 0 && (
                                    <div className="mt-4 col-span-2 sm:col-span-5">
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Food Bills</p>
                                            {booking.foodBills.map((fb: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-amber-100 last:border-0">
                                                    <span className="font-medium text-amber-800">{fb.description}</span>
                                                    <span className="font-bold text-amber-800">₹{fb.amount.toLocaleString('en-IN')} <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded ml-1 uppercase">{fb.paymentMethod}</span></span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between text-xs font-black text-amber-900 pt-1.5 mt-1 border-t border-amber-200">
                                                <span>Total</span>
                                                <span>₹{booking.foodBills.reduce((s: number, f: any) => s + f.amount, 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Camera size={14} /> ID Proofs</h4>
                                        <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
                                            <Upload size={12} /> Upload
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                                                        const formData = new FormData();
                                                        formData.append("file", file);
                                                        formData.append("bookingId", String(booking.rawId));
                                                        const res = await fetch("/api/uploads/guest-id", {
                                                            method: "POST",
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            body: formData,
                                                        });
                                                        if (res.ok) {
                                                            alert("ID uploaded!");
                                                            fetchBookings();
                                                        } else {
                                                            alert("Upload failed");
                                                        }
                                                    } catch { alert("Upload failed"); }
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {booking.guestIds && booking.guestIds.length > 0 ? (
                                            booking.guestIds.map((gid: any) => (
                                                <button
                                                    key={gid.id}
                                                    onClick={() => setPreviewGuestId(gid)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    <span className="truncate max-w-[120px]">{gid.fileName || `ID-${gid.id}`}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium py-2">No IDs uploaded yet</span>
                                        )}
                                    </div>
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
                                            onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200">
                                            <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                        </button>
                                        <button
                                            onClick={() => setCancelModalBooking(booking)}
                                            className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-red-200">
                                            <Ban size={18} /> Cancel Booking
                                        </button>
                                        {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                        <button
                                            onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
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
                                            onClick={() => { setSelectedBooking(booking); setExtraGuestForm({ guests: 1, pets: 0, paymentMethod: 'UPI', idFileName: '' }); setIsAddGuestModalOpen(true); }}
                                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 mt-2">
                                            <Users size={18} className="text-purple-600" /> Add Extra Guest / Pet
                                        </button>
                                        {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                        <button
                                            onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
                                    </>
                                )}

                                {booking.status === "Pending Checkout" && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedBooking(booking); setModalType('checkout'); setIsActionModalOpen(true); }}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-indigo-700">
                                            <RotateCcw size={18} /> Initiate Checkout
                                        </button>
                                        {(portalName.includes('Ambrose') || portalName.includes('Amstel')) && (
                                        <button
                                            onClick={() => { setFoodBillBooking(booking); setFoodBillForm({ description: '', amount: '', paymentMethod: 'cash' }); setFoodBillUpiProof(null); setIsFoodBillModalOpen(true); }}
                                            className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 border border-amber-200">
                                            <Plus size={18} /> Add Food Bill
                                        </button>
                                        )}
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
                                            {collected20 === "UPI" && (
                                                <div className="mt-2 space-y-2">
                                                    {upiProofBalance ? (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                            <CheckCircle size={14} className="text-emerald-600" />
                                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{upiProofBalance.name}</span>
                                                            <button type="button" onClick={() => setUpiProofBalance(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofBalance(e.target.files[0]); e.target.value = ''; }} />
                                                                <Camera size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofBalance(e.target.files[0]); e.target.value = ''; }} />
                                                                <Upload size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

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
                                            {collectedSec === "UPI" && (
                                                <div className="mt-2 space-y-2">
                                                    {upiProofDeposit ? (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                            <CheckCircle size={14} className="text-emerald-600" />
                                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{upiProofDeposit.name}</span>
                                                            <button type="button" onClick={() => setUpiProofDeposit(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofDeposit(e.target.files[0]); e.target.value = ''; }} />
                                                                <Camera size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setUpiProofDeposit(e.target.files[0]); e.target.value = ''; }} />
                                                                <Upload size={14} className="text-indigo-600" />
                                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            disabled={!collected20 || !collectedSec || (collected20 === "UPI" && !upiProofBalance) || (collectedSec === "UPI" && !upiProofDeposit)}
                                            onClick={() => {
                                                handleAction(selectedBooking, "Checked In");
                                                setIsActionModalOpen(false);
                                            }}
                                            className={`w-full font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${(!collected20 || !collectedSec || (collected20 === "UPI" && !upiProofBalance) || (collectedSec === "UPI" && !upiProofDeposit))
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
                                                onClick={async () => {
                                                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { method: "cash" });
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200 col-span-1"
                                            >
                                                <RotateCcw size={16} /> <span className="text-xs">Cash</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await api.post(`/bookings/staycation/${selectedBooking.rawId}/refund-deposit`, { method: "upi" });
                                                    handleAction(selectedBooking, "Completed");
                                                    setIsActionModalOpen(false);
                                                }}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-200 col-span-1"
                                            >
                                                <span className="font-bold text-[10px] bg-indigo-200 text-indigo-800 px-1 py-0.5 rounded-sm leading-none">UPI</span> <span className="text-xs">UPI</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAction(selectedBooking, "Completed");
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
                                    handleAction(cancelModalBooking, 'Cancelled');
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
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, guests: Math.max(0, extraGuestForm.guests - 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >−</button>
                                        <span className="text-lg font-black text-slate-800 w-6 text-center">{extraGuestForm.guests}</span>
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, guests: Math.min(10, extraGuestForm.guests + 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >+</button>
                                    </div>

                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mt-4">Number of Pets (₹600/pet/night)</label>
                                    <div className="flex items-center gap-3 mt-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, pets: Math.max(0, extraGuestForm.pets - 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >−</button>
                                        <span className="text-lg font-black text-slate-800 w-6 text-center">{extraGuestForm.pets}</span>
                                        <button
                                            type="button"
                                            onClick={() => setExtraGuestForm({ ...extraGuestForm, pets: Math.min(10, extraGuestForm.pets + 1) })}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                                        >+</button>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 mt-1">Pricing dynamically computed by Property strictly for the booked nights.</p>
                                </div>
                            </div>

                            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Additional Cost (Inc. Taxes)</p>
                                        <h2 className="text-3xl font-black text-purple-900 flex items-center">
                                            <IndianRupee size={24} className="mr-1" /> {calculateExtraGuestPrice().toLocaleString('en-IN')}
                                        </h2>
                                        {(() => {
                                            if (!selectedBooking) return null;
                                            const startStr = selectedBooking.checkInDate.replace(',', '');
                                            const endStr = selectedBooking.checkOutDate.replace(',', '');
                                            const start = new Date(startStr);
                                            const end = new Date(endStr);
                                            const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                                            const prop = selectedBooking.property;
                                            let extraAdultPrice = 0;
                                            if (prop.includes('Hill View')) extraAdultPrice = 600;
                                            else if (prop.includes('Mount View')) extraAdultPrice = 800;
                                            else if (prop.includes('Heavenly Villa')) extraAdultPrice = 800;
                                            else if (prop.includes('La Paraiso')) extraAdultPrice = 1200;
                                            else if (prop.includes('Amstel')) extraAdultPrice = 1000;
                                            else if (prop.includes('Ambrose')) extraAdultPrice = 2000;
                                            return (
                                                <div className="mt-2 space-y-0.5 text-[11px] font-medium text-purple-700">
                                                    {extraGuestForm.guests > 0 && <p>Extra guests: {extraGuestForm.guests} × ₹{extraAdultPrice.toLocaleString('en-IN')}/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.guests * extraAdultPrice * nights).toLocaleString('en-IN')}</p>}
                                                    {extraGuestForm.pets > 0 && <p>Pets: {extraGuestForm.pets} × ₹600/night × {nights} night{nights > 1 ? 's' : ''} = ₹{(extraGuestForm.pets * 600 * nights).toLocaleString('en-IN')}</p>}
                                                    <p className="text-purple-500">+ Taxes</p>
                                                </div>
                                            );
                                        })()}
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

            <ManualBookingModal
                isOpen={isManualBookingOpen}
                onClose={() => setIsManualBookingOpen(false)}
                onSuccess={fetchBookings}
                properties={properties}
            />
        </div >

            {previewGuestId && (
                <IdProofModal
                    guestId={previewGuestId}
                    onClose={() => setPreviewGuestId(null)}
                    onDelete={async (id) => {
                        const token = localStorage.getItem("galaxia_admin_token") || localStorage.getItem("galaxia_token") || "";
                        const res = await fetch(`/api/uploads/guest-id/${id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) throw new Error("Delete failed");
                        fetchBookings();
                    }}
                />
            )}

            {/* Food Bill Modal */}
            {isFoodBillModalOpen && foodBillBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus size={18} className="text-amber-600" /> Add Food Bill</h3>
                            <button onClick={() => setIsFoodBillModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">{foodBillBooking.id} — {foodBillBooking.customer}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description *</label>
                                <input type="text" value={foodBillForm.description} onChange={e => setFoodBillForm({ ...foodBillForm, description: e.target.value })} placeholder="e.g. Dinner for 4, Snacks order" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount (₹) *</label>
                                <input type="text" inputMode="numeric" value={foodBillForm.amount} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setFoodBillForm({ ...foodBillForm, amount: val }); }} placeholder="e.g. 2500" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Paid via</label>
                                <div className="bg-slate-50 rounded-lg p-1 flex">
                                    <button type="button" onClick={() => setFoodBillForm({ ...foodBillForm, paymentMethod: 'cash' })} className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${foodBillForm.paymentMethod === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>Cash</button>
                                    <button type="button" onClick={() => setFoodBillForm({ ...foodBillForm, paymentMethod: 'upi' })} className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${foodBillForm.paymentMethod === 'upi' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>UPI</button>
                                </div>
                            </div>
                            {foodBillForm.paymentMethod === 'upi' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">UPI Proof</label>
                                    {foodBillUpiProof ? (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <CheckCircle size={14} className="text-emerald-600" />
                                            <span className="text-xs font-bold text-emerald-700 truncate max-w-[200px]">{foodBillUpiProof.name}</span>
                                            <button type="button" onClick={() => setFoodBillUpiProof(null)} className="text-xs text-red-500 font-bold ml-auto">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setFoodBillUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Camera size={14} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-indigo-700">Camera</span>
                                            </label>
                                            <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setFoodBillUpiProof(e.target.files[0]); e.target.value = ''; }} />
                                                <Upload size={14} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-indigo-700">Gallery</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleFoodBillSubmit}
                                disabled={foodBillSubmitting || !foodBillForm.description || !foodBillForm.amount}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {foodBillSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={16} /> Submit Food Bill</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
