"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CelebrationPackage, ScreenData, timeSlots, formatPrice } from "../../../../data/celebrations";
import { api } from "../../../../../lib/api";

interface CelebrationBookingClientProps {
    pkg: CelebrationPackage;
    screen: ScreenData;
}

export default function CelebrationBookingClient({ pkg, screen }: CelebrationBookingClientProps) {
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState(1);
    const [guestCount, setGuestCount] = useState(2);

    // Guest details
    const [title, setTitle] = useState("Mr.");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialRequests, setSpecialRequests] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [idVerificationMethod, setIdVerificationMethod] = useState<"online" | "venue">("venue");
    const [idProofs, setIdProofs] = useState<(File | null)[]>([null, null]);

    // Add-ons (both Movie Time and Celebration packages)
    const [addBalloons, setAddBalloons] = useState(false);
    const [addLedBanner, setAddLedBanner] = useState(false);
    const [ledBannerType, setLedBannerType] = useState("Happy Birthday");
    const [addCake, setAddCake] = useState(false);
    const [cakeMessage, setCakeMessage] = useState("");
    const [idProofErrors, setIdProofErrors] = useState<string[]>(["", ""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");

    // Login prompt state
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [emailMode, setEmailMode] = useState<false | "login" | "register">(false);
    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authName, setAuthName] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    // DB IDs for screen and package (fetched by slug)
    const [dbScreenId, setDbScreenId] = useState<number | null>(null);
    const [dbPackageId, setDbPackageId] = useState<number | null>(null);
    const [isScreenDisabled, setIsScreenDisabled] = useState(false);
    const [isPackageDisabled, setIsPackageDisabled] = useState(false);
    const [livePricing, setLivePricing] = useState<{ hours: number; weekday: number; weekend: number; id?: number }[] | null>(null);
    const [liveExtraPerson, setLiveExtraPerson] = useState<number | null>(null);
    const [liveAddonPricing, setLiveAddonPricing] = useState<Record<string, number> | null>(null);
    const [liveExtraHourRate, setLiveExtraHourRate] = useState<number | null>(null);
    // DD pricing overrides: key = 'pricingId-YYYY-MM-DD', value = override price
    const [ddOverrides, setDdOverrides] = useState<Record<string, number>>({});
    
    // Blocked/Booked slots tracking
    const [bookedSlots, setBookedSlots] = useState<number[]>([]);

    // Auto-enable ALL add-ons for Celebration (Decoration + Movie Time) package
    useEffect(() => {
        if (pkg.id === "celebration") {
            setAddBalloons(true);
            setAddLedBanner(true);
            setAddCake(true);
        }
    }, [pkg.id]);

    // Load user data if logged in
    useEffect(() => {
        const token = localStorage.getItem("galaxia_token");
        const userStr = localStorage.getItem("galaxia_user");
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setEmail(user.email || "");
                setPhone(user.phone || "");
            } catch {}
        }
    }, []);

    // Listen for Cognito popup success
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data === "COGNITO_LOGIN_SUCCESS") {
                setShowLoginPrompt(false);
                const userStr = localStorage.getItem("galaxia_user");
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        setEmail(user.email || "");
                        setPhone(user.phone || "");
                    } catch {}
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Guest login handler
    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError("");
        try {
            const res = await fetch(`${typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: authEmail, password: authPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            setEmail(data.user.email || "");
            setPhone(data.user.phone || "");
            setShowLoginPrompt(false);
            setEmailMode(false);
        } catch (err: any) {
            setAuthError(err.message || "Login failed");
        } finally {
            setAuthLoading(false);
        }
    };

    // Guest register handler
    const handleGuestRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError("");
        try {
            const res = await fetch(`${typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName: authName, email: authEmail, phone: authPhone, password: authPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            setEmail(authEmail);
            setPhone(authPhone);
            setShowLoginPrompt(false);
            setEmailMode(false);
        } catch (err: any) {
            setAuthError(err.message || "Registration failed");
        } finally {
            setAuthLoading(false);
        }
    };

    // Fetch DB IDs + live pricing on mount
    useEffect(() => {
        (async () => {
            try {
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                const [screensRes, packagesRes] = await Promise.all([
                    fetch(`${baseUrl}/dd/screens`),
                    fetch(`${baseUrl}/dd/packages`),
                ]);
                const screens = screensRes.ok ? await screensRes.json() : [];
                const packages = packagesRes.ok ? await packagesRes.json() : [];
                const dbScreen = screens.find((s: any) => s.slug === screen.id);
                const dbPackage = packages.find((p: any) => p.slug === pkg.id);
                if (dbScreen) {
                    setDbScreenId(dbScreen.id);
                    if (dbScreen.isActive === false) setIsScreenDisabled(true);
                }
                if (dbPackage) {
                    setDbPackageId(dbPackage.id);
                    if (dbPackage.isActive === false) setIsPackageDisabled(true);
                    // Use live pricing from DB
                    if (dbPackage.pricing && dbPackage.pricing.length > 0) {
                        setLivePricing(dbPackage.pricing.map((p: any) => ({
                            id: p.id,
                            hours: p.hours,
                            weekday: p.weekdayPrice,
                            weekend: p.weekendPrice,
                            weekdayDiscount: p.weekdayDiscount || 0,
                            weekendDiscount: p.weekendDiscount || 0,
                        })));
                        // Build overrides map: 'pricingId-YYYY-MM-DD' -> price
                        const ovMap: Record<string, number> = {};
                        for (const p of dbPackage.pricing) {
                            if (p.overrides && Array.isArray(p.overrides)) {
                                for (const ov of p.overrides) {
                                    const dateKey = new Date(ov.overrideDate).toISOString().split('T')[0];
                                    ovMap[`${p.id}-${dateKey}`] = ov.price;
                                }
                            }
                        }
                        setDdOverrides(ovMap);
                    }
                    if (dbPackage.extraPersonPrice != null) setLiveExtraPerson(dbPackage.extraPersonPrice);
                    if (dbPackage.addonPricing && typeof dbPackage.addonPricing === 'object') setLiveAddonPricing(dbPackage.addonPricing as Record<string, number>);
                    if (dbPackage.extraHourRate != null) setLiveExtraHourRate(dbPackage.extraHourRate);
                }
            } catch (err) {
                console.error("Failed to fetch DD data:", err);
            }
        })();
    }, [screen.id, pkg.id]);

    const isMaintenance = isScreenDisabled || isPackageDisabled;

    // Sync ID proof array length with guest count
    const syncIdProofs = (count: number) => {
        setIdProofs(prev => {
            const arr = [...prev];
            while (arr.length < count) arr.push(null);
            return arr.slice(0, count);
        });
        setIdProofErrors(prev => {
            const arr = [...prev];
            while (arr.length < count) arr.push("");
            return arr.slice(0, count);
        });
    };

    // Date navigation
    const [weekOffset, setWeekOffset] = useState(0);
    const weekStart = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + weekOffset * 7);
        return d;
    }, [weekOffset]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    // Fetch availability when selectedDate or dbScreenId changes
    useEffect(() => {
        let isMounted = true;
        if (!dbScreenId || !selectedDate) return;
        
        const fetchAvailability = async () => {
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                const res = await fetch(`${baseUrl}/dd/availability/${dateStr}`);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    const slots: number[] = [];
                    
                    // Add booked hours ranges
                    if (data.bookings && Array.isArray(data.bookings)) {
                        data.bookings.forEach((b: any) => {
                            if (b.screenId === dbScreenId) {
                                for (let i = 0; i < b.durationHours; i++) {
                                    slots.push(b.startHour + i);
                                }
                            }
                        });
                    }
                    
                    // Add blocked hours or full days
                    if (data.blocked && Array.isArray(data.blocked)) {
                        data.blocked.forEach((bk: any) => {
                            if (bk.screenId === dbScreenId) {
                                if (bk.isHalfDay && bk.startHour && bk.endHour) {
                                    for (let i = bk.startHour; i < bk.endHour; i++) {
                                        slots.push(i);
                                    }
                                } else if (!bk.isHalfDay) {
                                    // Block all typical slots (e.g. 10 to 24)
                                    for (let i = 10; i <= 24; i++) slots.push(i);
                                }
                            }
                        });
                    }
                    
                    setBookedSlots(slots);
                    // Clear selected slots if they overlap
                    setSelectedSlots(prev => prev.filter(p => !slots.includes(parseInt(p))));
                }
            } catch (err) {
                console.error("Failed to fetch availability:", err);
            }
        };
        fetchAvailability();
        return () => { isMounted = false; };
    }, [selectedDate, dbScreenId]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const isToday = (d: Date) => d.toDateString() === today.toDateString();
    const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();
    const isPast = (d: Date) => d < today && !isToday(d);
    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

    // Slot selection
    const toggleSlot = (slotId: string) => {
        setSelectedSlots((prev) =>
            prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
        );
    };

    // Pricing calculation - use live DB pricing when available, fallback to hardcoded
    const totalHours = selectedSlots.length;
    const weekend = isWeekend(selectedDate);
    const pricingTiers = livePricing || pkg.pricing;
    const extraPersonPrice = liveExtraPerson ?? pkg.extraPerson;

    const getHourlyRate = () => {
        // Find the matching pricing tier
        const tier = pricingTiers.find((p) => p.hours === totalHours);
        if (tier) {
            // Check for date-specific override
            if ((tier as any).id && selectedDate) {
                const dateKey = `${(tier as any).id}-${selectedDate}`;
                if (ddOverrides[dateKey] !== undefined) return ddOverrides[dateKey];
            }
            return weekend ? tier.weekend : tier.weekday;
        }
        // Overtime: after max tier, add extraHourRate per additional hour
        if (totalHours > 0) {
            const maxTier = pricingTiers[pricingTiers.length - 1];
            const baseRate = weekend ? maxTier.weekend : maxTier.weekday;
            if (totalHours > maxTier.hours && pkg.extraHourRate) {
                return baseRate + (totalHours - maxTier.hours) * pkg.extraHourRate;
            }
            const perHr = baseRate / maxTier.hours;
            return Math.round(perHr * totalHours);
        }
        return 0;
    };

    const basePrice = getHourlyRate();
    const extraPersonCharge = Math.max(0, guestCount - 2) * extraPersonPrice;

    // Add-on charges — read from DB if available
    // For celebration: add-ons are included FREE, so no extra charge
    const isMovieTime = pkg.id === "movie-time";
    const isCelebration = pkg.id === "celebration";
    const getAddonPrice = (key: string) => liveAddonPricing?.[key] ?? 400;
    const balloonsCharge = isMovieTime && addBalloons ? getAddonPrice('balloons') : 0;
    const ledBannerCharge = isMovieTime && addLedBanner ? getAddonPrice('led_banner') : 0;
    const cakeCharge = isMovieTime && addCake ? getAddonPrice('cake') : 0;
    const addOnsTotal = balloonsCharge + ledBannerCharge + cakeCharge;

    const subtotal = basePrice + extraPersonCharge + addOnsTotal;

    // Coupon discount
    let couponDiscount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === "percentage") {
            couponDiscount = Math.round(subtotal * appliedCoupon.discountValue / 100);
        } else {
            couponDiscount = appliedCoupon.discountValue;
        }
    }
    const total = subtotal - couponDiscount;

    // Per-slot display price: use 1hr tier if available
    const oneHrTier = pricingTiers.find((p) => p.hours === 1);
    const perSlotPrice = oneHrTier ? (weekend ? oneHrTier.weekend : oneHrTier.weekday) : Math.round((weekend ? pricingTiers[0].weekend : pricingTiers[0].weekday) / pricingTiers[0].hours);

    // Discount: celebration gets ₹500 off for 3hr weekday ONLY. Movie-time uses DB pricing.
    const matchedTier = pricingTiers.find((p) => p.hours === totalHours);
    const matchedLive = livePricing?.find((p) => p.hours === totalHours);
    let discount = 0;
    if (isCelebration && totalHours === 3 && !weekend) {
        discount = 500;
    } else if (isMovieTime && totalHours > 1 && matchedLive) {
        discount = weekend ? ((matchedLive as any).weekendDiscount || 0) : ((matchedLive as any).weekdayDiscount || 0);
    }
    const discountHourRate = liveExtraHourRate ?? pkg.extraHourRate ?? 1000;
    const originalPrice = discount > 0 ? basePrice + discount : totalHours * discountHourRate;

    // 50-50 Payment Split
    const payNow = Math.round(total * 0.5);
    const payAtVenue = total - payNow;

    // Group slots by period
    const slotsByPeriod = useMemo(() => {
        const groups: Record<string, typeof timeSlots> = {};
        timeSlots.forEach((slot) => {
            if (!groups[slot.period]) groups[slot.period] = [];
            groups[slot.period].push(slot);
        });
        return groups;
    }, []);

    const periodIcons: Record<string, string> = {
        Morning: "☀️",
        Afternoon: "🌤️",
        Evening: "✨",
        Night: "🌙",
    };

    const router = useRouter();

    const formattedTime = useMemo(() => {
        if (!selectedSlots.length) return "";

        // Sort slots chronologically based on their original index in timeSlots
        const sortedSlots = [...selectedSlots].sort((a, b) => {
            return timeSlots.findIndex(s => s.id === a) - timeSlots.findIndex(s => s.id === b);
        });

        const blocks: string[] = [];
        let currentStart = "";
        let currentEnd = "";
        let prevIdx = -2;

        for (const slotId of sortedSlots) {
            const idx = timeSlots.findIndex(s => s.id === slotId);
            const slot = timeSlots[idx];
            if (!slot) continue;

            if (idx === prevIdx + 1) {
                // Connect contiguous slots
                currentEnd = slot.end;
            } else {
                // Break in continuity, push the previous block if it exists
                if (currentStart) {
                    blocks.push(`${currentStart} – ${currentEnd}`);
                }
                currentStart = slot.start;
                currentEnd = slot.end;
            }
            prevIdx = idx;
        }
        // Push the final block
        if (currentStart) {
            blocks.push(`${currentStart} – ${currentEnd}`);
        }

        return blocks.join(", ");
    }, [selectedSlots]);

    // Coupon validation
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError("");
        try {
            const result = await api.post("/coupons/validate", { code: couponCode });
            if (result && result.valid) {
                setAppliedCoupon({ code: result.code, discountType: result.discountType, discountValue: result.discountValue });
            } else {
                setCouponError("Invalid or expired coupon code");
            }
        } catch (err: any) {
            setCouponError(err?.message || "Invalid or expired coupon code");
        } finally { setCouponLoading(false); }
    };

    // Submit booking to API
    const handleBooking = useCallback(async () => {
        if (!dbScreenId || !dbPackageId) {
            setBookingError("Booking system loading, please wait...");
            return;
        }

        setIsSubmitting(true);
        setBookingError("");

        try {
            // Map selected slot IDs to startHour and compute duration
            const slotHours = selectedSlots
                .map(s => parseInt(s.replace("slot-", "")))
                .sort((a, b) => a - b);

            const startHour = slotHours[0];
            const durationHours = slotHours.length;

            // Build add-ons array
            const addons: { type: string; value?: string; message?: string; price: number }[] = [];
            if (addBalloons) addons.push({ type: "balloons", price: getAddonPrice('balloons') });
            if (addLedBanner) addons.push({ type: "ledBanner", price: getAddonPrice('led_banner'), message: ledBannerType });
            if (addCake) addons.push({ type: "cake", value: cakeMessage, price: getAddonPrice('cake') });

            const payload = {
                screenId: dbScreenId,
                packageId: dbPackageId,
                bookingDate: selectedDate.toISOString().split("T")[0],
                startHour,
                durationHours,
                customerName: `${title} ${firstName} ${lastName}`.trim(),
                customerPhone: phone,
                customerEmail: email || null,
                occasion: pkg.id === "celebration" ? "Celebration" : "Movie Time",
                cakeMessage: addCake ? cakeMessage : null,
                numGuests: guestCount,
                basePrice,
                extraPersonCharge,
                gstAmount: 0,
                totalAmount: total,
                amountPaid: payNow,
                paymentMethod: "online",
                addons,
                source: "website",
                couponCode: appliedCoupon?.code || null,
                discountAmount: couponDiscount,
            };

            const result = await api.post("/bookings/dd", payload);

            // Upload ID proofs to S3 (fire-and-forget)
            if (result?.id) {
                for (const proof of idProofs) {
                    if (proof) {
                        try {
                            const uploadForm = new FormData();
                            uploadForm.append("file", proof);
                            uploadForm.append("ddBookingId", String(result.id));
                            await fetch("/api/uploads/guest-id-public", {
                                method: "POST",
                                body: uploadForm,
                            });
                        } catch (uploadErr) {
                            console.error("ID upload failed (booking succeeded):", uploadErr);
                        }
                    }
                }
            }

            // Success — redirect to dashboard with success indicator
            router.push("/dashboard?source=celebration&status=success");
        } catch (err: any) {
            if (err?.message?.includes("409") || err?.message?.includes("overlap")) {
                setBookingError("This time slot is no longer available. Please choose a different slot.");
                setCurrentStep(1);
            } else {
                setBookingError(err?.message || "Booking failed. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [dbScreenId, dbPackageId, selectedDate, selectedSlots, title, firstName, lastName, phone, email, guestCount, basePrice, extraPersonCharge, total, payNow, addBalloons, addLedBanner, ledBannerType, addCake, cakeMessage, pkg.id, router, appliedCoupon, couponDiscount]);

    return (
        <div>
            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-b border-cel-border">
                <nav className="flex items-center gap-2 text-xs font-inter text-cel-text-muted flex-wrap">
                    <Link href="/" className="hover:text-rose-light transition-colors">Home</Link>
                    <span className="text-cel-border">/</span>
                    <Link href="/celebration" className="hover:text-rose-light transition-colors">Digital Diaries</Link>
                    <span className="text-cel-border">/</span>
                    <Link href={`/celebration/${pkg.id}`} className="hover:text-rose-light transition-colors">{pkg.name}</Link>
                    <span className="text-cel-border">/</span>
                    <Link href={`/celebration/${pkg.id}/${screen.id}`} className="hover:text-rose-light transition-colors">{screen.name} (Digital Diaries)</Link>
                    <span className="text-cel-border">/</span>
                    <span className="text-rose-medium">Book</span>
                </nav>
            </div>

            {/* Progress Steps */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-center gap-4">
                    {["Select Slot", "Guest Details", "Payment"].map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-inter font-semibold transition-all ${currentStep > i + 1 ? "bg-rose-dark text-white" :
                                currentStep === i + 1 ? "bg-gradient-to-r from-rose-medium to-rose-dark text-white" :
                                    "bg-cel-card border border-cel-border text-cel-text-muted"
                                }`}>
                                {currentStep > i + 1 ? "✓" : i + 1}
                            </div>
                            <span className={`text-xs font-inter hidden sm:inline ${currentStep === i + 1 ? "text-cel-text font-medium" : "text-cel-text-muted"}`}>{step}</span>
                            {i < 2 && <div className={`w-8 sm:w-12 h-px ${currentStep > i + 1 ? "bg-rose-dark" : "bg-cel-border"}`} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
                {/* Step 1: Select Slot */}
                {currentStep === 1 && (
                    <div>
                        {/* Screen Name Header */}
                        <div className="text-center mb-8">
                            <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-cel-text">{screen.name} (Digital Diaries)</h1>
                            <p className="font-inter text-cel-text-secondary text-xs mt-1">{pkg.name} Package</p>
                        </div>

                        {isMaintenance && (
                            <div className="max-w-md mx-auto mb-8 bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-lg font-bold text-white mb-2 uppercase tracking-wider">Under Maintenance</h3>
                                <p className="font-inter text-sm text-red-200/70 mb-5">This screening area is currently undergoing maintenance and is temporarily unavailable for bookings. Please check back later or select another screen.</p>
                                <Link href="/celebration" className="inline-block bg-white/10 hover:bg-white/20 text-white font-inter text-xs px-6 py-2.5 rounded-full transition-all border border-white/20">Back to Digital Diaries</Link>
                            </div>
                        )}

                        {/* Date Selector */}
                        <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 mb-6">
                            <div className="flex items-center justify-between mb-5">
                                <button onClick={() => setWeekOffset((p) => Math.max(0, p - 1))} disabled={weekOffset === 0} className="w-8 h-8 rounded-full border border-cel-border flex items-center justify-center text-cel-text-secondary hover:text-rose-medium hover:border-rose-medium/30 transition-all disabled:opacity-30">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="text-center">
                                    <p className="font-cinzel text-base font-semibold text-cel-text">{monthNames[weekStart.getMonth()]} {weekStart.getFullYear()}</p>
                                </div>
                                <button onClick={() => setWeekOffset((p) => p + 1)} className="w-8 h-8 rounded-full border border-cel-border flex items-center justify-center text-cel-text-secondary hover:text-rose-medium hover:border-rose-medium/30 transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((d) => (
                                    <button
                                        key={d.toISOString()}
                                        onClick={() => !isPast(d) && !isMaintenance && setSelectedDate(d)}
                                        disabled={isPast(d) || isMaintenance}
                                        className={`flex flex-col items-center py-3 rounded-lg transition-all text-center ${isSelected(d)
                                            ? "bg-gradient-to-b from-rose-medium to-rose-dark text-white shadow-lg shadow-rose-dark/20"
                                            : (isPast(d) || isMaintenance)
                                                ? "text-cel-text-muted/40 cursor-not-allowed"
                                                : isToday(d)
                                                    ? "border border-rose-medium/40 text-cel-text hover:bg-rose-dark/10"
                                                    : "text-cel-text-secondary hover:bg-cel-card-hover border border-transparent hover:border-cel-border"
                                            }`}
                                    >
                                        <span className="text-[10px] font-inter mb-1">{isToday(d) ? "Today" : dayNames[d.getDay()]}</span>
                                        <span className="text-lg font-cinzel font-semibold">{d.getDate()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Slots */}
                        <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 mb-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-cinzel text-base font-semibold text-cel-text">Available Slots ({timeSlots.length})</h3>
                                {selectedSlots.length > 0 && (
                                    <span className="text-rose-medium font-inter text-xs">{selectedSlots.length} selected</span>
                                )}
                            </div>
                            <div className="space-y-6">
                                {Object.entries(slotsByPeriod).map(([period, slots]) => (
                                    <div key={period}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-sm">{periodIcons[period]}</span>
                                            <span className="font-inter text-xs font-medium text-rose-medium uppercase tracking-wider">{period} Slots</span>
                                        </div>
                                        <div className="space-y-2">
                                            {slots.map((slot) => {
                                                const slotHour = parseInt(slot.id.replace("slot-", ""));
                                                const isBooked = bookedSlots.includes(slotHour);
                                                const isSlotSelected = selectedSlots.includes(slot.id);
                                                
                                                // Disable if it's booked, or if it's past
                                                const slotDate = new Date(selectedDate);
                                                slotDate.setHours(slotHour, 0, 0, 0);
                                                const isSlotPast = slotDate < new Date();
                                                const isDisabled = isMaintenance || isBooked || isSlotPast;

                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${isSlotSelected
                                                            ? "border-rose-medium/50 bg-rose-dark/15"
                                                            : isDisabled ? "border-cel-border opacity-30 cursor-not-allowed bg-cel-card/50" : "border-cel-border hover:border-cel-border-light cursor-pointer"
                                                            }`}
                                                        onClick={() => !isDisabled && toggleSlot(slot.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`font-inter text-sm ${isDisabled ? "text-cel-text-muted" : "text-cel-text"}`}>{slot.label}{isDisabled && isBooked ? ' (Booked)' : ''}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-inter text-sm text-cel-text-secondary">
                                                                {formatPrice(perSlotPrice)}
                                                            </span>
                                                            <button className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isSlotSelected
                                                                ? "bg-rose-dark text-white"
                                                                : "border border-cel-border text-cel-text-muted hover:border-rose-medium/40"
                                                                }`}>
                                                                {isSlotSelected ? (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {pkg.extraHourRate && (
                                            <p className="font-inter text-[10px] text-rose-medium mt-3 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                After {pkg.pricing[pkg.pricing.length - 1].hours} hours: {formatPrice(pkg.extraHourRate)}/hr additional
                                            </p>
                                        )}
                                        <p className="font-inter text-[10px] text-cel-text-muted mt-2 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Minimum booking: {isMovieTime ? '1 hour' : '2 hours'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Guest Count */}
                        <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 mb-6">
                            <h3 className="font-cinzel text-base font-semibold text-cel-text mb-4">Guests</h3>
                            <div className="flex items-center gap-4">
                                <button onClick={() => { const c = Math.max(1, guestCount - 1); setGuestCount(c); syncIdProofs(c); }} className="w-9 h-9 rounded-full border border-cel-border flex items-center justify-center text-cel-text-secondary hover:text-rose-medium hover:border-rose-medium/30 transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                </button>
                                <span className="font-cinzel text-lg font-semibold text-cel-text w-8 text-center">{guestCount}</span>
                                <button
                                    onClick={() => {
                                        const capacityNum = parseInt(screen.capacity) || 3;
                                        const c = Math.min(capacityNum, guestCount + 1);
                                        setGuestCount(c);
                                        syncIdProofs(c);
                                    }}
                                    className="w-9 h-9 rounded-full border border-cel-border flex items-center justify-center text-cel-text-secondary hover:text-rose-medium hover:border-rose-medium/30 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                                <div className="flex flex-col">
                                    <span className="font-inter text-xs text-cel-text-muted">Max Capacity: {screen.capacity}</span>
                                    <span className="font-inter text-[10px] text-rose-medium">Extra guest above 2: {formatPrice(pkg.extraPerson)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Add-ons (Movie Time & Celebration) */}
                        {(isMovieTime || isCelebration) && (
                            <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 mb-6">
                                <h3 className="font-cinzel text-base font-semibold text-cel-text mb-1">Add-Ons</h3>
                                <p className="font-inter text-[10px] text-cel-text-muted mb-4">{isCelebration ? 'These extras are included with your celebration package. You may customize further below.' : 'Enhance your experience with optional extras.'}</p>
                                <div className="space-y-3">
                                    {/* Balloons */}
                                    <div
                                        onClick={() => { if (!isCelebration) setAddBalloons(!addBalloons); }}
                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${isCelebration ? 'border-rose-medium/50 bg-rose-dark/15 cursor-default' : `cursor-pointer ${addBalloons ? 'border-rose-medium/50 bg-rose-dark/15' : 'border-cel-border hover:border-cel-border-light'}`}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🎈</span>
                                            <div className="flex flex-col">
                                                <span className="font-inter text-sm text-cel-text">Balloons {isCelebration && <span className="text-[10px] text-rose-medium">(Included)</span>}</span>
                                                <span className="text-[10px] text-cel-text-muted">{isCelebration ? 'Included free' : `${formatPrice(getAddonPrice('balloons'))} (Colorful balloon decoration)`}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-inter text-sm text-cel-text-secondary">{isCelebration ? 'Free' : formatPrice(getAddonPrice('balloons'))}</span>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${addBalloons ? 'bg-rose-dark text-white' : 'border border-cel-border text-cel-text-muted hover:border-rose-medium/40'}`}>
                                                {addBalloons ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* LED Banner */}
                                    <div
                                        onClick={() => { if (!isCelebration) setAddLedBanner(!addLedBanner); }}
                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${isCelebration ? 'border-rose-medium/50 bg-rose-dark/15 cursor-default' : `cursor-pointer ${addLedBanner ? 'border-rose-medium/50 bg-rose-dark/15' : 'border-cel-border hover:border-cel-border-light'}`}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">💡</span>
                                            <div className="flex flex-col">
                                                <span className="font-inter text-sm text-cel-text">LED Banner {isCelebration && <span className="text-[10px] text-rose-medium">(Included)</span>}</span>
                                                <span className="text-[10px] text-cel-text-muted">{isCelebration ? 'Included free' : `${formatPrice(getAddonPrice('led_banner'))} (Neon-style LED message banner)`}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-inter text-sm text-cel-text-secondary">{isCelebration ? 'Free' : formatPrice(getAddonPrice('led_banner'))}</span>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${addLedBanner ? 'bg-rose-dark text-white' : 'border border-cel-border text-cel-text-muted hover:border-rose-medium/40'}`}>
                                                {addLedBanner ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {(addLedBanner || isCelebration) && (
                                        <div className="pl-10 animate-in fade-in slide-in-from-top-2">
                                            <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Select Banner Message</label>
                                            <select value={ledBannerType} onChange={(e) => setLedBannerType(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text focus:border-rose-medium focus:outline-none transition-colors">
                                                <option>Happy Birthday</option>
                                                <option>Better Together</option>
                                                <option>Happy Anniversary</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Cake */}
                                    <div
                                        onClick={() => { if (!isCelebration) setAddCake(!addCake); }}
                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${isCelebration ? 'border-rose-medium/50 bg-rose-dark/15 cursor-default' : `cursor-pointer ${addCake ? 'border-rose-medium/50 bg-rose-dark/15' : 'border-cel-border hover:border-cel-border-light'}`}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">🎂</span>
                                            <div>
                                                <span className="font-inter text-sm text-cel-text">Cake {isCelebration && <span className="text-[10px] text-rose-medium">(Included)</span>}</span>
                                                <p className="font-inter text-[10px] text-cel-text-muted">{isCelebration ? 'Included free' : 'Customizable celebration cake'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-inter text-sm text-cel-text-secondary">{isCelebration ? 'Free' : formatPrice(getAddonPrice('cake'))}</span>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${addCake ? 'bg-rose-dark text-white' : 'border border-cel-border text-cel-text-muted hover:border-rose-medium/40'}`}>
                                                {addCake ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {(addCake || isCelebration) && (
                                        <div className="pl-10 animate-in fade-in slide-in-from-top-2">
                                            <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Cake Message</label>
                                            <input value={cakeMessage} onChange={(e) => setCakeMessage(e.target.value)} maxLength={50} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors" placeholder="e.g. Happy Birthday Neha!" />
                                            <p className="text-right text-[10px] text-cel-text-muted font-inter mt-1">{cakeMessage.length}/50</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Summary & Book Now */}
                        {selectedSlots.length > 0 && (
                            <div className="rounded-xl border border-rose-dark/30 bg-gradient-to-b from-cel-card to-rose-dark/5 p-5 sm:p-6 mb-6">
                                <h3 className="font-cinzel text-base font-semibold text-cel-text mb-4">Booking Summary</h3>
                                <div className="space-y-2 text-sm font-inter mb-4">
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Date</span><span className="text-cel-text">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Duration</span><span className="text-cel-text">{totalHours} hour{totalHours > 1 ? "s" : ""}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Guests</span><span className="text-cel-text">{guestCount} person{guestCount > 1 ? "s" : ""}</span></div>
                                    {screen.size && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">Screen Size</span><span className="text-cel-text">{screen.size}</span></div>
                                    )}
                                    
                                    {(isMovieTime || isCelebration) && discount > 0 && (
                                        <>
                                            <div className="flex justify-between font-inter text-sm pt-2 border-t border-cel-border/30">
                                                <span className="text-cel-text-secondary">Original Price ({totalHours} hr{totalHours > 1 ? 's' : ''})</span>
                                                <span className="text-cel-text line-through opacity-70">{formatPrice(originalPrice)}</span>
                                            </div>
                                            <div className="flex justify-between text-green-500 font-medium">
                                                <span>Discount</span>
                                                <span>-{formatPrice(discount)}</span>
                                            </div>
                                        </>
                                    )}

                                    {(isMovieTime || isCelebration) && discount === 0 && (
                                        <div className="flex justify-between pt-2 border-t border-cel-border/30">
                                            <span className="text-cel-text-secondary">Base Price ({totalHours} hr{totalHours > 1 ? 's' : ''})</span>
                                            <span className="text-cel-text">{formatPrice(basePrice)}</span>
                                        </div>
                                    )}

                                    {!isMovieTime && !isCelebration && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">Base Price</span><span className="text-cel-text">{formatPrice(basePrice)}</span></div>
                                    )}
                                    {extraPersonCharge > 0 && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">Extra Person ({guestCount - 2}×{formatPrice(pkg.extraPerson)})</span><span className="text-cel-text">{formatPrice(extraPersonCharge)}</span></div>
                                    )}
                                    {balloonsCharge > 0 && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">🎈 Balloons</span><span className="text-cel-text">{formatPrice(balloonsCharge)}</span></div>
                                    )}
                                    {ledBannerCharge > 0 && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">💡 LED Banner ({ledBannerType})</span><span className="text-cel-text">{formatPrice(ledBannerCharge)}</span></div>
                                    )}
                                    {cakeCharge > 0 && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">🎂 Cake{cakeMessage ? ` — "${cakeMessage}"` : ''}</span><span className="text-cel-text">{formatPrice(cakeCharge)}</span></div>
                                    )}

                                    <div className="flex justify-between pt-3 border-t border-cel-border">
                                        <span className="text-cel-text font-semibold">Subtotal</span>
                                        <span className="text-cel-text font-cinzel font-bold">{formatPrice(subtotal)}</span>
                                    </div>

                                    {/* Coupon Input */}
                                    <div className="pt-3 border-t border-cel-border/30">
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                                                <div>
                                                    <span className="text-green-400 font-inter text-xs font-semibold">🎉 {appliedCoupon.code}</span>
                                                    <span className="text-green-300 font-inter text-xs ml-2">
                                                        {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
                                                    </span>
                                                </div>
                                                <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-red-400 hover:text-red-300 text-xs font-inter font-semibold">Remove</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 bg-cel-bg border border-cel-border rounded-lg px-3 py-2 text-xs font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none uppercase tracking-widest" />
                                                <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="bg-rose-dark/80 text-white px-4 py-2 rounded-lg font-inter text-xs font-semibold hover:bg-rose-dark transition-colors disabled:opacity-40">
                                                    {couponLoading ? "..." : "Apply"}
                                                </button>
                                            </div>
                                        )}
                                        {couponError && <p className="text-red-400 text-[10px] font-inter mt-1">{couponError}</p>}
                                    </div>

                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-green-400 font-medium">
                                            <span>Coupon Discount</span>
                                            <span>-{formatPrice(couponDiscount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-3 border-t border-cel-border">
                                        <span className="text-cel-text font-semibold">Total</span>
                                        <span className="text-rose-medium font-cinzel font-bold text-lg">{formatPrice(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-2">
                                        <span className="text-cel-text-secondary">Pay Now (50%)</span>
                                        <span className="text-cel-text">{formatPrice(payNow)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-cel-text-secondary">Due at Venue (50%)</span>
                                        <span className="text-cel-text">{formatPrice(payAtVenue)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (totalHours >= (isMovieTime ? 1 : 2)) {
                                            const token = localStorage.getItem("galaxia_token");
                                            if (!token) {
                                                setShowLoginPrompt(true);
                                            }
                                            setCurrentStep(2);
                                        }
                                    }}
                                    disabled={totalHours < (isMovieTime ? 1 : 2)}
                                    className={`w-full font-cinzel font-semibold text-sm py-3.5 rounded-lg transition-all duration-300 ${(totalHours >= (isMovieTime ? 1 : 2)) ? 'bg-gradient-to-r from-rose-medium to-rose-dark text-white hover:shadow-lg hover:shadow-rose-dark/30' : 'bg-cel-border text-cel-text-muted cursor-not-allowed'}`}
                                >
                                    {totalHours < (isMovieTime ? 1 : 2) ? `Select at least ${(isMovieTime ? 1 : 2) - totalHours} more hour${(isMovieTime ? 1 : 2) - totalHours > 1 ? 's' : ''}` : 'BOOK NOW'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Guest Details */}
                {currentStep === 2 && showLoginPrompt && (
                    <>
                        {/* Faded background form */}
                        <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 opacity-30 pointer-events-none">
                            <h2 className="font-cinzel text-lg font-semibold text-cel-text mb-1">Primary Guest Details</h2>
                            <p className="font-inter text-xs text-cel-text-muted mb-6">Please fill all relevant fields to proceed further.</p>
                        </div>

                        {/* Dark Auth Modal */}
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <div className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 relative">
                                <button onClick={() => { setShowLoginPrompt(false); setEmailMode(false); setCurrentStep(1); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>

                                {!emailMode && (
                                    <>
                                        <h2 className="font-inter text-[28px] font-semibold text-white mb-2 text-center tracking-tight">Log in or sign up</h2>
                                        <p className="font-inter text-[15px] text-[#C5C5D2] text-center mb-8 px-2 font-normal">
                                            Sign in to securely manage your booking and confirm your screening.
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
                                                className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors"
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
                                    <form onSubmit={handleGuestLogin} className="w-full">
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
                                        {authError && <p className="text-red-400 text-sm mb-4 text-center">{authError}</p>}
                                        <button type="submit" disabled={authLoading} className="w-full bg-white text-black py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
                                            {authLoading ? "Signing in..." : "Sign In"}
                                        </button>
                                        <div className="flex justify-between mt-4">
                                            <button type="button" onClick={() => setEmailMode(false)} className="text-white/50 text-sm hover:text-white transition-colors">← Back</button>
                                            <button type="button" onClick={() => { setEmailMode("register"); setAuthError(""); }} className="text-white/50 text-sm hover:text-white transition-colors">Create account →</button>
                                        </div>
                                    </form>
                                )}

                                {emailMode === "register" && (
                                    <form onSubmit={handleGuestRegister} className="w-full">
                                        <h2 className="font-inter text-2xl font-semibold text-white mb-6 text-center">Create Account</h2>
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="text-white/70 text-xs mb-1.5 block">Full Name</label>
                                                <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="John Doe" />
                                            </div>
                                            <div>
                                                <label className="text-white/70 text-xs mb-1.5 block">Email address</label>
                                                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="user@example.com" />
                                            </div>
                                            <div>
                                                <label className="text-white/70 text-xs mb-1.5 block">Phone</label>
                                                <input type="tel" required value={authPhone} onChange={e => setAuthPhone(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="+91 98765 43210" />
                                            </div>
                                            <div>
                                                <label className="text-white/70 text-xs mb-1.5 block">Password</label>
                                                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#343541] border border-[#565869] rounded-md px-3 py-3 text-white focus:border-white focus:outline-none transition-colors" placeholder="••••••••" />
                                            </div>
                                        </div>
                                        {authError && <p className="text-red-400 text-sm mb-4 text-center">{authError}</p>}
                                        <button type="submit" disabled={authLoading} className="w-full bg-white text-black py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
                                            {authLoading ? "Creating account..." : "Create Account"}
                                        </button>
                                        <div className="flex justify-between mt-4">
                                            <button type="button" onClick={() => { setEmailMode("login"); setAuthError(""); }} className="text-white/50 text-sm hover:text-white transition-colors">← Back to login</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </>
                )}
                {currentStep === 2 && !showLoginPrompt && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Guest Form */}
                        <div className="lg:col-span-2 rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6">
                            <h2 className="font-cinzel text-lg font-semibold text-cel-text mb-1">Primary Guest Details</h2>
                            <p className="font-inter text-xs text-cel-text-muted mb-6">Please fill all relevant fields to proceed further.</p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Title*</label>
                                        <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text focus:border-rose-medium focus:outline-none transition-colors">
                                            <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">First Name*</label>
                                            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors" placeholder="First Name" />
                                        </div>
                                        <div>
                                            <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Last Name*</label>
                                            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors" placeholder="Last Name" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Email (Optional)</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors" placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Mobile Number*</label>
                                        <div className="flex">
                                            <span className="bg-cel-bg border border-r-0 border-cel-border rounded-l-lg px-3 py-2.5 text-sm font-inter text-cel-text-secondary">+91</span>
                                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-cel-bg border border-cel-border rounded-r-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors" placeholder="Phone Number" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-inter text-xs text-cel-text-secondary mb-1.5">Special Requests</label>
                                    <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={3} maxLength={500} className="w-full bg-cel-bg border border-cel-border rounded-lg px-3 py-2.5 text-sm font-inter text-cel-text placeholder-cel-text-muted focus:border-rose-medium focus:outline-none transition-colors resize-none" placeholder="Any special requests or notes..." />
                                    <p className="text-right text-[10px] text-cel-text-muted font-inter mt-1">{specialRequests.length}/500</p>
                                </div>

                                {/* ID Verification Choice */}
                                <div className="space-y-4">
                                    <label className="block font-inter text-xs text-cel-text-secondary">ID Verification*</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setIdVerificationMethod("venue")}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${idVerificationMethod === "venue" ? "border-rose-medium bg-rose-dark/10" : "border-cel-border bg-cel-bg hover:border-cel-border-light"}`}
                                        >
                                            <p className="font-cinzel text-xs font-semibold text-cel-text mb-1">Present at Venue</p>
                                            <p className="font-inter text-[10px] text-cel-text-muted leading-tight">Bring physical ID to the screen location.</p>
                                        </div>
                                        <div
                                            onClick={() => setIdVerificationMethod("online")}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${idVerificationMethod === "online" ? "border-rose-medium bg-rose-dark/10" : "border-cel-border bg-cel-bg hover:border-cel-border-light"}`}
                                        >
                                            <p className="font-cinzel text-xs font-semibold text-cel-text mb-1">Upload Online</p>
                                            <p className="font-inter text-[10px] text-cel-text-muted leading-tight">Fast-track your check-in by uploading IDs now.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ID Proof Uploads (Conditional) */}
                                {idVerificationMethod === "online" && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block font-inter text-xs text-cel-text-secondary mb-3">Upload Valid ID Proof* — All {guestCount} Guest{guestCount > 1 ? 's' : ''}</label>
                                        <div className="space-y-3">
                                            {Array.from({ length: guestCount }).map((_, idx) => (
                                                <div key={idx}>
                                                    <p className="font-inter text-[10px] text-cel-text-muted mb-1.5">Guest {idx + 1}{idx === 0 ? ' (Primary)' : ''}</p>
                                                    <div className={`border border-dashed ${idProofErrors[idx] ? 'border-red-500/50 bg-red-500/5' : 'border-cel-border bg-cel-bg/50'} rounded-lg p-3 text-center hover:border-rose-medium/50 transition-colors cursor-pointer relative`}>
                                                        <input
                                                            type="file"
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                const newProofs = [...idProofs];
                                                                const newErrors = [...idProofErrors];
                                                                if (file) {
                                                                    if (file.size > 2 * 1024 * 1024) {
                                                                        newErrors[idx] = "File size must be less than 2MB";
                                                                        newProofs[idx] = null;
                                                                    } else {
                                                                        newErrors[idx] = "";
                                                                        newProofs[idx] = file;
                                                                    }
                                                                } else {
                                                                    newProofs[idx] = null;
                                                                    newErrors[idx] = "";
                                                                }
                                                                setIdProofs(newProofs);
                                                                setIdProofErrors(newErrors);
                                                            }}
                                                        />
                                                        {idProofs[idx] ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <svg className="w-4 h-4 text-rose-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                <span className="font-inter text-xs text-cel-text truncate max-w-[180px]">{idProofs[idx]!.name}</span>
                                                            </div>
                                                        ) : (
                                                            <p className="font-inter text-xs text-cel-text-muted">Click to upload · JPG, PNG, PDF (Max 2MB)</p>
                                                        )}
                                                    </div>
                                                    {idProofErrors[idx] && <p className="text-red-400 text-[10px] font-inter mt-1">* {idProofErrors[idx]}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-rose-dark" />
                                    <span className="font-inter text-xs text-cel-text-secondary">I have read and agree to the <a href="#" className="text-rose-medium underline">Privacy Policy</a> and <a href="#" className="text-rose-medium underline">Terms & Conditions</a>.</span>
                                </label>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setCurrentStep(1)} className="flex-1 border border-cel-border text-cel-text-secondary font-inter text-sm py-3 rounded-lg hover:bg-cel-card-hover transition-all">
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!firstName || !lastName || !phone || !agreed || (idVerificationMethod === "online" && (idProofs.slice(0, guestCount).some(p => !p) || idProofErrors.slice(0, guestCount).some(e => !!e)))}
                                        className="flex-1 bg-gradient-to-r from-rose-medium to-rose-dark text-white font-cinzel font-semibold text-sm py-3 rounded-lg hover:shadow-lg hover:shadow-rose-dark/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar — Your Booking */}
                        <div className="rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 h-fit sticky top-20">
                            <h3 className="font-cinzel text-sm font-semibold text-cel-text uppercase tracking-wider mb-4">Your Booking</h3>
                            <div className="space-y-3 text-sm font-inter">
                                <div className="flex justify-between"><span className="text-cel-text-secondary">Screen</span><span className="text-cel-text">{screen.name} (Digital Diaries)</span></div>
                                <div className="flex justify-between"><span className="text-cel-text-secondary">Package</span><span className="text-cel-text">{pkg.name}</span></div>
                                <div className="flex justify-between"><span className="text-cel-text-secondary">Date</span><span className="text-cel-text">{selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
                                <div className="flex justify-between"><span className="text-cel-text-secondary">Duration</span><span className="text-cel-text">{totalHours}h</span></div>
                                <div className="flex justify-between"><span className="text-cel-text-secondary">Guests</span><span className="text-cel-text">{guestCount}</span></div>
                                {balloonsCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">🎈 Balloons</span><span className="text-cel-text">{formatPrice(balloonsCharge)}</span></div>}
                                {ledBannerCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">💡 LED Banner</span><span className="text-cel-text">{formatPrice(ledBannerCharge)}</span></div>}
                                {cakeCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">🎂 Cake</span><span className="text-cel-text">{formatPrice(cakeCharge)}</span></div>}
                                <div className="pt-3 border-t border-cel-border flex justify-between">
                                    <span className="text-cel-text font-semibold">Total</span>
                                    <span className="text-rose-medium font-cinzel font-bold">{formatPrice(total)}</span>
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-cel-text-secondary">Pay Now (50%)</span>
                                    <span className="text-cel-text">{formatPrice(payNow)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-cel-text-secondary">Due at Venue (50%)</span>
                                    <span className="text-cel-text">{formatPrice(payAtVenue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Payment Confirmation */}
                {currentStep === 3 && (
                    <div className="max-w-2xl mx-auto">
                        <div className="rounded-xl border border-cel-border bg-cel-card p-6 sm:p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-rose-dark/20 flex items-center justify-center mx-auto mb-5">
                                <svg className="w-8 h-8 text-rose-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="font-cinzel text-2xl font-bold text-cel-text mb-2">Booking Summary</h2>
                            <p className="font-inter text-cel-text-secondary text-sm mb-8">Review your booking details before payment.</p>

                            <div className="rounded-lg border border-cel-border bg-cel-bg p-5 text-left mb-6">
                                <div className="space-y-3 text-sm font-inter">
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Guest</span><span className="text-cel-text">{title} {firstName} {lastName}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Email</span><span className="text-cel-text">{email}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Phone</span><span className="text-cel-text">+91 {phone}</span></div>
                                    <div className="pt-3 border-t border-cel-border" />
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Screen</span><span className="text-cel-text">{screen.name} (Digital Diaries)</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Package</span><span className="text-cel-text">{pkg.name}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Date</span><span className="text-cel-text">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
                                    <div className="flex justify-between items-start gap-4"><span className="text-cel-text-secondary shrink-0">Time</span><span className="text-cel-text text-right max-w-[70%]">{formattedTime}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Guests</span><span className="text-cel-text">{guestCount}</span></div>
                                    <div className="pt-3 border-t border-cel-border" />
                                    
                                    {isMovieTime && originalPrice > 0 && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-cel-text-secondary">Original Price ({totalHours} hr{totalHours > 1 ? 's' : ''} × ₹{discountHourRate.toLocaleString("en-IN")})</span>
                                                <span className="text-cel-text line-through opacity-70">{formatPrice(originalPrice)}</span>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-green-500 font-medium">
                                                    <span>Discount ({totalHours} hour{totalHours > 1 ? 's' : ''} booking)</span>
                                                    <span>-{formatPrice(discount)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {!isMovieTime && (
                                        <div className="flex justify-between"><span className="text-cel-text-secondary">Subtotal</span><span className="text-cel-text">{formatPrice(subtotal)}</span></div>
                                    )}
                                    {balloonsCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">🎈 Balloons</span><span className="text-cel-text">{formatPrice(balloonsCharge)}</span></div>}
                                    {ledBannerCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">💡 LED Banner ({ledBannerType})</span><span className="text-cel-text">{formatPrice(ledBannerCharge)}</span></div>}
                                    {cakeCharge > 0 && <div className="flex justify-between"><span className="text-cel-text-secondary">🎂 Cake{cakeMessage ? ` — "${cakeMessage}"` : ''}</span><span className="text-cel-text">{formatPrice(cakeCharge)}</span></div>}
                                    <div className="flex justify-between pt-3 border-t border-cel-border"><span className="text-cel-text font-semibold">Total</span><span className="text-rose-medium font-cinzel font-bold text-xl">{formatPrice(total)}</span></div>
                                    <div className="flex justify-between mt-2"><span className="text-cel-text-secondary">Pay Now (50%)</span><span className="text-cel-text font-semibold">{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between"><span className="text-cel-text-secondary">Due at Venue (50%)</span><span className="text-cel-text">{formatPrice(payAtVenue)}</span></div>
                                </div>
                            </div>

                            <p className="font-inter text-xs text-cel-text-muted mb-6">A copy of the invoice will be sent to your registered email & phone number upon confirmation.</p>

                            <div className="flex gap-3">
                                <button onClick={() => setCurrentStep(2)} className="flex-1 border border-cel-border text-cel-text-secondary font-inter text-sm py-3.5 rounded-lg hover:bg-cel-card-hover transition-all">
                                    Edit Details
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={isSubmitting || !dbScreenId || !dbPackageId}
                                    className="flex-1 bg-gradient-to-r from-rose-medium to-rose-dark text-white font-cinzel font-semibold text-sm py-3.5 rounded-lg hover:shadow-lg hover:shadow-rose-dark/30 transition-all disabled:opacity-60"
                                >
                                    {isSubmitting ? "Processing..." : (!(dbScreenId && dbPackageId) ? "Loading System..." : "Make Payment")}
                                </button>
                            </div>
                            {bookingError && (
                                <p className="text-red-400 text-xs font-inter mt-3 text-center">{bookingError}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
