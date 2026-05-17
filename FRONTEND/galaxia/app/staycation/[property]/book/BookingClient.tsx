"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PropertyData } from "../../../data/properties";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import DateSelectionBar from "../../../components/DateSelectionBar";
import { api } from "../../../../lib/api";
import { initiateRazorpayPayment } from "../../../../lib/razorpay";
import PhoneAuthModal from "../../../components/PhoneAuthModal";
import { useBookedDates } from "../../../hooks/useBookedDates";

interface BookingClientProps {
    property: PropertyData;
}


const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookingClient({ property }: BookingClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [selectedRoom, setSelectedRoom] = useState<{ 
        id: string; 
        name: string; 
        price: number; 
        type: string; 
        maxPersons: number;
        maxAdults?: number;
        maxKids?: number;
        weekdayPrice: string;
        weekendPrice: string;
        saturdayPrice: string;
        primeDatePrice: string;
        personsLabel?: string;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);
    const [holdSessionId, setHoldSessionId] = useState<string | null>(null);
    
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

    // Resolve the effective sub-property ID for the current selection
    const effectiveSubPropertyId = (() => {
        if (property.id.includes('/')) {
            const slug = property.id.split('/').pop() || '';
            return dbSubPropertyMap[slug] || null;
        }
        if (selectedRoom) {
            return dbSubPropertyMap[selectedRoom.id] || dbSubPropertyMap[selectedRoom.id.split('/').pop() || ''] || null;
        }
        return null;
    })();

    // Fetch booked dates for the current property/sub-property (shared with DateSelectionBar)
    const bookedDatesForPicker = useBookedDates(dbPropertyId, effectiveSubPropertyId);

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
                        const isSat = day === 6;
                        const isWe = day === 0 || day === 5;
                        const priceStr = isSat
                            ? ((property as any).pricing?.saturday?.price || property.pricing.weekend.price)
                            : isWe ? property.pricing.weekend.price : property.pricing.weekday.price;
                        const rate = parseInt(priceStr.replace(/,/g, ""));
                        setNightlyRate(rate);
                    }
                }
            }
        }
    }, [searchParams, property.pricing]);

    // Dynamic Pricing & Status State
    const [backendData, setBackendData] = useState<any>(null);
    const [isMaintenance, setIsMaintenance] = useState(false);

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                // For sub-properties like 'amstel-nest/standard-cottage', use parent slug
                const fetchSlug = property.id.includes('/') ? property.id.split('/')[0] : property.id;
                const data = await api.get(`/properties/${fetchSlug}/availability`);
                setBackendData(data);
                setIsMaintenance(data.isActive === false);
                
                // If dates were in URL, update rate from backend pricing
                const ciStr = searchParams.get("checkIn");
                const coStr = searchParams.get("checkOut");
                if (ciStr && coStr) {
                    const ci = new Date(ciStr);
                    const day = ci.getDay();
                    const isSat = day === 6;
                    const isWe = day === 0 || day === 5;
                    // For sub-property bookings (ambrose/bamboosa), use sub-property pricing
                    let priceData = null;
                    if (property.id.includes('/') && data.subPropertyPricing && data.subProperties) {
                        const villaSlug = property.id.split('/').pop();
                        const dbSub = data.subProperties.find((sp: any) => sp.slug === villaSlug || sp.name?.toUpperCase() === property.name?.toUpperCase());
                        const spP = dbSub ? data.subPropertyPricing[dbSub.id] : null;
                        if (spP) {
                            priceData = isSat ? (spP.saturday || spP.weekend) : isWe ? spP.weekend : spP.weekday;
                        }
                    }
                    if (!priceData && data.pricing) {
                        priceData = isSat ? (data.pricing.saturday || data.pricing.weekend) : isWe ? data.pricing.weekend : data.pricing.weekday;
                    }
                    if (priceData) {
                        setNightlyRate(parseInt(priceData.price));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch backend availability:", err);
            }
        };
        fetchAvailability();
    }, [property.id, searchParams]);

    // Guest state
    const [adults, setAdults] = useState(2);
    const [kids, setKids] = useState(0);
    const [pets, setPets] = useState(0);
    const PET_CHARGE = 600; // ₹600 per pet per stay

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gst: "",
        aadhaarFile: null as File | null,
        agreedToTerms: false
    });
    const [idProofError, setIdProofError] = useState("");

    // Celebration Add-on (all properties) + Food Preference (Ambrose/Amstel Nest)
    const isAmbrose = property.id === 'ambrose' || property.id.startsWith('ambrose/');
    const isAmstelNest = property.id.startsWith('amstel-nest/');
    const [celebrationAddon, setCelebrationAddon] = useState(false);
    const [celebrationCakeMsg, setCelebrationCakeMsg] = useState('');
    const [celebrationOccasion, setCelebrationOccasion] = useState('Birthday');
    const CELEBRATION_ADDON_PRICE = 1200;
    const [foodType, setFoodType] = useState<'Regular' | 'Jain'>('Regular');
    const [celebrationPreviewOpen, setCelebrationPreviewOpen] = useState(false);

    // Amstel Nest multi-unit cart state
    const [unitCount, setUnitCount] = useState(1);
    const [unitAvailability, setUnitAvailability] = useState<Record<string, number>>({});
    const [availabilityWarning, setAvailabilityWarning] = useState('');
    const [availabilityDetails, setAvailabilityDetails] = useState<{date: string; available: number}[]>([]);
    const [userAcceptedWarning, setUserAcceptedWarning] = useState(false);

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

    // Release booking hold on page leave / component unmount
    useEffect(() => {
        const releaseHold = () => {
            if (holdSessionId) {
                fetch(`/api/bookings/staycation/hold/${holdSessionId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
            }
        };
        window.addEventListener('beforeunload', releaseHold);
        return () => {
            window.removeEventListener('beforeunload', releaseHold);
            releaseHold();
        };
    }, [holdSessionId]);

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
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    // Site images from admin panel
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    // Main thumbnail for this property (used on booking card + summary)
    const mainThumb = (siteImages[`${property.id}/thumbnail`] || [])[0]?.url;

    // Celebration add-on image for this property (uploaded via Photo Manager)
    const celebrationImageUrl = (() => {
        // Try property-level celebration image first (e.g. "la-paraiso/celebration")
        const direct = (siteImages[`${property.id}/celebration`] || [])[0]?.url;
        if (direct) return direct;
        // For sub-property bookings (e.g. "ambrose/bamboosa"), try parent slug
        if (property.id.includes('/')) {
            const parentSlug = property.id.split('/')[0];
            return (siteImages[`${parentSlug}/celebration`] || [])[0]?.url || '';
        }
        return '';
    })();

    const isSingleRoom = !property.subProperties || property.subProperties.length === 0 || property.id.includes('/');

    // Check if selected date range overlaps with any booked dates (mirrors DateSelectionBar logic)
    const hasBookedDateConflict = (() => {
        if (!checkInDate || !checkOutDate || bookedDatesForPicker.size === 0) return false;
        for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (bookedDatesForPicker.has(ds)) return true;
        }
        return false;
    })();

    const roomOptions = (property.subProperties && property.subProperties.length > 0
        ? property.subProperties.map((sub: any) => {
            const subThumb = (siteImages[`${property.id}/${sub.id}/thumbnail`] || [])[0]?.url;
            // Override with live DB pricing if available
            const subSlug = sub.id?.split?.('/')?.pop?.() || sub.id;
            const dbSub = (backendData?.subProperties || []).find((sp: any) => sp.slug === subSlug || sp.name?.toUpperCase() === sub.name?.toUpperCase());
            const spPricing = dbSub ? backendData?.subPropertyPricing?.[dbSub.id] : null;
            const liveWd = spPricing?.weekday?.price;
            const liveWe = spPricing?.weekend?.price;
            const liveSa = spPricing?.saturday?.price || spPricing?.weekend?.price;
            const livePersons = spPricing?.weekday?.personsLabel;
            return {
                id: sub.id,
                name: sub.name,
                theme: sub.theme,
                image: subThumb || sub.image || mainThumb || '',
                description: sub.description,
                price: parseInt((liveWd || sub.pricing?.weekday.price || "0").toString().replace(/,/g, "")),
                weekdayPrice: liveWd || sub.pricing?.weekday.price || property.pricing.weekday.price,
                weekendPrice: liveWe || sub.pricing?.weekend.price || property.pricing.weekend.price,
                saturdayPrice: liveSa || sub.pricing?.saturday?.price || sub.pricing?.weekend?.price || property.pricing.weekend.price,
                primeDatePrice: sub.pricing?.primeDates || property.pricing.primeDates || "",
                details: sub.configuration?.slice(0, 3) || [],
                persons: livePersons || sub.pricing?.weekday.persons || "2 guests",
                maxPersons: sub.maxPersons || property.maxPersons || 4,
                maxAdults: sub.maxAdults || property.maxAdults || undefined,
                maxKids: sub.maxKids ?? property.maxKids ?? undefined
            };
        })
        : (() => {
            // For sub-property single bookings (e.g. ambrose/bamboosa), use sub-property DB pricing
            let dbWd: string | undefined, dbWe: string | undefined, dbSa: string | undefined, dbPersons: string | undefined;
            if (property.id.includes('/') && backendData?.subPropertyPricing && backendData?.subProperties) {
                const villaSlug = property.id.split('/').pop();
                const dbSub = backendData.subProperties.find((sp: any) => sp.slug === villaSlug || sp.name?.toUpperCase() === property.name?.toUpperCase());
                const spP = dbSub ? backendData.subPropertyPricing[dbSub.id] : null;
                if (spP) {
                    dbWd = spP.weekday?.price;
                    dbWe = spP.weekend?.price;
                    dbSa = spP.saturday?.price || spP.weekend?.price;
                    dbPersons = spP.weekday?.personsLabel;
                }
            } else if (backendData?.pricing) {
                dbWd = backendData.pricing.weekday?.price;
                dbWe = backendData.pricing.weekend?.price;
                dbSa = backendData.pricing.saturday?.price || backendData.pricing.weekend?.price;
                dbPersons = backendData.pricing.weekday?.personsLabel;
            }
            return [{
                id: property.id,
                name: property.name,
                theme: property.type === "standalone" ? "Entire Villa" : property.subtitle,
                image: mainThumb || property.images[0] || '',
                description: property.description,
                price: parseInt((dbWd || property.pricing.weekday.price).toString().replace(/,/g, "")),
                weekdayPrice: dbWd || property.pricing.weekday.price,
                weekendPrice: dbWe || property.pricing.weekend.price,
                saturdayPrice: dbSa || property.pricing.saturday?.price || property.pricing.weekend.price,
                primeDatePrice: property.pricing.primeDates || "",
                details: property.configuration.slice(0, 3),
                persons: dbPersons || property.pricing.weekday.persons,
                maxPersons: property.maxPersons || 4,
                maxAdults: property.maxAdults || undefined,
                maxKids: property.maxKids ?? undefined
            }];
        })());

    const formatPrice = (price: number) => `₹ ${price.toLocaleString('en-IN')}`;
    const formatDateShort = (d: Date) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    // Extra person charges
    const extraAdultCharge = parseInt(property.pricing.extraAdult.replace(/,/g, ""));
    const kidsChargeStr = property.pricing.kidsCharge;
    const kidsChargeNum = parseInt(kidsChargeStr.replace(/,/g, ""));

    // Base included persons from persons label (e.g. "4 with meals" => 4, "2 with meals" => 2, "upto 4 with meals" => 4)
    const personsFromLabel = selectedRoom?.personsLabel ? (parseInt(selectedRoom.personsLabel.replace(/[^0-9]/g, '')) || 2) : 2;
    const baseIncludedPersons = personsFromLabel * (isAmstelNest ? unitCount : 1);
    // Adults beyond included persons are charged at adult rate
    const extraAdults = Math.max(0, adults - baseIncludedPersons);
    // Remaining free slots (after adults) absorb kids before charging
    const freeKidsSlots = Math.max(0, baseIncludedPersons - adults);
    const extraKids = Math.max(0, kids - freeKidsSlots);
    const extraAdultTotal = extraAdults * extraAdultCharge;
    const kidsTotal = extraKids * kidsChargeNum;

    // Room price: sum per-night prices for accurate multi-day-type bookings
    const computedRoomPrice = (() => {
        // Use selectedRoom prices, or fall back to roomOptions[0] for pre-select display
        const priceSource = selectedRoom || roomOptions[0];
        if (!checkInDate || nights <= 0 || !priceSource) return nightlyRate * nights * (isAmstelNest ? unitCount : 1);
        let total = 0;
        const wdP = parseInt((priceSource.weekdayPrice || '0').toString().replace(/,/g, ''));
        const weP = parseInt((priceSource.weekendPrice || '0').toString().replace(/,/g, ''));
        const saP = parseInt((priceSource.saturdayPrice || priceSource.weekendPrice || '0').toString().replace(/,/g, ''));
        for (let i = 0; i < nights; i++) {
            const d = new Date(checkInDate);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            total += day === 6 ? saP : (day === 0 || day === 5) ? weP : wdP;
        }
        return total * (isAmstelNest ? unitCount : 1);
    })();
    const roomPrice = computedRoomPrice;
    const extraCharges = (extraAdultTotal + kidsTotal) * nights;
    const petCharges = pets * PET_CHARGE;
    const subtotal = roomPrice + extraCharges + petCharges;

    // Discount
    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === "percentage") {
            discountAmount = Math.round(subtotal * appliedCoupon.discountValue / 100);
        } else {
            discountAmount = appliedCoupon.discountValue;
        }
    }

    const addonTotal = celebrationAddon ? CELEBRATION_ADDON_PRICE : 0;
    const taxesAndFees = Math.round((subtotal - discountAmount) * property.gstPercent / 100);
    const totalAmount = Math.round((subtotal - discountAmount + addonTotal + taxesAndFees) / 10) * 10;

    const totalGuests = adults + kids;
    const maxGuests = selectedRoom?.maxPersons || property.maxPersons || 4;
    // Per-property max adults & kids caps
    const maxAdultsCap = selectedRoom?.maxAdults || property.maxAdults || 6;
    const maxKidsCap = selectedRoom?.maxKids ?? property.maxKids ?? 2;
    // Dynamic combo caps: total guests cannot exceed maxGuests
    const effectiveMaxAdults = Math.min(maxAdultsCap, maxGuests - kids);
    const effectiveMaxKids = Math.min(maxKidsCap, maxGuests - 1); // at least 1 adult required

    // 80-20 Payment Split (rounded to nearest 10)
    const payNow = Math.round(Math.round(totalAmount * 0.8) / 10) * 10;
    const payAtVenue = totalAmount - payNow;

    const handleRoomSelect = (room: any) => {
        if (isMaintenance) {
            alert("This property is currently under maintenance and not accepting bookings.");
            return;
        }

        let currentWeekdayPrice = room.weekdayPrice;
        let currentWeekendPrice = room.weekendPrice;
        let currentSaturdayPrice = room.saturdayPrice || room.weekendPrice;
        let currentPersonsLabel = room.persons || '2 guests';
        
        // Override from backend DB if available
        let roomDbId = dbSubPropertyMap[room.id] || dbSubPropertyMap[room.id?.split?.('/')?.pop?.() || ''];
        // For ambrose villa single bookings, also try matching by name/slug from backendData
        if (!roomDbId && room.id?.includes('/') && backendData?.subProperties) {
            const villaSlug = room.id.split('/').pop();
            const dbSub = backendData.subProperties.find((sp: any) => sp.slug === villaSlug || sp.name?.toUpperCase() === room.name?.toUpperCase());
            if (dbSub) roomDbId = dbSub.id;
        }
        const spPricing = roomDbId ? backendData?.subPropertyPricing?.[roomDbId] : null;
        if (spPricing) {
            if (spPricing.weekday?.price) currentWeekdayPrice = spPricing.weekday.price;
            if (spPricing.weekend?.price) currentWeekendPrice = spPricing.weekend.price;
            if (spPricing.saturday?.price) currentSaturdayPrice = spPricing.saturday.price;
            if (spPricing.weekday?.personsLabel) currentPersonsLabel = spPricing.weekday.personsLabel;
        } else if (!room.id?.includes('/') && backendData?.pricing) {
            // Only use parent-level pricing for non-sub-property bookings
            if (backendData.pricing.weekday?.price) currentWeekdayPrice = backendData.pricing.weekday.price;
            if (backendData.pricing.weekend?.price) currentWeekendPrice = backendData.pricing.weekend.price;
            if (backendData.pricing.saturday?.price) currentSaturdayPrice = backendData.pricing.saturday.price;
            if (backendData.pricing.weekday?.personsLabel) currentPersonsLabel = backendData.pricing.weekday.personsLabel;
        }

        const ci = checkInDate || new Date();
        const day = ci.getDay();
        const isSat = day === 6;
        const isWe = day === 0 || day === 5;
        const initialPriceStr = (isSat ? currentSaturdayPrice : isWe ? currentWeekendPrice : currentWeekdayPrice).toString();
        const initialPrice = parseInt(initialPriceStr.replace(/,/g, ""));

        setSelectedRoom({
            id: room.id,
            name: room.name,
            price: initialPrice,
            type: room.theme,
            maxPersons: room.maxPersons,
            maxAdults: room.maxAdults,
            maxKids: room.maxKids,
            weekdayPrice: currentWeekdayPrice,
            weekendPrice: currentWeekendPrice,
            saturdayPrice: currentSaturdayPrice,
            primeDatePrice: room.primeDatePrice,
            personsLabel: currentPersonsLabel,
        });
        setNightlyRate(initialPrice);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Acquire booking hold (fire-and-forget, non-blocking)
        if (checkInDate && checkOutDate && dbPropertyId) {
            const roomId = selectedRoom?.id || '';
            const subPropertyId = selectedRoom
                ? (dbSubPropertyMap[roomId] || dbSubPropertyMap[roomId.split('/').pop() || ''] || undefined)
                : undefined;
            fetch('/api/bookings/staycation/hold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: dbPropertyId,
                    subPropertyId: subPropertyId || null,
                    checkInDate: `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}`,
                    checkOutDate: `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}`,
                }),
            })
                .then(r => r.json())
                .then(data => { if (data.sessionId) setHoldSessionId(data.sessionId); })
                .catch(() => { /* hold is best-effort */ });
        }
    };

    const handleDatesChange = (checkIn: Date | null, checkOut: Date | null, rate: number, n: number) => {
        setCheckInDate(checkIn);
        setCheckOutDate(checkOut);
        setNightlyRate(rate);
        setNights(n);

        // Check unit availability warnings for Amstel Nest
        if (isAmstelNest && checkIn && checkOut && unitCount > 1) {
            checkUnitAvailability(checkIn, checkOut, unitCount);
        } else {
            setAvailabilityWarning('');
        }
    };

    // Check if selected unit count is available for all dates
    const checkUnitAvailability = useCallback(async (ci: Date, co: Date, units: number) => {
        if (!dbPropertyId) return;
        setUserAcceptedWarning(false);
        try {
            const startStr = `${ci.getFullYear()}-${String(ci.getMonth()+1).padStart(2,'0')}-${String(ci.getDate()).padStart(2,'0')}`;
            const endStr = `${co.getFullYear()}-${String(co.getMonth()+1).padStart(2,'0')}-${String(co.getDate()).padStart(2,'0')}`;
            const subId = selectedRoom ? (dbSubPropertyMap[selectedRoom.id] || dbSubPropertyMap[selectedRoom.id.split('/').pop() || '']) : null;
            let url = `/api/bookings/staycation/booked-dates?propertyId=${dbPropertyId}&startDate=${startStr}&endDate=${endStr}`;
            if (subId) url += `&subPropertyId=${subId}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.dateCounts) {
                    setUnitAvailability(data.dateCounts);
                    const totalUnits = data.capacity || 15;
                    const details: {date: string; available: number}[] = [];
                    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
                        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                        const booked = data.dateCounts[ds] || 0;
                        const avail = totalUnits - booked;
                        if (avail < units) {
                            details.push({ date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), available: avail });
                        }
                    }
                    setAvailabilityDetails(details);
                    if (details.length > 0) {
                        setAvailabilityWarning(`${details.length} date${details.length > 1 ? 's have' : ' has'} fewer units than selected (${units}).`);
                    } else {
                        setAvailabilityWarning('');
                    }
                }
            }
        } catch {}
    }, [dbPropertyId, dbSubPropertyMap, selectedRoom]);

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
        if ((isAmbrose || isAmstelNest) && !foodType) {
            alert("Please select a food preference (Jain or Regular)");
            return;
        }
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const handlePayment = async () => {
        if (!dbPropertyId) {
            setBookingError("Booking system loading, please wait...");
            return;
        }
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

            // Initiate Razorpay payment for the advance amount
            let paymentResult;
            try {
                paymentResult = await initiateRazorpayPayment({
                    amount: payNow,
                    customerName,
                    customerEmail: formData.email || undefined,
                    customerPhone: formData.phone,
                    description: `Staycation - ${property.name}${selectedRoom ? ` (${selectedRoom.name})` : ''}`,
                    notes: {
                        bookingType: "staycation",
                        property: property.name,
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

            const roomId = selectedRoom?.id || '';
            const subPropertyId = selectedRoom
                ? (dbSubPropertyMap[roomId] || dbSubPropertyMap[roomId.split('/').pop() || ''] || undefined)
                : undefined;

            // Build addons
            const bookingAddons: any[] = [];
            if (celebrationAddon) bookingAddons.push({ name: 'Celebration Add-on', price: CELEBRATION_ADDON_PRICE, description: 'Cake, balloons, and a banner for a warm ambiance', cakeMessage: celebrationCakeMsg || '', occasion: celebrationOccasion });
            if (isAmbrose || isAmstelNest) bookingAddons.push({ name: 'Food Preference', foodType });

            const payload = {
                customerName,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                propertyId: dbPropertyId,
                subPropertyId: subPropertyId || null,
                numGuests: adults,
                numKids: kids,
                numPets: pets,
                numCottages: isAmstelNest ? unitCount : 1,
                checkInDate: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}` : undefined,
                checkOutDate: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}` : undefined,
                nightlyRate,
                basePrice: roomPrice,
                extraPersonCharge: extraCharges,
                extraAdultCharge: extraAdultTotal * nights,
                extraKidsCharge: kidsTotal * nights,
                gstAmount: taxesAndFees,
                totalAmount,
                advanceAmount: payNow,
                balanceAmount: payAtVenue,
                securityDeposit: parseInt((property.securityDeposit || '3000').replace(/,/g, '')),
                advancePaid: true,
                advanceMethod: `Razorpay: ${paymentResult.razorpay_payment_id}`,
                source: "website",
                couponCode: appliedCoupon?.code || null,
                addons: bookingAddons.length > 0 ? bookingAddons : null,
            };

            const firstResult = await api.post("/bookings/staycation", payload);

            // Upload ID proof to S3 (fire-and-forget — booking succeeds even if upload fails)
            if (formData.aadhaarFile && firstResult?.id) {
                try {
                    const uploadForm = new FormData();
                    uploadForm.append("file", formData.aadhaarFile);
                    uploadForm.append("bookingId", String(firstResult.id));
                    await fetch("/api/uploads/guest-id-public", {
                        method: "POST",
                        body: uploadForm,
                    });
                } catch (uploadErr) {
                    console.error("ID upload failed (booking succeeded):", uploadErr);
                }
            }

            // Clear unified cart after booking
            if (isAmstelNest) localStorage.removeItem('ambrose_cart');

            // Release the hold after successful booking
            if (holdSessionId) {
                fetch(`/api/bookings/staycation/hold/${holdSessionId}`, { method: 'DELETE' }).catch(() => {});
                setHoldSessionId(null);
            }

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
                    <div className={`flex-1 w-full ${isSingleRoom && currentStep === 1 ? 'lg:max-w-full' : 'lg:max-w-[700px]'}`}>

                        {/* STEP 1: SELECT ROOM */}
                        {currentStep === 1 && (
                            <div className="space-y-6">

                                {/* ─── SINGLE-ROOM PROPERTY: Wider redesigned layout ─── */}
                                {isSingleRoom && roomOptions.length > 0 && (() => {
                                    const room = roomOptions[0];
                                    return (
                                        <>
                                            {/* Property Card — Full Width */}
                                            <div className="bg-white border border-border-light shadow-sm rounded-lg overflow-hidden">
                                                <div className="relative w-full h-[220px] sm:h-[260px] bg-soft-gray">
                                                    <Image src={room.image} alt={room.name} fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                                        <div className="inline-block px-3 py-1 mb-2 border border-white/30 rounded-full bg-white/10 backdrop-blur-sm text-[10px] font-inter uppercase tracking-widest text-white">
                                                            {room.theme}
                                                        </div>
                                                        <h3 className="font-cinzel text-xl tracking-wide text-white uppercase">{room.name}</h3>
                                                    </div>
                                                </div>
                                                <div className="p-5 sm:p-6">
                                                    <p className="font-inter text-sm text-text-secondary leading-relaxed mb-4">{room.description}</p>
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-inter text-text-secondary pb-4 border-b border-border-light">
                                                        <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> {room.persons}</div>
                                                        <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> {room.details[0]}</div>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                                                        <div className="flex items-end gap-1.5">
                                                            <p className="text-[10px] font-inter text-text-muted uppercase tracking-wider">Starting from</p>
                                                            <span className="font-cinzel text-xl font-semibold text-text-primary">{formatPrice(room.price)}</span>
                                                            <span className="text-[10px] font-inter text-text-muted mb-0.5">/ Night</span>
                                                        </div>
                                                        <ul className="flex flex-wrap gap-2">
                                                            {room.details.slice(0, 3).map((d: string, i: number) => (
                                                                <li key={i} className="flex items-center gap-1 text-[10px] font-inter text-text-muted bg-soft-gray/50 px-2 py-1 rounded-full">
                                                                    <div className="w-1 h-1 rounded-full bg-antique-gold shrink-0" />{d}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Inline Date Selection + Calendar + Your Stay for single-room */}
                                            <DateSelectionBar
                                                checkIn={checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}` : undefined}
                                                checkOut={checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}` : undefined}
                                                disabledDates={bookedDatesForPicker.size > 0 ? bookedDatesForPicker : undefined}
                                                onDatesChange={(ci, co) => {
                                                    const ciDate = new Date(ci + 'T12:00:00');
                                                    const coDate = new Date(co + 'T12:00:00');
                                                    handleDatesChange(ciDate, coDate, 0, Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000*60*60*24)));
                                                }}
                                                onCheckoutCleared={() => { setCheckOutDate(null); setNights(0); }}
                                            />
                                            <AvailabilityCalendar
                                                propertyId={dbPropertyId}
                                                subPropertyId={property.id.includes('/') ? (dbSubPropertyMap[property.id.split('/').pop() || ''] || null) : null}
                                                weekdayPrice={room.weekdayPrice || property.pricing.weekday.price}
                                                weekendPrice={room.weekendPrice || property.pricing.weekend.price}
                                                saturdayPrice={room.saturdayPrice}
                                                primeDatePrice={room.primeDatePrice || property.pricing.primeDates || ""}
                                                initialCheckIn={checkInDate}
                                                initialCheckOut={checkOutDate}
                                                isDisabled={isMaintenance}
                                                compact
                                            />

                                            {/* Your Stay — inline */}
                                            <div className="bg-white border border-border-light shadow-sm">
                                                <div className="p-5 border-b border-border-light">
                                                    <h2 className="font-cinzel text-base tracking-widest text-text-primary uppercase">Your Stay</h2>
                                                </div>
                                                <div className="p-5 border-b border-border-light">
                                                    <p className="font-inter text-xs uppercase tracking-widest text-text-muted mb-2">{room.theme}</p>
                                                    <p className="font-inter text-xs text-text-primary leading-relaxed pb-3 border-b border-border-light mb-3 italic">{room.name}</p>
                                                    {(() => {
                                                        if (!checkInDate || nights <= 0) return (
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-inter text-xl text-text-primary">{formatPrice(room.price)}</span>
                                                                <span className="font-inter text-[10px] text-text-muted">/ Night</span>
                                                            </div>
                                                        );
                                                        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                        const wdP = parseInt((room.weekdayPrice || '0').toString().replace(/,/g, ''));
                                                        const weP = parseInt((room.weekendPrice || '0').toString().replace(/,/g, ''));
                                                        const saP = parseInt((room.saturdayPrice || room.weekendPrice || '0').toString().replace(/,/g, ''));
                                                        const perNight: {day: string; price: number}[] = [];
                                                        for (let i = 0; i < nights; i++) {
                                                            const d = new Date(checkInDate); d.setDate(d.getDate() + i);
                                                            const dw = d.getDay();
                                                            const p = dw === 6 ? saP : (dw === 0 || dw === 5) ? weP : wdP;
                                                            perNight.push({ day: DAY_NAMES[dw], price: p });
                                                        }
                                                        return (
                                                            <div className="space-y-1.5">
                                                                {perNight.map((n, i) => (
                                                                    <div key={i} className="flex justify-between items-center">
                                                                        <span className="font-inter text-xs text-text-muted">{n.day}</span>
                                                                        <span className="font-inter text-sm text-text-primary">{formatPrice(n.price)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="p-5 border-b border-border-light space-y-3 font-inter text-sm text-text-primary">
                                                    <div className="flex justify-between items-center"><span>Room Price</span><span>{formatPrice(roomPrice)}</span></div>
                                                    <div className="flex justify-between items-center"><span>Taxes</span><span>{formatPrice(taxesAndFees)}</span></div>
                                                </div>
                                                <div className="p-5 bg-soft-gray/30">
                                                    <div className="flex justify-between items-center font-inter">
                                                        <span className="text-sm font-semibold text-text-primary">Total Amount</span>
                                                        <span className="text-xl font-medium text-text-primary">{formatPrice(totalAmount)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Book Now Button */}
                                            <button
                                                onClick={() => handleRoomSelect(room)}
                                                disabled={!checkInDate || !checkOutDate || nights <= 0 || hasBookedDateConflict}
                                                className={`w-full py-3.5 rounded-lg font-cinzel text-sm tracking-widest uppercase transition-all ${
                                                    checkInDate && checkOutDate && nights > 0 && !hasBookedDateConflict
                                                        ? 'bg-gradient-to-r from-antique-gold to-dark-gold text-white hover:shadow-lg hover:shadow-antique-gold/20'
                                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                                                }`}
                                            >
                                                {checkInDate && checkOutDate && nights > 0 && !hasBookedDateConflict ? 'Book Now' : 'Select dates to continue'}
                                            </button>
                                        </>
                                    );
                                })()}

                                {/* ─── MULTI-ROOM PROPERTY: Existing card layout ─── */}
                                {!isSingleRoom && (
                                    <>
                                        <h2 className="font-inter text-sm font-semibold text-text-primary mb-4">{isAmstelNest ? 'Select your cottage type' : 'Rooms for your search'}</h2>
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
                                                                <li className="flex items-start gap-2 text-xs font-inter text-text-secondary"><div className="w-1 h-1 rounded-full bg-antique-gold mt-1.5 shrink-0" /><span className="text-blue-600">Max 6 guests</span></li>
                                                            </ul>
                                                        </div>
                                                        <div className="mt-6 flex flex-col items-end border-t border-border-light pt-4 border-dashed">
                                                            <p className="text-[10px] font-inter text-text-muted uppercase tracking-wider mb-1">Exclusive Rate</p>
                                                            <div className="flex items-end gap-1 mb-3">
                                                                <span className="font-cinzel text-lg font-semibold text-text-primary">{formatPrice(room.price)}</span>
                                                                <span className="text-[10px] font-inter text-text-muted mb-1">/ Night{isAmstelNest && unitCount > 1 ? ` × ${unitCount}` : ''}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRoomSelect(room)}
                                                                disabled={!checkInDate || !checkOutDate || nights <= 0}
                                                                className={`px-8 py-2 border font-inter text-xs tracking-wider uppercase transition-all w-32 ${
                                                                    checkInDate && checkOutDate && nights > 0
                                                                        ? 'border-antique-gold text-antique-gold hover:bg-antique-gold hover:text-white'
                                                                        : 'border-slate-200 text-slate-300 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                SELECT
                                                            </button>
                                                            {(!checkInDate || !checkOutDate) && (
                                                                <p className="text-[9px] font-inter text-red-400 mt-1.5 text-right">Select dates first</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">First Name*</label>
                                            <input type="text" required placeholder="First Name" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Last Name*</label>
                                            <input type="text" required placeholder="Last Name" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Email (Optional)</label>
                                            <input type="email" placeholder="Email" className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold placeholder:text-text-muted" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Mobile*</label>
                                            <div className="flex items-center border-b border-border-medium focus-within:border-antique-gold transition-colors">
                                                <span className="text-sm text-text-primary font-inter px-1 shrink-0">+91</span>
                                                <input type="tel" required placeholder="Mobile Number" maxLength={10} className="w-full bg-transparent border-0 rounded-none px-2 py-2 font-inter text-sm text-text-primary focus:ring-0 placeholder:text-text-muted" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
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
                                        <p className="font-inter text-[10px] text-text-muted mb-4">Base price includes up to {baseIncludedPersons} persons. Max {maxGuests} guests total (up to {maxAdultsCap} adults, {maxKidsCap} kids).</p>
                                        <div className="flex flex-wrap gap-6">
                                            <div className="flex items-center gap-3">
                                                <label className="font-inter text-xs text-text-secondary w-12">Adults</label>
                                                <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">−</button>
                                                <span className="font-inter text-sm text-text-primary w-4 text-center">{adults}</span>
                                                <button type="button" onClick={() => setAdults(Math.min(effectiveMaxAdults, adults + 1))} disabled={adults >= effectiveMaxAdults} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="font-inter text-xs text-text-secondary w-16">Kids (5-12)</label>
                                                <button type="button" onClick={() => setKids(Math.max(0, kids - 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">−</button>
                                                <span className="font-inter text-sm text-text-primary w-4 text-center">{kids}</span>
                                                <button type="button" onClick={() => { const newKids = Math.min(effectiveMaxKids, kids + 1); setKids(newKids); if (adults + newKids > maxGuests) setAdults(Math.max(1, maxGuests - newKids)); }} disabled={kids >= effectiveMaxKids || totalGuests >= maxGuests} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                            </div>
                                        </div>
                                        {totalGuests >= maxGuests && (
                                            <p className="mt-2 text-[10px] font-inter text-amber-600 font-medium">Maximum {maxGuests} guests reached.</p>
                                        )}
                                        {(extraAdults > 0 || extraKids > 0) && (
                                            <div className="mt-3 pt-3 border-t border-border-light text-[10px] font-inter text-text-muted space-y-1">
                                                {extraAdults > 0 && <p>Extra adults: {extraAdults} × ₹{property.pricing.extraAdult}/night = ₹{(extraAdultTotal).toLocaleString("en-IN")}/night</p>}
                                                {extraKids > 0 && <p>Extra kids: {extraKids} × ₹{kidsChargeNum.toLocaleString("en-IN")}/night = ₹{kidsTotal.toLocaleString("en-IN")}/night</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pet Input (pet-friendly properties only) */}
                                    {property.petsAllowed && (
                                        <div className="mb-6 p-4 border border-border-light rounded-lg bg-soft-gray/30">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-inter text-xs font-semibold text-text-primary uppercase tracking-wider">Bringing Pets?</h4>
                                                    <p className="font-inter text-[10px] text-text-muted mt-1">₹{PET_CHARGE}/pet · Max 2 pets allowed</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setPets(Math.max(0, pets - 1))} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm">−</button>
                                                    <span className="font-inter text-sm text-text-primary w-4 text-center">{pets}</span>
                                                    <button type="button" onClick={() => setPets(Math.min(2, pets + 1))} disabled={pets >= 2} className="w-7 h-7 rounded-full border border-border-medium flex items-center justify-center text-text-muted hover:border-antique-gold hover:text-antique-gold transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                </div>
                                            </div>
                                            {pets > 0 && (
                                                <p className="mt-2 text-[10px] font-inter text-text-muted">Pet charges: {pets} × ₹{PET_CHARGE} = ₹{(pets * PET_CHARGE).toLocaleString('en-IN')}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Celebration Add-on (all properties) */}
                                    {(
                                        <div className="mb-6 p-4 border border-antique-gold/30 rounded-lg bg-antique-gold/5">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="celebration-addon"
                                                    checked={celebrationAddon}
                                                    onChange={(e) => setCelebrationAddon(e.target.checked)}
                                                    className="mt-1 w-4 h-4 accent-[#B8860B] cursor-pointer"
                                                />
                                                <label htmlFor="celebration-addon" className="cursor-pointer flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                                        <h4 className="font-inter text-sm font-semibold text-text-primary">Celebration Add-on</h4>
                                                        <span className="font-cinzel text-sm font-semibold text-dark-gold whitespace-nowrap">+ ₹{CELEBRATION_ADDON_PRICE.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <p className="font-inter text-xs text-text-secondary mt-1">Includes: Cake, balloons, and a banner for a warm ambiance</p>
                                                </label>
                                                {celebrationImageUrl && (
                                                    <div className="shrink-0 flex flex-col items-center gap-1">
                                                        <button type="button" onClick={(e) => { e.preventDefault(); setCelebrationPreviewOpen(true); }} className="w-[78px] h-[78px] sm:w-[92px] sm:h-[92px] rounded-lg overflow-hidden border border-antique-gold/30 hover:border-antique-gold hover:shadow-md transition-all cursor-pointer relative group">
                                                            <Image src={celebrationImageUrl} alt="Celebration preview" fill className="object-cover" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                            </div>
                                                        </button>
                                                        <span className="text-[9px] font-inter text-text-muted">Click to view</span>
                                                    </div>
                                                )}
                                            </div>
                                            {celebrationAddon && (
                                                <div className="mt-4 space-y-3 pl-7 animate-in fade-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="block font-inter text-xs text-text-secondary mb-1.5">Banner / Occasion</label>
                                                        <select value={celebrationOccasion} onChange={(e) => setCelebrationOccasion(e.target.value)} className="w-full bg-white border border-border-medium rounded-lg px-3 py-2.5 text-sm font-inter text-text-primary focus:border-antique-gold focus:outline-none transition-colors">
                                                            <option>Birthday</option>
                                                            <option>Anniversary</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

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

                                    {/* Food Preference — Ambrose & Amstel Nest only (compulsory) */}
                                    {(isAmbrose || isAmstelNest) && (
                                        <div className="mb-6 p-4 border border-emerald-200 rounded-lg bg-emerald-50/50">
                                            <h4 className="font-inter text-sm font-semibold text-text-primary mb-1">Food Preference <span className="text-red-500">*</span></h4>
                                            <p className="font-inter text-[10px] text-text-muted mb-3 uppercase tracking-wider">Both options are vegetarian only</p>
                                            <div className="flex gap-3">
                                                <button type="button" onClick={() => setFoodType('Regular')} className={`flex-1 py-2.5 rounded-lg text-sm font-inter font-semibold transition-all border ${foodType === 'Regular' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-text-secondary border-border-medium hover:border-emerald-300'}`}>Regular (Veg)</button>
                                                <button type="button" onClick={() => setFoodType('Jain')} className={`flex-1 py-2.5 rounded-lg text-sm font-inter font-semibold transition-all border ${foodType === 'Jain' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-text-secondary border-border-medium hover:border-emerald-300'}`}>Jain (Veg)</button>
                                            </div>
                                        </div>
                                    )}

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
                                                    <span className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                        {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`} applied
                                                    </span>
                                                </div>
                                                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-red-400 text-xs font-inter hover:text-red-600">Remove</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex gap-2 mb-3">
                                                    <input type="text" placeholder="Enter coupon code" className="flex-1 bg-white border border-border-light rounded-lg px-3 py-2 text-sm font-inter text-text-primary outline-none focus:border-antique-gold uppercase tracking-wider" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                                                    <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="bg-antique-gold text-white font-inter text-xs font-medium px-4 py-2 rounded-lg hover:bg-dark-gold transition-colors whitespace-nowrap disabled:opacity-40">
                                                        {couponLoading ? "..." : "Apply"}
                                                    </button>
                                                </div>
                                                {couponError && <p className="text-red-500 text-[10px] font-inter mt-1">{couponError}</p>}
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

                                    <div className="hidden sm:flex justify-between items-center border-t border-border-light pt-6 mt-6">
                                        <button type="button" onClick={() => setCurrentStep(1)} className="font-inter text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary px-4 py-2">Back</button>
                                        <button type="submit" className="bg-[#2A2A2A] text-white px-8 py-3 text-xs font-inter uppercase tracking-widest hover:bg-black transition-colors">Proceed to Payment</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar — shown on steps 1 & 2 only; hidden for single-room step 1 (inlined above) */}
                    {currentStep <= 2 && !(isSingleRoom && currentStep === 1) && (
                        <div className="flex-1 w-full lg:max-w-[360px] sticky top-24 space-y-4 lg:ml-auto">
                            {/* Date Selection Bar — Step 1 only (multi-room properties) */}
                            {currentStep === 1 && (
                            <>
                            <DateSelectionBar
                                checkIn={checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,'0')}-${String(checkInDate.getDate()).padStart(2,'0')}` : undefined}
                                checkOut={checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,'0')}-${String(checkOutDate.getDate()).padStart(2,'0')}` : undefined}
                                disabledDates={bookedDatesForPicker.size > 0 ? bookedDatesForPicker : undefined}
                                onDatesChange={(ci, co) => {
                                    const ciDate = new Date(ci + 'T12:00:00');
                                    const coDate = new Date(co + 'T12:00:00');
                                    handleDatesChange(ciDate, coDate, 0, Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000*60*60*24)));
                                }}
                                onCheckoutCleared={() => { setCheckOutDate(null); setNights(0); }}
                            />
                            {/* Calendar in sidebar — always show in Step 1 */}
                            <AvailabilityCalendar
                                    propertyId={dbPropertyId}
                                    subPropertyId={property.id.includes('/') ? (dbSubPropertyMap[property.id.split('/').pop() || ''] || null) : null}
                                    weekdayPrice={selectedRoom?.weekdayPrice || roomOptions[0]?.weekdayPrice || property.pricing.weekday.price}
                                    weekendPrice={selectedRoom?.weekendPrice || roomOptions[0]?.weekendPrice || property.pricing.weekend.price}
                                    saturdayPrice={selectedRoom?.saturdayPrice || roomOptions[0]?.saturdayPrice}
                                    primeDatePrice={selectedRoom?.primeDatePrice || roomOptions[0]?.primeDatePrice || property.pricing.primeDates || ""}
                                    initialCheckIn={checkInDate}
                                    initialCheckOut={checkOutDate}
                                    isDisabled={isMaintenance}
                                    compact
                                />
                            </>
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
                                        {(() => {
                                            if (!checkInDate || nights <= 0) return (
                                                <div className="flex justify-between items-center">
                                                    <span className="font-inter text-xl text-text-primary">{formatPrice(nightlyRate)}</span>
                                                    <span className="font-inter text-[10px] text-text-muted">/ Night</span>
                                                </div>
                                            );
                                            const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                            const wdP = parseInt((selectedRoom.weekdayPrice || '0').toString().replace(/,/g, ''));
                                            const weP = parseInt((selectedRoom.weekendPrice || '0').toString().replace(/,/g, ''));
                                            const saP = parseInt((selectedRoom.saturdayPrice || selectedRoom.weekendPrice || '0').toString().replace(/,/g, ''));
                                            const perNight: {day: string; price: number}[] = [];
                                            for (let i = 0; i < nights; i++) {
                                                const d = new Date(checkInDate); d.setDate(d.getDate() + i);
                                                const dw = d.getDay();
                                                const p = dw === 6 ? saP : (dw === 0 || dw === 5) ? weP : wdP;
                                                perNight.push({ day: DAY_NAMES[dw], price: p });
                                            }
                                            const units = isAmstelNest ? unitCount : 1;
                                            return (
                                                <div className="space-y-1.5">
                                                    {perNight.map((n, i) => (
                                                        <div key={i} className="flex justify-between items-center">
                                                            <span className="font-inter text-xs text-text-muted">{n.day}</span>
                                                            <span className="font-inter text-sm text-text-primary">{formatPrice(n.price * units)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="p-5 border-b border-border-light">
                                        <p className="font-inter text-xs text-text-muted italic">Not selected</p>
                                    </div>
                                )}

                                <div className="p-5 border-b border-border-light space-y-3 font-inter text-sm text-text-primary">
                                    <div className="flex justify-between items-center"><span>Room Price</span><span>{formatPrice(roomPrice)}</span></div>
                                    {extraCharges > 0 && <div className="flex justify-between items-center text-text-secondary text-xs"><span>Extra Guests</span><span>{formatPrice(extraCharges)}</span></div>}
                                    {petCharges > 0 && <div className="flex justify-between items-center text-text-secondary text-xs"><span>Pets ({pets} × ₹{PET_CHARGE})</span><span>{formatPrice(petCharges)}</span></div>}
                                    {discountAmount > 0 && <div className="flex justify-between items-center text-green-600 text-xs"><span>Discount ({appliedCoupon?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
                                    {celebrationAddon && <div className="flex justify-between items-center text-xs text-amber-700"><span>Celebration Add-on</span><span>{formatPrice(CELEBRATION_ADDON_PRICE)}</span></div>}
                                    <div className="flex justify-between items-center"><span>Taxes</span><span>{formatPrice(taxesAndFees)}</span></div>
                                </div>

                                <div className="p-5 bg-soft-gray/30">
                                    <div className="flex justify-between items-center font-inter">
                                        <span className="text-sm font-semibold text-text-primary">Total Amount</span>
                                        <span className="text-xl font-medium text-text-primary">{formatPrice(totalAmount)}</span>
                                    </div>
                                    {/* Mobile-only: Back & Payment buttons under Total */}
                                    {currentStep === 2 && !showLoginPrompt && (
                                        <div className="flex justify-between items-center border-t border-border-light pt-4 mt-4 sm:hidden">
                                            <button type="button" onClick={() => setCurrentStep(1)} className="font-inter text-xs tracking-wider uppercase text-text-secondary hover:text-text-primary px-4 py-2">Back</button>
                                            <button type="button" onClick={(e) => { const form = document.querySelector('form'); if (form) form.requestSubmit(); }} className="bg-[#2A2A2A] text-white px-8 py-3 text-xs font-inter uppercase tracking-widest hover:bg-black transition-colors">Proceed to Payment</button>
                                        </div>
                                    )}
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

                {/* STEP 3: CONFIRM & PAY — Multi-booking style */}
                {currentStep === 3 && (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        {/* Icon Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-in</span>
                                <span className="font-cinzel text-base font-semibold text-text-primary block">{checkInDate ? formatDateShort(checkInDate) : "—"}</span>
                                <span className="font-inter text-xs text-text-muted">{property.checkIn}</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Check-out</span>
                                <span className="font-cinzel text-base font-semibold text-text-primary block">{checkOutDate ? formatDateShort(checkOutDate) : "—"}</span>
                                <span className="font-inter text-xs text-text-muted">{property.checkOut}</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Duration</span>
                                <span className="font-cinzel text-2xl font-bold text-text-primary block">{nights}</span>
                                <span className="font-inter text-xs text-text-muted">Night{nights > 1 ? "s" : ""}</span>
                            </div>
                            <div className="bg-white border border-border-light rounded-xl p-4 text-center shadow-sm">
                                <span className="text-text-muted text-[10px] font-inter uppercase tracking-wider block mb-1">Total Guests</span>
                                <span className="font-cinzel text-2xl font-bold text-text-primary block">{totalGuests}</span>
                                <span className="font-inter text-xs text-text-muted">{adults} Adult{adults > 1 ? "s" : ""}{kids > 0 ? ` · ${kids} Kid${kids > 1 ? "s" : ""}` : ""}</span>
                            </div>
                        </div>

                        {/* Booking Confirmation Card */}
                        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
                            <h2 className="font-cinzel text-xl font-semibold text-text-primary mb-6">Booking Confirmation</h2>
                            <div className="space-y-2 mb-6 font-inter text-sm">
                                <p className="text-text-secondary">Guest: <span className="text-text-primary font-medium">{formData.firstName} {formData.lastName}</span></p>
                                <p className="text-text-secondary">Phone: <span className="text-text-primary font-medium">+91 {formData.phone}</span></p>
                                {formData.email && <p className="text-text-secondary">Email: <span className="text-text-primary font-medium">{formData.email}</span></p>}
                                {formData.gst && <p className="text-text-secondary">GST: <span className="text-text-primary font-medium">{formData.gst}</span></p>}
                            </div>

                            {/* Villa Card with Thumbnail */}
                            {selectedRoom && (
                                <div className="border border-border-light rounded-lg p-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-soft-gray shrink-0 relative">
                                            {(mainThumb || property.images[0]) && <Image src={mainThumb || property.images[0]} alt={selectedRoom.name} fill className="object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] text-dark-gold font-inter uppercase tracking-wider">{selectedRoom.type}</span>
                                            <h4 className="font-cinzel font-semibold text-text-primary">{selectedRoom.name}{unitCount > 1 ? ` × ${unitCount}` : ""}</h4>
                                            <p className="text-xs text-text-muted font-inter">{adults} adult{adults > 1 ? "s" : ""}{kids > 0 ? `, ${kids} kid${kids > 1 ? "s" : ""}` : ""}{unitCount > 1 ? " per unit" : ""}</p>
                                        </div>
                                        <span className="font-inter font-semibold text-text-primary">{formatPrice(roomPrice + extraCharges)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Pricing Breakdown */}
                            <div className="border-t border-border-light pt-4 space-y-2 font-inter text-sm">
                                <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(roomPrice + extraCharges)}</span></div>
                                {celebrationAddon && <div className="flex justify-between text-amber-700 text-xs"><span>Celebration Add-on</span><span>{formatPrice(CELEBRATION_ADDON_PRICE)}</span></div>}
                                {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({appliedCoupon?.code})</span><span>-{formatPrice(discountAmount)}</span></div>}
                                <div className="flex justify-between"><span className="text-text-secondary">GST ({property.gstPercent}%)</span><span>{formatPrice(taxesAndFees)}</span></div>
                                <div className="flex justify-between text-base font-bold pt-2"><span>Grand Total</span><span className="text-antique-gold">{formatPrice(totalAmount)}</span></div>
                                <div className="flex justify-between text-xs text-sky-600 mt-1">
                                    <span>Refundable Security Deposit <span className="text-[10px] text-text-muted">(at check-in)</span></span>
                                    <span>{"\u20B9"}{parseInt((property.securityDeposit || '3000').replace(/,/g, '')).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between text-sm"><span className="text-amber-800 font-medium">Pay Now (80%)</span><span className="font-bold text-amber-900">{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-amber-600 mt-1"><span>Balance at venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                </div>
                            </div>
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
                                <div className="border-t border-border-light pt-3">
                                    <h4 className="font-inter text-xs font-semibold text-text-primary mb-1">Security Deposit</h4>
                                    <p className="font-inter text-[11px] text-text-secondary leading-relaxed">Security deposit of {"\u20B9"}{property.securityDeposit} is applicable and will be refunded per the property&apos;s refund timeline.</p>
                                </div>
                            </div>
                        </div>

                        {bookingError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-inter">
                                <p className="font-medium">{bookingError}</p>
                                {bookingError.toLowerCase().includes("booked") && (
                                    <button onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-2 text-red-800 underline text-xs font-semibold">
                                        Go back to Step 1 and select different dates
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="px-6 py-3 border border-border-medium text-text-primary font-inter text-sm rounded-lg hover:bg-soft-gray transition-colors">Back</button>
                            <button
                                onClick={handlePayment}
                                disabled={isSubmitting || !dbPropertyId}
                                className="flex-1 bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm py-3.5 rounded-lg hover:shadow-lg hover:shadow-antique-gold/20 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? "Processing..." : `Pay ${formatPrice(payNow)} Now`}
                            </button>
                        </div>

                        <p className="font-inter text-[11px] text-text-muted flex items-center gap-2 justify-center">
                            <svg className="w-3.5 h-3.5 text-antique-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            A copy of the invoice will be sent to your registered email &amp; phone number upon confirmation.
                        </p>
                    </div>
                )}
            </main>

            {/* Phone Auth Modal */}
            {showPhoneAuth && (
                <PhoneAuthModal
                    onClose={() => setShowPhoneAuth(false)}
                    onSuccess={() => { setShowPhoneAuth(false); window.location.reload(); }}
                />
            )}
        </div>
    );
}
