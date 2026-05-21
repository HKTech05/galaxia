"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { initiateRazorpayPayment } from "../../lib/razorpay";
import {
    CalendarDays, Users, User, Phone, Mail, Home, UtensilsCrossed,
    PartyPopper, PawPrint, IndianRupee, Loader2, Check, AlertTriangle,
    ChevronLeft, ChevronRight, Lock, LogIn, Building2, X, Tag
} from "lucide-react";

// ── Property slug map ──
const SLUG_MAP: Record<string, string> = {
    "Hill View": "hill-view", "Mount View": "mount-view",
    "Heavenly Villa": "heavenly-villa", "La Paraiso": "la-paraiso",
    "Amstel Nest": "amstel-nest", "Ambrose": "ambrose",
};

function CustomerQuoteInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const quoteId = searchParams.get("quoteId") || "";

    // ── State ──
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quoteData, setQuoteData] = useState<any>(null);
    const [quotePricing, setQuotePricing] = useState<any>(null);

    // Editable form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [checkIn, setCheckIn] = useState<Date | null>(null);
    const [checkOut, setCheckOut] = useState<Date | null>(null);
    const [adults, setAdults] = useState(2);
    const [kids, setKids] = useState(0);
    const [pets, setPets] = useState(0);
    const [decoration, setDecoration] = useState(false);
    const [foodType, setFoodType] = useState("Regular");
    const [propertyName, setPropertyName] = useState("");
    const [villaQuantities, setVillaQuantities] = useState<Record<string, number>>({});

    // Availability
    const [availData, setAvailData] = useState<any>(null);
    const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Auth
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [loginPhone, setLoginPhone] = useState("");
    const [loginOtp, setLoginOtp] = useState("");
    const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    // Booking
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [dateConflict, setDateConflict] = useState(false);

    // Coupon
    const [couponCode, setCouponCode] = useState("");
    const [couponData, setCouponData] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    // ── Fetch quote data ──
    useEffect(() => {
        if (!quoteId) { setError("No quote ID provided"); setLoading(false); return; }
        (async () => {
            try {
                const res = await api.get(`/quotations/${quoteId}/data`);
                const d = res.data;
                setQuoteData(d);
                setQuotePricing(res.pricing);
                setPropertyName(d.propertyName);
                const nameParts = (d.customerName || "").split(" ");
                setFirstName(nameParts[0] || "");
                setLastName(nameParts.slice(1).join(" ") || "");
                setPhone(d.customerPhone || "");
                setEmail(d.customerEmail || "");
                setCheckIn(d.checkIn ? new Date(d.checkIn + "T00:00:00") : null);
                setCheckOut(d.checkOut ? new Date(d.checkOut + "T00:00:00") : null);
                setAdults(d.adults || 2);
                setKids(d.kids || 0);
                setPets(d.pets || 0);
                setDecoration(d.decoration || false);
                setFoodType(d.foodType || "Regular");
                if (d.villaQuantities) setVillaQuantities(d.villaQuantities);
                if (d.checkIn) setCalendarMonth(new Date(d.checkIn + "T00:00:00"));
            } catch (err: any) {
                setError(err?.message || "Failed to load quotation. It may have expired.");
            } finally { setLoading(false); }
        })();
    }, [quoteId]);

    // ── Check auth ──
    useEffect(() => {
        const token = localStorage.getItem("galaxia_token");
        if (token) {
            setIsLoggedIn(true);
            // Pre-fill from user profile (but not email — only fill if admin provided one)
            (async () => {
                try {
                    const user = await api.get("/auth/me");
                    if (user?.phone && !phone) setPhone(user.phone);
                    if (user?.fullName) {
                        const parts = user.fullName.split(" ");
                        if (!firstName) setFirstName(parts[0] || "");
                        if (!lastName) setLastName(parts.slice(1).join(" ") || "");
                    }
                } catch { }
            })();
        }
    }, []);

    // ── Fetch availability ──
    useEffect(() => {
        if (!propertyName) return;
        const slug = SLUG_MAP[propertyName];
        if (!slug) return;
        (async () => {
            try {
                const data = await api.get(`/properties/${slug}/availability`);
                setAvailData(data);
                // Build booked dates set
                const booked = new Set<string>();
                if (data.bookings) {
                    // Calculate total capacity
                    let totalCapacity = 1;
                    if (data.subProperties?.length > 0) {
                        // Fetch unit counts from our known data
                        if (slug === "amstel-nest") totalCapacity = 15; // 14 standard + 1 family
                        else if (slug === "ambrose") totalCapacity = 5;
                    }
                    // Count bookings per date
                    const dateCounts: Record<string, number> = {};
                    for (const b of data.bookings) {
                        const ci = new Date(b.checkInDate);
                        const co = new Date(b.checkOutDate);
                        for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
                            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            dateCounts[key] = (dateCounts[key] || 0) + 1;
                        }
                    }
                    for (const [date, count] of Object.entries(dateCounts)) {
                        if (count >= totalCapacity) booked.add(date);
                    }
                }
                if (data.blocked) {
                    for (const b of data.blocked) {
                        const d = new Date(b.blockedDate);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        booked.add(key);
                    }
                }
                setBookedDates(booked);
            } catch { }
        })();
    }, [propertyName]);

    // ── Check date conflict when dates change ──
    useEffect(() => {
        if (!checkIn || !checkOut) { setDateConflict(false); return; }
        let conflict = false;
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (bookedDates.has(key)) { conflict = true; break; }
        }
        setDateConflict(conflict);
    }, [checkIn, checkOut, bookedDates]);

    // ── Price calculation ──
    const livePrice = useCallback(() => {
        if (!checkIn || !checkOut || !propertyName) return null;
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
        if (nights <= 0) return null;

        let roomTotal = 0, extraAdultTotal = 0, extraKidsTotal = 0, totalUnits = 0;

        const calcUnit = (villaName?: string) => {
            let uRoom = 0, uExA = 0, uExK = 0;
            for (let i = 0; i < nights; i++) {
                const d = new Date(checkIn); d.setDate(checkIn.getDate() + i);
                const day = d.getDay();
                const isSat = day === 6; const isWe = day === 0 || day === 5 || day === 6;

                let basePrice = 0, extraAdultPrice = 0, kidsPrice = 0, baseGuests = 2;

                // Use availData pricing if available
                let pricing: any = null;
                if (villaName && availData?.subProperties && availData?.subPropertyPricing) {
                    const sp = availData.subProperties.find((s: any) =>
                        s.name.toUpperCase() === villaName.toUpperCase() || s.slug === villaName.toLowerCase()
                    );
                    if (sp) pricing = availData.subPropertyPricing[sp.id];
                }
                if (!pricing && availData?.pricing) pricing = availData.pricing;

                if (pricing) {
                    const p = isSat ? (pricing.saturday || pricing.weekend) : (day === 0 || day === 5) ? pricing.weekend : pricing.weekday;
                    if (p) {
                        basePrice = parseInt(p.price) || 0;
                        extraAdultPrice = p.extraAdult || 1000;
                        baseGuests = p.personsLabel ? parseInt(p.personsLabel) || 2 : 2;
                        kidsPrice = 1000;
                    }
                }
                if (!basePrice) {
                    // Fallback
                    if (propertyName.includes("Hill View")) { basePrice = isWe ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
                    else if (propertyName.includes("Mount View")) { basePrice = isWe ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (propertyName.includes("Heavenly")) { basePrice = isWe ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (propertyName.includes("La Paraiso")) { basePrice = isWe ? 7500 : 4950; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWe ? 4 : 2; }
                    else if (propertyName.includes("Amstel")) { basePrice = isWe ? 6950 : 4950; extraAdultPrice = 2000; kidsPrice = 1000; }
                    else if (propertyName.includes("Ambrose")) { basePrice = isWe ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
                }
                uRoom += basePrice;
                const exA = Math.max(0, adults - baseGuests);
                const freeKids = Math.max(0, baseGuests - adults);
                const exK = Math.max(0, kids - freeKids);
                uExA += exA * extraAdultPrice;
                uExK += exK * kidsPrice;
            }
            return { roomTotal: uRoom, extraAdultTotal: uExA, extraKidsTotal: uExK };
        };

        const hasVillas = Object.values(villaQuantities).some(q => q > 0);
        if (hasVillas) {
            for (const [vName, qty] of Object.entries(villaQuantities)) {
                if (qty <= 0) continue;
                const u = calcUnit(vName);
                roomTotal += u.roomTotal * qty; extraAdultTotal += u.extraAdultTotal * qty;
                extraKidsTotal += u.extraKidsTotal * qty; totalUnits += qty;
            }
        } else {
            const u = calcUnit(); roomTotal = u.roomTotal; extraAdultTotal = u.extraAdultTotal;
            extraKidsTotal = u.extraKidsTotal; totalUnits = 1;
        }

        let subtotal = roomTotal + extraAdultTotal + extraKidsTotal;
        if (decoration) subtotal += 1200;
        const gst = Math.round(Math.round(subtotal) * 0.05);
        let total = Math.round(subtotal) + gst + pets * 600;
        total = Math.round(total / 10) * 10;
        const advance = Math.round(total * 0.8);

        return {
            nights, totalUnits, roomTotal: Math.round(roomTotal), gst,
            extraAdultCharge: Math.round(extraAdultTotal), extraKidsCharge: Math.round(extraKidsTotal),
            decorationCharge: decoration ? 1200 : 0, petCharge: pets * 600,
            totalAmount: total, advanceAmount: advance, balanceAmount: total - advance,
        };
    }, [checkIn, checkOut, propertyName, adults, kids, pets, decoration, villaQuantities, availData]);

    const pricing = (() => {
        const base = livePrice();
        if (!base) return null;
        if (couponData) {
            let discount = 0;
            if (couponData.discountType === 'percentage') discount = Math.round(base.totalAmount * couponData.discountValue / 100);
            else discount = Math.round(couponData.discountValue);
            discount = Math.min(discount, base.totalAmount);
            const newTotal = base.totalAmount - discount;
            const advance = Math.round(newTotal * 0.8);
            return { ...base, couponDiscount: discount, totalAmount: newTotal, advanceAmount: advance, balanceAmount: newTotal - advance };
        }
        return { ...base, couponDiscount: 0 };
    })();

    // ── Coupon handler ──
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true); setCouponError("");
        try {
            const res = await api.post("/coupons/validate", { code: couponCode.trim() });
            setCouponData(res);
        } catch (err: any) {
            setCouponError(err?.message || "Invalid coupon");
            setCouponData(null);
        } finally { setCouponLoading(false); }
    };

    // ── Login handlers ──
    const handleSendOtp = async () => {
        let cleanPhone = loginPhone.replace(/\D/g, '');
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
        if (cleanPhone.length !== 10) { setLoginError("Enter a valid 10-digit number"); return; }
        setLoginLoading(true); setLoginError("");
        try {
            await api.post("/auth/send-otp", { phone: cleanPhone });
            setLoginStep("otp");
        } catch (err: any) { setLoginError(err?.message || "Failed to send OTP"); }
        finally { setLoginLoading(false); }
    };

    const handleVerifyOtp = async () => {
        let cleanPhone = loginPhone.replace(/\D/g, '');
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
        setLoginLoading(true); setLoginError("");
        try {
            const res = await api.post("/auth/verify-otp", { phone: cleanPhone, otp: loginOtp });
            if (res?.token) {
                localStorage.setItem("galaxia_token", res.token);
                if (res.user?.name) {
                    const parts = res.user.name.split(" ");
                    if (!firstName) setFirstName(parts[0] || "");
                    if (!lastName) setLastName(parts.slice(1).join(" ") || "");
                }
                if (res.user?.email && !email && quoteData?.customerEmail) setEmail(res.user.email);
                if (!phone) setPhone(cleanPhone);
                setIsLoggedIn(true);
                setShowLogin(false);
            }
        } catch (err: any) { setLoginError(err?.message || "Invalid OTP"); }
        finally { setLoginLoading(false); }
    };

    // ── Payment handler ──
    const handleBookNow = async () => {
        if (!isLoggedIn) { setShowLogin(true); return; }
        if (!phone.trim() || phone.replace(/\D/g, '').length !== 10) {
            setBookingError("Please enter a valid 10-digit phone number."); return;
        }
        if (!firstName.trim()) { setBookingError("Please enter your first name."); return; }
        if (!checkIn || !checkOut || !pricing) { setBookingError("Please select valid dates."); return; }
        if (dateConflict) { setBookingError("Selected dates are unavailable. Please choose different dates."); return; }

        setIsSubmitting(true); setBookingError("");

        try {
            const customerName = `${firstName} ${lastName}`.trim();
            const cleanPhone = phone.replace(/\D/g, '').slice(-10);
            const ciStr = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`;
            const coStr = `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, '0')}-${String(checkOut.getDate()).padStart(2, '0')}`;

            // Razorpay payment
            let paymentResult;
            try {
                paymentResult = await initiateRazorpayPayment({
                    amount: pricing.advanceAmount,
                    customerName,
                    customerEmail: email || undefined,
                    customerPhone: cleanPhone,
                    description: `Staycation - ${propertyName} (Quote: ${quoteId})`,
                    notes: { bookingType: "staycation", property: propertyName, checkIn: ciStr, checkOut: coStr, quoteRef: quoteId },
                });
            } catch (payErr: any) {
                if (payErr?.message === "Payment cancelled by user") { setIsSubmitting(false); return; }
                throw payErr;
            }

            // Find DB property ID
            const slug = SLUG_MAP[propertyName];
            let dbPropertyId: number | null = null;
            let dbSubPropertyId: number | null = null;
            try {
                const props = await api.get("/properties");
                const prop = props.find((p: any) => p.slug === slug);
                if (prop) dbPropertyId = prop.id;
            } catch { }
            if (!dbPropertyId) { throw new Error("Could not find property. Please contact support."); }

            // Build addons
            const addons: any[] = [];
            if (decoration) addons.push({ name: 'Celebration Add-on', price: 1200, description: 'Cake, balloons, and a banner' });
            if (propertyName === "Amstel Nest" || propertyName === "Ambrose") {
                addons.push({ name: 'Food Preference', foodType });
            }

            const totalCottages = Object.values(villaQuantities).reduce((s, q) => s + q, 0) || 1;

            const token = localStorage.getItem("galaxia_token");
            const payload = {
                customerName, customerPhone: cleanPhone, customerEmail: email,
                propertyId: dbPropertyId, subPropertyId: dbSubPropertyId,
                numGuests: adults, numKids: kids, numPets: pets,
                numCottages: totalCottages,
                checkInDate: ciStr, checkOutDate: coStr,
                nightlyRate: pricing.nights > 0 ? Math.round(pricing.roomTotal / pricing.nights) : 0,
                basePrice: pricing.roomTotal,
                extraPersonCharge: pricing.extraAdultCharge + pricing.extraKidsCharge,
                extraAdultCharge: pricing.extraAdultCharge,
                extraKidsCharge: pricing.extraKidsCharge,
                gstAmount: pricing.gst,
                totalAmount: pricing.totalAmount,
                advanceAmount: pricing.advanceAmount,
                balanceAmount: pricing.balanceAmount,
                securityDeposit: 3000,
                advancePaid: true,
                advanceMethod: `Razorpay: ${paymentResult.razorpay_payment_id}`,
                source: "quotation",
                couponCode: couponData?.code || null,
                addons: addons.length > 0 ? addons : null,
            };

            await fetch("/api/bookings/staycation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            }).then(async r => {
                if (!r.ok) {
                    const err = await r.json();
                    if (r.status === 409) throw new Error("409: These dates are no longer available.");
                    throw new Error(err?.error || "Booking failed");
                }
                return r.json();
            });

            router.push("/dashboard?source=staycation&status=success");
        } catch (err: any) {
            if (err?.message?.includes("409")) {
                setDateConflict(true);
                setBookingError("These dates are no longer available. Please select new dates or request a new quote.");
            } else {
                setBookingError(err?.message || "Booking failed. Please try again.");
            }
        } finally { setIsSubmitting(false); }
    };

    // ── Helpers ──
    const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const fmtDateStr = (d: Date | null) => d ? d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—";
    const dateToKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // ── Calendar renderer ──
    const renderCalendar = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthLabel = new Date(year, month).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const key = dateToKey(date);
            const isPast = date < today;
            const isBooked = bookedDates.has(key);
            const isDisabled = isPast || isBooked;
            const isCheckIn = checkIn && dateToKey(checkIn) === key;
            const isCheckOut = checkOut && dateToKey(checkOut) === key;
            const isInRange = checkIn && checkOut && date > checkIn && date < checkOut;

            cells.push(
                <button key={d} disabled={isDisabled}
                    onClick={() => {
                        if (!checkIn || (checkIn && checkOut) || date <= checkIn) {
                            setCheckIn(date); setCheckOut(null);
                        } else {
                            setCheckOut(date);
                        }
                    }}
                    className={`aspect-square rounded-lg text-xs font-semibold transition-all
                        ${isCheckIn ? "bg-[#1a1a2e] text-[#C4A265] ring-2 ring-[#C4A265]" : ""}
                        ${isCheckOut ? "bg-[#1a1a2e] text-[#C4A265] ring-2 ring-[#C4A265]" : ""}
                        ${isInRange ? "bg-[#C4A265]/15 text-[#1a1a2e]" : ""}
                        ${isBooked ? "bg-red-100 text-red-400 line-through cursor-not-allowed" : ""}
                        ${isPast && !isBooked ? "text-gray-300 cursor-not-allowed" : ""}
                        ${!isDisabled && !isCheckIn && !isCheckOut && !isInRange ? "hover:bg-[#C4A265]/10 text-[#1a1a2e]" : ""}
                    `}
                >{d}</button>
            );
        }

        return (
            <div className="bg-white rounded-2xl border border-[#e8e5dd] p-5">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCalendarMonth(new Date(year, month - 1))}
                        className="p-1.5 rounded-full hover:bg-[#f5f3ef] transition-colors"><ChevronLeft size={16} className="text-[#1a1a2e]" /></button>
                    <span className="text-sm font-bold text-[#1a1a2e] tracking-wide uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>{monthLabel}</span>
                    <button onClick={() => setCalendarMonth(new Date(year, month + 1))}
                        className="p-1.5 rounded-full hover:bg-[#f5f3ef] transition-colors"><ChevronRight size={16} className="text-[#1a1a2e]" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-[#C4A265] uppercase">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{cells}</div>
                <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Unavailable</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#1a1a2e]" /> Selected</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#C4A265]/15" /> Range</span>
                </div>
            </div>
        );
    };

    // ── Loading / Error ──
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
            <div className="text-center"><Loader2 size={32} className="animate-spin text-[#C4A265] mx-auto mb-3" /><p className="text-sm text-[#555]">Loading your quotation...</p></div>
        </div>
    );
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
            <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl border border-[#e8e5dd] shadow-sm">
                <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Quotation Not Found</h2>
                <p className="text-sm text-[#555]">{error}</p>
            </div>
        </div>
    );

    const isAmstelOrAmbrose = propertyName === "Amstel Nest" || propertyName === "Ambrose";
    const nights = pricing?.nights || 0;

    return (
        <div className="min-h-screen bg-[#faf9f6]">
            {/* Header */}
            <div className="bg-[#1a1a2e] py-6">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h1 className="text-2xl text-[#C4A265] tracking-[0.15em] font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>GALAXIA</h1>
                    <div className="w-12 h-[1px] bg-[#C4A265] mx-auto my-2" />
                    <p className="text-xs text-[#C4A265]/70 tracking-[0.3em] uppercase">Staycation Quotation</p>
                </div>
            </div>

            {/* Quote badge */}
            <div className="max-w-5xl mx-auto px-4 -mt-4">
                <div className="inline-flex items-center gap-2 bg-white border border-[#C4A265]/30 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-xs font-bold text-[#C4A265]">Quote</span>
                    <span className="text-xs font-mono font-bold text-[#1a1a2e]">{quoteId}</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left: Form (3 cols) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Property info */}
                        <div className="bg-white rounded-2xl border border-[#e8e5dd] p-6 shadow-sm">
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Home size={14} /> Property
                            </h2>
                            <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: "'Playfair Display', serif" }}>{propertyName}</p>
                            {Object.entries(villaQuantities).filter(([, q]) => q > 0).length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {Object.entries(villaQuantities).filter(([, q]) => q > 0).map(([name, qty]) => (
                                        <div key={name} className="flex items-center justify-between bg-[#C4A265]/10 rounded-xl px-4 py-3 border border-[#C4A265]/20">
                                            <div>
                                                <p className="text-sm font-bold text-[#1a1a2e]">{name}</p>
                                                <p className="text-xs text-[#555]">{qty} unit{qty > 1 ? 's' : ''}</p>
                                            </div>
                                            <button onClick={() => setVillaQuantities(prev => {
                                                const next = { ...prev };
                                                delete next[name];
                                                return next;
                                            })}
                                                className="p-1.5 rounded-lg hover:bg-red-100 text-[#555] hover:text-red-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-1 text-xs text-[#555]">Karjat, Maharashtra, India</p>
                        </div>

                        {/* Calendar */}
                        <div>
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <CalendarDays size={14} /> Select Dates
                            </h2>
                            {renderCalendar()}
                            {checkIn && checkOut && (
                                <div className="mt-3 flex items-center justify-between bg-white border border-[#e8e5dd] rounded-xl px-4 py-3">
                                    <div className="text-xs"><span className="text-[#555]">Check-in:</span> <strong className="text-[#1a1a2e]">{fmtDateStr(checkIn)}</strong></div>
                                    <div className="text-xs text-[#C4A265] font-bold">{nights} night{nights > 1 ? 's' : ''}</div>
                                    <div className="text-xs"><span className="text-[#555]">Check-out:</span> <strong className="text-[#1a1a2e]">{fmtDateStr(checkOut)}</strong></div>
                                </div>
                            )}
                            {dateConflict && (
                                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-red-700">Dates no longer available</p>
                                        <p className="text-xs text-red-600 mt-1">Some of the selected dates are already booked or blocked. Please select new dates or request a new quote.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Guest Details */}
                        <div className="bg-white rounded-2xl border border-[#e8e5dd] p-6 shadow-sm">
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <User size={14} /> Guest Details
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5">First Name *</label>
                                    <input value={firstName} onChange={e => setFirstName(e.target.value)}
                                        className="w-full border border-[#e8e5dd] rounded-xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:border-[#C4A265] focus:outline-none bg-[#faf9f6]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5">Last Name</label>
                                    <input value={lastName} onChange={e => setLastName(e.target.value)}
                                        className="w-full border border-[#e8e5dd] rounded-xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:border-[#C4A265] focus:outline-none bg-[#faf9f6]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5 flex items-center gap-1"><Phone size={12} /> Phone *</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number"
                                        className="w-full border border-[#e8e5dd] rounded-xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:border-[#C4A265] focus:outline-none bg-[#faf9f6]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5 flex items-center gap-1"><Mail size={12} /> Email</label>
                                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional"
                                        className="w-full border border-[#e8e5dd] rounded-xl px-4 py-2.5 text-sm text-[#1a1a2e] focus:border-[#C4A265] focus:outline-none bg-[#faf9f6]" />
                                </div>
                            </div>
                        </div>

                        {/* Guests & Add-ons */}
                        <div className="bg-white rounded-2xl border border-[#e8e5dd] p-6 shadow-sm">
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Users size={14} /> Guests & Preferences
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <GuestCounter label="Adults" value={adults} onChange={setAdults} min={1} max={20} />
                                <GuestCounter label="Kids (5-12)" value={kids} onChange={setKids} min={0} max={10} />
                                <GuestCounter label="Pets" value={pets} onChange={setPets} min={0} max={3} />
                                <div>
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5">Celebration</label>
                                    <button onClick={() => setDecoration(!decoration)}
                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all
                                            ${decoration ? "bg-[#C4A265]/10 border-[#C4A265] text-[#1a1a2e]" : "bg-[#faf9f6] border-[#e8e5dd] text-[#555] hover:border-[#C4A265]/50"}`}>
                                        <PartyPopper size={13} /> {decoration ? "Added ✓" : "+₹1,200"}
                                    </button>
                                </div>
                            </div>
                            {isAmstelOrAmbrose && (
                                <div className="mt-4">
                                    <label className="block text-xs font-semibold text-[#555] mb-1.5 flex items-center gap-1"><UtensilsCrossed size={12} /> Food Preference *</label>
                                    <div className="flex gap-3">
                                        {["Regular", "Jain"].map(t => (
                                            <button key={t} onClick={() => setFoodType(t)}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                                                    ${foodType === t ? "bg-[#1a1a2e] text-[#C4A265] border-[#1a1a2e]" : "bg-[#faf9f6] text-[#555] border-[#e8e5dd] hover:border-[#C4A265]/50"}`}>
                                                {t} Veg
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Price Summary (2 cols) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-[#e8e5dd] shadow-sm p-6 sticky top-8">
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-4">Your Stay</h2>

                            {pricing ? (
                                <>
                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between"><span className="text-[#555]">Base Price</span><span className="font-bold text-[#1a1a2e]">{fmtCurrency(pricing.roomTotal + pricing.gst)}</span></div>
                                        {pricing.extraAdultCharge > 0 && <div className="flex justify-between"><span className="text-[#555]">Extra Adults</span><span className="font-semibold text-[#1a1a2e]">{fmtCurrency(pricing.extraAdultCharge)}</span></div>}
                                        {pricing.extraKidsCharge > 0 && <div className="flex justify-between"><span className="text-[#555]">Extra Kids</span><span className="font-semibold text-[#1a1a2e]">{fmtCurrency(pricing.extraKidsCharge)}</span></div>}
                                        {pricing.decorationCharge > 0 && <div className="flex justify-between"><span className="text-[#555]">Celebration</span><span className="font-semibold text-[#1a1a2e]">{fmtCurrency(pricing.decorationCharge)}</span></div>}
                                        {pricing.petCharge > 0 && <div className="flex justify-between"><span className="text-[#555]">Pets</span><span className="font-semibold text-[#1a1a2e]">{fmtCurrency(pricing.petCharge)}</span></div>}
                                    </div>

                                    <div className="border-t border-[#C4A265]/30 mt-4 pt-4">
                                        {pricing.couponDiscount > 0 && (
                                            <div className="flex justify-between mb-2">
                                                <span className="text-[#16a34a] text-sm font-bold">Coupon Discount</span>
                                                <span className="font-bold text-[#16a34a]">-{fmtCurrency(pricing.couponDiscount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-bold text-[#1a1a2e]" style={{ fontFamily: "'Playfair Display', serif" }}>Total Amount</span>
                                            <span className="text-xl font-bold text-[#C4A265]">{fmtCurrency(pricing.totalAmount)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-[#faf9f6] rounded-xl space-y-1.5 text-xs">
                                        <div className="flex justify-between"><span className="text-[#555]">Pay Now (80%)</span><span className="font-bold text-[#16a34a]">{fmtCurrency(pricing.advanceAmount)}</span></div>
                                        <div className="flex justify-between"><span className="text-[#555]">Pay at Venue (20%)</span><span className="font-semibold text-[#1a1a2e]">{fmtCurrency(pricing.balanceAmount)}</span></div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 text-[#555]"><CalendarDays size={28} className="mx-auto mb-2 opacity-40" /><p className="text-xs">Select dates to see pricing</p></div>
                            )}

                            {/* Coupon Code */}
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-[#555] mb-1.5 flex items-center gap-1"><Tag size={12} /> Coupon Code</label>
                                {couponData ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                        <div>
                                            <p className="text-xs font-bold text-green-700">{couponData.code} applied</p>
                                            <p className="text-[10px] text-green-600">
                                                {couponData.discountType === 'percentage' ? `${couponData.discountValue}% off` : `₹${couponData.discountValue} off`}
                                            </p>
                                        </div>
                                        <button onClick={() => { setCouponData(null); setCouponCode(""); setCouponError(""); }}
                                            className="text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="Enter code"
                                            className="flex-1 border border-[#e8e5dd] rounded-xl px-3 py-2 text-xs text-[#1a1a2e] focus:border-[#C4A265] focus:outline-none bg-[#faf9f6] uppercase tracking-wider" />
                                        <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1a1a2e] text-[#C4A265] hover:bg-[#2a2a4e] disabled:opacity-40 transition-colors">
                                            {couponLoading ? "..." : "Apply"}
                                        </button>
                                    </div>
                                )}
                                {couponError && <p className="mt-1 text-[10px] text-red-500 font-medium">{couponError}</p>}
                            </div>

                            {bookingError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{bookingError}</div>
                            )}

                            <button onClick={handleBookNow}
                                disabled={!pricing || dateConflict || isSubmitting}
                                className="w-full mt-6 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm
                                    bg-[#1a1a2e] text-[#C4A265] hover:bg-[#2a2a4e] disabled:opacity-40 disabled:cursor-not-allowed">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isLoggedIn ? <Lock size={16} /> : <LogIn size={16} />}
                                {isSubmitting ? "Processing..." : isLoggedIn ? `Pay ${pricing ? fmtCurrency(pricing.advanceAmount) : ''} & Book` : "Login & Book"}
                            </button>

                            <p className="mt-3 text-[10px] text-center text-[#888]">Non-refundable • Check-in: 1 PM • Check-out: 11 AM</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Modal */}
            {showLogin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a2e] rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
                        <button onClick={() => { setShowLogin(false); setLoginError(""); setLoginStep("phone"); }}
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
                        <h2 className="text-xl text-[#C4A265] font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Login to Book</h2>
                        <p className="text-xs text-white/60 mb-6">Verify your phone number to continue</p>

                        {loginStep === "phone" ? (
                            <>
                                <label className="block text-xs font-semibold text-[#C4A265]/70 mb-1.5">Phone Number</label>
                                <input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="10-digit mobile"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#C4A265] focus:outline-none" />
                                {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
                                <button onClick={handleSendOtp} disabled={loginLoading}
                                    className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-[#C4A265] text-[#1a1a2e] hover:bg-[#d4b275] transition-colors disabled:opacity-50">
                                    {loginLoading ? "Sending..." : "Send OTP"}
                                </button>
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-semibold text-[#C4A265]/70 mb-1.5">Enter OTP</label>
                                <input value={loginOtp} onChange={e => setLoginOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#C4A265] focus:outline-none tracking-[0.5em] text-center" />
                                {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
                                <button onClick={handleVerifyOtp} disabled={loginLoading}
                                    className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-[#C4A265] text-[#1a1a2e] hover:bg-[#d4b275] transition-colors disabled:opacity-50">
                                    {loginLoading ? "Verifying..." : "Verify & Continue"}
                                </button>
                                <button onClick={() => { setLoginStep("phone"); setLoginError(""); }}
                                    className="w-full mt-2 py-2 text-xs text-white/50 hover:text-white/80 transition-colors">Change Number</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function GuestCounter({ label, value, onChange, min, max }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
    return (
        <div>
            <label className="block text-xs font-semibold text-[#555] mb-1.5">{label}</label>
            <div className="flex items-center border border-[#e8e5dd] rounded-xl overflow-hidden bg-[#faf9f6]">
                <button onClick={() => onChange(Math.max(min, value - 1))}
                    className="px-3 py-2.5 text-[#555] hover:text-[#1a1a2e] hover:bg-[#e8e5dd]/50 transition-colors font-bold text-sm">−</button>
                <span className="flex-1 text-center text-sm font-bold text-[#1a1a2e]">{value}</span>
                <button onClick={() => onChange(Math.min(max, value + 1))}
                    className="px-3 py-2.5 text-[#555] hover:text-[#1a1a2e] hover:bg-[#e8e5dd]/50 transition-colors font-bold text-sm">+</button>
            </div>
        </div>
    );
}

export default function CustomerQuotePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
                <Loader2 size={32} className="animate-spin text-[#C4A265]" />
            </div>
        }>
            <CustomerQuoteInner />
        </Suspense>
    );
}
