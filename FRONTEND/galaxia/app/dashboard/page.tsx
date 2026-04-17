"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../lib/api";

type Tab = "bookings" | "profile" | "reviews";
type Category = "all" | "staycation" | "celebration";

// Smart name parser: splits email-derived strings into readable first/last names
function parseSmartName(raw: string): { first: string; last: string } {
    if (!raw) return { first: "", last: "" };
    // Remove email domain and common suffixes like .11, _99 etc.
    let cleaned = raw.split("@")[0].replace(/[._-]\d+$/g, "");
    // Replace separators (., _, -) with spaces
    cleaned = cleaned.replace(/[._-]+/g, " ");
    // Insert space before capitals in camelCase (e.g. "savagebeast" → keep, "SavageBeast" → "Savage Beast")
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");
    // Common concatenated word pairs that should be split
    const commonPairs: [RegExp, string][] = [
        [/savage\s*beast/gi, "Savage Beast"],
        [/dark\s*knight/gi, "Dark Knight"],
        [/star\s*lord/gi, "Star Lord"],
        [/iron\s*man/gi, "Iron Man"],
    ];
    for (const [pattern, replacement] of commonPairs) {
        cleaned = cleaned.replace(pattern, replacement);
    }
    // Try to split concatenated lowercase words by known prefixes (da, the, etc.)
    cleaned = cleaned.replace(/^(da|the|mr|ms|dr)\s*/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
    if (cleaned.includes(" ")) cleaned = cleaned.replace(/^(da|the)\s+/i, "");
    // Capitalize each word
    const words = cleaned.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    if (words.length === 0) return { first: "", last: "" };
    if (words.length === 1) return { first: words[0], last: "" };
    return { first: words[0], last: words.slice(1).join(" ") };
}

interface Booking {
    id: string;
    propertyDbId?: number;
    dates: string;
    status: string;
    amount: string;
    guests: number;
    image: string;
    type: "staycation" | "celebration";
    time: "upcoming" | "past";
    property: string;
    rating?: number;
    hasReview?: boolean;
    // Financial details
    totalPaid?: string;
    payNow?: string;
    payAtVenue?: string;
    securityDeposit?: string;
    depositRefunded?: boolean;
    // Celebration specifics
    screen?: string;
    package?: string;
    duration?: string;
    timeSlot?: string;
    // Staycation specifics
    checkIn?: string;
    checkOut?: string;
    roomType?: string;
    taxes?: string;
    addons?: any[];
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("bookings");
    const [bookingView, setBookingView] = useState<"upcoming" | "past">("upcoming");
    const [categoryFilter, setCategoryFilter] = useState<Category>("all");
    const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
    const [userName, setUserName] = useState("Guest");
    const [userInitial, setUserInitial] = useState("G");
    const [userEmail, setUserEmail] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [personalReviews, setPersonalReviews] = useState<any[]>([]);
    const [reviewFormData, setReviewFormData] = useState({ rating: 5, reviewText: "", propertyId: "" });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);

    // Profile editing state
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    useEffect(() => {
        if (activeTab === "reviews" && localStorage.getItem("galaxia_token")) {
            api.get("/reviews/me").then(res => setPersonalReviews(Array.isArray(res) ? res : [])).catch(console.error);
        }
    }, [activeTab]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setReviewSubmitting(true);
        setReviewSuccess(false);
        try {
            await api.post("/reviews", reviewFormData);
            setReviewSuccess(true);
            setReviewFormData({ rating: 5, reviewText: "", propertyId: "" });
            const res = await api.get("/reviews/me");
            setPersonalReviews(Array.isArray(res) ? res : []);
        } catch (err: any) {
            alert(err.message || "Failed to submit review");
        } finally {
            setReviewSubmitting(false);
        }
    };

    // Auth guard: redirect to Cognito login if not authenticated
    useEffect(() => {
        const token = localStorage.getItem("galaxia_token");
        if (!token) {
            const redirectUri = `${window.location.origin}/auth/callback`;
            const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/login?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
            window.location.href = cognitoUrl;
            return;
        }

        // Fetch user profile from API instead of just localStorage
        api.get("/users/me").then(user => {
            if (user) {
                setUserName(user.fullName || user.email?.split("@")[0] || "Guest");
                setUserInitial((user.fullName || user.email || "G").charAt(0).toUpperCase());
                setUserEmail(user.email || "");
                setUserPhone(user.phone || "");
                localStorage.setItem("galaxia_user", JSON.stringify(user));
                // Populate profile form with smart name parsing
                const fullN = user.fullName || user.email?.split("@")[0] || "";
                const parsed = parseSmartName(fullN);
                setEditFirstName(parsed.first);
                setEditLastName(parsed.last);
                setEditPhone(user.phone || "");
            }
        }).catch(err => {
            console.error("Error fetching user profile:", err);
            // Fallback to localStorage if API fails
            const storedUser = localStorage.getItem("galaxia_user");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setUserName(user.fullName || user.email?.split("@")[0] || "Guest");
                setUserInitial((user.fullName || user.email || "G").charAt(0).toUpperCase());
                setUserEmail(user.email || "");
                setUserPhone(user.phone || "");
            }
        });
    }, [router, searchParams]);

    // Site images for DD thumbnails
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true);
                const res = await api.get("/users/me/bookings");
                
                const formattedStay = (res.stayBookings || []).map((b: any): Booking => {
                    const ci = new Date(b.checkInDate);
                    const co = new Date(b.checkOutDate);
                    
                    const coDate = new Date(co);
                    coDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isUpcoming = coDate >= today;
                    
                    const formatPrice = (val: number) => `₹${val.toLocaleString("en-IN")}`;
                    
                    return {
                        id: b.bookingRef || `#S-${b.id}`,
                        property: b.property?.name || "Staycation Property",
                        propertyDbId: b.propertyId,
                        dates: `${ci.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}-${co.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`,
                        status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
                        amount: formatPrice(b.totalAmount),
                        guests: b.numGuests,
                        image: (() => {
                            // Use raw slugs from DB for siteImages lookup (NOT the standardized combined name)
                            const propSlug = b.property?.slug || (b.property?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                            const subSlug = b.subProperty?.slug || (b.subProperty?.name ? b.subProperty.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null);
                            // Try sub-property thumbnail first (e.g. ambrose/alta/thumbnail), then property (e.g. la-paraiso/thumbnail)
                            if (subSlug) {
                                const subThumb = (siteImages[`${propSlug}/${subSlug}/thumbnail`] || [])[0]?.url;
                                if (subThumb) return subThumb;
                            }
                            const propThumb = (siteImages[`${propSlug}/thumbnail`] || [])[0]?.url;
                            if (propThumb) return propThumb;
                            // Fallback: try property or subProperty imageUrl from DB
                            if (b.subProperty?.imageUrl) return b.subProperty.imageUrl;
                            if (b.property?.imageUrl) return b.property.imageUrl;
                            return b.property?.images?.[0] || '';
                        })(),
                        type: "staycation",
                        time: isUpcoming ? "upcoming" : "past",
                        totalPaid: formatPrice(b.totalAmount),
                        payNow: formatPrice(b.advanceAmount ?? Math.round(b.totalAmount * 0.2)),
                        payAtVenue: formatPrice(Math.max(0, b.balanceAmount ?? Math.round(b.totalAmount * 0.8))),
                        securityDeposit: b.securityDeposit ? formatPrice(b.securityDeposit) : "—",
                        depositRefunded: b.depositRefunded || false,
                        checkIn: ci.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) + " · " + (b.property?.checkInTime || "1:00 PM"),
                        checkOut: co.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) + " · " + (b.property?.checkOutTime || "11:00 AM"),
                        roomType: b.subProperty?.name || "Entire Property",
                        taxes: formatPrice(b.gstAmount || 0),
                        addons: b.addons || [],
                    };
                });
                
                const formattedDd = (res.ddBookings || []).map((b: any): Booking => {
                    const date = new Date(b.bookingDate);
                    
                    const bookingDateOnly = new Date(date);
                    bookingDateOnly.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isUpcoming = bookingDateOnly >= today;
                    const formatPrice = (val: number) => `₹${val.toLocaleString("en-IN")}`;
                    
                    const fmtHour = (h: number) => {
                        const ampm = h >= 12 ? "PM" : "AM";
                        const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
                        return `${hr}:00 ${ampm}`;
                    };
                    return {
                        id: b.bookingRef || `#DD-${b.id}`,
                        property: b.screen?.name ? `${b.screen.name.replace(/\s*\([^)]*\)/g, '').trim()} \u2014 Digital Diaries` : "Digital Diaries",
                        dates: date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
                        status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
                        amount: formatPrice(b.totalAmount),
                        guests: b.numGuests,
                        image: (() => {
                            // Try to get package-specific thumbnail from Photo Manager
                            const screenSlug = b.screen?.slug;
                            const pkgSlug = b.package?.slug;
                            if (screenSlug && pkgSlug) {
                                const thumbSection = `dd/${screenSlug}/${pkgSlug}/thumbnail`;
                                const thumbImg = (siteImages[thumbSection] || [])[0]?.url;
                                if (thumbImg) return thumbImg;
                            }
                            // Fallback to screen image
                            return b.screen?.imageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80";
                        })(),
                        type: "celebration",
                        time: isUpcoming ? "upcoming" : "past",
                        totalPaid: formatPrice(b.totalAmount),
                        payNow: formatPrice(b.amountPaid ?? Math.round(b.totalAmount * 0.5)),
                        payAtVenue: formatPrice(Math.max(0, b.amountToCollect ?? Math.round(b.totalAmount * 0.5))),
                        screen: (b.screen?.name || "Private Screen").replace(/\s*\([^)]*\)/g, '').trim(),
                        package: b.package?.name || "Private Screening",
                        duration: `${b.durationHours || 3} hours`,
                        timeSlot: b.startHour != null ? `${fmtHour(b.startHour)} - ${fmtHour(b.startHour + (b.durationHours || 3))}` : b.timeSlot
                    };
                });
                
                setBookings([...formattedStay, ...formattedDd].sort((a, b) => b.id.localeCompare(a.id)));
            } catch (err) {
                console.error("Error fetching my bookings:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [siteImages]);

    useEffect(() => {
        const source = searchParams.get("source");
        if (source === "staycation") setCategoryFilter("staycation");
        else if (source === "celebration") setCategoryFilter("celebration");
        else setCategoryFilter("all");
    }, [searchParams]);

    const isDark = categoryFilter === "celebration";

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "bookings", label: "Bookings", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { key: "profile", label: "Profile", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        { key: "reviews", label: "Reviews", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    ];

    const filteredBookings = useMemo(() => {
        return bookings.filter(b =>
            (b.time === bookingView) &&
            (categoryFilter === "all" || b.type === categoryFilter)
        );
    }, [bookings, bookingView, categoryFilter]);

    // Theme Variables
    const bgApp = isDark ? "bg-[#0D0D0D]" : "bg-cream-white";
    const bgCard = isDark ? "bg-[#1A1A1A]" : "bg-white";
    const bgInput = isDark ? "bg-[#1A1A1A]" : "bg-soft-gray";
    const bgDetail = isDark ? "bg-[#111111]" : "bg-[#faf8f4]";
    const textPrimary = isDark ? "text-white" : "text-text-primary";
    const textSecondary = isDark ? "text-[#AAAAAA]" : "text-text-secondary";
    const textMuted = isDark ? "text-[#777777]" : "text-text-muted";
    const borderMain = isDark ? "border-[#2A2A2A]" : "border-border-light";
    const borderActive = isDark ? "border-[#d87f82]" : "border-antique-gold";
    const accentText = isDark ? "text-[#f1b1b3]" : "text-antique-gold";
    const accentHoverText = isDark ? "hover:text-[#d87f82]" : "hover:text-dark-gold";
    const accentBg = isDark ? "bg-[#9f353a]" : "bg-antique-gold";
    const gradientBrandText = isDark ? "bg-gradient-to-r from-[#d87f82] to-[#9f353a]" : "bg-gradient-to-r from-antique-gold to-dark-gold";

    function StatusBadge({ status }: { status: string }) {
        const colors: Record<string, string> = {
            Confirmed: isDark ? "bg-green-900/30 text-green-400 border-green-800" : "bg-green-50 text-green-700 border-green-200",
            Completed: isDark ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-200",
            Cancelled: isDark ? "bg-red-900/30 text-red-400 border-red-800" : "bg-red-50 text-red-700 border-red-200",
        };
        return <span className={`text-[10px] font-inter font-medium px-2 py-0.5 rounded-full border ${colors[status] || (isDark ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-50 text-gray-700 border-gray-200")}`}>{status}</span>;
    }

    function StarRating({ rating, interactive = false }: { rating: number; interactive?: boolean }) {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-4 h-4 ${s <= rating ? `${accentText} fill-current` : borderMain} ${interactive ? `cursor-pointer ${accentHoverText}` : ""}`} fill={s <= rating ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                ))}
            </div>
        );
    }

    /* ---------- Expandable Booking Detail Panel ---------- */
    function BookingDetail({ booking }: { booking: Booking }) {
        const isUpcoming = booking.time === "upcoming";
        const isStaycation = booking.type === "staycation";

        return (
            <div className={`mt-4 ${bgDetail} rounded-xl border ${borderMain} p-5 sm:p-6 animate-in slide-in-from-top-2 duration-300`}>
                {/* Section: Booking Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    {isStaycation ? (
                        <>
                            <DetailRow label="Room Type" value={booking.roomType || "—"} />
                            <DetailRow label="Check-in" value={booking.checkIn || "—"} />
                            <DetailRow label="Check-out" value={booking.checkOut || "—"} />
                            <DetailRow label="Guests" value={`${booking.guests} person${booking.guests > 1 ? "s" : ""}`} />
                        </>
                    ) : (
                        <>
                            <DetailRow label="Screen" value={booking.screen || "—"} />
                            <DetailRow label="Package" value={booking.package || "—"} />
                            <DetailRow label="Duration" value={booking.duration || "—"} />
                            <DetailRow label="Time" value={booking.timeSlot || "—"} />
                            <DetailRow label="Guests" value={`${booking.guests} person${booking.guests > 1 ? "s" : ""}`} />
                        </>
                    )}
                </div>

                {/* Celebration Add-on (above Payment Details) */}
                {booking.addons && booking.addons.length > 0 && (
                    <div className={`border-t ${borderMain} pt-4 mb-4`}>
                        <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-amber-900/10 border border-amber-900/30" : "bg-amber-50 border border-amber-200"}`}>
                            <div>
                                <p className={`font-inter text-xs font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>Celebration Add-on</p>
                                <p className={`font-inter text-[10px] ${isDark ? "text-amber-500/70" : "text-amber-600/70"}`}>{booking.addons[0].description}</p>
                            </div>
                            <span className={`font-cinzel font-bold text-sm ${isDark ? "text-amber-400" : "text-amber-700"}`}>₹{booking.addons[0].price?.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                )}

                {/* Section: Payment Breakdown */}
                <div className={`border-t ${borderMain} pt-4 mb-4`}>
                    <h4 className={`font-cinzel text-xs font-semibold ${textPrimary} uppercase tracking-wider mb-3`}>Payment Details</h4>
                    <div className="space-y-2">
                        <DetailRow label="Total Amount" value={booking.amount} bold />
                        {isStaycation && booking.taxes && (
                            <DetailRow label="Taxes (5% GST)" value={booking.taxes} />
                        )}
                    </div>
                </div>

                {/* Upcoming: Amount Due at Venue + Security Deposit */}
                {isUpcoming && (
                    <div className={`border-t ${borderMain} pt-4 mb-4`}>
                        <div className="space-y-3">
                            <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-green-900/10 border border-green-900/30" : "bg-green-50 border border-green-200"}`}>
                                <div>
                                    <p className={`font-inter text-xs font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}>Paid Online ({isStaycation ? "80%" : "50%"})</p>
                                    <p className={`font-inter text-[10px] ${isDark ? "text-green-500/70" : "text-green-600/70"}`}>Payment confirmed</p>
                                </div>
                                <span className={`font-cinzel font-bold text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>{booking.payNow}</span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-amber-900/10 border border-amber-900/30" : "bg-amber-50 border border-amber-200"}`}>
                                <div>
                                    <p className={`font-inter text-xs font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>Amount Due at Venue ({isStaycation ? "20%" : "50%"})</p>
                                    <p className={`font-inter text-[10px] ${isDark ? "text-amber-500/70" : "text-amber-600/70"}`}>Payable at {isStaycation ? "check-in" : "venue"}</p>
                                </div>
                                <span className={`font-cinzel font-bold text-sm ${isDark ? "text-amber-400" : "text-amber-700"}`}>{booking.payAtVenue}</span>
                            </div>
                            {isStaycation && booking.securityDeposit && (
                                <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-sky-900/10 border border-sky-900/30" : "bg-sky-50 border border-sky-200"}`}>
                                    <div>
                                        <p className={`font-inter text-xs font-semibold ${isDark ? "text-sky-400" : "text-sky-700"}`}>Security Deposit</p>
                                        <p className={`font-inter text-[10px] ${isDark ? "text-sky-500/70" : "text-sky-600/70"}`}>Refundable · due at check-in</p>
                                    </div>
                                    <span className={`font-cinzel font-bold text-sm ${isDark ? "text-sky-400" : "text-sky-700"}`}>{booking.securityDeposit}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Past: Payment breakdown — same as upcoming but labeled as completed */}
                {!isUpcoming && (
                    <div className={`border-t ${borderMain} pt-4 mb-4`}>
                        <div className="space-y-3">
                            <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-green-900/10 border border-green-900/30" : "bg-green-50 border border-green-200"}`}>
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isDark ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <div>
                                        <p className={`font-inter text-xs font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}>Paid Online ({isStaycation ? "80%" : "50%"})</p>
                                        <p className={`font-inter text-[10px] ${isDark ? "text-green-500/70" : "text-green-600/70"}`}>Payment confirmed</p>
                                    </div>
                                </div>
                                <span className={`font-cinzel font-bold text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>{booking.payNow}</span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-amber-900/10 border border-amber-900/30" : "bg-amber-50 border border-amber-200"}`}>
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <div>
                                        <p className={`font-inter text-xs font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>Venue Payment ({isStaycation ? "20%" : "50%"})</p>
                                        <p className={`font-inter text-[10px] ${isDark ? "text-amber-500/70" : "text-amber-600/70"}`}>Due at {isStaycation ? "check-in" : "venue"}</p>
                                    </div>
                                </div>
                                <span className={`font-cinzel font-bold text-sm ${isDark ? "text-amber-400" : "text-amber-700"}`}>{booking.payAtVenue}</span>
                            </div>
                            {isStaycation && booking.securityDeposit && (
                                <div className={`flex justify-between items-center p-3 rounded-lg ${booking.depositRefunded ? (isDark ? "bg-green-900/10 border border-green-900/30" : "bg-green-50 border border-green-200") : (isDark ? "bg-amber-900/10 border border-amber-900/30" : "bg-amber-50 border border-amber-200")}`}>
                                    <div className="flex items-center gap-2">
                                        {booking.depositRefunded ? (
                                            <svg className={`w-4 h-4 ${isDark ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        )}
                                        <div>
                                            <p className={`font-inter text-xs font-semibold ${booking.depositRefunded ? (isDark ? "text-green-400" : "text-green-700") : (isDark ? "text-amber-400" : "text-amber-700")}`}>Security Deposit {booking.depositRefunded ? "Refunded" : "Pending"}</p>
                                            <p className={`font-inter text-[10px] ${isDark ? "text-[#555]" : "text-text-muted"}`}>{booking.depositRefunded ? "Refunded to your account" : "Processing refund"}</p>
                                        </div>
                                    </div>
                                    <span className={`font-cinzel font-bold text-sm ${booking.depositRefunded ? (isDark ? "text-green-400" : "text-green-700") : (isDark ? "text-amber-400" : "text-amber-700")}`}>{booking.securityDeposit}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Past: Review encouragement */}
                {!isUpcoming && !booking.hasReview && (
                    <div className={`border-t ${borderMain} pt-4`}>
                        <div className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? "bg-[#1A1A1A] border border-[#2A2A2A]" : "bg-white border border-antique-gold/20"}`}>
                            <div className={`w-10 h-10 rounded-full ${isDark ? "bg-[#9f353a]/15" : "bg-antique-gold/10"} flex items-center justify-center shrink-0`}>
                                <svg className={`w-5 h-5 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            </div>
                            <div className="flex-1">
                                <p className={`font-cinzel text-sm font-semibold ${textPrimary} mb-1`}>Share your experience!</p>
                                <p className={`${textSecondary} font-inter text-xs mb-3`}>You haven&apos;t reviewed this booking yet. Your feedback helps other guests and means a lot to us.</p>
                                <button onClick={() => setActiveTab("reviews")} className={`${gradientBrandText} text-white font-inter text-xs font-medium px-5 py-2 rounded-full hover:shadow-lg transition-all`}>
                                    Write a Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Past with review: show the review */}
                {!isUpcoming && booking.hasReview && booking.rating && (
                    <div className={`border-t ${borderMain} pt-4`}>
                        <div className="flex items-center gap-2 mb-1">
                            <p className={`font-inter text-xs font-semibold ${textPrimary}`}>Your Review</p>
                            <StarRating rating={booking.rating} />
                        </div>
                        <p className={`${textSecondary} font-inter text-xs`}>Amazing experience! Highly recommended.</p>
                    </div>
                )}
            </div>
        );
    }

    function DetailRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
        return (
            <div className="flex justify-between">
                <span className={`font-inter text-xs ${textSecondary}`}>{label}</span>
                <span className={`font-inter text-xs ${bold ? `font-semibold ${textPrimary}` : textPrimary}`}>{value}</span>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${bgApp} transition-colors duration-500`}>
            {/* Header */}
            <nav className={`${isDark ? "bg-[#0D0D0D]/85 border-b border-[#2A2A2A]" : "glass-light"} fixed top-0 left-0 right-0 z-50 backdrop-blur-xl`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full ${gradientBrandText} flex items-center justify-center`}>
                            <span className="text-white font-cinzel font-bold text-sm">G</span>
                        </div>
                        <span className={`font-cinzel text-lg font-semibold ${gradientBrandText} bg-clip-text text-transparent`}>GALAXIA</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/staycation" className={`${textMuted} ${accentHoverText} text-xs font-inter transition-colors hidden sm:block`}>Staycation</Link>
                        <Link href="/celebration" className={`${textMuted} ${accentHoverText} text-xs font-inter transition-colors hidden sm:block`}>Celebration</Link>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-[#9f353a]/10 border border-[#9f353a]/30" : "bg-antique-gold/10 border border-antique-gold/30"}`}>
                            <span className={`${accentText} font-cinzel font-semibold text-sm`}>{userInitial}</span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
                {/* Welcome & Filter */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className={`font-cinzel text-2xl sm:text-3xl font-bold ${textPrimary} mb-1`}>Welcome back, {userName}</h1>
                        <p className={`${textSecondary} font-inter text-sm`}>Manage your bookings, profile, and rewards</p>
                    </div>

                    <div className={`flex rounded-lg border ${borderMain} p-1 ${bgCard}`}>
                        {(["all", "staycation", "celebration"] as const).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-1.5 text-xs font-inter rounded-md capitalize transition-all ${categoryFilter === cat ? `${accentBg} text-white` : `${textSecondary} hover:${textPrimary}`}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex flex-wrap gap-1 mb-8 border-b ${borderMain}`}>
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-inter font-medium transition-all duration-300 border-b-2 -mb-px ${activeTab === tab.key ? `${accentText} ${borderActive}` : `${textMuted} border-transparent hover:${textPrimary}`}`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* Bookings Tab */}
                {activeTab === "bookings" && (
                    <div>
                        <div className="flex gap-4 mb-6">
                            {(["upcoming", "past"] as const).map((v) => (
                                <button key={v} onClick={() => { setBookingView(v); setExpandedBooking(null); }} className={`px-4 py-2 text-xs font-inter font-medium rounded-full transition-all ${bookingView === v ? `${accentBg} text-white` : `${bgInput} ${textSecondary} hover:opacity-80`}`}>
                                    {v === "upcoming" ? "Upcoming" : "Past Bookings"}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {filteredBookings.length === 0 ? (
                                <div className={`text-center py-12 border border-dashed ${borderMain} rounded-xl`}>
                                    <p className={`${textMuted} font-inter text-sm`}>No {bookingView} {categoryFilter !== 'all' ? categoryFilter : ''} bookings found.</p>
                                </div>
                            ) : (
                                filteredBookings.map((booking) => (
                                    <div key={booking.id}>
                                        <div className={`${bgCard} rounded-xl border ${borderMain} p-4 sm:p-5 flex flex-col sm:flex-row gap-4 hover:shadow-lg transition-all ${expandedBooking === booking.id ? (isDark ? 'ring-1 ring-[#9f353a]/30' : 'ring-1 ring-antique-gold/30') : ''}`}>
                                            <div className="relative w-full sm:w-32 h-40 sm:h-24 rounded-lg overflow-hidden shrink-0">
                                                <img src={booking.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'} alt={booking.property} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'; }} />
                                                {booking.type === 'celebration' && (
                                                    <div className="absolute top-2 left-2 bg-[#9f353a] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wide">
                                                        Digital Diaries
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className={`font-cinzel text-sm sm:text-base font-semibold ${textPrimary}`}>{booking.property}</h3>
                                                    <StatusBadge status={booking.status} />
                                                </div>
                                                <p className={`${textSecondary} font-inter text-xs mb-1`}>Booking ID: {booking.id}</p>
                                                <p className={`${textSecondary} font-inter text-xs`}>{booking.dates} • {booking.guests} guests</p>
                                                {booking.rating && <div className="mt-2"><StarRating rating={booking.rating} /></div>}
                                            </div>
                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                <p className={`${accentText} font-cinzel font-semibold text-sm sm:text-base`}>{booking.amount}</p>
                                                <button
                                                    onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
                                                    className={`${accentText} text-xs font-inter font-medium ${accentHoverText} transition-colors flex items-center gap-1`}
                                                >
                                                    {expandedBooking === booking.id ? "Hide Details" : "View Details"}
                                                    <svg className={`w-3 h-3 transition-transform ${expandedBooking === booking.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        {expandedBooking === booking.id && <BookingDetail booking={booking} />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="max-w-2xl">
                        <div className={`${bgCard} rounded-xl border ${borderMain} p-6 sm:p-8 mb-6 transition-colors`}>
                            <h3 className={`font-cinzel text-lg font-semibold ${textPrimary} mb-6`}>Personal Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div>
                                    <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>First Name</label>
                                    <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-colors`} />
                                </div>
                                <div>
                                    <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Last Name</label>
                                    <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-colors`} />
                                </div>
                                <div>
                                    <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Email</label>
                                    <input type="email" value={userEmail} readOnly className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none opacity-60 cursor-not-allowed transition-colors`} />
                                </div>
                                <div>
                                    <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Phone</label>
                                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-colors`} />
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    setProfileSaving(true);
                                    setProfileSaved(false);
                                    try {
                                        const fullName = [editFirstName, editLastName].filter(Boolean).join(" ").trim();
                                        await api.patch("/users/me", { fullName, phone: editPhone });
                                        setUserName(fullName || "Guest");
                                        setUserInitial((fullName || "G").charAt(0).toUpperCase());
                                        setUserPhone(editPhone);
                                        localStorage.setItem("galaxia_user", JSON.stringify({ fullName, email: userEmail, phone: editPhone }));
                                        setProfileSaved(true);
                                        setTimeout(() => setProfileSaved(false), 3000);
                                    } catch (err) {
                                        alert("Failed to save profile. Please try again.");
                                    } finally {
                                        setProfileSaving(false);
                                    }
                                }}
                                disabled={profileSaving}
                                className={`mt-6 ${gradientBrandText} text-white font-inter text-sm font-medium px-6 py-2.5 rounded-full hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2`}
                            >
                                {profileSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : profileSaved ? (
                                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Saved!</>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>

                        {/* Logout Section */}
                        <div className={`${bgCard} rounded-xl border ${borderMain} p-6 sm:p-8 transition-colors`}>
                            <h3 className={`font-cinzel text-lg font-semibold text-red-500 mb-6`}>Account Actions</h3>
                            <p className={`${textMuted} font-inter text-xs mb-5 max-w-sm`}>
                                Log out of your account on this device. You will need to sign in again to view your bookings.
                            </p>
                            <button 
                                onClick={() => {
                                    localStorage.removeItem("galaxia_token");
                                    localStorage.removeItem("galaxia_user");
                                    window.location.href = "/";
                                }}
                                className="border border-red-500 text-red-500 hover:bg-red-500/10 font-inter text-sm font-medium px-6 py-2.5 rounded-full transition-all"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                )}
                       {/* Reviews Tab */}
                {activeTab === "reviews" && (
                    <div className="max-w-2xl animate-fade-in">
                        <div className={`${bgCard} rounded-2xl border ${borderMain} mb-8 shadow-sm transition-all overflow-hidden`}>
                            {/* Gradient accent bar */}
                            <div className={`h-1 ${gradientBrandText}`} />
                            <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className={`font-cinzel text-lg font-bold ${textPrimary}`}>Share Your Experience</h3>
                                    <p className={`${textMuted} font-inter text-xs mt-1`}>Help others discover the Galaxia magic</p>
                                </div>
                                <div className={`w-10 h-10 rounded-full ${isDark ? "bg-[#9f353a]/15" : "bg-antique-gold/10"} flex items-center justify-center`}>
                                    <svg className={`w-5 h-5 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                            </div>
                            
                            {reviewSuccess ? (
                                <div className={`text-center py-6 ${isDark ? "bg-green-900/10 border border-green-900/30" : "bg-green-50/50 border border-green-100"} rounded-2xl animate-in zoom-in-95 duration-300`}>
                                    <div className={`w-12 h-12 ${isDark ? "bg-green-900/20" : "bg-green-100"} rounded-full flex items-center justify-center mx-auto mb-3`}>
                                        <svg className={`w-6 h-6 ${isDark ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className={`font-cinzel text-sm font-bold ${isDark ? "text-green-400" : "text-green-800"}`}>Review Submitted!</p>
                                    <p className={`${isDark ? "text-green-500/70" : "text-green-700/70"} font-inter text-[11px] mt-1`}>Thank you for your valuable feedback.</p>
                                    <button onClick={() => setReviewSuccess(false)} className={`mt-4 ${isDark ? "text-green-400" : "text-green-700"} text-xs font-bold hover:underline`}>Write another</button>
                                </div>
                            ) : (
                                <form onSubmit={handleReviewSubmit} className="space-y-5">
                                    <div>
                                        <label className={`${textMuted} text-[10px] font-inter uppercase tracking-widest font-bold mb-2 block`}>Select Staycation Property *</label>
                                        {bookings.filter(b => b.type === 'staycation').length === 0 ? (
                                            <div className={`p-5 rounded-xl border ${borderMain} ${bgInput} text-center`}>
                                                <svg className={`w-8 h-8 mx-auto mb-3 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                <p className={`${textPrimary} font-cinzel text-sm font-semibold mb-1`}>Complete a Stay First</p>
                                                <p className={`${textMuted} font-inter text-xs`}>You need to complete a staycation booking before you can post a review.</p>
                                            </div>
                                        ) : (
                                            <select 
                                                required
                                                value={reviewFormData.propertyId}
                                                onChange={(e) => setReviewFormData({...reviewFormData, propertyId: e.target.value})}
                                                className={`w-full ${bgInput} border ${borderMain} rounded-xl px-4 py-3.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-all appearance-none cursor-pointer`}
                                            >
                                                <option value="">Which property did you visit?</option>
                                                {[...new Map(bookings.filter(b => b.type === 'staycation').map(b => [b.propertyDbId, b])).values()].map(b => (
                                                    <option key={b.propertyDbId} value={b.propertyDbId?.toString()}>
                                                        {b.roomType && b.roomType !== 'Entire Property' ? `${b.roomType} - ${b.property}` : b.property}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`${textMuted} text-[10px] font-inter uppercase tracking-widest font-bold mb-2 block`}>Overall Experience *</label>
                                        <div className={`flex justify-between items-center ${bgInput} p-3 rounded-2xl border ${borderMain} gap-1`}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button 
                                                    key={s} 
                                                    type="button" 
                                                    onClick={() => setReviewFormData({...reviewFormData, rating: s})}
                                                    className={`group relative flex-1 py-3 rounded-xl transition-all duration-300 ${s <= reviewFormData.rating
                                                        ? `${accentText} scale-100`
                                                        : `${textMuted} opacity-40 hover:opacity-80 scale-90 hover:scale-100`
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center gap-1">
                                                        <svg className={`w-8 h-8 ${s <= reviewFormData.rating ? (isDark ? "fill-[#d87f82]" : "fill-antique-gold") : "fill-transparent stroke-current"}`} strokeWidth={1} viewBox="0 0 24 24">
                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                        </svg>
                                                        <span className="text-[10px] font-bold">{s}★</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`${textMuted} text-[10px] font-inter uppercase tracking-widest font-bold mb-2 block`}>Your Review</label>
                                        <textarea 
                                            required
                                            value={reviewFormData.reviewText}
                                            onChange={(e) => setReviewFormData({...reviewFormData, reviewText: e.target.value})}
                                            rows={4} 
                                            placeholder="What did you love about your stay?" 
                                            className={`w-full ${bgInput} border ${borderMain} rounded-2xl px-5 py-4 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} resize-none transition-all placeholder:opacity-50`} 
                                        />
                                        <p className={`text-[10px] ${textMuted} mt-2 px-1 italic`}>Note: Reviews with 3 stars or less are stored privately for our team to improve.</p>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={reviewSubmitting}
                                        className={`w-full ${accentBg} text-white font-inter text-sm font-bold py-4 rounded-2xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group`}
                                    >
                                        {reviewSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                            <>
                                                Post Review
                                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                            </div>
                        </div>

                        <h3 className={`font-cinzel text-base font-bold ${textPrimary} mb-5 flex items-center gap-2`}>
                            Your Review History
                            <span className={`text-[10px] font-inter px-2 py-0.5 rounded-full ${isDark ? "bg-white/10" : "bg-black/5"}`}>{personalReviews.length}</span>
                        </h3>
                        
                        <div className="space-y-4">
                            {personalReviews.length === 0 ? (
                                <div className={`text-center py-10 border border-dashed ${borderMain} rounded-2xl`}>
                                    <p className={`${textMuted} font-inter text-xs italic`}>You haven&apos;t shared any reviews yet.</p>
                                </div>
                            ) : (
                                personalReviews.map((review: any) => (
                                    <div key={review.id} className={`${bgCard} rounded-2xl border ${borderMain} p-5 shadow-sm transition-all hover:border-antique-gold/30 hover:shadow-md`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className={`font-cinzel text-sm font-bold ${textPrimary}`}>{review.property?.name || "Staycation Stay"}</h4>
                                                <p className={`${textMuted} font-inter text-[10px] uppercase tracking-wider`}>
                                                    {new Date(review.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <StarRating rating={review.rating} />
                                        </div>
                                        <p className={`${textSecondary} font-inter text-sm italic leading-relaxed`}>&ldquo;{review.reviewText}&rdquo;</p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className={`text-[9px] font-inter font-bold uppercase tracking-widest ${review.rating > 3 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded" : "text-amber-600 bg-amber-50 px-2 py-0.5 rounded"}`}>
                                                {/* Visibility labels removed as per request */}
                                            </span>
                                            {review.rating > 3 && (
                                                <Link href="/staycation/reviews" className={`${accentText} text-[9px] font-inter font-bold uppercase hover:underline`}>View on site</Link>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-cream-white flex items-center justify-center font-cinzel text-antique-gold font-semibold tracking-widest text-lg">LOADING...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
