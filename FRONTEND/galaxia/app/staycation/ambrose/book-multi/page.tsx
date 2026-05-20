"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { properties } from "../../../data/properties";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import DateSelectionBar from "../../../components/DateSelectionBar";
import { api } from "../../../../lib/api";
import { initiateRazorpayPayment } from "../../../../lib/razorpay";
import PhoneAuthModal from "../../../components/PhoneAuthModal";
import { useBookedDates } from "../../../hooks/useBookedDates";

interface CartItem {
    villaId: string;
    villaName: string;
    theme: string;
    weekdayPrice: string;
    weekendPrice: string;
    saturdayPrice?: string;
    personsLabel?: string;
    maxPersons: number;
    maxAdults?: number;
    maxKids?: number;
    property?: string; // "amstel-nest" | undefined (Ambrose default)
    unitCount?: number; // Amstel Nest: how many cottages
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookMultiPage() {
    const router = useRouter();
    const ambrose = properties["ambrose"];
    const amstelNest = properties["amstel-nest"];

    // Data-driven guest limits lookup (handles old cart items without maxAdults/maxKids)
    const guestLimits: Record<string, { maxAdults: number; maxKids: number }> = {};
    ambrose.subProperties?.forEach(sp => {
        guestLimits[sp.id] = { maxAdults: sp.maxAdults || ambrose.maxAdults || 6, maxKids: sp.maxKids ?? ambrose.maxKids ?? 2 };
    });
    amstelNest.subProperties?.forEach(sp => {
        guestLimits[sp.id] = { maxAdults: sp.maxAdults || amstelNest.maxAdults || 3, maxKids: sp.maxKids ?? amstelNest.maxKids ?? 1 };
    });
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
    const [petsPerVilla, setPetsPerVilla] = useState<Record<string, number>>({});
    const PET_CHARGE = 600;

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        agreedToTerms: false,
        agreedToMenu: false,
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
    const [holdSessionIds, setHoldSessionIds] = useState<string[]>([]);

    // Auth
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authError, setAuthError] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [emailMode, setEmailMode] = useState<false | "login" | "register">(false);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);

    // Coupon (API-based — same as BookingClient)
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    // Celebration Add-on + Food Preference
    const [celebrationAddon, setCelebrationAddon] = useState(false);
    const [celebrationCakeMsg, setCelebrationCakeMsg] = useState('');
    const [celebrationOccasion, setCelebrationOccasion] = useState('Birthday');
    const CELEBRATION_ADDON_PRICE = 1200;
    const [foodType, setFoodType] = useState<'Regular' | 'Jain'>('Regular');
    const [celebrationPreviewOpen, setCelebrationPreviewOpen] = useState(false);

    // Site images from admin panel (for celebration thumbnails)
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    // Celebration add-on image: resolve from the first cart item's property/villa
    const celebrationImageUrl = (() => {
        // Try each cart item's specific celebration image first
        for (const item of cart) {
            const prefix = item.property === "amstel-nest" ? "amstel-nest" : "ambrose";
            const specific = (siteImages[`${prefix}/${item.villaId}/celebration`] || [])[0]?.url;
            if (specific) return specific;
        }
        // Fallback: try any property-level or villa-level celebration image
        const ambroseLevel = (siteImages['ambrose/celebration'] || [])[0]?.url;
        if (ambroseLevel) return ambroseLevel;
        const amstelLevel = (siteImages['amstel-nest/celebration'] || [])[0]?.url;
        if (amstelLevel) return amstelLevel;
        // Last resort: try each Ambrose villa then Amstel cottage
        for (const key of ['ambrose/take-1', 'ambrose/alta', 'ambrose/santorini', 'ambrose/bamboosa', 'ambrose/cypress', 'amstel-nest/standard-cottage', 'amstel-nest/family-cottage']) {
            const url = (siteImages[`${key}/celebration`] || [])[0]?.url;
            if (url) return url;
        }
        return '';
    })();

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

    // Fetch booked dates for the date picker (must be before any early returns)
    const hasAmstelOnly = ambroseItems.length === 0 && amstelItems.length > 0;
    const bookedDatesForPicker = useBookedDates(
        hasAmstelOnly ? (dbPropertyMap["amstel-nest"] || null) : (dbPropertyMap["ambrose"] || null)
    );

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
            const pets: Record<string, number> = {};
            stored.forEach((item: CartItem) => { guests[item.villaId] = { adults: 2, kids: 0 }; pets[item.villaId] = 0; });
            setGuestsPerVilla(guests);
            setPetsPerVilla(pets);
        } catch { setCart([]); }

        // Read dates from URL params or localStorage
        const params = new URLSearchParams(window.location.search);
        let ciStr = params.get("checkIn");
        let coStr = params.get("checkOut");
        if (!ciStr || !coStr) {
            try {
                const savedDates = JSON.parse(localStorage.getItem("ambrose_cart_dates") || "null");
                if (savedDates) { ciStr = savedDates.checkIn; coStr = savedDates.checkOut; }
            } catch {}
        }
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

    // Listen for Cognito popup success (auto-refresh after Google sign-in)
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data === "COGNITO_LOGIN_SUCCESS") {
                setShowLoginPrompt(false);
                const userStr = localStorage.getItem("galaxia_user");
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        setFormData(prev => ({
                            ...prev,
                            email: user.email || "",
                            phone: user.phone || ""
                        }));
                        setCurrentStep(2);
                    } catch (e) {}
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
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

    // ── Fetch LIVE DB prices from availability API and sync cart items ──
    useEffect(() => {
        const ambId = dbPropertyMap["ambrose"];
        const anId = dbPropertyMap["amstel-nest"];
        if (!ambId && !anId) return;
        if (cart.length === 0) return;

        (async () => {
            try {
                const pricingMap: Record<string, { weekday: string; weekend: string; saturday: string; personsLabel: string }> = {};

                // Fetch Ambrose availability
                if (ambId) {
                    try {
                        const ambData = await api.get(`/properties/ambrose/availability`);
                        // Get parent-level pricing as fallback
                        const ambParentWd = ambData.pricing?.weekday?.price || "5500";
                        const ambParentWe = ambData.pricing?.weekend?.price || "6500";
                        const ambParentSa = ambData.pricing?.saturday?.price || ambParentWe;
                        const ambParentPersons = ambData.pricing?.weekday?.personsLabel || "2 guests";

                        if (ambData.subPropertyPricing && ambData.subProperties) {
                            for (const sp of ambData.subProperties) {
                                const spPricing = ambData.subPropertyPricing[sp.id];
                                const key = sp.slug || sp.name.toLowerCase().replace(/\s+/g, "-");
                                // Use sub-property pricing if it has actual values, otherwise fall back to parent
                                const hasSubPricing = spPricing && (spPricing.weekday?.price || spPricing.weekend?.price);
                                pricingMap[key] = {
                                    weekday: (hasSubPricing && spPricing.weekday?.price) || ambParentWd,
                                    weekend: (hasSubPricing && spPricing.weekend?.price) || ambParentWe,
                                    saturday: (hasSubPricing && spPricing.saturday?.price) || (hasSubPricing && spPricing.weekend?.price) || ambParentSa,
                                    personsLabel: (hasSubPricing && spPricing.weekday?.personsLabel) || ambParentPersons,
                                };
                            }
                        }
                    } catch {}
                }

                // Fetch Amstel Nest availability
                if (anId) {
                    try {
                        const anData = await api.get(`/properties/amstel-nest/availability`);
                        // Get parent-level pricing as fallback
                        const anParentWd = anData.pricing?.weekday?.price || "4950";
                        const anParentWe = anData.pricing?.weekend?.price || "6950";
                        const anParentSa = anData.pricing?.saturday?.price || anParentWe;
                        const anParentPersons = anData.pricing?.weekday?.personsLabel || "2 persons with meals";

                        if (anData.subPropertyPricing && anData.subProperties) {
                            for (const sp of anData.subProperties) {
                                const spPricing = anData.subPropertyPricing[sp.id];
                                const key = sp.slug || sp.name.toLowerCase().replace(/\s+/g, "-");
                                // Use sub-property pricing if it has actual values, otherwise fall back to parent
                                const hasSubPricing = spPricing && (spPricing.weekday?.price || spPricing.weekend?.price);
                                pricingMap[key] = {
                                    weekday: (hasSubPricing && spPricing.weekday?.price) || anParentWd,
                                    weekend: (hasSubPricing && spPricing.weekend?.price) || anParentWe,
                                    saturday: (hasSubPricing && spPricing.saturday?.price) || (hasSubPricing && spPricing.weekend?.price) || anParentSa,
                                    personsLabel: (hasSubPricing && spPricing.weekday?.personsLabel) || anParentPersons,
                                };
                            }
                        }
                    } catch {}
                }

                // Update cart items with live DB prices
                if (Object.keys(pricingMap).length > 0) {
                    setCart(prev => {
                        const updated = prev.map(item => {
                            const live = pricingMap[item.villaId];
                            if (live) {
                                return {
                                    ...item,
                                    weekdayPrice: live.weekday,
                                    weekendPrice: live.weekend,
                                    saturdayPrice: live.saturday,
                                    personsLabel: live.personsLabel,
                                };
                            }
                            return item;
                        });
                        // Also update localStorage so prices persist
                        localStorage.setItem("ambrose_cart", JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch {}
        })();
    }, [dbPropertyMap, cart.length]);

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
                        try {
                            const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                            const data = await api.get(`/bookings/staycation/booked-dates?propertyId=${ambId}&subPropertyId=${subId}&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`);
                            allConflicts[item.villaId] = data.dates || [];
                        } catch (err) {
                            console.error(`Failed to fetch booked dates for ${item.villaId}:`, err);
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
                const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
                const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                const res = await fetch(`/api/bookings/staycation/booked-dates?propertyId=${anId}&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`);
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
                const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

    // Release holds on page leave / component unmount
    useEffect(() => {
        const releaseHolds = () => {
            for (const sid of holdSessionIds) {
                fetch(`/api/bookings/staycation/hold/${sid}`, { method: 'DELETE', keepalive: true }).catch(() => {});
            }
        };
        window.addEventListener('beforeunload', releaseHolds);
        return () => {
            window.removeEventListener('beforeunload', releaseHolds);
            releaseHolds();
        };
    }, [holdSessionIds]);

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
            const isSat = day === 6;
            const isWe = day === 0 || day === 5;
            const priceStr = isSat ? (item.saturdayPrice || item.weekendPrice) : isWe ? item.weekendPrice : item.weekdayPrice;
            const price = parseInt(priceStr.replace(/,/g, ""));
            total += price;
        }
        return total * units;
    };

    const getExtraCharges = (item: CartItem) => {
        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
        const isAmstel = item.property === "amstel-nest";
        const extraAdultCharge = 2000;
        const kidsCharge = 1000;
        const units = item.unitCount || 1;
        // Parse base included persons from personsLabel (e.g. "upto 4 with meals" => 4)
        const basePersons = item.personsLabel ? (parseInt(item.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
        const baseIncluded = isAmstel ? basePersons * units : basePersons;
        // Adults beyond included are charged at adult rate
        const extraAdults = Math.max(0, guests.adults - baseIncluded);
        // Remaining free slots absorb kids
        const freeKidsSlots = Math.max(0, baseIncluded - guests.adults);
        const extraKids = Math.max(0, guests.kids - freeKidsSlots);
        const multiplier = isAmstel ? 1 : units;
        return (extraAdults * extraAdultCharge + extraKids * kidsCharge) * Math.max(nights, 1) * multiplier + (item.property !== 'amstel-nest' ? (petsPerVilla[item.villaId] || 0) * PET_CHARGE : 0);
    };

    const getExtraChargeBreakdown = (item: CartItem) => {
        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
        const isAmstel = item.property === "amstel-nest";
        const extraAdultRate = 2000;
        const kidsRate = 1000;
        const units = item.unitCount || 1;
        const basePersons = item.personsLabel ? (parseInt(item.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
        const baseIncluded = isAmstel ? basePersons * units : basePersons;
        const extraAdults = Math.max(0, guests.adults - baseIncluded);
        const freeKidsSlots = Math.max(0, baseIncluded - guests.adults);
        const extraKids = Math.max(0, guests.kids - freeKidsSlots);
        const multiplier = isAmstel ? 1 : units;
        return {
            adultCharge: extraAdults * extraAdultRate * Math.max(nights, 1) * multiplier,
            kidsCharge: extraKids * kidsRate * Math.max(nights, 1) * multiplier,
            petCharge: item.property !== 'amstel-nest' ? (petsPerVilla[item.villaId] || 0) * PET_CHARGE : 0,
        };
    };

    const grandSubtotal = cart.reduce((sum, item) => sum + getItemPrice(item) + getExtraCharges(item), 0);
    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === "percentage") {
            discountAmount = Math.round(grandSubtotal * appliedCoupon.discountValue / 100);
        } else {
            discountAmount = appliedCoupon.discountValue;
        }
    }
    const afterDiscount = grandSubtotal - discountAmount;
    const addonTotal = celebrationAddon ? CELEBRATION_ADDON_PRICE : 0;
    const gst = Math.round((afterDiscount + addonTotal) * 0.05);
    const grandTotal = Math.round((afterDiscount + addonTotal + gst) / 10) * 10;
    const payNow = Math.round(Math.round(grandTotal * 0.8) / 10) * 10;
    const payAtVenue = grandTotal - payNow;

    // Calculate total security deposit for display
    const totalAmstelVillaCount = amstelItems.reduce((sum, item) => sum + (item.unitCount || 1), 0);
    const amstelDeposit = totalAmstelVillaCount === 0 ? 0
        : totalAmstelVillaCount <= 5 ? 2000
        : totalAmstelVillaCount <= 10 ? 5000
        : 10000;
    const ambroseDeposit = ambroseItems.reduce((sum, item) => sum + 3000 * (item.unitCount || 1), 0);
    const totalSecurityDeposit = amstelDeposit + ambroseDeposit;

    const handleProceed = () => {
        if (!checkInDate || !checkOutDate || nights <= 0) return;
        const token = localStorage.getItem("galaxia_token");
        if (!token) { setShowLoginPrompt(true); return; }
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Acquire holds for all cart items (fire-and-forget)
        if (checkInDate && checkOutDate && Object.keys(dbPropertyMap).length > 0) {
            for (const item of cart) {
                const propSlug = item.property || 'ambrose';
                const propId = dbPropertyMap[propSlug];
                const subPropId = dbSubPropertyMap[item.villaId] || null;
                if (propId) {
                    fetch('/api/bookings/staycation/hold', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            propertyId: propId,
                            subPropertyId: subPropId,
                            checkInDate: `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}`,
                            checkOutDate: `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}`,
                        }),
                    })
                        .then(r => r.json())
                        .then(data => { if (data.sessionId) setHoldSessionIds(prev => [...prev, data.sessionId]); })
                        .catch(() => {});
                }
            }
        }
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

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError("");
        try {
            const result = await api.post("/coupons/validate", { code: couponCode });
            if (result && result.valid) {
                setAppliedCoupon({
                    code: result.code,
                    discountType: result.discountType,
                    discountValue: result.discountValue,
                });
            } else {
                setCouponError("Invalid or expired coupon code");
            }
        } catch (err: any) {
            setCouponError(err?.message || "Invalid or expired coupon code");
        } finally {
            setCouponLoading(false);
        }
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
        if (!formData.firstName || !formData.phone || !formData.agreedToTerms || !formData.agreedToMenu) return;
        if (!idFile) { setIdError("Government ID is required"); return; }
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePayment = async () => {
        let cleanPhone = formData.phone.replace(/\D/g, '');
        // Strip leading 91 country code if present (phone may be stored as +91XXXXXXXXXX from auth)
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
        if (cleanPhone.length !== 10) {
            setBookingError("Please enter a valid 10-digit mobile number.");
            return;
        }
        setIsSubmitting(true);
        setBookingError("");

        try {
            const customerName = `${formData.firstName} ${formData.lastName}`.trim();

            // Initiate single Razorpay payment for total advance
            let paymentResult;
            try {
                paymentResult = await initiateRazorpayPayment({
                    amount: payNow,
                    customerName,
                    customerEmail: formData.email || undefined,
                    customerPhone: formData.phone,
                    description: `Staycation - ${cart.length} villa${cart.length > 1 ? 's' : ''}`,
                    notes: {
                        bookingType: "staycation-multi",
                        villaCount: String(cart.length),
                        checkIn: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}` : '',
                        checkOut: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}` : '',
                    },
                });
            } catch (payErr: any) {
                if (payErr?.message === "Payment cancelled by user") {
                    setBookingError("");
                    setIsSubmitting(false);
                    return;
                }
                throw payErr;
            }

            // Calculate tiered Amstel Nest security deposit
            const totalAmstelVillas = amstelItems.reduce((sum, item) => sum + (item.unitCount || 1), 0);
            const amstelTotalDeposit = totalAmstelVillas === 0 ? 0
                : totalAmstelVillas <= 5 ? 2000
                : totalAmstelVillas <= 10 ? 5000
                : 10000;
            let amstelDepositAssigned = false;

            for (const item of cart) {
                const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                const itemSubtotal = getItemPrice(item) + getExtraCharges(item);
                const itemGst = Math.round(itemSubtotal * 0.05);
                const itemTotal = Math.round((itemSubtotal + itemGst) / 10) * 10;
                const itemPayNow = Math.round(Math.round(itemTotal * 0.8) / 10) * 10;
                const itemPayAtVenue = itemTotal - itemPayNow;

                const isAmstel = item.property === "amstel-nest";
                const propertyId = isAmstel ? dbPropertyMap["amstel-nest"] : dbPropertyMap["ambrose"];
                const subPropertyId = dbSubPropertyMap[item.villaId] || null;

                if (!propertyId) { setBookingError("Property not found. Please try again."); return; }

                const units = item.unitCount || 1;

                if (isAmstel) {
                    // Amstel Nest: single booking with numCottages
                    const totalPrice = getItemPrice(item);
                    const totalExtra = getExtraCharges(item);
                    const totalSubtotal = totalPrice + totalExtra;
                    const isFirstItem = cart.indexOf(item) === 0;
                    const addonAmount = isFirstItem && celebrationAddon ? CELEBRATION_ADDON_PRICE : 0;
                    const totalGst = Math.round(totalSubtotal * 0.05);
                    const totalTotal = Math.round((totalSubtotal + addonAmount + totalGst) / 10) * 10;
                    const totalPayNow = Math.round(Math.round(totalTotal * 0.8) / 10) * 10;
                    const totalPayAtVenue = totalTotal - totalPayNow;
                    const breakdown = getExtraChargeBreakdown(item);

                    const itemAddons: any[] = [];
                    if (isFirstItem && celebrationAddon) {
                        itemAddons.push({ name: 'Celebration Add-on', price: CELEBRATION_ADDON_PRICE, cakeMessage: celebrationCakeMsg || '', occasion: celebrationOccasion });
                    }
                    if (isFirstItem) {
                        itemAddons.push({ name: 'Food Preference', foodType });
                    }

                    const booking = await api.post("/bookings/staycation", {
                        customerName,
                        customerPhone: formData.phone,
                        customerEmail: formData.email,
                        propertyId,
                        subPropertyId,
                        numGuests: guests.adults,
                        numKids: guests.kids,
                        numPets: petsPerVilla[item.villaId] || 0,
                        numCottages: units,
                        checkInDate: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,"0")}-${String(checkInDate.getDate()).padStart(2,"0")}` : undefined,
                        checkOutDate: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,"0")}-${String(checkOutDate.getDate()).padStart(2,"0")}` : undefined,
                        nightlyRate: totalPrice / Math.max(nights, 1) / units,
                        basePrice: totalPrice,
                        extraPersonCharge: totalExtra,
                        extraAdultCharge: breakdown.adultCharge,
                        extraKidsCharge: breakdown.kidsCharge,
                        gstAmount: totalGst,
                        totalAmount: totalTotal,
                        advanceAmount: totalPayNow,
                        balanceAmount: totalPayAtVenue,
                        securityDeposit: amstelTotalDeposit,
                        advancePaid: true,
                        advanceMethod: `Razorpay: ${paymentResult.razorpay_payment_id}`,
                        source: "website",
                        addons: isFirstItem && itemAddons.length > 0 ? itemAddons : null,
                    });

                    if (idFile && booking?.id) {
                        try {
                            const fd = new FormData();
                            fd.append("file", idFile);
                            fd.append("bookingId", String(booking.id));
                            await fetch("/api/uploads/guest-id-public", { method: "POST", body: fd });
                        } catch (uploadErr) {
                            console.error("ID upload failed for booking", booking.id, uploadErr);
                        }
                    }
                } else {
                    // Ambrose: one booking per unit (villa)
                    for (let u = 0; u < units; u++) {
                        const perUnitPrice = getItemPrice({ ...item, unitCount: 1 });
                        const perUnitExtra = getExtraCharges({ ...item, unitCount: 1 });
                        const perUnitSubtotal = perUnitPrice + perUnitExtra;
                        const isFirstBooking = cart.indexOf(item) === 0 && u === 0;
                        const unitAddon = isFirstBooking && celebrationAddon ? CELEBRATION_ADDON_PRICE : 0;
                        const perUnitGst = Math.round(perUnitSubtotal * 0.05);
                        const perUnitTotal = Math.round((perUnitSubtotal + unitAddon + perUnitGst) / 10) * 10;
                        const perUnitPayNow = Math.round(Math.round(perUnitTotal * 0.8) / 10) * 10;
                        const perUnitPayAtVenue = perUnitTotal - perUnitPayNow;
                        const perUnitBreakdown = getExtraChargeBreakdown({ ...item, unitCount: 1 });

                        const isFirstItem = cart.indexOf(item) === 0;
                        const itemAddons: any[] = [];
                        if (isFirstItem && celebrationAddon) {
                            itemAddons.push({ name: 'Celebration Add-on', price: CELEBRATION_ADDON_PRICE, cakeMessage: celebrationCakeMsg || '', occasion: celebrationOccasion });
                        }
                        if (isFirstItem) {
                            itemAddons.push({ name: 'Food Preference', foodType });
                        }

                        const booking = await api.post("/bookings/staycation", {
                            customerName,
                            customerPhone: formData.phone,
                            customerEmail: formData.email,
                            propertyId,
                            subPropertyId,
                            numGuests: guests.adults,
                            numKids: guests.kids,
                            numPets: petsPerVilla[item.villaId] || 0,
                            checkInDate: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,"0")}-${String(checkInDate.getDate()).padStart(2,"0")}` : undefined,
                            checkOutDate: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,"0")}-${String(checkOutDate.getDate()).padStart(2,"0")}` : undefined,
                            nightlyRate: perUnitPrice / Math.max(nights, 1),
                            basePrice: perUnitPrice,
                            extraPersonCharge: perUnitExtra,
                            extraAdultCharge: perUnitBreakdown.adultCharge,
                            extraKidsCharge: perUnitBreakdown.kidsCharge,
                            gstAmount: perUnitGst,
                            totalAmount: perUnitTotal,
                            advanceAmount: perUnitPayNow,
                            balanceAmount: perUnitPayAtVenue,
                            securityDeposit: 3000,
                            advancePaid: true,
                            advanceMethod: `Razorpay: ${paymentResult.razorpay_payment_id}`,
                            source: "website",
                            addons: isFirstItem && itemAddons.length > 0 ? itemAddons : null,
                        });

                        if (idFile && booking?.id) {
                            try {
                                const fd = new FormData();
                                fd.append("file", idFile);
                                fd.append("bookingId", String(booking.id));
                                await fetch("/api/uploads/guest-id-public", { method: "POST", body: fd });
                            } catch (uploadErr) {
                                console.error("ID upload failed for booking", booking.id, uploadErr);
                            }
                        }
                    }
                }
            }

            localStorage.removeItem("ambrose_cart");
            window.dispatchEvent(new Event("cart-update"));

            // Release all holds
            for (const sid of holdSessionIds) {
                fetch(`/api/bookings/staycation/hold/${sid}`, { method: 'DELETE' }).catch(() => {});
            }
            setHoldSessionIds([]);

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
                    <a href="/staycation/ambrose" className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-6 py-3 rounded-full">Ambrose Villas</a>
                    <a href="/staycation/amstel-nest" className="border border-antique-gold text-antique-gold font-cinzel font-semibold text-sm px-6 py-3 rounded-full hover:bg-antique-gold/5 transition-colors">Amstel Nest</a>
                </div>
            </div>
        );
    }

    // Which property's calendar to show for date picker
    const calendarPropertyId = dbPropertyMap["ambrose"] || dbPropertyMap["amstel-nest"] || null;
    const showAmstelCalendar = hasAmstelOnly || amstelItems.length > 0;

    return (
        <>
        {/* Scrolling Announcement Bar */}
        <div style={{ background: '#dc2626', color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', padding: '8px 0', fontSize: '13px', fontWeight: 600, letterSpacing: '0.3px', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-block', animation: 'marquee 20s linear infinite' }}>
                ⚠️ No changes or customizations will be made to the menu; only the listed food items will be served. &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ⚠️ No changes or customizations will be made to the menu; only the listed food items will be served. &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; ⚠️ No changes or customizations will be made to the menu; only the listed food items will be served. &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }`}</style>
        </div>
        <div className="min-h-screen bg-[#FDFCF9] pb-24 relative z-0">
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
                            <div className="mb-4">
                                <DateSelectionBar
                                    checkIn={checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}` : undefined}
                                    checkOut={checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}` : undefined}
                                    disabledDates={bookedDatesForPicker.size > 0 ? bookedDatesForPicker : undefined}
                                    onDatesChange={(ci, co) => {
                                        const ciDate = new Date(ci + 'T12:00:00');
                                        const coDate = new Date(co + 'T12:00:00');
                                        handleDatesChange(ciDate, coDate);
                                    }}
                                />
                            </div>
                            <AvailabilityCalendar
                                propertyId={hasAmstelOnly ? dbPropertyMap["amstel-nest"] : dbPropertyMap["ambrose"]}
                                weekdayPrice={hasAmstelOnly ? (amstelItems[0]?.weekdayPrice || "4,950") : (ambroseItems[0]?.weekdayPrice || ambrose.pricing.weekday.price)}
                                weekendPrice={hasAmstelOnly ? (amstelItems[0]?.weekendPrice || "6,950") : (ambroseItems[0]?.weekendPrice || ambrose.pricing.weekend.price)}
                                saturdayPrice={hasAmstelOnly ? undefined : (ambroseItems[0]?.saturdayPrice || (ambrose.pricing as any).saturday?.price)}
                                dateOverrides={{}}
                                hidePrice={hasMixedPrices}
                                totalUnits={hasAmstelOnly ? 14 : undefined}
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
                                                    {(() => {
                                                        const limits = guestLimits[item.villaId] || { maxAdults: 6, maxKids: 2 };
                                                        const maxTotal = item.maxPersons || 8;
                                                        const effMaxAdults = Math.min(limits.maxAdults, maxTotal - guests.kids);
                                                        const effMaxKids = Math.min(limits.maxKids, maxTotal - 1);
                                                        const totalG = guests.adults + guests.kids;
                                                        return (
                                                    <div className="mb-4">
                                                        <div className="bg-soft-gray/40 rounded-lg border border-border-light p-4">
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block mb-2">Adults</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.max(1, guests.adults - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                        <span className="font-inter text-lg font-bold text-text-primary w-6 text-center">{guests.adults}</span>
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.min(effMaxAdults, guests.adults + 1) } }))} disabled={guests.adults >= effMaxAdults} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block mb-2">Kids (5-12 yrs)</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.max(0, guests.kids - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                        <span className="font-inter text-lg font-bold text-text-primary w-6 text-center">{guests.kids}</span>
                                                                        <button onClick={() => { const nk = Math.min(effMaxKids, guests.kids + 1); const na = Math.min(guests.adults, maxTotal - nk); setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { adults: Math.max(1, na), kids: nk } })); }} disabled={guests.kids >= effMaxKids || totalG >= maxTotal} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] font-inter text-text-muted mt-3">{totalG >= maxTotal ? <span className="text-amber-600 font-medium">Max {maxTotal} guests reached.</span> : <>Max {maxTotal} guests (up to {limits.maxAdults} adults, {limits.maxKids} kids)</>}</p>
                                                        </div>
                                                    </div>
                                                        );
                                                    })()}

                                                    {/* Pet selector — Ambrose only */}
                                                    {item.property !== 'amstel-nest' && (
                                                        <div className="mb-4">
                                                            <div className="bg-soft-gray/40 rounded-lg border border-border-light p-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block">Bringing Pets?</label>
                                                                        <p className="text-[10px] font-inter text-text-muted mt-0.5">₹{PET_CHARGE}/pet · Max 2 pets</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => setPetsPerVilla(prev => ({ ...prev, [item.villaId]: Math.max(0, (prev[item.villaId] || 0) - 1) }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                        <span className="font-inter text-lg font-bold text-text-primary w-6 text-center">{petsPerVilla[item.villaId] || 0}</span>
                                                                        <button onClick={() => setPetsPerVilla(prev => ({ ...prev, [item.villaId]: Math.min(2, (prev[item.villaId] || 0) + 1) }))} disabled={(petsPerVilla[item.villaId] || 0) >= 2} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                                    </div>
                                                                </div>
                                                                {(petsPerVilla[item.villaId] || 0) > 0 && (
                                                                    <p className="mt-2 text-[10px] font-inter text-text-muted">Pet charges: {petsPerVilla[item.villaId]} × ₹{PET_CHARGE} = ₹{((petsPerVilla[item.villaId] || 0) * PET_CHARGE).toLocaleString('en-IN')}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {villaPrice > 0 && (
                                                        <div className="border-t border-border-light pt-4 space-y-1.5 font-inter text-sm">
                                                            {(() => {
                                                                if (!checkInDate || nights <= 0) return <div className="flex justify-between"><span className="text-text-secondary">Room ({nights} night{nights > 1 ? "s" : ""})</span><span className="text-text-primary">{formatPrice(villaPrice)}</span></div>;
                                                                const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                                                                const units = item.unitCount || 1;
                                                                const wdP = parseInt((item.weekdayPrice || '0').replace(/,/g,''));
                                                                const weP = parseInt((item.weekendPrice || '0').replace(/,/g,''));
                                                                const saP = parseInt(((item.saturdayPrice || item.weekendPrice) || '0').replace(/,/g,''));
                                                                return <>
                                                                    {Array.from({length: nights}, (_, i) => {
                                                                        const d = new Date(checkInDate); d.setDate(d.getDate() + i);
                                                                        const dw = d.getDay();
                                                                        const p = dw === 6 ? saP : (dw === 0 || dw === 5) ? weP : wdP;
                                                                        return <div key={i} className="flex justify-between"><span className="text-text-secondary text-xs">{DAY_NAMES[dw]}</span><span className="text-text-primary text-xs">{formatPrice(p * units)}</span></div>;
                                                                    })}
                                                                </>;
                                                            })()}
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
                                                        <div className="bg-emerald-50/50 rounded-lg border border-emerald-200/50 p-4">
                                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block mb-2">Number of Cottages {item.villaId === 'standard-cottage' ? '(max 14)' : ''}</label>
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => updateUnitCount(item.villaId, units - 1)} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                <span className="font-inter text-xl font-bold text-text-primary w-6 text-center">{units}</span>
                                                                <button onClick={() => updateUnitCount(item.villaId, units + 1)} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">+</button>
                                                                <span className="font-inter text-xs text-text-muted">× {item.villaName}</span>
                                                            </div>
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

                                                    {/* Guest selectors (total across all cottages) */}
                                                    {(() => {
                                                        const perUnitLimits = guestLimits[item.villaId] || { maxAdults: 3, maxKids: 1 };
                                                        const perUnitMax = item.maxPersons || 4;
                                                        // Scale limits by number of units for total guest input
                                                        const totalMaxAdults = perUnitLimits.maxAdults * units;
                                                        const totalMaxKids = perUnitLimits.maxKids * units;
                                                        const totalMaxGuests = perUnitMax * units;
                                                        const effMaxAdults = Math.min(totalMaxAdults, totalMaxGuests - guests.kids);
                                                        const effMaxKids = Math.min(totalMaxKids, totalMaxGuests - 1);
                                                        const totalG = guests.adults + guests.kids;
                                                        return (
                                                    <div className="mb-4">
                                                        <div className="bg-soft-gray/40 rounded-lg border border-border-light p-4">
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block mb-2">Total Number of Adults</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.max(1, guests.adults - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                        <span className="font-inter text-lg font-bold text-text-primary w-6 text-center">{guests.adults}</span>
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, adults: Math.min(effMaxAdults, guests.adults + 1) } }))} disabled={guests.adults >= effMaxAdults} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider font-semibold block mb-2">Total Number of Kids</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { ...guests, kids: Math.max(0, guests.kids - 1) } }))} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors">-</button>
                                                                        <span className="font-inter text-lg font-bold text-text-primary w-6 text-center">{guests.kids}</span>
                                                                        <button onClick={() => { const nk = Math.min(effMaxKids, guests.kids + 1); const na = Math.min(guests.adults, totalMaxGuests - nk); setGuestsPerVilla(prev => ({ ...prev, [item.villaId]: { adults: Math.max(1, na), kids: nk } })); }} disabled={guests.kids >= effMaxKids || totalG >= totalMaxGuests} className="w-8 h-8 rounded-full border border-border-medium flex items-center justify-center text-text-primary hover:border-antique-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] font-inter text-text-muted mt-3">{totalG >= totalMaxGuests ? <span className="text-amber-600 font-medium">Max {totalMaxGuests} guests across {units} cottage{units > 1 ? 's' : ''} reached.</span> : <>Max {totalMaxGuests} total guests across {units} cottage{units > 1 ? 's' : ''} (up to {totalMaxAdults} adults, {totalMaxKids} kids)</>}</p>
                                                        </div>
                                                    </div>
                                                        );
                                                    })()}

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
                                    {discountAmount > 0 && <div className="flex justify-between items-center text-green-600 text-xs"><span>Discount ({appliedCoupon?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
                                    <div className="flex justify-between"><span className="text-text-secondary">Taxes</span><span className="text-text-primary">{formatPrice(gst)}</span></div>
                                    <div className="border-t border-border-light my-2" />
                                    <div className="flex justify-between text-base font-bold"><span className="text-text-primary">Grand Total</span><span className="text-antique-gold">{formatPrice(grandTotal)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay Now (80%)</span><span>{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay at Venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                    {totalSecurityDeposit > 0 && <div className="flex justify-between text-xs text-sky-600 mt-1"><span>Refundable Security Deposit <span className="text-[10px] text-text-muted">(at check-in)</span></span><span>{formatPrice(totalSecurityDeposit)}</span></div>}
                                </div>

                                {/* Coupon */}
                                <div className="mt-4 pt-4 border-t border-border-light">
                                    <h4 className="font-inter text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Have a Coupon?</h4>
                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                            <div>
                                                <span className="font-mono text-sm font-bold text-antique-gold">{appliedCoupon.code}</span>
                                                <p className="text-[10px] text-green-600 font-inter mt-0.5">
                                                    {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`} applied
                                                </p>
                                            </div>
                                            <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-red-400 text-xs font-inter hover:text-red-600">Remove</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Enter coupon code" className="flex-1 bg-white border border-border-light rounded-lg px-3 py-2 text-sm font-inter text-text-primary outline-none focus:border-antique-gold uppercase tracking-wider" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                                                <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="bg-antique-gold text-white font-inter text-xs font-medium px-4 py-2 rounded-lg hover:bg-dark-gold transition-colors whitespace-nowrap disabled:opacity-40">
                                                    {couponLoading ? "..." : "Apply"}
                                                </button>
                                            </div>
                                            {couponError && <p className="text-red-500 text-[10px] font-inter mt-1">{couponError}</p>}
                                        </div>
                                    )}
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
                                    {hasAnyConflicts ? "Resolve Conflicts to Continue" : "Book Now"}
                                </button>
                            </div>
                        )}

                        {/* Back to Staycation button */}
                        <a href="/staycation" className="inline-flex items-center justify-center w-full px-5 py-3 bg-[#1A1A1A] text-white font-inter text-sm font-medium rounded-lg hover:bg-[#333] transition-colors">
                            Back to Staycation
                        </a>
                    </div>
                )}

                {/* STEP 2: Personal Details */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        {/* Date summary — same as Step 3 */}
                        {checkInDate && checkOutDate && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                    <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-in</span>
                                    <span className="font-cinzel text-base font-semibold text-text-primary block">{`${checkInDate.getDate()} ${MONTH_SHORT[checkInDate.getMonth()]}`}</span>
                                    <span className="font-inter text-xs text-text-muted">1:00 PM</span>
                                </div>
                                <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                    <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-out</span>
                                    <span className="font-cinzel text-base font-semibold text-text-primary block">{`${checkOutDate.getDate()} ${MONTH_SHORT[checkOutDate.getMonth()]}`}</span>
                                    <span className="font-inter text-xs text-text-muted">10:00 AM</span>
                                </div>
                                <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                    <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Duration</span>
                                    <span className="font-cinzel text-2xl font-bold text-text-primary block">{nights}</span>
                                    <span className="font-inter text-xs text-text-muted">Night{nights > 1 ? "s" : ""}</span>
                                </div>
                                <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                    <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Properties</span>
                                    <span className="font-cinzel text-2xl font-bold text-text-primary block">{cart.length}</span>
                                    <span className="font-inter text-xs text-text-muted">Item{cart.length > 1 ? "s" : ""}</span>
                                </div>
                            </div>
                        )}
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
                                        <input required type="tel" maxLength={10} placeholder="10-digit mobile number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                    <div>
                                        <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Email</label>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                    </div>
                                </div>

                                {/* ID Upload */}
                                <div className="mb-6">
                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-2 block">Government ID (Image, max 2MB) *</label>
                                    <label className="cursor-pointer flex items-center gap-3 w-full px-4 py-3 border border-dashed border-border-medium rounded-lg hover:border-antique-gold transition-colors">
                                        <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="font-inter text-sm text-text-secondary flex-1">{idFile ? idFile.name : "Upload ID"}</span>
                                        {idPreview && <img src={idPreview} alt="ID Preview" className="w-12 h-12 object-cover rounded-lg border border-border-light" />}
                                        <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                                    </label>
                                    {idError && <p className="font-inter text-xs text-red-500 mt-1">{idError}</p>}
                                </div>

                                {/* Celebration Add-on */}
                                <div className="mb-6 p-4 border border-antique-gold/30 rounded-lg bg-antique-gold/5">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <input type="checkbox" id="multi-celebration" checked={celebrationAddon} onChange={(e) => setCelebrationAddon(e.target.checked)} className="mt-1 sm:mt-0 w-4 h-4 accent-[#B8860B] cursor-pointer shrink-0" />
                                        <label htmlFor="multi-celebration" className="cursor-pointer flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                                <h4 className="font-inter text-sm font-semibold text-text-primary">Celebration Add-on</h4>
                                                <span className="font-cinzel text-sm font-semibold text-dark-gold whitespace-nowrap">+ ₹{CELEBRATION_ADDON_PRICE.toLocaleString('en-IN')}</span>
                                            </div>
                                            <p className="font-inter text-xs text-text-secondary mt-0.5">Includes: Cake, balloons, and a banner</p>
                                        </label>
                                        {celebrationImageUrl && (
                                            <div className="shrink-0 flex flex-col items-center gap-1">
                                                <button type="button" onClick={(e) => { e.preventDefault(); setCelebrationPreviewOpen(true); }} className="w-[78px] h-[78px] sm:w-[92px] sm:h-[92px] rounded-lg overflow-hidden border border-antique-gold/30 hover:border-antique-gold hover:shadow-md transition-all cursor-pointer relative group">
                                                    <img src={celebrationImageUrl} alt="Celebration preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                    </div>
                                                </button>
                                                <span className="text-[9px] font-inter text-text-muted">Click to view</span>
                                            </div>
                                        )}
                                    </div>
                                    {celebrationAddon && (
                                        <div className="mt-4 space-y-3 pl-7 animate-in fade-in">
                                            <div>
                                                <label className="block font-inter text-xs text-text-secondary mb-1.5">Occasion</label>
                                                <select value={celebrationOccasion} onChange={(e) => setCelebrationOccasion(e.target.value)} className="w-full bg-white border border-border-medium rounded-lg px-3 py-2.5 text-sm font-inter text-text-primary focus:border-antique-gold focus:outline-none">
                                                    <option>Birthday</option>
                                                    <option>Anniversary</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Celebration Image Preview Modal */}
                                {celebrationPreviewOpen && celebrationImageUrl && (
                                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setCelebrationPreviewOpen(false)}>
                                        <div className="relative max-w-lg w-full max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                                            <img src={celebrationImageUrl} alt="Celebration decoration" className="w-full h-auto max-h-[80vh] object-contain bg-white" />
                                            <button onClick={() => setCelebrationPreviewOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Food Preference (compulsory for Ambrose & Amstel Nest) */}
                                <div className="mb-6 p-4 border border-emerald-200 rounded-lg bg-emerald-50/50">
                                    <h4 className="font-inter text-sm font-semibold text-text-primary mb-1">Food Preference <span className="text-red-500">*</span></h4>
                                    <p className="font-inter text-[10px] text-text-muted mb-3 uppercase tracking-wider">Both options are vegetarian only</p>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setFoodType('Regular')} className={`flex-1 py-2.5 rounded-lg text-sm font-inter font-semibold transition-all border ${foodType === 'Regular' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-text-secondary border-border-medium hover:border-emerald-300'}`}>Regular (Veg)</button>
                                        <button type="button" onClick={() => setFoodType('Jain')} className={`flex-1 py-2.5 rounded-lg text-sm font-inter font-semibold transition-all border ${foodType === 'Jain' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-text-secondary border-border-medium hover:border-emerald-300'}`}>Jain (Veg)</button>
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 mt-6 cursor-pointer">
                                    <input type="checkbox" required checked={formData.agreedToTerms} onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} className="mt-1 accent-[#C4A265] w-4 h-4" />
                                    <span className="text-text-secondary font-inter text-xs leading-relaxed">I agree to the booking terms, cancellation policy, and property rules for all selected villas.</span>
                                </label>
                                <label className="flex items-start gap-3 mt-3 cursor-pointer">
                                    <input type="checkbox" required checked={formData.agreedToMenu} onChange={(e) => setFormData({ ...formData, agreedToMenu: e.target.checked })} className="mt-1 accent-[#C4A265] w-4 h-4" />
                                    <span className="text-text-secondary font-inter text-xs leading-relaxed">I understand that no changes or customizations <strong>can be made</strong> to the menu; only the listed food items will be served.</span>
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
                                <span className="font-cinzel text-2xl font-bold text-text-primary block">{cart.reduce((s, item) => { const g = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 }; const isAmstel = item.property === 'amstel-nest'; return s + (g.adults + g.kids) * (isAmstel ? 1 : (item.unitCount || 1)); }, 0)}</span>
                                <span className="font-inter text-xs text-text-muted">{cart.reduce((s, item) => { const isAmstel = item.property === 'amstel-nest'; return s + (guestsPerVilla[item.villaId]?.adults || 2) * (isAmstel ? 1 : (item.unitCount || 1)); }, 0)} Adults</span>
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
                                const itemGstInc = Math.round(itemTotal * 1.05);
                                return (
                                    <div key={item.villaId} className="border border-border-light rounded-lg p-4 mb-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] text-dark-gold font-inter uppercase tracking-wider">{item.property === "amstel-nest" ? "Amstel Nest" : "Ambrose"} · {item.theme}</span>
                                                <h4 className="font-cinzel font-semibold text-text-primary">{item.villaName}{units > 1 ? ` × ${units}` : ""}</h4>
                                                <p className="text-xs text-text-muted font-inter">{guests.adults} adults{guests.kids > 0 ? `, ${guests.kids} kids` : ""}{units > 1 && item.property !== 'amstel-nest' ? " per villa" : ""}{units > 1 && item.property === 'amstel-nest' ? ` across ${units} cottages` : ""}</p>
                                            </div>
                                            <span className="font-inter font-semibold text-text-primary">{formatPrice(itemGstInc)}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="border-t border-border-light mt-4 pt-4 space-y-2 font-inter text-sm">
                                <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(grandSubtotal)}</span></div>
                                {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({appliedCoupon?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
                                <div className="flex justify-between"><span className="text-text-secondary">GST (5%)</span><span>{formatPrice(gst)}</span></div>
                                <div className="flex justify-between text-base font-bold pt-2"><span>Grand Total</span><span className="text-antique-gold">{formatPrice(grandTotal)}</span></div>
                                {totalSecurityDeposit > 0 && <div className="flex justify-between text-xs text-sky-600 mt-1"><span>Refundable Security Deposit <span className="text-[10px] text-text-muted">(at check-in)</span></span><span>{formatPrice(totalSecurityDeposit)}</span></div>}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between text-sm"><span className="text-amber-800 font-medium">Pay Now (80%)</span><span className="font-bold text-amber-900">{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-amber-600 mt-1"><span>Balance at venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                </div>
                            </div>
                        </div>

                        {bookingError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-inter">
                                <p className="font-medium">{bookingError}</p>
                                {bookingError.toLowerCase().includes("booked") && (
                                    <button onClick={() => { setCurrentStep(1); setBookingError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-2 text-red-800 underline text-xs font-semibold">
                                        Go back to Step 1 and select different dates
                                    </button>
                                )}
                            </div>
                        )}

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

            {/* Login Modal — matching BookingClient style */}
            {showLoginPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 xs:p-10 relative transform transition-all">
                        <button onClick={() => { setShowLoginPrompt(false); setAuthError(""); setEmailMode(false); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        {!emailMode && (
                            <>
                                <h2 className="font-inter text-[28px] font-semibold text-white mb-2 text-center tracking-tight">Log in or sign up</h2>
                                <p className="font-inter text-[15px] text-[#C5C5D2] text-center mb-8 px-2 font-normal">
                                    Sign in to your account or create a new one to access your premium reservations.
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
                                        <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                        Continue with Google
                                    </button>
                                    
                                    <div className="flex items-center gap-4 py-2 opacity-60">
                                        <div className="h-[1px] bg-white/20 flex-1"></div>
                                        <span className="text-white/80 font-inter text-xs uppercase tracking-wider">or</span>
                                        <div className="h-[1px] bg-white/20 flex-1"></div>
                                    </div>


                                    <button 
                                        onClick={() => { setShowLoginPrompt(false); setShowPhoneAuth(true); }}
                                        className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors"
                                    >
                                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        Continue with Phone Number
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
                                <p className="text-[#C5C5D2] text-sm text-center">Don&apos;t have an account? <button type="button" onClick={() => setEmailMode("register")} className="text-white hover:underline">Sign up</button></p>
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
            )}
        </div>

            {/* Phone Auth Modal */}
            {showPhoneAuth && (
                <PhoneAuthModal
                    onClose={() => setShowPhoneAuth(false)}
                    onSuccess={() => { setShowPhoneAuth(false); window.location.reload(); }}
                />
            )}
        </>
    );
}



