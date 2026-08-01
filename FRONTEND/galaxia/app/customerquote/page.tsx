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
import DateSelectionBar from "../components/DateSelectionBar";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import { useBookedDates } from "../hooks/useBookedDates";

// ── Property slug map ──
const SLUG_MAP: Record<string, string> = {
    "Hill View": "hill-view", "Mount View": "mount-view",
    "Heavenly Villa": "heavenly-villa", "La Paraiso": "la-paraiso",
    "Amstel Nest": "amstel-nest", "Ambrose": "ambrose",
};

const resolvePropertySlug = (propName: string, quantities?: Record<string, number>) => {
    const activeVillas = Object.keys(quantities || {}).filter(k => (quantities || {})[k] > 0);
    const firstName = activeVillas[0] || propName || "";
    const combined = `${propName} ${firstName}`.toLowerCase();

    if (combined.includes("amstel") || combined.includes("standard cottage") || combined.includes("family cottage")) {
        const isFam = combined.includes("family");
        return {
            slug: "amstel-nest",
            subSlug: isFam ? "family-cottage" : "standard-cottage",
            isFamily: isFam,
        };
    }
    if (combined.includes("ambrose") || ["take-1", "alta", "santorini", "bamboosa", "cypress"].some(v => combined.includes(v))) {
        const sub = ["take-1", "alta", "santorini", "bamboosa", "cypress"].find(v => combined.includes(v));
        return { slug: "ambrose", subSlug: sub };
    }
    if (combined.includes("hill view") || combined.includes("hill-view")) return { slug: "hill-view" };
    if (combined.includes("mount view") || combined.includes("mount-view")) return { slug: "mount-view" };
    if (combined.includes("heavenly")) return { slug: "heavenly-villa" };
    if (combined.includes("la paraiso") || combined.includes("paraiso")) return { slug: "la-paraiso" };

    return { slug: SLUG_MAP[propName] || "amstel-nest" };
};

