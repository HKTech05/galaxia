"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../lib/api";

type Tab = "bookings" | "profile" | "reviews";
type Category = "all" | "staycation" | "celebration";

interface Booking {
    id: string;
    property: string;
    dates: string;
    status: string;
    amount: string;
    guests: number;
    image: string;
    type: "staycation" | "celebration";
    time: "upcoming" | "past";
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
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Auth guard: redirect to Cognito login if not authenticated
    useEffect(() => {
        const token = localStorage.getItem("galaxia_token");
        if (!token) {
            const redirectUri = `${window.location.origin}/auth/callback`;
            const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/login?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
            window.location.href = cognitoUrl;
            return;
        }
        const storedUser = localStorage.getItem("galaxia_user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setUserName(user.fullName || user.email?.split("@")[0] || "Guest");
                setUserInitial((user.fullName || user.email || "G").charAt(0).toUpperCase());
            } catch { }
        }

        // Fetch real user bookings
        (async () => {
            try {
                setIsLoading(true);
                const res = await api.get("/users/me/bookings");
                
                const formattedStay = (res.stayBookings || []).map((b: any): Booking => {
                    const ci = new Date(b.checkInDate);
                    const co = new Date(b.checkOutDate);
                    const isUpcoming = ci > new Date();
                    
                    const formatPrice = (val: number) => `₹${val.toLocaleString("en-IN")}`;
                    
                    return {
                        id: b.bookingId,
                        property: b.property?.name || "Staycation Property",
                        dates: `${ci.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}-${co.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`,
                        status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
                        amount: formatPrice(b.totalAmount),
                        guests: b.numGuests,
                        image: b.property?.images?.[0] || "https://images.unsplash.com/photo-1615571022219-eb45cf7faa36?w=400&q=80",
                        type: "staycation",
                        time: isUpcoming ? "upcoming" : "past",
                        totalPaid: formatPrice(b.totalAmount),
                        payNow: formatPrice(Math.round(b.totalAmount * 0.5)),
                        payAtVenue: formatPrice(Math.round(b.totalAmount * 0.5)),
                        securityDeposit: "—",
                        checkIn: ci.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) + " · 2:00 PM",
                        checkOut: co.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) + " · 11:00 AM",
                        roomType: b.subProperty?.name || "Entire Property",
                        taxes: "Included"
                    };
                });
                
                const formattedDd = (res.ddBookings || []).map((b: any): Booking => {
                    const date = new Date(b.date);
                    const isUpcoming = date > new Date();
                    const formatPrice = (val: number) => `₹${val.toLocaleString("en-IN")}`;
                    
                    return {
                        id: b.bookingId,
                        property: "Celebration",
                        dates: date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
                        status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
                        amount: formatPrice(b.totalAmount),
                        guests: b.numGuests,
                        image: b.screen?.images?.[0] || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
                        type: "celebration",
                        time: isUpcoming ? "upcoming" : "past",
                        totalPaid: formatPrice(b.totalAmount),
                        payNow: formatPrice(Math.round(b.totalAmount * 0.5)),
                        payAtVenue: formatPrice(Math.round(b.totalAmount * 0.5)),
                        screen: b.screen?.name || "Private Screen",
                        package: b.packageType ? b.packageType.replace("-", " ") : "Private Screening",
                        duration: "3 hours",
                        timeSlot: b.timeSlot
                    };
                });
                
                setBookings([...formattedStay, ...formattedDd].sort((a, b) => b.id.localeCompare(a.id)));
            } catch (err) {
                console.error("Error fetching my bookings:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

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

                {/* Past: Full amount paid + Deposit refunded */}
                {!isUpcoming && (
                    <div className={`border-t ${borderMain} pt-4 mb-4`}>
                        <div className="space-y-3">
                            <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? "bg-green-900/10 border border-green-900/30" : "bg-green-50 border border-green-200"}`}>
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isDark ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <p className={`font-inter text-xs font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}>Full Amount Paid</p>
                                </div>
                                <span className={`font-cinzel font-bold text-sm ${isDark ? "text-green-400" : "text-green-700"}`}>{booking.amount}</span>
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
                                                <img src={booking.image} alt={booking.property} className="w-full h-full object-cover" />
                                                {booking.type === 'celebration' && (
                                                    <div className="absolute top-2 left-2 bg-[#9f353a] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wide">
                                                        Celebration
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
                                {[
                                    { label: "First Name", value: "John", type: "text" },
                                    { label: "Last Name", value: "Doe", type: "text" },
                                    { label: "Email", value: "john@example.com", type: "email" },
                                    { label: "Phone", value: "+91 98765 43210", type: "tel" },
                                ].map((field) => (
                                    <div key={field.label}>
                                        <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>{field.label}</label>
                                        <input type={field.type} defaultValue={field.value} className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-colors`} />
                                    </div>
                                ))}
                            </div>
                            <button className={`mt-6 ${gradientBrandText} text-white font-inter text-sm font-medium px-6 py-2.5 rounded-full hover:shadow-lg transition-all`}>Save Changes</button>
                        </div>
                        <div className={`${bgCard} rounded-xl border ${borderMain} p-6 sm:p-8 transition-colors`}>
                            <h3 className={`font-cinzel text-lg font-semibold ${textPrimary} mb-6`}>Change Password</h3>
                            <div className="space-y-4 max-w-sm">
                                {["Current Password", "New Password", "Confirm Password"].map((label) => (
                                    <div key={label}>
                                        <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>{label}</label>
                                        <input type="password" placeholder="••••••••" className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} transition-colors`} />
                                    </div>
                                ))}
                            </div>
                            <button className={`mt-6 border border-current ${accentText} font-inter text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-80 transition-all`}>Update Password</button>
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
                    <div className="max-w-2xl">
                        <div className={`${bgCard} rounded-xl border ${borderMain} p-6 sm:p-8 mb-6 transition-colors`}>
                            <h3 className={`font-cinzel text-lg font-semibold ${textPrimary} mb-2`}>Write a Review</h3>
                            <p className={`${textMuted} font-inter text-xs mb-5`}>Share your experience from a past booking</p>
                            <div className="mb-4">
                                <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Select Booking</label>
                                <select className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive}`}>
                                    {bookings.filter(b => b.time === 'past' && (categoryFilter === 'all' || b.type === categoryFilter)).map(b => (
                                        <option key={b.id}>{b.property} — {b.dates}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Rating</label>
                                <StarRating rating={0} interactive />
                            </div>
                            <div className="mb-4">
                                <label className={`${textMuted} text-xs font-inter uppercase tracking-wider mb-1.5 block`}>Your Review</label>
                                <textarea rows={4} placeholder="Tell us about your experience..." className={`w-full ${bgInput} border ${borderMain} rounded-lg px-4 py-2.5 text-sm font-inter ${textPrimary} outline-none focus:${borderActive} resize-none`} />
                            </div>
                            <button className={`${gradientBrandText} text-white font-inter text-sm font-medium px-6 py-2.5 rounded-full hover:shadow-lg transition-all`}>Submit Review</button>
                        </div>
                        <h3 className={`font-cinzel text-base font-semibold ${textPrimary} mb-4`}>Your Past Reviews</h3>
                        <div className="space-y-4">
                            {bookings.filter(b => b.rating && (categoryFilter === 'all' || b.type === categoryFilter)).map((b) => (
                                <div key={b.id} className={`${bgCard} rounded-xl border ${borderMain} p-5 transition-colors`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className={`font-cinzel text-sm font-semibold ${textPrimary}`}>{b.property}</h4>
                                        <StarRating rating={b.rating!} />
                                    </div>
                                    <p className={`${textMuted} font-inter text-xs`}>{b.dates}</p>
                                    <p className={`${textSecondary} font-inter text-sm mt-2`}>Amazing experience! Highly recommended.</p>
                                </div>
                            ))}
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
