"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { properties } from "../../../data/properties";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import { api } from "../../../../lib/api";

interface CartItem {
    villaId: string;
    villaName: string;
    theme: string;
    weekdayPrice: string;
    weekendPrice: string;
    maxPersons: number;
    property?: string; // "amstel-nest" | undefined (Ambrose default)
    unitCount?: number; // Amstel Nest: how many cottages
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookMultiPage() {
    const router = useRouter();
    const ambrose = properties["ambrose"];
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mounted, setMounted] = useState(false);

    // Date state — shared across all items
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [nights, setNights] = useState(0);

    // Step state
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    // Guest state per villa
    const [guestsPerVilla, setGuestsPerVilla] = useState<Record<string, { adults: number; kids: number }>>({});

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        agreedToTerms: false,
    });

    // ID upload
    const [idFile, setIdFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string>("");
    const [idError, setIdError] = useState("");

    // DB IDs — for both Ambrose and Amstel Nest
    const [dbPropertyMap, setDbPropertyMap] = useState<Record<string, number>>({});
    const [dbSubPropertyMap, setDbSubPropertyMap] = useState<Record<string, number>>({});

    // Submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");

    // Auth
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authError, setAuthError] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [emailMode, setEmailMode] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    // Coupon
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponMsg, setCouponMsg] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);

    // Per-villa booked dates for conflict detection
    const [villaBookedDates, setVillaBookedDates] = useState<Record<string, string[]>>({});
    const [villaConflicts, setVillaConflicts] = useState<Record<string, string[]>>({});
    const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

    // Amstel Nest availability: per-date bookingCounts from API
    const [amstelBookingCounts, setAmstelBookingCounts] = useState<Record<string, number>>({});
    const [amstelConflicts, setAmstelConflicts] = useState<Record<string, { date: string; available: number }[]>>({});

    // Derived: separate by property
    const ambroseItems = cart.filter(c => !c.property || c.property === "ambrose");
    const amstelItems = cart.filter(c => c.property === "amstel-nest");

    // Should we hide prices? Multi Ambrose, or mix of standard + family
    const hasMixedPrices = (() => {
        if (ambroseItems.length > 1) return true;
        if (ambroseItems.length > 0 && amstelItems.length > 0) return true;
        if (amstelItems.length > 1) {
            const prices = new Set(amstelItems.map(i => i.weekdayPrice));
            if (prices.size > 1) return true;
        }
        return false;
    })();

    useEffect(() => {
        setMounted(true);
        try {
            const stored = JSON.parse(localStorage.getItem("ambrose_cart") || "[]");
            setCart(stored);
            const guests: Record<string, { adults: number; kids: number }> = {};
            stored.forEach((item: CartItem) => { guests[item.villaId] = { adults: 2, kids: 0 }; });
            setGuestsPerVilla(guests);
        } catch { setCart([]); }

        // Read dates from URL params
        const params = new URLSearchParams(window.location.search);
        const ciStr = params.get("checkIn");
        const coStr = params.get("checkOut");
        if (ciStr && coStr) {
            const ci = new Date(ciStr + "T00:00:00");
            const co = new Date(coStr + "T00:00:00");
            if (!isNaN(ci.getTime()) && !isNaN(co.getTime()) && co > ci) {
                setCheckInDate(ci);
                setCheckOutDate(co);
                setNights(Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
            }
        }
    }, []);

    // Fetch DB IDs for all properties in cart
    useEffect(() => {
        (async () => {
            try {
                const props = await api.get("/properties");
                const propMap: Record<string, number> = {};
                const subMap: Record<string, number> = {};
                for (const p of props) {
                    if (p.slug === "ambrose" || p.slug === "amstel-nest") {
                        propMap[p.slug] = p.id;
                        if (p.subProperties) {
                            for (const sp of p.subProperties) {
                                const key = sp.slug || sp.name.toLowerCase().replace(/\s+/g, "-");
                                subMap[key] = sp.id;
                            }
                        }
                    }
                }
                setDbPropertyMap(propMap);
                setDbSubPropertyMap(subMap);
            } catch {}
        })();
    }, []);

    // Fetch per-villa booked dates for conflict detection (Ambrose villas only)
    useEffect(() => {
        const ambId = dbPropertyMap["ambrose"];
        if (!ambId || ambroseItems.length === 0) return;
        (async () => {
            try {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
                const allConflicts: Record<string, string[]> = {};
                for (const item of ambroseItems) {
                    const subId = dbSubPropertyMap[item.villaId];
                    if (subId) {
                        const res = await fetch(`/api/bookings/staycation/booked-dates?propertyId=${ambId}&subPropertyId=${subId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
                        if (res.ok) {
                            const data = await res.json();
                            allConflicts[item.villaId] = data.dates || [];
                        }
                    }
                }
                setVillaBookedDates(allConflicts);
            } catch {}
        })();
    }, [dbPropertyMap, dbSubPropertyMap, ambroseItems.length]);

    // Check conflicts when dates change
    useEffect(() => {
        if (!checkInDate || !checkOutDate) { setVillaConflicts({}); return; }
        const conflicts: Record<string, string[]> = {};
        const n = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        for (const item of ambroseItems) {
            const booked = villaBookedDates[item.villaId] || [];
            const conflictDates: string[] = [];
            for (let i = 0; i < n; i++) {
                const d = new Date(checkInDate);
                d.setDate(d.getDate() + i);
                const ds = d.toISOString().split("T")[0];
                if (booked.includes(ds)) conflictDates.push(ds);
            }
            if (conflictDates.length > 0) conflicts[item.villaId] = conflictDates;
        }
        setVillaConflicts(conflicts);
    }, [checkInDate, checkOutDate, ambroseItems.length, villaBookedDates]);

    // Fetch Amstel Nest booked dates
    useEffect(() => {
        const anId = dbPropertyMap["amstel-nest"];
        if (!anId || amstelItems.length === 0) return;
        (async () => {
            try {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
                const res = await fetch(`/api/bookings/staycation/booked-dates?propertyId=${anId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
                if (res.ok) {
                    const data = await res.json();
                    setAmstelBookingCounts(data.bookingCounts || {});
                }
            } catch {}
        })();
    }, [dbPropertyMap, amstelItems.length]);

    // Check Amstel Nest conflicts: unitCount vs available
    useEffect(() => {
        if (!checkInDate || !checkOutDate || amstelItems.length === 0) { setAmstelConflicts({}); return; }
        const n = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const conflicts: Record<string, { date: string; available: number }[]> = {};
        for (const item of amstelItems) {
            const maxUnits = item.villaId === 'standard-cottage' ? 14 : 1;
            const units = item.unitCount || 1;
            const itemConflicts: { date: string; available: number }[] = [];
            for (let i = 0; i < n; i++) {
                const d = new Date(checkInDate);
                d.setDate(d.getDate() + i);
                const ds = d.toISOString().split("T")[0];
                const booked = amstelBookingCounts[ds] || 0;
                const available = maxUnits - booked;
                if (units > available) itemConflicts.push({ date: ds, available: Math.max(0, available) });
            }
            if (itemConflicts.length > 0) conflicts[item.villaId] = itemConflicts;
        }
        setAmstelConflicts(conflicts);
    }, [checkInDate, checkOutDate, amstelItems, amstelBookingCounts]);

    const hasAnyConflicts = Object.keys(villaConflicts).length > 0 || Object.keys(amstelConflicts).length > 0;

    // Load user data if logged in
    useEffect(() => {
        const userStr = localStorage.getItem("galaxia_user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setFormData(prev => ({ ...prev, email: user.email || "", phone: user.phone || "" }));
            } catch {}
        }
    }, []);

    const removeFromCart = (villaId: string) => {
        const newCart = cart.filter(c => c.villaId !== villaId);
        localStorage.setItem("ambrose_cart", JSON.stringify(newCart));
        setCart(newCart);
        window.dispatchEvent(new Event("cart-update"));
        if (newCart.length === 0) router.push("/staycation");
    };

    const updateUnitCount = (villaId: string, count: number) => {
        // Standard cottage max 14, family cottage max 1
        const item = cart.find(c => c.villaId === villaId);
        const maxUnits = villaId === 'standard-cottage' ? 14 : (villaId === 'family-cottage' ? 1 : 99);
        const clamped = Math.max(1, Math.min(maxUnits, count));
        const newCart = cart.map(c => c.villaId === villaId ? { ...c, unitCount: clamped } : c);
        localStorage.setItem("ambrose_cart", JSON.stringify(newCart));
        setCart(newCart);
    };

    const handleDatesChange = (ci: Date | null, co: Date | null) => {
        setCheckInDate(ci);
        setCheckOutDate(co);
        if (ci && co) {
            setNights(Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
        }
    };

    const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const formatDateShort = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    // Calculate pricing per item
    const getItemPrice = (item: CartItem) => {
        if (!checkInDate || nights <= 0) return 0;
        let total = 0;
        const units = item.unitCount || 1;
        for (let i = 0; i < nights; i++) {
            const d = new Date(checkInDate);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const price = parseInt((isWeekend ? item.weekendPrice : item.weekdayPrice).replace(/,/g, ""));
            total += price;
        }
        return total * units;
    };

    const getExtraCharges = (item: CartItem) => {
        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
        const extraAdults = Math.max(0, guests.adults - 2);
        const isAmstel = item.property === "amstel-nest";
        const extraAdultCharge = isAmstel ? 1500 : 2000;
        const kidsCharge = isAmstel ? 500 : 1000;
        const units = item.unitCount || 1;
        return (extraAdults * extraAdultCharge + guests.kids * kidsCharge) * Math.max(nights, 1) * units;
    };

    const grandSubtotal = cart.reduce((sum, item) => sum + getItemPrice(item) + getExtraCharges(item), 0);
    const discountAmount = couponApplied ? Math.round(grandSubtotal * couponDiscount / 100) : 0;
    const afterDiscount = grandSubtotal - discountAmount;
    const gst = Math.round(afterDiscount * 0.05);
    const grandTotal = afterDiscount + gst;
    const payNow = Math.round(grandTotal * 0.8);
    const payAtVenue = grandTotal - payNow;

    const handleProceed = () => {
        if (!checkInDate || !checkOutDate || nights <= 0) return;
        const token = localStorage.getItem("galaxia_token");
        if (!token) { setShowLoginPrompt(true); return; }
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setAuthError("");
        try {
            const data = await api.post("/auth/login-guest", { email: authEmail, password: authPassword });
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            setFormData(prev => ({ ...prev, email: data.user.email || "", phone: data.user.phone || "" }));
            setShowLoginPrompt(false);
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err: any) {
            setAuthError(err.message || "Invalid email or password");
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleGuestRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setAuthError("");
        try {
            const data = await api.post("/auth/register-guest", { fullName: authName, email: authEmail, phone: authPhone, password: authPassword });
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            setFormData(prev => ({ ...prev, email: data.user.email || "", phone: data.user.phone || "", firstName: authName.split(" ")[0] || "", lastName: authName.split(" ").slice(1).join(" ") || "" }));
            setShowLoginPrompt(false);
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err: any) {
            setAuthError(err.message || "Registration failed");
        } finally {
            setIsAuthenticating(false);
        }
    };

    const applyCoupon = () => {
        setCouponMsg("");
        const code = couponCode.trim().toUpperCase();
        if (!code) return;
        // Predefined coupons
        const COUPONS: Record<string, { percent: number; label: string }> = {
            "WELCOME10": { percent: 10, label: "10% off" },
            "GALAXIA15": { percent: 15, label: "15% off" },
            "STAYCATION20": { percent: 20, label: "20% off" },
        };
        const coupon = COUPONS[code];
        if (coupon) {
            setCouponDiscount(coupon.percent);
            setCouponMsg(`✓ Coupon applied: ${coupon.label}`);
            setCouponApplied(true);
        } else {
            setCouponDiscount(0);
            setCouponMsg("Invalid coupon code");
            setCouponApplied(false);
        }
    };

    const removeCoupon = () => {
        setCouponCode("");
        setCouponDiscount(0);
        setCouponMsg("");
        setCouponApplied(false);
    };

    const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIdError("");
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { setIdError("Please upload an image file"); return; }
        if (file.size > 2 * 1024 * 1024) { setIdError("File must be under 2MB"); return; }
        setIdFile(file);
        setIdPreview(URL.createObjectURL(file));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.phone || !formData.agreedToTerms) return;
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePayment = async () => {
        setIsSubmitting(true);
        setBookingError("");

        try {
            // Upload ID first if provided
            let guestIdUrl = "";
            if (idFile) {
                const fd = new FormData();
                fd.append("file", idFile);
                const uploadRes = await fetch("/api/uploads/guest-id-public", { method: "POST", body: fd });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    guestIdUrl = data.url || data.path || "";
                }
            }

            for (const item of cart) {
                const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                const itemSubtotal = getItemPrice(item) + getExtraCharges(item);
                const itemGst = Math.round(itemSubtotal * 0.05);
                const itemTotal = itemSubtotal + itemGst;
                const itemPayNow = Math.round(itemTotal * 0.8);
                const itemPayAtVenue = itemTotal - itemPayNow;

                const isAmstel = item.property === "amstel-nest";
                const propertyId = isAmstel ? dbPropertyMap["amstel-nest"] : dbPropertyMap["ambrose"];
                const subPropertyId = dbSubPropertyMap[item.villaId] || null;

                if (!propertyId) { setBookingError("Property not found. Please try again."); return; }

                const units = item.unitCount || 1;
                for (let u = 0; u < units; u++) {
                    const perUnitPrice = getItemPrice({ ...item, unitCount: 1 });
                    const perUnitExtra = getExtraCharges({ ...item, unitCount: 1 });
                    const perUnitSubtotal = perUnitPrice + perUnitExtra;
                    const perUnitGst = Math.round(perUnitSubtotal * 0.05);
                    const perUnitTotal = perUnitSubtotal + perUnitGst;
                    const perUnitPayNow = Math.round(perUnitTotal * 0.8);
                    const perUnitPayAtVenue = perUnitTotal - perUnitPayNow;

                    await api.post("/bookings/staycation", {
                        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
                        customerPhone: formData.phone,
                        customerEmail: formData.email,
                        propertyId,
                        subPropertyId,
                        numGuests: guests.adults + guests.kids,
                        checkInDate: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,"0")}-${String(checkInDate.getDate()).padStart(2,"0")}` : undefined,
                        checkOutDate: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,"0")}-${String(checkOutDate.getDate()).padStart(2,"0")}` : undefined,
                        nightlyRate: perUnitPrice / Math.max(nights, 1),
                        basePrice: perUnitPrice,
                        extraPersonCharge: perUnitExtra,
                        gstAmount: perUnitGst,
                        totalAmount: perUnitTotal,
                        advanceAmount: perUnitPayNow,
                        balanceAmount: perUnitPayAtVenue,
                        securityDeposit: isAmstel ? 2000 : 3000,
                        advancePaid: true,
                        advanceMethod: "online",
                        source: "website",
                        ...(guestIdUrl ? { guestIdUrl } : {}),
                    });
                }
            }

            localStorage.removeItem("ambrose_cart");
            window.dispatchEvent(new Event("cart-update"));
            window.location.href = "/dashboard?source=staycation&status=success";
        } catch (err: any) {
            setBookingError(err?.message || "Booking failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#C4A265] border-t-transparent rounded-full" /></div>;

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[#FDFCF9] flex flex-col items-center justify-center p-4">
                <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                <h2 className="font-cinzel text-xl text-slate-800 mb-2">Your Cart is Empty</h2>
                <p className="font-inter text-sm text-slate-500 mb-6">Add villas or cottages to your cart to book them together.</p>
                <div className="flex gap-3">
                    <Link href="/staycation/ambrose" className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-6 py-3 rounded-full">Ambrose Villas</Link>
                    <Link href="/staycation/amstel-nest" className="border border-antique-gold text-antique-gold font-cinzel font-semibold text-sm px-6 py-3 rounded-full hover:bg-antique-gold/5 transition-colors">Amstel Nest</Link>
                </div>
            </div>
        );
    }

    // Which property's calendar to show for date picker
    const calendarPropertyId = dbPropertyMap["ambrose"] || dbPropertyMap["amstel-nest"] || null;
    const hasAmstelOnly = ambroseItems.length === 0 && amstelItems.length > 0;
    const showAmstelCalendar = hasAmstelOnly || amstelItems.length > 0;

    return (
        <div className="min-h-screen bg-[#FDFCF9] pb-24">
            <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
                {/* Steps */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="w-12 h-[1px] bg-border-medium" />
                        <h1 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-text-primary uppercase">Your Booking Cart</h1>
                        <div className="w-12 h-[1px] bg-border-medium" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-6 font-inter text-[10px] sm:text-sm max-w-2xl mx-auto bg-white py-3 sm:py-4 px-4 sm:px-6 rounded-full shadow-sm border border-border-light">
                        {[{ n: 1, label: "Your Cart" }, { n: 2, label: "Personal Details" }, { n: 3, label: "Confirm & Pay" }].map((s, i) => (
                            <div key={s.n} className="flex items-center gap-2">
                                {i > 0 && <span className="text-border-medium">----</span>}
                                <div className={`flex items-center gap-2 ${currentStep >= s.n ? "text-text-primary font-medium" : "text-text-muted"}`}>
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs text-white ${currentStep >= s.n ? "bg-antique-gold/90" : "bg-border-medium"}`}>{s.n}</span>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STEP 1: Cart Review */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        {/* Info banner */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex items-center gap-3">
                            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="font-inter text-sm text-amber-800">
                                You're booking <strong>{cart.length} item{cart.length > 1 ? "s" : ""}</strong>
                                {ambroseItems.length > 0 && <> ({ambroseItems.length} Ambrose)</>}
                                {amstelItems.length > 0 && <> ({amstelItems.length} Amstel Nest)</>}
                                . All items share the same dates.
                            </p>
                        </div>

                        {/* Date Picker */}
                        <div className="bg-white border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
                            <h3 className="font-cinzel text-lg font-semibold text-text-primary mb-4">Select Dates</h3>
                            <AvailabilityCalendar
                                propertyId={hasAmstelOnly ? dbPropertyMap["amstel-nest"] : dbPropertyMap["ambrose"]}
                                weekdayPrice={hasAmstelOnly ? (amstelItems[0]?.weekdayPrice || "4,950") : ambrose.pricing.weekday.price}
                                weekendPrice={hasAmstelOnly ? (amstelItems[0]?.weekendPrice || "6,950") : ambrose.pricing.weekend.price}
                                dateOverrides={{}}
                                onDatesChange={handleDatesChange}
                                hidePrice={hasMixedPrices}
                                totalUnits={hasAmstelOnly ? 15 : undefined}
                                initialCheckIn={checkInDate}
                                initialCheckOut={checkOutDate}
                            />
                        </div>

                        {/* ═══ AMBROSE ITEMS ═══ */}
                        {ambroseItems.length > 0 && (
                            <div>
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-antique-gold" />Ambrose Villas ({ambroseItems.length})
                                </h3>
                                <div className="space-y-4">
                                    {ambroseItems.map((item) => {
                                        const villaPrice = getItemPrice(item);
                                        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                                        const extraCharges = getExtraCharges(item);
                                        const conflict = villaConflicts[item.villaId];
                                        const isExpanded = expandedConflict === item.villaId;

                                        return (
                                            <div key={item.villaId} className={`bg-white border ${conflict ? 'border-red-300' : 'border-border-light'} rounded-xl overflow-hidden shadow-sm`}>
                                                <div className="p-5 sm:p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <span className="inline-block px-3 py-1 mb-2 bg-antique-gold/10 border border-antique-gold/30 rounded-full text-[10px] font-inter uppercase tracking-widest text-dark-gold">{item.theme}</span>
                                                            <h3 className="font-cinzel text-lg font-semibold text-text-primary">{item.villaName}</h3>
                                                        </div>
                                                        <button onClick={() => removeFromCart(item.villaId)} className="text-red-400 hover:text-red-600 transition-colors p-2" title="Remove">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* Conflict Warning + collapsible calendar */}
                                                    {conflict && (
                                                        <div className="mb-4">
                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 font-inter text-xs text-red-800">
                                                                ⚠️ <strong>{item.villaName}</strong> is booked on: {conflict.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })).join(", ")}.
                                                                <span className="block mt-1 text-red-600">Remove this villa or choose different dates.</span>
                                                                <button onClick={() => setExpandedConflict(isExpanded ? null : item.villaId)} className="mt-2 text-red-700 underline text-[11px] font-medium">
                                                                    {isExpanded ? "Hide" : "View"} availability calendar
                                                                </button>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className="mt-3 border border-red-100 rounded-lg p-3">
                                                                    <AvailabilityCalendar
                                                                        propertyId={dbPropertyMap["ambrose"]}
                                                                        subPropertyId={dbSubPropertyMap[item.villaId]}
                                                                        weekdayPrice={item.weekdayPrice}
                                                                        weekendPrice={item.weekendPrice}
                                                                        compact
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Guest selectors */}
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Adults</label>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.max(1, guests.adults - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                <span className="font-inter text-lg font-semibold text-text-primary w-8 text-center">{guests.adults}</span>
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.min(6, guests.adults + 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Kids (5-12 yrs)</label>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.max(0, guests.kids - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                <span className="font-inter text-lg font-semibold text-text-primary w-8 text-center">{guests.kids}</span>
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.min(4, guests.kids + 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {villaPrice > 0 && (
                                                        <div className="border-t border-border-light pt-4 space-y-1.5 font-inter text-sm">
                                                            <div className="flex justify-between"><span className="text-text-secondary">Room ({nights} night{nights > 1 ? "s" : ""})</span><span className="text-text-primary">{formatPrice(villaPrice)}</span></div>
                                                            {extraCharges > 0 && <div className="flex justify-between"><span className="text-text-secondary">Extra guests</span><span className="text-text-primary">{formatPrice(extraCharges)}</span></div>}
                                                            <div className="flex justify-between font-semibold text-text-primary pt-1"><span>Villa Subtotal</span><span>{formatPrice(villaPrice + extraCharges)}</span></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ═══ AMSTEL NEST ITEMS ═══ */}
                        {amstelItems.length > 0 && (
                            <div>
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" />Amstel Nest ({amstelItems.length})
                                </h3>
                                <div className="space-y-4">
                                    {amstelItems.map((item) => {
                                        const itemPrice = getItemPrice(item);
                                        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                                        const extraCharges = getExtraCharges(item);
                                        const units = item.unitCount || 1;

                                        return (
                                            <div key={item.villaId} className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
                                                <div className="p-5 sm:p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <span className="inline-block px-3 py-1 mb-2 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-inter uppercase tracking-widest text-emerald-700">{item.theme}</span>
                                                            <h3 className="font-cinzel text-lg font-semibold text-text-primary">{item.villaName}</h3>
                                                        </div>
                                                        <button onClick={() => removeFromCart(item.villaId)} className="text-red-400 hover:text-red-600 transition-colors p-2" title="Remove">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* Unit count selector */}
                                                    <div className="mb-4">
                                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-2 block">Number of Cottages {item.villaId === 'standard-cottage' ? '(max 14)' : ''}</label>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => updateUnitCount(item.villaId, units - 1)} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                            <span className="font-inter text-xl font-bold text-text-primary w-8 text-center">{units}</span>
                                                            <button onClick={() => updateUnitCount(item.villaId, units + 1)} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                            <span className="font-inter text-xs text-text-muted">× {item.villaName}</span>
                                                        </div>
                                                    </div>

                                                    {/* Amstel Nest Conflict Warning */}
                                                    {amstelConflicts[item.villaId] && (
                                                        <div className="mb-4">
                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 font-inter text-xs text-red-800">
                                                                ⚠️ <strong>{item.villaName}</strong> has insufficient availability on some dates:
                                                                <ul className="mt-1 space-y-0.5">
                                                                    {amstelConflicts[item.villaId].map((c, i) => (
                                                                        <li key={i}>• {new Date(c.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: only <strong>{c.available}</strong> available (need {units})</li>
                                                                    ))}
                                                                </ul>
                                                                <span className="block mt-1 text-red-600">Reduce unit count or choose different dates.</span>
                                                                <button onClick={() => setExpandedConflict(expandedConflict === item.villaId ? null : item.villaId)} className="mt-2 text-red-700 underline text-[11px] font-medium">
                                                                    {expandedConflict === item.villaId ? "Hide" : "View"} availability calendar
                                                                </button>
                                                            </div>
                                                            {expandedConflict === item.villaId && (
                                                                <div className="mt-3 border border-red-100 rounded-lg p-3">
                                                                    <AvailabilityCalendar
                                                                        propertyId={dbPropertyMap["amstel-nest"]}
                                                                        weekdayPrice={item.weekdayPrice}
                                                                        weekendPrice={item.weekendPrice}
                                                                        totalUnits={item.villaId === 'standard-cottage' ? 14 : undefined}
                                                                        compact
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Guest selectors (per unit) */}
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Adults per cottage</label>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.max(1, guests.adults - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                <span className="font-inter text-lg font-semibold text-text-primary w-8 text-center">{guests.adults}</span>
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.min(6, guests.adults + 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Kids per cottage</label>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.max(0, guests.kids - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                <span className="font-inter text-lg font-semibold text-text-primary w-8 text-center">{guests.kids}</span>
                                                                <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.min(4, guests.kids + 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {itemPrice > 0 && (
                                                        <div className="border-t border-border-light pt-4 space-y-1.5 font-inter text-sm">
                                                            <div className="flex justify-between"><span className="text-text-secondary">{units} cottage{units > 1 ? "s" : ""} × {nights} night{nights > 1 ? "s" : ""}</span><span className="text-text-primary">{formatPrice(itemPrice)}</span></div>
                                                            {extraCharges > 0 && <div className="flex justify-between"><span className="text-text-secondary">Extra guests</span><span className="text-text-primary">{formatPrice(extraCharges)}</span></div>}
                                                            <div className="flex justify-between font-semibold text-text-primary pt-1"><span>Subtotal</span><span>{formatPrice(itemPrice + extraCharges)}</span></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Grand Total + Proceed */}
                        {nights > 0 && (
                            <div className="bg-white border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-lg font-semibold text-text-primary mb-4">Booking Summary</h3>
                                <div className="space-y-2 font-inter text-sm">
                                    <div className="flex justify-between"><span className="text-text-secondary">Dates</span><span className="text-text-primary">{checkInDate && formatDateShort(checkInDate)} → {checkOutDate && formatDateShort(checkOutDate)}</span></div>
                                    <div className="flex justify-between"><span className="text-text-secondary">Subtotal ({cart.length} item{cart.length > 1 ? "s" : ""})</span><span className="text-text-primary">{formatPrice(grandSubtotal)}</span></div>
                                    {couponApplied && <div className="flex justify-between text-emerald-600"><span>Discount ({couponDiscount}%)</span><span>-{formatPrice(discountAmount)}</span></div>}
                                    <div className="flex justify-between"><span className="text-text-secondary">GST (5%)</span><span className="text-text-primary">{formatPrice(gst)}</span></div>
                                    <div className="border-t border-border-light my-2" />
                                    <div className="flex justify-between text-base font-bold"><span className="text-text-primary">Grand Total</span><span className="text-antique-gold">{formatPrice(grandTotal)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay Now (80%)</span><span>{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay at Venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                </div>

                                {/* Coupon */}
                                <div className="mt-4 pt-4 border-t border-border-light">
                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-2 block">Have a coupon?</label>
                                    {couponApplied ? (
                                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                            <div>
                                                <span className="font-inter text-sm font-semibold text-emerald-700">{couponCode}</span>
                                                <span className="font-inter text-xs text-emerald-600 ml-2">{couponMsg}</span>
                                            </div>
                                            <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-xs font-inter font-medium">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Enter coupon code"
                                                className="flex-1 border border-border-medium rounded-lg px-3 py-2.5 font-inter text-sm text-text-primary focus:ring-1 focus:ring-antique-gold focus:border-antique-gold outline-none"
                                            />
                                            <button onClick={applyCoupon} className="px-4 py-2.5 bg-antique-gold/10 border border-antique-gold/30 text-antique-gold font-inter font-semibold text-sm rounded-lg hover:bg-antique-gold hover:text-white transition-all">
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                    {couponMsg && !couponApplied && <p className="font-inter text-xs text-red-500 mt-1">{couponMsg}</p>}
                                </div>

                                <button
                                    onClick={handleProceed}
                                    disabled={!checkInDate || !checkOutDate || hasAnyConflicts}
                                    className={`mt-6 w-full py-3 rounded-lg font-cinzel font-semibold text-sm uppercase tracking-wider transition-all duration-300 ${
                                        checkInDate && checkOutDate && !hasAnyConflicts
                                            ? "bg-gradient-to-r from-antique-gold to-dark-gold text-white hover:shadow-lg hover:shadow-antique-gold/20"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                                >
                                    {hasAnyConflicts ? "Resolve Conflicts to Continue" : "Proceed to Details"}
                                </button>
                                <Link href="/staycation" className="block text-center mt-3 font-inter text-xs text-text-muted hover:text-antique-gold transition-colors">
                                    ← Back to Staycation
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Personal Details */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="bg-white border border-border-light p-6 sm:p-8 shadow-sm rounded-xl">
                            <h2 className="font-cinzel text-lg sm:text-xl text-text-primary uppercase mb-1">Primary Guest Details</h2>
                            <p className="font-inter text-xs sm:text-sm text-text-secondary mb-8 pb-4 border-b border-border-light">These details apply to all {cart.length} bookings.</p>
                            <form onSubmit={handleFormSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">First Name*</label>
                                        <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                    <div>
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Last Name</label>
                                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Phone*</label>
                                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                    <div>
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Email</label>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                </div>

                                {/* ID Upload */}
                                <div className="mb-6">
                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-2 block">Government ID (Image, max 2MB)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 border border-dashed border-border-medium rounded-lg hover:border-antique-gold transition-colors">
                                            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="font-inter text-xs text-text-secondary">{idFile ? idFile.name : "Upload ID"}</span>
                                            <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                                        </label>
                                        {idPreview && <img src={idPreview} alt="ID Preview" className="w-16 h-16 object-cover rounded-lg border border-border-light" />}
                                    </div>
                                    {idError && <p className="font-inter text-xs text-red-500 mt-1">{idError}</p>}
                                </div>

                                <label className="flex items-start gap-3 mt-6 cursor-pointer">
                                    <input type="checkbox" required checked={formData.agreedToTerms} onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} className="mt-1 accent-[#C4A265] w-4 h-4" />
                                    <span className="text-text-secondary font-inter text-xs leading-relaxed">I agree to the booking terms, cancellation policy, and property rules for all selected villas.</span>
                                </label>
                                <div className="flex gap-3 mt-8">
                                    <button type="button" onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="px-6 py-3 border border-border-medium text-text-primary font-inter text-sm rounded-lg hover:bg-soft-gray transition-colors">Back</button>
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm py-3 rounded-lg hover:shadow-lg hover:shadow-antique-gold/20 transition-all">Continue to Payment</button>
                                </div>
                            </form>
                        </div>

                        {/* Terms & Conditions Card */}
                        <div className="bg-white border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
                            <h3 className="font-cinzel text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Terms & Conditions</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-inter text-xs font-semibold text-red-700 mb-1">No Cancellation</h4>
                                    <p className="font-inter text-[11px] text-text-secondary leading-relaxed">This booking is non-refundable — no cancellations, amendments, or date changes are permitted once confirmed.</p>
                                </div>
                                <div className="border-t border-border-light pt-3">
                                    <h4 className="font-inter text-xs font-semibold text-text-primary mb-1">Payment Policy</h4>
                                    <p className="font-inter text-[11px] text-text-secondary leading-relaxed">80% payable online at booking · 20% payable at the venue</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Confirm & Pay */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        {/* Icon Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-in</span>
                                <span className="font-cinzel text-base font-semibold text-text-primary block">{checkInDate && `${checkInDate.getDate()} ${MONTH_SHORT[checkInDate.getMonth()]} ${checkInDate.getFullYear()}`}</span>
                                <span className="font-inter text-xs text-text-muted">1:00 PM</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-out</span>
                                <span className="font-cinzel text-base font-semibold text-text-primary block">{checkOutDate && `${checkOutDate.getDate()} ${MONTH_SHORT[checkOutDate.getMonth()]} ${checkOutDate.getFullYear()}`}</span>
                                <span className="font-inter text-xs text-text-muted">10:00 AM</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Duration</span>
                                <span className="font-cinzel text-2xl font-bold text-text-primary block">{nights}</span>
                                <span className="font-inter text-xs text-text-muted">Night{nights > 1 ? "s" : ""}</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Total Guests</span>
                                <span className="font-cinzel text-2xl font-bold text-text-primary block">{cart.reduce((s, item) => { const g = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 }; return s + (g.adults + g.kids) * (item.unitCount || 1); }, 0)}</span>
                                <span className="font-inter text-xs text-text-muted">{cart.reduce((s, item) => s + (guestsPerVilla[item.villaId]?.adults || 2) * (item.unitCount || 1), 0)} Adults</span>
                            </div>
                        </div>

                        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
                            <h2 className="font-cinzel text-xl font-semibold text-text-primary mb-6">Booking Confirmation</h2>
                            <div className="space-y-2 mb-6 font-inter text-sm">
                                <p className="text-text-secondary">Guest: <span className="text-text-primary font-medium">{formData.firstName} {formData.lastName}</span></p>
                                <p className="text-text-secondary">Phone: <span className="text-text-primary font-medium">{formData.phone}</span></p>
                            </div>

                            {cart.map((item) => {
                                const itemTotal = getItemPrice(item) + getExtraCharges(item);
                                const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                                const units = item.unitCount || 1;
                                return (
                                    <div key={item.villaId} className="border border-border-light rounded-lg p-4 mb-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] text-dark-gold font-inter uppercase tracking-wider">{item.property === "amstel-nest" ? "Amstel Nest" : "Ambrose"} · {item.theme}</span>
                                                <h4 className="font-cinzel font-semibold text-text-primary">{item.villaName}{units > 1 ? ` × ${units}` : ""}</h4>
                                                <p className="text-xs text-text-muted font-inter">{guests.adults} adults{guests.kids > 0 ? `, ${guests.kids} kids` : ""}{units > 1 ? " per cottage" : ""}</p>
                                            </div>
                                            <span className="font-inter font-semibold text-text-primary">{formatPrice(itemTotal)}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="border-t border-border-light mt-4 pt-4 space-y-2 font-inter text-sm">
                                <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(grandSubtotal)}</span></div>
                                {couponApplied && <div className="flex justify-between text-emerald-600"><span>Discount ({couponDiscount}%)</span><span>-{formatPrice(discountAmount)}</span></div>}
                                <div className="flex justify-between"><span className="text-text-secondary">GST (5%)</span><span>{formatPrice(gst)}</span></div>
                                <div className="flex justify-between text-base font-bold pt-2"><span>Grand Total</span><span className="text-antique-gold">{formatPrice(grandTotal)}</span></div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between text-sm"><span className="text-amber-800 font-medium">Pay Now (80%)</span><span className="font-bold text-amber-900">{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-amber-600 mt-1"><span>Balance at venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                </div>
                            </div>
                        </div>

                        {bookingError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-inter">{bookingError}</div>}

                        <div className="flex gap-3">
                            <button onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="px-6 py-3 border border-border-medium text-text-primary font-inter text-sm rounded-lg hover:bg-soft-gray transition-colors">Back</button>
                            <button
                                onClick={handlePayment}
                                disabled={isSubmitting}
                                className="flex-1 bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm py-3.5 rounded-lg hover:shadow-lg hover:shadow-antique-gold/20 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? "Processing..." : `Pay ${formatPrice(payNow)} Now`}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Login Modal */}
            {showLoginPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#202123] rounded-2xl shadow-xl w-full max-w-[420px] p-8 relative">
                        <button onClick={() => { setShowLoginPrompt(false); setAuthError(""); setEmailMode(false); setIsRegistering(false); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="font-inter text-2xl font-semibold text-white text-center mb-2">Log In to Continue</h2>
                        <p className="text-[#C5C5D2] text-sm text-center mb-6">Sign in to your account to complete your booking</p>

                        {!emailMode ? (
                            <div className="space-y-3">
                                <button onClick={() => { setEmailMode(true); setIsRegistering(false); }} className="w-full flex items-center justify-center gap-3 bg-white text-[#202123] py-3 rounded-xl font-inter text-sm font-semibold hover:bg-gray-100 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Continue with Email
                                </button>
                                <button onClick={() => { setEmailMode(true); setIsRegistering(true); }} className="w-full flex items-center justify-center gap-3 bg-[#343541] text-white py-3 rounded-xl font-inter text-sm font-semibold hover:bg-[#40414F] transition-colors">
                                    Create New Account
                                </button>
                                <button onClick={() => setShowLoginPrompt(false)} className="w-full text-[#C5C5D2] py-2 font-inter text-sm hover:text-white transition-colors">Cancel</button>
                            </div>
                        ) : isRegistering ? (
                            <form onSubmit={handleGuestRegister} className="space-y-4">
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Full Name</label><input required type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="Full name" /></div>
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Email</label><input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="you@example.com" /></div>
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Phone</label><input required type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="+91 XXXXX XXXXX" /></div>
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Password</label><input required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="Create a password" /></div>
                                {authError && <p className="text-red-400 text-xs font-inter">{authError}</p>}
                                <button type="submit" disabled={isAuthenticating} className="w-full bg-gradient-to-r from-[#C4A265] to-[#B8956A] text-white py-3 rounded-xl font-inter text-sm font-semibold mt-2 disabled:opacity-50">{isAuthenticating ? "Creating Account..." : "Create Account & Continue"}</button>
                                <button type="button" onClick={() => { setIsRegistering(false); setAuthError(""); }} className="w-full text-[#C5C5D2] py-2 font-inter text-xs hover:text-white transition-colors">Already have an account? Log in</button>
                            </form>
                        ) : (
                            <form onSubmit={handleGuestLogin} className="space-y-4">
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Email</label><input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="you@example.com" /></div>
                                <div><label className="text-[#A0A0B0] text-[10px] font-inter uppercase tracking-wider mb-1 block">Password</label><input required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-[#343541] border border-[#444654] rounded-xl px-4 py-3 text-white font-inter text-sm focus:ring-1 focus:ring-[#C4A265] focus:border-[#C4A265] outline-none" placeholder="Password" /></div>
                                {authError && <p className="text-red-400 text-xs font-inter">{authError}</p>}
                                <button type="submit" disabled={isAuthenticating} className="w-full bg-gradient-to-r from-[#C4A265] to-[#B8956A] text-white py-3 rounded-xl font-inter text-sm font-semibold mt-2 disabled:opacity-50">{isAuthenticating ? "Signing In..." : "Sign In & Continue"}</button>
                                <button type="button" onClick={() => { setIsRegistering(true); setAuthError(""); }} className="w-full text-[#C5C5D2] py-2 font-inter text-xs hover:text-white transition-colors">Don&apos;t have an account? Register</button>
                                <button type="button" onClick={() => { setEmailMode(false); setAuthError(""); }} className="w-full text-[#C5C5D2] py-1 font-inter text-xs hover:text-white transition-colors">← Back</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}