const toLocalDateStr = (d: Date | null) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
    const [livePricing, setLivePricing] = useState<Record<string, any>>({});

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
    const [regularCount, setRegularCount] = useState(0);
    const [jainCount, setJainCount] = useState(0);
    const [propertyName, setPropertyName] = useState("");
    const [villaQuantities, setVillaQuantities] = useState<Record<string, number>>({});

    // Availability & Property ID
    const [availData, setAvailData] = useState<any>(null);
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [dbSubPropertyMap, setDbSubPropertyMap] = useState<Record<string, number>>({});
    const [dbSubPropertyUnitsMap, setDbSubPropertyUnitsMap] = useState<Record<number, number>>({});

    const subPropertyId = (() => {
        const activeVillas = Object.entries(villaQuantities).filter(([, q]) => q > 0);
        if (activeVillas.length === 1) {
            const villaName = activeVillas[0][0];
            return dbSubPropertyMap[villaName.toUpperCase()] || null;
        }
        return null;
    })();

    const activeSubPropertyUnits = subPropertyId ? dbSubPropertyUnitsMap[subPropertyId] : undefined;

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
                setRegularCount(d.regularCount !== undefined ? d.regularCount : (d.foodType === "Jain" ? 0 : ((d.adults || 2) + (d.kids || 0))));
                setJainCount(d.jainCount !== undefined ? d.jainCount : (d.foodType === "Jain" ? ((d.adults || 2) + (d.kids || 0)) : 0));
                if (d.villaQuantities) setVillaQuantities(d.villaQuantities);
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

    // ── Fetch availability (used for metadata/pricing) ──
    useEffect(() => {
        if (!propertyName) return;
        const { slug } = resolvePropertySlug(propertyName, villaQuantities);
        if (slug) {
            (async () => {
                try {
                    const data = await api.get(`/properties/${slug}/availability`);
                    setAvailData(data);
                } catch { }
            })();
        }
    }, [propertyName, villaQuantities]);

    // ── Fetch live pricing ──
    useEffect(() => {
        const slugs = ["hill-view", "mount-view", "heavenly-villa", "la-paraiso", "amstel-nest", "ambrose"];
        const result: Record<string, any> = {};
        Promise.all(slugs.map(async (slug) => {
            try {
                const data = await api.get(`/properties/${slug}/availability`);
                if (!data?.pricing) return;
                const mapName: Record<string, string> = {
                    "hill-view": "Hill View", "mount-view": "Mount View",
                    "heavenly-villa": "Heavenly Villa", "la-paraiso": "La Paraiso",
                    "amstel-nest": "Amstel Nest", "ambrose": "Ambrose",
                };
                const propName = mapName[slug] || slug;
                const buildEntry = (p: any) => {
                    if (!p?.weekday && !p?.weekend) return null;
                    const wd = p.weekday; const we = p.weekend; const sa = p.saturday;
                    return {
                        weekday: wd ? parseInt(wd.price) : (we ? parseInt(we.price) : 0),
                        weekend: we ? parseInt(we.price) : (wd ? parseInt(wd.price) : 0),
                        saturday: sa ? parseInt(sa.price) : (we ? parseInt(we.price) : (wd ? parseInt(wd.price) : 0)),
                        extraAdult: wd?.extraAdult || 1000, kidsCharge: wd?.kidsCharge || 500,
                        baseGuests: wd?.personsLabel ? parseInt(wd.personsLabel) || 2 : 2,
                    };
                };
                const parentEntry = buildEntry(data.pricing);
                if (parentEntry) result[propName] = parentEntry;
                if (data.subProperties && data.subPropertyPricing) {
                    for (const sp of data.subProperties) {
                        const spP = data.subPropertyPricing[sp.id];
                        if (spP) {
                            const spEntry = buildEntry(spP);
                            if (spEntry) result[`${propName}/${sp.name.toUpperCase()}`] = spEntry;
                        }
                    }
                }
            } catch { }
        })).then(() => setLivePricing(result));
    }, []);

    // Fetch DB property ID on propertyName load
    useEffect(() => {
        if (!propertyName) return;
        (async () => {
            try {
                const props = await api.get("/properties");
                const { slug } = resolvePropertySlug(propertyName, villaQuantities);
                const dbProp = props.find((p: any) => p.slug === slug);
                if (dbProp) {
                    setDbPropertyId(dbProp.id);
                    if (dbProp.subProperties) {
                        const map: Record<string, number> = {};
                        const unitsMap: Record<number, number> = {};
                        for (const sp of dbProp.subProperties) {
                            map[sp.name.toUpperCase()] = sp.id;
                            map[sp.slug || sp.name.toLowerCase().replace(/\s+/g, "-")] = sp.id;
                            unitsMap[sp.id] = sp.unitCount || 1;
                        }
                        setDbSubPropertyMap(map);
                        setDbSubPropertyUnitsMap(unitsMap);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch property data:", err);
            }
        })();
    }, [propertyName, villaQuantities]);

    // Fetch booked dates for the current property/sub-property (shared with DateSelectionBar)
    const bookedDatesForPicker = useBookedDates(dbPropertyId, subPropertyId);

    // ── Check date conflict when dates change ──
    useEffect(() => {
        if (!checkIn || !checkOut) { setDateConflict(false); return; }
        let conflict = false;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (bookedDatesForPicker.has(key)) { conflict = true; break; }
        }
        setDateConflict(conflict);
    }, [checkIn, checkOut, bookedDatesForPicker]);

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

                let resolvedProperty = propertyName;
                let resolvedVilla = villaName;
                if (propertyName.includes(" + ")) {
                    const nameToResolve = villaName || propertyName;
                    if (nameToResolve === "Standard Cottage" || nameToResolve === "Family Cottage") {
                        resolvedProperty = "Amstel Nest";
                        resolvedVilla = nameToResolve;
                    } else if (["TAKE-1", "ALTA", "SANTORINI", "BAMBOOSA", "CYPRESS"].includes(nameToResolve.toUpperCase())) {
                        resolvedProperty = "Ambrose";
                        resolvedVilla = nameToResolve;
                    } else {
                        resolvedProperty = nameToResolve;
                        resolvedVilla = undefined;
                    }
                }

                // Look up in livePricing first
                let liveKey = "";
                if (resolvedProperty.includes("Ambrose") && resolvedVilla) {
                    liveKey = `Ambrose/${resolvedVilla.toUpperCase()}`;
                } else if (resolvedProperty.includes("Amstel") && resolvedVilla) {
                    liveKey = resolvedVilla.toLowerCase().includes("family")
                        ? "Amstel Nest/FAMILY COTTAGE" : "Amstel Nest/STANDARD COTTAGE";
                } else {
                    for (const k of Object.keys(livePricing)) {
                        if (resolvedProperty.includes(k)) { liveKey = k; break; }
                    }
                }

                let lp = livePricing[liveKey];
                if (!lp) {
                    const upper = liveKey.toUpperCase();
                    for (const [k, v] of Object.entries(livePricing)) {
                        if (k.toUpperCase() === upper) { lp = v; break; }
                    }
                }
                if (!lp && (resolvedProperty.includes("Amstel") || resolvedProperty.includes("Ambrose"))) {
                    lp = livePricing[resolvedProperty.includes("Amstel") ? "Amstel Nest" : "Ambrose"];
                }

                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const is14Aug = dateStr.endsWith("08-14");
                const is15Aug = dateStr.endsWith("08-15");
                const isFamily = (resolvedVilla || "").toLowerCase().includes("family");

                if (is14Aug || is15Aug) {
                    const vName = (resolvedVilla || "").toUpperCase();
                    if (resolvedProperty.includes("Amstel")) {
                        basePrice = is14Aug ? (isFamily ? 11000 : 7950) : (isFamily ? 13500 : 8500);
                        extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = isFamily ? 4 : 2;
                    } else if (resolvedProperty.includes("Ambrose")) {
                        if (vName.includes("BAMBOOSA")) {
                            basePrice = is14Aug ? 12500 : 14000;
                            extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 4;
                        } else if (vName.includes("CYPRESS")) {
                            basePrice = 7500;
                            extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 2;
                        } else {
                            basePrice = is14Aug ? 7500 : 9500;
                            extraAdultPrice = 2000; kidsPrice = 1000; baseGuests = 2;
                        }
                    } else if (resolvedProperty.includes("Hill View")) {
                        basePrice = 4950; extraAdultPrice = 600; kidsPrice = 400; baseGuests = 2;
                    } else if (resolvedProperty.includes("Mount View")) {
                        basePrice = 5950; extraAdultPrice = 800; kidsPrice = 500; baseGuests = 2;
                    } else if (resolvedProperty.includes("Heavenly")) {
                        basePrice = 5950; extraAdultPrice = 800; kidsPrice = 500; baseGuests = 2;
                    } else if (resolvedProperty.includes("La Paraiso")) {
                        basePrice = is14Aug ? 8500 : 9500; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = 4;
                    }
                } else if (lp) {
                    basePrice = isSat ? lp.saturday : (day === 0 || day === 5) ? lp.weekend : lp.weekday;
                    extraAdultPrice = lp.extraAdult; kidsPrice = lp.kidsCharge; baseGuests = lp.baseGuests;
                } else {
                    // Fallback
                    if (resolvedProperty.includes("Hill View")) { basePrice = isWe ? 3950 : 2500; extraAdultPrice = 600; kidsPrice = 400; }
                    else if (resolvedProperty.includes("Mount View")) { basePrice = isWe ? 4950 : 3500; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (resolvedProperty.includes("Heavenly")) { basePrice = isWe ? 4950 : 3950; extraAdultPrice = 800; kidsPrice = 500; }
                    else if (resolvedProperty.includes("La Paraiso")) { basePrice = isWe ? 7500 : 4960; extraAdultPrice = 1200; kidsPrice = 800; baseGuests = isWe ? 4 : 2; }
                    else if (resolvedProperty.includes("Amstel")) {
                        if (isFamily) { basePrice = isSat ? 12000 : (day === 0 || day === 5) ? 10000 : 9000; baseGuests = 4; }
                        else { basePrice = isSat ? 6950 : (day === 0 || day === 5) ? 5950 : 4950; baseGuests = 2; }
                        extraAdultPrice = 2000; kidsPrice = 1000;
                    }
                    else if (resolvedProperty.includes("Ambrose")) { basePrice = isWe ? 6500 : 5500; extraAdultPrice = 2000; kidsPrice = 1000; }
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

        let specialDiscount = 0;
        if (checkIn && checkOut && nights > 0) {
            const totalGuests = adults + kids;
            const pSlug = propertyName.toLowerCase();
            if (pSlug.includes("la paraiso") || pSlug.includes("la-paraiso")) {
                const extraAdultCharge = 1200;
                const kidsChargeNum = 800;
                for (let i = 0; i < nights; i++) {
                    const d = new Date(checkIn);
                    d.setDate(checkIn.getDate() + i);
                    const day = d.getDay();
                    const isWeekend = day === 0 || day === 5 || day === 6;
                    if (isWeekend) {
                        if (totalGuests >= 3) {
                            let extraAdultsCount = 0;
                            let extraKidsCount = 0;
                            for (let slot = 3; slot <= Math.min(4, totalGuests); slot++) {
                                if (slot <= adults) {
                                    extraAdultsCount++;
                                } else {
                                    extraKidsCount++;
                                }
                            }
                            specialDiscount += (extraAdultsCount * extraAdultCharge) + (extraKidsCount * kidsChargeNum);
                        }
                    }
                }
            } else if (pSlug.includes("ambrose")) {
                const checkAmbroseDiscount = (vName: string, qty: number) => {
                    const sSlug = vName.toLowerCase();
                    const isAmbroseVilla = sSlug === "take-1" || sSlug === "alta" || sSlug === "santorini" || sSlug === "take 1";
                    if (isAmbroseVilla) {
                        let villaDiscount = 0;
                        for (let i = 0; i < nights; i++) {
                            const d = new Date(checkIn);
                            d.setDate(checkIn.getDate() + i);
                            const day = d.getDay();
                            const isSaturday = day === 6;
                            if (isSaturday && totalGuests === 4) {
                                villaDiscount += 500 * qty;
                            }
                        }
                        return villaDiscount;
                    }
                    return 0;
                };

                const hasVillas = Object.values(villaQuantities).some(q => q > 0);
                if (hasVillas) {
                    for (const [vName, qty] of Object.entries(villaQuantities)) {
                        if (qty <= 0) continue;
                        specialDiscount += checkAmbroseDiscount(vName, qty);
                    }
                } else if (quoteData?.villaName) {
                    specialDiscount += checkAmbroseDiscount(quoteData.villaName, 1);
                } else if (quoteData?.data?.villaName) {
                    specialDiscount += checkAmbroseDiscount(quoteData.data.villaName, 1);
                }
            }
        }

        const petCharges = pets * 600;
        const subtotal = roomTotal + extraAdultTotal + extraKidsTotal + petCharges;
        const gstBase = Math.max(0, subtotal - specialDiscount);
        const gst = Math.round(gstBase * 0.05);
        let total = Math.round(subtotal - specialDiscount) + gst + (decoration ? 1200 : 0);
        total = Math.round(total / 10) * 10;
        const advance = Math.round(total * 0.8);

        return {
            nights, totalUnits, roomTotal: Math.round(roomTotal), gst,
            extraAdultCharge: Math.round(extraAdultTotal), extraKidsCharge: Math.round(extraKidsTotal),
            decorationCharge: decoration ? 1200 : 0, petCharge: petCharges,
            specialDiscount: Math.round(specialDiscount),
            totalAmount: total, advanceAmount: advance, balanceAmount: total - advance,
        };
    }, [checkIn, checkOut, propertyName, adults, kids, pets, decoration, villaQuantities, availData, livePricing]);

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
            const isAmstelOrAmbrose = propertyName.includes("Amstel") || propertyName.includes("Ambrose");
            if (isAmstelOrAmbrose) {
                if (regularCount > 0) {
                    addons.push({ name: 'Food Preference', foodType: 'Regular', count: regularCount });
                }
                if (jainCount > 0) {
                    addons.push({ name: 'Food Preference', foodType: 'Jain', count: jainCount });
                }
            }

            const totalCottages = Object.values(villaQuantities).reduce((s, q) => s + q, 0) || 1;

            const bookingPayload = {
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
                source: "quotation",
                couponCode: couponData?.code || null,
                addons: addons.length > 0 ? addons : null,
            };

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
                    bookingPayload, // NEW: Stored by backend for webhook safety-net
                });
            } catch (payErr: any) {
                if (payErr?.message === "Payment cancelled by user") { setIsSubmitting(false); return; }
                throw payErr;
            }

            const token = localStorage.getItem("galaxia_token");
            const payload = {
                ...bookingPayload,
                advanceMethod: `Razorpay: ${paymentResult.razorpay_payment_id}`,
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

                        {/* Date Picker Bar & Calendar */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-[#C4A265] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                                <CalendarDays size={14} /> Select Dates
                            </h2>
                            <DateSelectionBar
                                checkIn={checkIn ? toLocalDateStr(checkIn) : undefined}
                                checkOut={checkOut ? toLocalDateStr(checkOut) : undefined}
                                disabledDates={bookedDatesForPicker.size > 0 ? bookedDatesForPicker : undefined}
                                onDatesChange={(ci, co) => {
                                    setCheckIn(new Date(ci + "T00:00:00"));
                                    setCheckOut(new Date(co + "T00:00:00"));
                                }}
                                onCheckoutCleared={() => {
                                    setCheckOut(null);
                                }}
                            />
                            {(() => {
                                const { slug, isFamily } = resolvePropertySlug(propertyName, villaQuantities);
                                const isAmstel = slug === "amstel-nest";

                                const spPricing = (subPropertyId && availData?.subPropertyPricing) ? availData.subPropertyPricing[subPropertyId] : null;

                                let wdPrice = spPricing?.weekday?.price || availData?.pricing?.weekday?.price;
                                let wePrice = spPricing?.weekend?.price || availData?.pricing?.weekend?.price;
                                let saPrice = spPricing?.saturday?.price || availData?.pricing?.saturday?.price;
                                let dateOverrides = (spPricing?.dateOverrides && Object.keys(spPricing.dateOverrides).length > 0) ? spPricing.dateOverrides : (availData?.pricing?.dateOverrides || {});

                                if (isAmstel) {
                                    if (!wdPrice) wdPrice = isFamily ? "9,000" : "4,950";
                                    if (!wePrice) wePrice = isFamily ? "10,000" : "5,950";
                                    if (!saPrice) saPrice = isFamily ? "12,000" : "6,950";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) {
                                        dateOverrides = isFamily ? { "2026-08-14": 11000, "2026-08-15": 13500 } : { "2026-08-14": 7950, "2026-08-15": 8500 };
                                    }
                                } else if (slug === "hill-view") {
                                    if (!wdPrice) wdPrice = "2,500"; if (!wePrice) wePrice = "3,950";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) dateOverrides = { "2026-08-14": 4950, "2026-08-15": 4950 };
                                } else if (slug === "mount-view") {
                                    if (!wdPrice) wdPrice = "3,500"; if (!wePrice) wePrice = "4,950";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) dateOverrides = { "2026-08-14": 5950, "2026-08-15": 5950 };
                                } else if (slug === "heavenly-villa") {
                                    if (!wdPrice) wdPrice = "3,950"; if (!wePrice) wePrice = "4,950";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) dateOverrides = { "2026-08-14": 5950, "2026-08-15": 5950 };
                                } else if (slug === "la-paraiso") {
                                    if (!wdPrice) wdPrice = "4,960"; if (!wePrice) wePrice = "7,500"; if (!saPrice) saPrice = "8,500";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) dateOverrides = { "2026-08-14": 8500, "2026-08-15": 9500 };
                                } else if (slug === "ambrose") {
                                    if (!wdPrice) wdPrice = "5,500"; if (!wePrice) wePrice = "6,500";
                                    if (!dateOverrides || Object.keys(dateOverrides).length === 0) {
                                        const activeV = Object.keys(villaQuantities).find(k => villaQuantities[k] > 0)?.toLowerCase() || "";
                                        if (activeV.includes("bamboosa")) dateOverrides = { "2026-08-14": 12500, "2026-08-15": 14000 };
                                        else if (activeV.includes("cypress")) dateOverrides = { "2026-08-14": 7500, "2026-08-15": 7500 };
                                        else dateOverrides = { "2026-08-14": 7500, "2026-08-15": 9500 };
                                    }
                                }

                                return (
                                    <AvailabilityCalendar
                                        propertyId={dbPropertyId}
                                        propertySlug={slug}
                                        subPropertyId={subPropertyId}
                                        weekdayPrice={wdPrice}
                                        weekendPrice={wePrice}
                                        saturdayPrice={saPrice}
                                        dateOverrides={dateOverrides}
                                        primeDatePrice={availData?.pricing?.primeDates || ""}
                                        initialCheckIn={checkIn}
                                        initialCheckOut={checkOut}
                                        compact
                                        totalUnits={activeSubPropertyUnits}
                                    />
                                );
                            })()}
                            {checkIn && checkOut && (
                                <div className="flex items-center justify-between bg-white border border-[#e8e5dd] rounded-xl px-4 py-3 shadow-sm">
                                    <div className="text-xs"><span className="text-[#555]">Check-in:</span> <strong className="text-[#1a1a2e]">{fmtDateStr(checkIn)}</strong></div>
                                    <div className="text-xs text-[#C4A265] font-bold">{nights} night{nights > 1 ? 's' : ''}</div>
                                    <div className="text-xs"><span className="text-[#555]">Check-out:</span> <strong className="text-[#1a1a2e]">{fmtDateStr(checkOut)}</strong></div>
                                </div>
                            )}
                            {dateConflict && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
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
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <GuestCounter label="Regular Veg Meals" value={regularCount} onChange={setRegularCount} min={0} max={30} />
                                    <GuestCounter label="Jain Veg Meals" value={jainCount} onChange={setJainCount} min={0} max={30} />
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
                                        {pricing.specialDiscount > 0 && <div className="flex justify-between text-[#16a34a] font-semibold"><span className="text-[#16a34a]">Discount</span><span>-{fmtCurrency(pricing.specialDiscount)}</span></div>}
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
