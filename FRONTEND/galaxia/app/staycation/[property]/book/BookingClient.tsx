"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyData } from "../../../data/properties";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import { api } from "../../../../lib/api";

interface BookingClientProps {
    property: PropertyData;
}

const coupons = [
    { code: "WELCOME10", discount: "10% off", description: "First booking discount — valid for all properties", expires: "Mar 31, 2026", active: true },
    { code: "SUMMER25", discount: "₹500 off", description: "Summer special — min booking ₹3,000", expires: "Jun 30, 2026", active: true },
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookingClient({ property }: BookingClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string; price: number; type: string; maxPersons: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    
    // Auth Modes
    const [emailMode, setEmailMode] = useState<"login" | "register" | false>(false);
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authError, setAuthError] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // DB IDs for property and sub-property
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [dbSubPropertyMap, setDbSubPropertyMap] = useState<Record<string, number>>({});

    // Fetch DB property ID on mount
    useEffect(() => {
        (async () => {
            try {
                const props = await api.get("/properties");
                const searchSlug = property.id.includes('/') ? property.id.split('/').pop() : property.id;
                let dbProp = props.find((p: any) => p.slug === searchSlug);
                // If it's a sub-property (e.g. standard-cottage), find its parent
                if (!dbProp) {
                    dbProp = props.find((p: any) => p.subProperties?.some((sp: any) => sp.slug === searchSlug));
                }

                if (dbProp) {
                    setDbPropertyId(dbProp.id);
                    if (dbProp.subProperties) {
                        const map: Record<string, number> = {};
                        for (const sp of dbProp.subProperties) {
                            map[sp.slug || sp.name.toLowerCase().replace(/\s+/g, "-")] = sp.id;
                        }
                        setDbSubPropertyMap(map);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch property data:", err);
            }
        })();
    }, [property.id]);

    // Date state — read from URL params if present
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [nightlyRate, setNightlyRate] = useState(0);
    const [nights, setNights] = useState(0);

    // Initialize from URL params
    useEffect(() => {
        const ciParam = searchParams.get("checkIn");
        const coParam = searchParams.get("checkOut");
        if (ciParam) {
            const ci = new Date(ciParam + "T00:00:00");
            if (!isNaN(ci.getTime())) {
                setCheckInDate(ci);
                if (coParam) {
                    const co = new Date(coParam + "T00:00:00");
                    if (!isNaN(co.getTime()) && co > ci) {
                        setCheckOutDate(co);
                        const n = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
                        setNights(n);
                        // Determine rate from first night's day of week
                        const day = ci.getDay();
                        const isWeekend = day === 0 || day === 5 || day === 6;
                        const rate = parseInt((isWeekend ? property.pricing.weekend.price : property.pricing.weekday.price).replace(/,/g, ""));
                        setNightlyRate(rate);
                    }
                }
            }
        }
    }, [searchParams, property.pricing]);

    // Guest state
    const [adults, setAdults] = useState(1);
    const [kids, setKids] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        title: "Mr",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gst: "",
        aadhaarFile: null as File | null,
        agreedToTerms: false
    });
    const [idProofError, setIdProofError] = useState("");

    // Load user data if logged in
    useEffect(() => {
        const token = localStorage.getItem("galaxia_token");
        const userStr = localStorage.getItem("galaxia_user");
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                const nameParts = user.fullName?.split(" ") || [""];
                setFormData(prev => ({
                    ...prev,
                    firstName: nameParts[0] || "",
                    lastName: nameParts.slice(1).join(" ") || "",
                    email: user.email || "",
                    phone: user.phone || ""
                }));
            } catch (e) {}
        }
    }, []);

    // Restore booking state if returning from Auth Callback (fallback for old flow)
    useEffect(() => {
        const saved = localStorage.getItem("galaxia_booking_state");
        if (saved) {
            try {
                const st = JSON.parse(saved);
                if (st.checkInDate) setCheckInDate(new Date(st.checkInDate));
                if (st.checkOutDate) setCheckOutDate(new Date(st.checkOutDate));
                if (st.nights) setNights(st.nights);
                if (st.nightlyRate) setNightlyRate(st.nightlyRate);
                if (st.adults) setAdults(st.adults);
                if (st.kids) setKids(st.kids);
                if (st.selectedRoom) setSelectedRoom(st.selectedRoom);
                if (st.currentStep) setCurrentStep(st.currentStep);
                
                // Clear it so it doesn't persistently load on future visits
                localStorage.removeItem("galaxia_booking_state");
            } catch (e) {}
        }
    }, []);

    // Listen for Cognito popup success
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data === "COGNITO_LOGIN_SUCCESS") {
                setShowLoginPrompt(false);
                // Reload user data
                const userStr = localStorage.getItem("galaxia_user");
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        const nameParts = user.fullName?.split(" ") || [""];
                        setFormData(prev => ({
                            ...prev,
                            firstName: nameParts[0] || "",
                            lastName: nameParts.slice(1).join(" ") || "",
                            email: user.email || "",
                            phone: user.phone || ""
                        }));
                    } catch (e) {}
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setAuthError("");
        try {
            const data = await api.post("/auth/login-guest", { email: authEmail, password: authPassword });
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            const nameParts = data.user.fullName?.split(" ") || [""];
            setFormData(prev => ({
                ...prev,
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: data.user.email || "",
                phone: data.user.phone || ""
            }));
            setShowLoginPrompt(false);
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
            await api.post("/auth/register-guest", {
                fullName: authName,
                email: authEmail,
                phone: authPhone,
                password: authPassword
            });
            // Auto login after register
            const data = await api.post("/auth/login-guest", { email: authEmail, password: authPassword });
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            const nameParts = authName.split(" ");
            setFormData(prev => ({
                ...prev,
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: authEmail,
                phone: authPhone
            }));
            setShowLoginPrompt(false);
        } catch (err: any) {
            setAuthError(err.message || "Registration failed");
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<typeof coupons[0] | null>(null);

    const roomOptions = property.subProperties && property.subProperties.length > 0
        ? property.subProperties.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            theme: sub.theme,
            image: sub.image,
            description: sub.description,
            price: parseInt(sub.pricing?.weekday.price.replace(/,/g, "") || "0"),
            details: sub.configuration?.slice(0, 3) || [],
            persons: sub.pricing?.weekday.persons || "2 guests",
            maxPersons: sub.maxPersons || property.maxPersons || 4
        }))
        : [{
            id: property.id,
            name: property.name,
            theme: property.type === "standalone" ? "Entire Villa" : property.subtitle,
            image: property.images[0],
            description: property.description,
            price: parseInt(property.pricing.weekday.price.replace(/,/g, "")),
            details: property.configuration.slice(0, 3),
            persons: property.pricing.weekday.persons,
            maxPersons: property.maxPersons || 4
        }];

    const formatPrice = (price: number) => `₹ ${price.toLocaleString('en-IN')}`;
    const formatDateShort = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    // Extra person charges
    const extraAdultCharge = parseInt(property.pricing.extraAdult.replace(/,/g, ""));
    const kidsChargeStr = property.pricing.kidsCharge;
    const kidsChargeNum = parseInt(kidsChargeStr.replace(/,/g, ""));

    // Base price includes 1-2 persons, extra charges for above that
    const baseIncludedPersons = 2;
    const extraAdults = Math.max(0, adults - baseIncludedPersons);
    const extraAdultTotal = extraAdults * extraAdultCharge;
    const kidsTotal = kids * kidsChargeNum;

    const roomPrice = nightlyRate * nights;
    const extraCharges = (extraAdultTotal + kidsTotal) * nights;
    const subtotal = roomPrice + extraCharges;

    // Discount
    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discount.includes("%")) {
            const pct = parseInt(appliedCoupon.discount);
            discountAmount = Math.round(subtotal * pct / 100);
        } else {
            discountAmount = parseInt(appliedCoupon.discount.replace(/[₹,\s]/g, ""));
        }
    }

    const taxesAndFees = Math.round((subtotal - discountAmount) * property.gstPercent / 100);
    const totalAmount = subtotal - discountAmount + taxesAndFees;

    const totalGuests = adults + kids;
    const maxGuests = selectedRoom?.maxPersons || property.maxPersons || 4;

    // 80-20 Payment Split
    const payNow = Math.round(totalAmount * 0.8);
    const payAtVenue = totalAmount - payNow;

    const handleRoomSelect = (room: any) => {
        setSelectedRoom({
            id: room.id,
            name: room.name,
            price: room.price,
            type: room.theme,
            maxPersons: room.maxPersons
        });
        setNightlyRate(room.price);
        if (!nights) setNights(1);
        setAdults(1);
        setKids(0);
        
        const token = localStorage.getItem("galaxia_token");
        if (!token) {
            setShowLoginPrompt(true);
        } else {
            setShowLoginPrompt(false);
        }
        setCurrentStep(2);
    };

    const handleDatesChange = (checkIn: Date | null, checkOut: Date | null, rate: number, n: number) => {
        setCheckInDate(checkIn);
        setCheckOutDate(checkOut);
        setNightlyRate(rate);
        setNights(n);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.agreedToTerms) {
            alert("Please agree to the Privacy Policy and Terms & Conditions");
            return;
        }
        if (!formData.aadhaarFile) {
            alert("Please upload a Valid ID Proof");
            return;
        }
        if (idProofError) {
            alert("Please upload a valid file size (Max 2MB)");
            return;
        }
        setCurrentStep(3);
    };

    const handleApplyCoupon = async () => {
        try {
            const result = await api.post("/coupons/validate", { code: couponCode });
            if (result && result.isActive) {
                setAppliedCoupon({
                    code: result.code,
                    discount: result.discountType === 'percent' ? `${result.discountValue}% off` : `₹${result.discountValue} off`,
                    description: result.description || '',
                    expires: '',
                    active: true
                });
            } else {
                alert("Invalid or expired coupon code");
            }
        } catch {
            // Fallback to local coupons if API fails
            const found = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase() && c.active);
            if (found) {
                setAppliedCoupon(found);
            } else {
                alert("Invalid or expired coupon code");
            }
        }
    };

    const handlePayment = async () => {
        if (!dbPropertyId) {
            setBookingError("Booking system loading, please wait...");
            return;
        }

        setIsSubmitting(true);
        setBookingError("");

        try {
            const subPropertyId = selectedRoom ? dbSubPropertyMap[selectedRoom.id] : undefined;

            const payload = {
                customerName: `${formData.title} ${formData.firstName} ${formData.lastName}`.trim(),
                customerPhone: formData.phone,
                customerEmail: formData.email,
                propertyId: dbPropertyId,
                subPropertyId: subPropertyId || null,
                numGuests: adults + kids,
                checkInDate: checkInDate?.toISOString().split("T")[0],
                checkOutDate: checkOutDate?.toISOString().split("T")[0],
                nightlyRate,
                basePrice: roomPrice,
                extraPersonCharge: extraCharges,
                gstAmount: taxesAndFees,
                totalAmount,
                advanceAmount: payNow,
                balanceAmount: payAtVenue,
                securityDeposit: parseInt((property.securityDeposit || '3000').replace(/,/g, '')),
                advancePaid: true,
                advanceMethod: "online",
                source: "website",
                couponCode: appliedCoupon?.code || null,
            };

            await api.post("/bookings/staycation", payload);
            router.push("/dashboard?source=staycation&status=success");
        } catch (err: any) {
            if (err?.message?.includes("409")) {
                setBookingError("This property is already booked for your dates. Please choose different dates.");
                setCurrentStep(1);
            } else {
                setBookingError(err?.message || "Booking failed. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCF9] pb-24">

            <main className={`mx-auto px-4 sm:px-6 pt-10 sm:pt-14 ${currentStep === 3 ? 'max-w-7xl' : 'max-w-[1100px]'}`}>
                {/* Steps */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="w-12 h-[1px] bg-border-medium" />
                        <h1 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-text-primary uppercase">Plan Your Stay</h1>
                        <div className="w-12 h-[1px] bg-border-medium" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-6 font-inter text-[10px] sm:text-sm max-w-2xl mx-auto bg-white py-3 sm:py-4 px-4 sm:px-6 rounded-full shadow-sm border border-border-light">
                        {[{ n: 1, label: "Select Room" }, { n: 2, label: "Personal Details" }, { n: 3, label: "Confirm & Pay" }].map((s, i) => (
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

                <div className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative ${currentStep === 3 ? 'hidden' : ''}`}>
                    {/* Left Column */}
                    <div className="flex-1 w-full max-w-[700px]">

                        {/* STEP 1: SELECT ROOM */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h2 className="font-inter text-sm font-semibold text-text-primary mb-4">Rooms for your search</h2>
                                {roomOptions.map((room: any) => (
                                    <div key={room.id} className="mb-6">
                                        <div className="inline-block px-4 py-1.5 mb-3 border border-antique-gold/30 rounded-full bg-antique-gold/5 text-[10px] font-inter uppercase tracking-widest text-dark-gold">
                                            {room.theme}
                                        </div>
                                        <div className="bg-white border border-border-light flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow">
                                            <div className="relative w-full sm:w-[280px] h-[200px] sm:h-auto shrink-0 bg-soft-gray border-b sm:border-b-0 sm:border-r border-border-light">
                                                <Image src={room.image} alt={room.name} fill className="object-cover" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md px-3 py-2 border-t border-border-light/50 flex flex-wrap gap-x-4 gap-y-1 text-xs font-inter text-text-secondary">
                                                    <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> {room.persons}</div>
                                                    <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> {room.details[0]}</div>
                                                </div>
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col justify-between min-h-[220px]">
                                                <div>
                                                    <h3 className="font-cinzel text-base tracking-wide text-text-primary uppercase mb-3">{room.name}</h3>
                                                    <p className="font-inter text-sm text-text-secondary mb-3 pr-2 leading-relaxed">{room.description}</p>
                                                    <ul className="space-y-1.5 mb-4">
                                                        <li className="flex items-start gap-2 text-xs font-inter text-text-secondary"><div className="w-1 h-1 rounded-full bg-antique-gold mt-1.5 shrink-0" />Inclusive of standard Wi-Fi</li>
                                                        <li className="flex items-start gap-2 text-xs font-inter text-text-secondary"><div className="w-1 h-1 rounded-full bg-antique-gold mt-1.5 shrink-0" /><span className="text-blue-600">Max {room.maxPersons} guests</span></li>
                                                    </ul>
                                                </div>
                                                <div className="mt-6 flex flex-col items-end border-t border-border-light pt-4 border-dashed">
                                                    <p className="text-[10px] font-inter text-text-muted uppercase tracking-wider mb-1">Exclusive Rate</p>
                                                    <div className="flex items-end gap-1 mb-3">
                                                        <span className="font-cinzel text-lg font-semibold text-text-primary">{formatPrice(room.price)}</span>
                                                        <span className="text-[10px] font-inter text-text-muted mb-1">/ Night</span>
                                                    </div>
                                                    <button onClick={() => handleRoomSelect(room)} className="px-8 py-2 border border-antique-gold text-antique-gold font-inter text-xs tracking-wider uppercase hover:bg-antique-gold hover:text-white transition-all w-32">
                                                        SELECT
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* STEP 2: PERSONAL DETAILS */}
                        {currentStep === 2 && showLoginPrompt && (
                            <>
                                {/* Background Form (Faded out) */}
                                <div className="bg-white border border-border-light p-6 sm:p-8 shadow-sm opacity-30 pointer-events-none">
                                    <h2 className="font-cinzel text-lg sm:text-xl text-text-primary uppercase mb-1">Primary Guest Details</h2>
                                    <p className="font-inter text-xs sm:text-sm text-text-secondary mb-8 pb-4 border-b border-border-light">Please fill all relevant fields to proceed further.</p>
                                </div>
                                
                                {/* ChatGPT-style Dark Auth Modal */}
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                                    <div className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 xs:p-10 relative transform transition-all">
                                        <button onClick={() => { setShowLoginPrompt(false); setEmailMode(false); setCurrentStep(1); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        
                                        {!emailMode && (
                                            <>
                                                <h2 className="font-inter text-[28px] font-semibold text-white mb-2 text-center tracking-tight">Log in or sign up</h2>
                                                <p className="font-inter text-[15px] text-[#C5C5D2] text-center mb-8 px-2 font-normal">
                                                    Sign in to securely manage your booking and confirm your luxury stay.
                                                </p>
                                                
                                                <div className="w-full space-y-3">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const redirectUri = `${window.location.origin}/auth/callback`;
                                                            const currentUrl = window.location.pathname + window.location.search;
                                                            const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/oauth2/authorize?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(currentUrl)}&identity_provider=Google`;
                                                            window.open(cognitoUrl, "Cognito Login", "width=500,height=600");
                                                        }}
                                                        className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors border border-transparent hover:border-gray-200"
                                                    >
                                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-[18px] h-[18px]" />
                                                        Continue with Google
                                                    </button>
                                                    
                                                    <div className="flex items-center gap-4 py-2 opacity-60">
                                                        <div className="h-[1px] bg-white/20 flex-1"></div>
                                                        <span className="text-white/80 font-inter text-xs uppercase tracking-wider">or</span>
                                                        <div className="h-[1px] bg-white/20 flex-1"></div>
                                                    </div>

                                                    <button 
                                                        onClick={() => setEmailMode("login")}
                                                        className="w-full bg-[#343541] outline outline-1 outline-[#565869] text-white hover:bg-[#40414F] flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors"
                                                    >
                                                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                        Continue with Email
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {emailMode === "login" && (
                                            <form onSubmit={handleGuestLogin} className="w-full animate-fade-in">
                                                <h2 className="font-inter text-2xl font-semibold text-white mb-6 text-center">Welcome Back</h2>
                                                
                                                <div className="space-y-4 mb-6">
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1.5 block">Email address</label>
                                                        <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="user@example.com" />
                                                    </div>
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1.5 block">Password</label>
                                                        <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="••••••••" />
                                                    </div>
                                                </div>
                                                
                                                {authError && <p className="text-red-400 text-xs mb-4 text-center">{authError}</p>}
                                                
                                                <button disabled={isAuthenticating} type="submit" className="w-full bg-white text-black hover:bg-gray-100 py-[12px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors mb-4 disabled:opacity-50">
                                                    {isAuthenticating ? "Logging in..." : "Continue"}
                                                </button>
                                                
                                                <p className="text-[#C5C5D2] text-sm text-center">Don't have an account? <button type="button" onClick={() => setEmailMode("register")} className="text-white hover:underline">Sign up</button></p>
                                                <button type="button" onClick={() => setEmailMode(false)} className="mx-auto block mt-4 text-white/50 text-xs hover:text-white transition-colors">Back to options</button>
                                            </form>
                                        )}

                                        {emailMode === "register" && (
                                            <form onSubmit={handleGuestRegister} className="w-full animate-fade-in">
                                                <h2 className="font-inter text-2xl font-semibold text-white mb-6 text-center">Create Account</h2>
                                                
                                                <div className="space-y-3 mb-6">
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1 block">Full Name</label>
                                                        <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-2.5 text-white focus:border-white focus:outline-none" placeholder="John Doe" />
                                                    </div>
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1 block">Email address</label>
                                                        <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-2.5 text-white focus:border-white focus:outline-none" placeholder="user@example.com" />
                                                    </div>
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1 block">Phone Number</label>
                                                        <input type="tel" required value={authPhone} onChange={e => setAuthPhone(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-2.5 text-white focus:border-white focus:outline-none" placeholder="9876543210" />
                                                    </div>
                                                    <div>
                                                        <label className="text-white/70 text-xs mb-1 block">Password</label>
                                                        <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-2.5 text-white focus:border-white focus:outline-none" placeholder="••••••••" />
                                                    </div>
                                                </div>
                                                
                                                {authError && <p className="text-red-400 text-xs mb-4 text-center">{authError}</p>}
                                                
                                                <button disabled={isAuthenticating} type="submit" className="w-full bg-[#10A37F] text-white hover:bg-[#0E906F] py-[12px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors mb-4 disabled:opacity-50">
                                                    {isAuthenticating ? "Creating..." : "Sign Up"}
                                                </button>
                                                
                                                <p className="text-[#C5C5D2] text-sm text-center">Already have an account? <button type="button" onClick={() => setEmailMode("login")} className="text-white hover:underline">Log in</button></p>
                                                <button type="button" onClick={() => setEmailMode(false)} className="mx-auto block mt-4 text-white/50 text-xs hover:text-white transition-colors">Back to options</button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {currentStep === 2 && !showLoginPrompt && (
                            <div className="bg-white border border-border-light p-6 sm:p-8 shadow-sm">
                                <h2 className="font-cinzel text-lg sm:text-xl text-text-primary uppercase mb-1">Primary Guest Details</h2>
                                <p className="font-inter text-xs sm:text-sm text-text-secondary mb-8 pb-4 border-b border-border-light">Please fill all relevant fields to proceed further.</p>

                                <form onSubmit={handleFormSubmit}>
                                    {/* Name */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                                        <div className="md:col-span-2 relative">
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Title*</label>
                                            <select value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold appearance-none">
                                                <option value="Mr">Mr.</option><option value="Mrs">Mrs.</option><option value="Ms">Ms.</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">First Name*</label>
                                            <input type="text" required placeholder="First Name" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Last Name*</label>
                                            <input type="text" required placeholder="Last Name" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Email*</label>
                                            <input type="email" required placeholder="Email" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Mobile*</label>
                                            <div className="flex items-center border-b border-border-medium focus-within:border-antique-gold transition-colors">
                                                <span className="text-sm text-text-primary font-inter px-1 shrink-0">+91</span>
                                                <input type="tel" required placeholder="Mobile Number" className="w-full bg-transparent border-0 rounded-none px-2 py-2 font-inter text-sm text-text-primary focus:ring-0 placeholder:text-text-muted" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* GST (optional) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <input type="text" placeholder="GST Number (Optional)" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} />
                                    </div>

                                    {/* Total Number of Guests */}
                                    <div className="mb-6 p-4 border border-border-light rounded-lg bg-soft-gray/30">
                                        <h4 className="font-inter text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Total Number of Guests</h4>
                                        <p className="font-inter text-[10px] text-text-muted mb-4">Base price includes up to {baseIncludedPersons} persons. Max {maxGuests} guests.</p>
                                        <div className="flex flex-wrap gap-6">
                                            <div className="flex items-center gap-3">
                                                <label className="font-inter text-xs text-text-secondary w-12">Adults</label>
                                                <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">−</button>
                                                <span className="font-inter text-sm text-text-primary w-4 text-center">{adults}</span>
                                                <button type="button" onClick={() => setAdults(Math.min(maxGuests - kids, adults + 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">+</button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="font-inter text-xs text-text-secondary w-16">Kids (5+)</label>
                                                <button type="button" onClick={() => setKids(Math.max(0, kids - 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">−</button>
                                                <span className="font-inter text-sm text-text-primary w-4 text-center">{kids}</span>
                                                <button type="button" onClick={() => setKids(Math.min(maxGuests - adults, kids + 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">+</button>
                                            </div>
                                        </div>
                                        {(extraAdults > 0 || kids > 0) && (
                                            <div className="mt-3 pt-3 border-t border-border-light text-[10px] font-inter text-text-muted space-y-1">
                                                {extraAdults > 0 && <p>Extra adults: {extraAdults} × ₹{property.pricing.extraAdult}/night = ₹{(extraAdultTotal).toLocaleString("en-IN")}/night</p>}
                                                {kids > 0 && <p>Kids: {kids} × ₹{kidsChargeNum.toLocaleString("en-IN")}/night = ₹{kidsTotal.toLocaleString("en-IN")}/night</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* ID Proof Upload */}
                                    <div className="mb-8">
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-2 block">Valid ID Proof Upload* (Aadhaar/DL/PAN)</label>
                                        <div className={`border border-dashed ${idProofError ? 'border-red-500 bg-red-50' : 'border-border-medium bg-soft-gray/20'} rounded-lg p-4 text-center hover:border-antique-gold/50 transition-colors cursor-pointer relative`}>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            setIdProofError("file size must be less than 2MB");
                                                            setFormData({ ...formData, aadhaarFile: null });
                                                        } else {
                                                            setIdProofError("");
                                                            setFormData({ ...formData, aadhaarFile: file });
                                                        }
                                                    } else {
                                                        setFormData({ ...formData, aadhaarFile: null });
                                                        setIdProofError("");
                                                    }
                                                }}
                                            />
                                            {formData.aadhaarFile ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    <span className="font-inter text-sm text-text-primary truncate max-w-[200px] sm:max-w-xs">{formData.aadhaarFile.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <svg className="w-8 h-8 text-border-medium mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                    <p className="font-inter text-xs text-text-muted">Click to upload or drag and drop</p>
                                                    <p className="font-inter text-[10px] text-text-muted mt-1">JPG, PNG, PDF (Max 2MB)</p>
                                                </>
                                            )}
                                        </div>
                                        {idProofError && <p className="text-red-500 text-[10px] font-inter mt-1.5">* {idProofError}</p>}
                                    </div>

                                    {/* Coupon Section */}
                                    <div className="mb-8 p-4 border border-border-light rounded-lg bg-soft-gray/20">
                                        <h4 className="font-inter text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Have a Coupon?</h4>
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-antique-gold">{appliedCoupon.code}</span>
                                                    <span className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{appliedCoupon.discount} applied</span>
                                                </div>
                                                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-red-400 text-xs font-inter hover:text-red-600">Remove</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex gap-2 mb-3">
                                                    <input type="text" placeholder="Enter coupon code" className="flex-1 bg-white border border-border-light rounded-lg px-3 py-2 text-sm font-inter text-text-primary outline-none focus:border-antique-gold uppercase tracking-wider" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                                                    <button type="button" onClick={handleApplyCoupon} className="bg-antique-gold text-white font-inter text-xs font-medium px-4 py-2 rounded-lg hover:bg-dark-gold transition-colors whitespace-nowrap">Apply</button>
                                                </div>
                                                {coupons.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-inter text-text-muted">Available coupons:</p>
                                                        {coupons.filter(c => c.active).map(c => (
                                                            <div key={c.code} className="flex items-center justify-between bg-white rounded-lg border border-border-light px-3 py-2">
                                                                <div>
                                                                    <span className="font-mono text-xs font-bold text-antique-gold">{c.code}</span>
                                                                    <span className="text-[10px] font-inter text-text-muted ml-2">{c.description}</span>
                                                                </div>
                                                                <button type="button" onClick={() => { setCouponCode(c.code); setAppliedCoupon(c); }} className="text-antique-gold text-[10px] font-inter font-medium hover:text-dark-gold">Apply</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Terms */}
                                    <div className="flex items-start gap-3 mb-8">
                                        <input type="checkbox" id="terms" className="mt-0.5 border-border-medium rounded-sm text-antique-gold focus:ring-antique-gold focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer" checked={formData.agreedToTerms} onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} />
                                        <label htmlFor="terms" className="font-inter text-xs text-text-secondary cursor-pointer leading-relaxed">
                                            I have read and agree to the <a href="#" className="text-antique-gold hover:underline">Privacy Policy</a> and <a href="#" className="text-antique-gold hover:underline">Terms & Conditions</a>.
                                        </label>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-border-light pt-6 mt-6">
                                        <button type="button" onClick={() => setCurrentStep(1)} className="font-inter text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary px-4 py-2">Back</button>
                                        <button type="submit" className="bg-[#2A2A2A] text-white px-8 py-3 text-xs font-inter uppercase tracking-widest hover:bg-black transition-colors">Proceed to Payment</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar — shown on steps 1 & 2 only */}
                    {currentStep <= 2 && (
                        <div className="flex-1 w-full max-w-[360px] sticky top-24 space-y-4 lg:ml-auto">
                            {/* Calendar in sidebar */}
                            {selectedRoom && (
                                <AvailabilityCalendar
                                    propertyId={dbPropertyId}
                                    weekdayPrice={selectedRoom.weekdayPrice}
                                    weekendPrice={selectedRoom.weekendPrice}
                                    primeDatePrice={selectedRoom.primeDatePrice}
                                    onDatesChange={handleDatesChange}
                                    initialCheckIn={checkInDate}
                                    initialCheckOut={checkOutDate}
                                    compact
                                />
                            )}

                            {/* Your Stay */}
                            <div className="bg-white border border-border-light shadow-sm">
                                <div className="p-5 border-b border-border-light">
                                    <h2 className="font-cinzel text-base tracking-widest text-text-primary uppercase">Your Stay</h2>
                                </div>

                                {selectedRoom ? (
                                    <div className="p-5 border-b border-border-light">
                                        <p className="font-inter text-xs uppercase tracking-widest text-text-muted mb-2">{selectedRoom.type}</p>
                                        <p className="font-inter text-xs text-text-primary leading-relaxed pb-3 border-b border-border-light mb-3 italic">{selectedRoom.name}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="font-inter text-xl text-text-primary">{formatPrice(nightlyRate)}</span>
                                            <span className="font-inter text-[10px] text-text-muted">/ Night × {nights}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 border-b border-border-light">
                                        <p className="font-inter text-xs text-text-muted italic">Not selected</p>
                                    </div>
                                )}

                                <div className="p-5 border-b border-border-light space-y-3 font-inter text-sm text-text-primary">
                                    <div className="flex justify-between items-center"><span>Room Price</span><span>{formatPrice(roomPrice)}</span></div>
                                    {extraCharges > 0 && <div className="flex justify-between items-center text-text-secondary text-xs"><span>Extra Guests</span><span>{formatPrice(extraCharges)}</span></div>}
                                    {discountAmount > 0 && <div className="flex justify-between items-center text-green-600 text-xs"><span>Discount ({appliedCoupon?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
                                    <div className="flex justify-between items-center"><span>Taxes ({property.gstPercent}% GST)</span><span>{formatPrice(taxesAndFees)}</span></div>
                                </div>

                                <div className="p-5 bg-soft-gray/30">
                                    <div className="flex justify-between items-center font-inter">
                                        <span className="text-sm font-semibold text-text-primary">Total Amount</span>
                                        <span className="text-xl font-medium text-text-primary">{formatPrice(totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cancellation Policy — sidebar */}
                            {currentStep === 2 && (
                                <div className="bg-white border border-border-light shadow-sm">
                                    <div className="p-5 border-b border-border-light">
                                        <h2 className="font-cinzel text-xs font-semibold tracking-wider text-text-primary uppercase">Terms & Conditions</h2>
                                    </div>
                                    <div className="p-5">
                                        <p className="font-inter text-[11px] font-semibold text-text-primary mb-1">No Cancellation</p>
                                        <p className="font-inter text-[10px] text-text-secondary leading-relaxed">This booking is non-refundable — no cancellations, amendments, or date changes are permitted once confirmed.</p>
                                        <div className="mt-3 pt-3 border-t border-border-light">
                                            <p className="font-inter text-[11px] font-semibold text-text-primary mb-1">Payment Policy</p>
                                            <p className="font-inter text-[10px] text-text-secondary leading-relaxed">80% payable online at booking · 20% payable at the venue</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* STEP 3: CONFIRM & PAY — 3 equal columns, full width */}
                {currentStep === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* CARD 1: Booking Summary + Guest Details */}
                        <div className="bg-white border border-border-light p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <h2 className="font-cinzel text-lg text-text-primary uppercase">Booking Summary</h2>
                                    <p className="font-inter text-xs text-text-muted">Please review your reservation details</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6 pb-6 border-b border-border-light">
                                <div className="bg-soft-gray/50 rounded-lg p-3 text-center border border-border-light">
                                    <p className="font-inter text-[9px] text-text-muted uppercase tracking-wider mb-1">Check-in</p>
                                    <p className="font-inter text-sm text-text-primary font-medium">{checkInDate ? formatDateShort(checkInDate) : "—"}</p>
                                    <p className="font-inter text-[10px] text-text-muted mt-0.5">{property.checkIn}</p>
                                </div>
                                <div className="bg-soft-gray/50 rounded-lg p-3 text-center border border-border-light">
                                    <p className="font-inter text-[9px] text-text-muted uppercase tracking-wider mb-1">Check-out</p>
                                    <p className="font-inter text-sm text-text-primary font-medium">{checkOutDate ? formatDateShort(checkOutDate) : "—"}</p>
                                    <p className="font-inter text-[10px] text-text-muted mt-0.5">{property.checkOut}</p>
                                </div>
                                <div className="bg-soft-gray/50 rounded-lg p-3 text-center border border-border-light">
                                    <p className="font-inter text-[9px] text-text-muted uppercase tracking-wider mb-1">Duration</p>
                                    <p className="font-inter text-sm text-text-primary font-medium">{nights} Night{nights !== 1 ? "s" : ""}</p>
                                </div>
                                <div className="bg-soft-gray/50 rounded-lg p-3 text-center border border-border-light">
                                    <p className="font-inter text-[9px] text-text-muted uppercase tracking-wider mb-1">Total Guests</p>
                                    <p className="font-inter text-sm text-text-primary font-medium">{totalGuests}</p>
                                    <p className="font-inter text-[10px] text-text-muted mt-0.5">{adults} Adult{adults > 1 ? "s" : ""}{kids > 0 ? ` · ${kids} Kid${kids > 1 ? "s" : ""}` : ""}</p>
                                </div>
                            </div>

                            {selectedRoom && (
                                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border-light">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-soft-gray shrink-0 relative">
                                        <Image src={property.images[0]} alt={selectedRoom.name} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-inter text-[9px] uppercase tracking-widest text-antique-gold mb-0.5">{selectedRoom.type}</p>
                                        <h3 className="font-cinzel text-sm font-semibold text-text-primary mb-1">{selectedRoom.name}</h3>
                                        <p className="font-inter text-xs text-text-muted">{formatPrice(nightlyRate)} × {nights} night{nights !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="font-inter text-xs uppercase tracking-widest text-text-muted mb-3">Guest Details</h3>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                    <div><p className="font-inter text-[10px] text-text-muted">Name</p><p className="font-inter text-sm text-text-primary">{formData.title} {formData.firstName} {formData.lastName}</p></div>
                                    <div><p className="font-inter text-[10px] text-text-muted">Contact</p><p className="font-inter text-sm text-text-primary">+91 {formData.phone}</p></div>
                                    <div><p className="font-inter text-[10px] text-text-muted">Email</p><p className="font-inter text-sm text-text-primary">{formData.email}</p></div>
                                    {formData.gst && <div><p className="font-inter text-[10px] text-text-muted">GST No.</p><p className="font-inter text-sm text-text-primary">{formData.gst}</p></div>}
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: Cancellation & Booking Policy */}
                        <div className="bg-white border border-border-light p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                                <div>
                                    <h2 className="font-cinzel text-lg text-text-primary uppercase">Booking Policy</h2>
                                    <p className="font-inter text-xs text-text-muted">Cancellation & refund terms</p>
                                </div>
                            </div>
                            <ul className="space-y-2.5 text-xs font-inter text-text-secondary leading-relaxed mb-5">
                                <li className="flex items-start gap-2">
                                    <span className="text-antique-gold mt-0.5 shrink-0">•</span>
                                    <span>This booking is <strong className="text-text-primary">non-refundable</strong> — no cancellations, amendments, or date changes are permitted once confirmed.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-antique-gold mt-0.5 shrink-0">•</span>
                                    <span>By proceeding with payment, you acknowledge and accept these terms in full.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-antique-gold mt-0.5 shrink-0">•</span>
                                    <span>Security deposit of ₹{property.securityDeposit} is applicable and will be refunded per the property&apos;s refund timeline.</span>
                                </li>
                            </ul>
                        </div>

                        {/* CARD 3: Pricing + Pay Button */}
                        <div className="bg-white border border-border-light p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <div>
                                    <h2 className="font-cinzel text-lg text-text-primary uppercase">Payment Details</h2>
                                    <p className="font-inter text-xs text-text-muted">Pricing breakdown & final amount</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 font-inter text-sm mb-5">
                                <div className="flex justify-between text-text-secondary">
                                    <span>Room ({nights} night{nights !== 1 ? "s" : ""})</span>
                                    <span className="text-text-primary font-medium">{formatPrice(roomPrice)}</span>
                                </div>
                                {extraCharges > 0 && (
                                    <div className="flex justify-between text-text-secondary text-xs">
                                        <span>Extra Guests Charges</span>
                                        <span className="text-text-primary">{formatPrice(extraCharges)}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600 text-xs">
                                        <span>Coupon ({appliedCoupon?.code})</span>
                                        <span>-{formatPrice(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-text-secondary text-xs">
                                    <span>Taxes ({property.gstPercent}% GST)</span>
                                    <span className="text-text-primary">{formatPrice(taxesAndFees)}</span>
                                </div>
                                <div className="flex justify-between text-text-secondary text-xs">
                                    <span>Refundable Security Deposit <span className="text-[10px] text-text-muted">(due at check-in)</span></span>
                                    <span className="text-text-primary">₹{parseInt((property.securityDeposit || '3000').replace(/,/g, '')).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-4 border-t border-dashed border-border-medium mb-2">
                                <span className="font-inter text-xs text-text-muted uppercase tracking-wider">Pay Now (80%)</span>
                                <span className="font-cinzel text-xl font-semibold text-text-primary">{formatPrice(payNow)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-5">
                                <span className="font-inter text-xs text-text-muted uppercase tracking-wider">Due at Venue (20%)</span>
                                <span className="font-cinzel text-xl font-semibold text-text-secondary">{formatPrice(payAtVenue)}</span>
                            </div>

                            <button onClick={handlePayment} disabled={isSubmitting || !dbPropertyId} className="w-full bg-gradient-to-r from-antique-gold to-dark-gold text-white py-3.5 text-xs font-inter uppercase tracking-widest hover:shadow-lg hover:shadow-antique-gold/20 transition-all rounded-lg disabled:opacity-60">
                                {isSubmitting ? "Processing..." : (!dbPropertyId ? "Loading System..." : "Make Payment")}
                            </button>
                            {bookingError && (
                                <p className="text-red-500 text-xs font-inter mt-2 text-center">{bookingError}</p>
                            )}
                            <button type="button" onClick={() => setCurrentStep(2)} className="w-full mt-3 font-inter text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary py-2 text-center">
                                ← Edit Details
                            </button>
                            <div className="pt-4 mt-4 border-t border-border-light">
                                <p className="font-inter text-[11px] text-text-muted flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-antique-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    A copy of the invoice will be sent to your registered email &amp; phone number upon confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
