"use client";

import { useState, useEffect } from "react";
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
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookMultiPage() {
    const router = useRouter();
    const ambrose = properties["ambrose"];
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mounted, setMounted] = useState(false);

    // Date state — shared across all villas
    const [checkInDate, setCheckInDate] = useState<Date | null>(null);
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
    const [nights, setNights] = useState(0);

    // Step state
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    // Guest state per villa
    const [guestsPerVilla, setGuestsPerVilla] = useState<Record<string, { adults: number; kids: number }>>({});

    // Form state
    const [formData, setFormData] = useState({
        title: "Mr",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        agreedToTerms: false,
    });

    // DB IDs
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [dbSubPropertyMap, setDbSubPropertyMap] = useState<Record<string, number>>({});

    // Submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");

    // Auth
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const stored = JSON.parse(localStorage.getItem("ambrose_cart") || "[]");
            setCart(stored);
            const guests: Record<string, { adults: number; kids: number }> = {};
            stored.forEach((item: CartItem) => { guests[item.villaId] = { adults: 2, kids: 0 }; });
            setGuestsPerVilla(guests);
        } catch { setCart([]); }
    }, []);

    // Fetch DB IDs
    useEffect(() => {
        (async () => {
            try {
                const props = await api.get("/properties");
                const dbProp = props.find((p: any) => p.slug === "ambrose");
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
            } catch {}
        })();
    }, []);

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
        if (newCart.length === 0) router.push("/staycation/ambrose");
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

    // Calculate pricing per villa
    const getVillaPrice = (item: CartItem) => {
        if (!checkInDate || nights <= 0) return 0;
        let total = 0;
        for (let i = 0; i < nights; i++) {
            const d = new Date(checkInDate);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            const isWeekend = day === 0 || day === 5 || day === 6;
            const price = parseInt((isWeekend ? item.weekendPrice : item.weekdayPrice).replace(/,/g, ""));
            total += price;
        }
        return total;
    };

    const getExtraCharges = (item: CartItem) => {
        const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
        const extraAdults = Math.max(0, guests.adults - 2);
        const extraAdultCharge = 2000; // Ambrose extra adult
        const kidsCharge = 1000; // Ambrose kids charge
        return (extraAdults * extraAdultCharge + guests.kids * kidsCharge) * Math.max(nights, 1);
    };

    const grandSubtotal = cart.reduce((sum, item) => sum + getVillaPrice(item) + getExtraCharges(item), 0);
    const gst = Math.round(grandSubtotal * 0.05);
    const grandTotal = grandSubtotal + gst;
    const payNow = Math.round(grandTotal * 0.8);
    const payAtVenue = grandTotal - payNow;

    const handleProceed = () => {
        if (!checkInDate || !checkOutDate || nights <= 0) return;
        const token = localStorage.getItem("galaxia_token");
        if (!token) {
            setShowLoginPrompt(true);
            return;
        }
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.phone || !formData.agreedToTerms) return;
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePayment = async () => {
        if (!dbPropertyId) { setBookingError("System loading, please wait..."); return; }
        setIsSubmitting(true);
        setBookingError("");

        try {
            for (const item of cart) {
                const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                const villaSubtotal = getVillaPrice(item) + getExtraCharges(item);
                const villaGst = Math.round(villaSubtotal * 0.05);
                const villaTotal = villaSubtotal + villaGst;
                const villaPayNow = Math.round(villaTotal * 0.8);
                const villaPayAtVenue = villaTotal - villaPayNow;

                const subPropertyId = dbSubPropertyMap[item.villaId] || null;

                await api.post("/bookings/staycation", {
                    customerName: `${formData.title} ${formData.firstName} ${formData.lastName}`.trim(),
                    customerPhone: formData.phone,
                    customerEmail: formData.email,
                    propertyId: dbPropertyId,
                    subPropertyId,
                    numGuests: guests.adults + guests.kids,
                    checkInDate: checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth()+1).padStart(2,"0")}-${String(checkInDate.getDate()).padStart(2,"0")}` : undefined,
                    checkOutDate: checkOutDate ? `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth()+1).padStart(2,"0")}-${String(checkOutDate.getDate()).padStart(2,"0")}` : undefined,
                    nightlyRate: getVillaPrice(item) / Math.max(nights, 1),
                    basePrice: getVillaPrice(item),
                    extraPersonCharge: getExtraCharges(item),
                    gstAmount: villaGst,
                    totalAmount: villaTotal,
                    advanceAmount: villaPayNow,
                    balanceAmount: villaPayAtVenue,
                    securityDeposit: 3000,
                    advancePaid: true,
                    advanceMethod: "online",
                    source: "website",
                });
            }

            // Clear cart
            localStorage.removeItem("ambrose_cart");
            router.push("/dashboard?source=staycation&status=success");
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
                <p className="font-inter text-sm text-slate-500 mb-6">Add Ambrose villas to your cart to book them together.</p>
                <Link href="/staycation/ambrose" className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3 rounded-full">Browse Villas</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCF9] pb-24">
            <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
                {/* Steps */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="w-12 h-[1px] bg-border-medium" />
                        <h1 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-text-primary uppercase">Book Multiple Villas</h1>
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
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex items-center gap-3">
                            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="font-inter text-sm text-amber-800">You're booking <strong>{cart.length} Ambrose villa{cart.length > 1 ? "s" : ""}</strong> together. All villas share the same dates.</p>
                        </div>

                        {/* Date Picker */}
                        <div className="bg-white border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
                            <h3 className="font-cinzel text-lg font-semibold text-text-primary mb-4">Select Dates</h3>
                            <AvailabilityCalendar
                                propertyId={dbPropertyId}
                                weekdayPrice={ambrose.pricing.weekday.price}
                                weekendPrice={ambrose.pricing.weekend.price}
                                dateOverrides={{}}
                                onDatesChange={handleDatesChange}
                            />
                        </div>

                        {/* Villa Cards */}
                        {cart.map((item) => {
                            const villa = ambrose.subProperties?.find(v => v.id === item.villaId);
                            const villaPrice = getVillaPrice(item);
                            const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                            const extraCharges = getExtraCharges(item);

                            return (
                                <div key={item.villaId} className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
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

                        {/* Grand Total */}
                        {nights > 0 && (
                            <div className="bg-white border border-border-light rounded-xl p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-lg font-semibold text-text-primary mb-4">Booking Summary</h3>
                                <div className="space-y-2 font-inter text-sm">
                                    <div className="flex justify-between"><span className="text-text-secondary">Dates</span><span className="text-text-primary">{checkInDate && formatDateShort(checkInDate)} → {checkOutDate && formatDateShort(checkOutDate)}</span></div>
                                    <div className="flex justify-between"><span className="text-text-secondary">Subtotal ({cart.length} villa{cart.length > 1 ? "s" : ""})</span><span className="text-text-primary">{formatPrice(grandSubtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-text-secondary">GST (5%)</span><span className="text-text-primary">{formatPrice(gst)}</span></div>
                                    <div className="border-t border-border-light my-2" />
                                    <div className="flex justify-between text-base font-bold"><span className="text-text-primary">Grand Total</span><span className="text-antique-gold">{formatPrice(grandTotal)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay Now (80%)</span><span>{formatPrice(payNow)}</span></div>
                                    <div className="flex justify-between text-xs text-text-muted"><span>Pay at Venue (20%)</span><span>{formatPrice(payAtVenue)}</span></div>
                                </div>
                                <button
                                    onClick={handleProceed}
                                    disabled={!checkInDate || !checkOutDate}
                                    className={`mt-6 w-full py-3 rounded-lg font-cinzel font-semibold text-sm uppercase tracking-wider transition-all duration-300 ${
                                        checkInDate && checkOutDate
                                            ? "bg-gradient-to-r from-antique-gold to-dark-gold text-white hover:shadow-lg hover:shadow-antique-gold/20"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                                >
                                    Proceed to Details
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Personal Details */}
                {currentStep === 2 && (
                    <div className="bg-white border border-border-light p-6 sm:p-8 shadow-sm rounded-xl">
                        <h2 className="font-cinzel text-lg sm:text-xl text-text-primary uppercase mb-1">Primary Guest Details</h2>
                        <p className="font-inter text-xs sm:text-sm text-text-secondary mb-8 pb-4 border-b border-border-light">These details apply to all {cart.length} villa bookings.</p>
                        <form onSubmit={handleFormSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                                <div className="md:col-span-2">
                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">Title*</label>
                                    <select value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold">
                                        <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
                                    </select>
                                </div>
                                <div className="md:col-span-5">
                                    <label className="text-text-muted text-[10px] font-inter uppercase tracking-wider mb-1 block">First Name*</label>
                                    <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2 font-inter text-sm text-text-primary focus:ring-0 focus:border-antique-gold" />
                                </div>
                                <div className="md:col-span-5">
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
                )}

                {/* STEP 3: Confirm & Pay */}
                {currentStep === 3 && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-white border border-border-light rounded-xl p-6 shadow-sm">
                            <h2 className="font-cinzel text-xl font-semibold text-text-primary mb-6">Booking Confirmation</h2>
                            <div className="space-y-2 mb-6 font-inter text-sm">
                                <p className="text-text-secondary">Guest: <span className="text-text-primary font-medium">{formData.title} {formData.firstName} {formData.lastName}</span></p>
                                <p className="text-text-secondary">Phone: <span className="text-text-primary font-medium">{formData.phone}</span></p>
                                <p className="text-text-secondary">Dates: <span className="text-text-primary font-medium">{checkInDate && formatDateShort(checkInDate)} → {checkOutDate && formatDateShort(checkOutDate)} ({nights} night{nights > 1 ? "s" : ""})</span></p>
                            </div>

                            {cart.map((item) => {
                                const villaTotal = getVillaPrice(item) + getExtraCharges(item);
                                const guests = guestsPerVilla[item.villaId] || { adults: 2, kids: 0 };
                                return (
                                    <div key={item.villaId} className="border border-border-light rounded-lg p-4 mb-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] text-dark-gold font-inter uppercase tracking-wider">{item.theme}</span>
                                                <h4 className="font-cinzel font-semibold text-text-primary">{item.villaName}</h4>
                                                <p className="text-xs text-text-muted font-inter">{guests.adults} adults{guests.kids > 0 ? `, ${guests.kids} kids` : ""}</p>
                                            </div>
                                            <span className="font-inter font-semibold text-text-primary">{formatPrice(villaTotal)}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="border-t border-border-light mt-4 pt-4 space-y-2 font-inter text-sm">
                                <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(grandSubtotal)}</span></div>
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

            {/* Login Prompt */}
            {showLoginPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#202123] rounded-2xl shadow-xl w-full max-w-[400px] p-8 text-center">
                        <h2 className="font-inter text-2xl font-semibold text-white mb-4">Please Log In</h2>
                        <p className="text-[#C5C5D2] text-sm mb-6">You need to be logged in to book. Please log in from any single villa booking page first.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLoginPrompt(false)} className="flex-1 bg-[#343541] text-white py-3 rounded-lg font-inter text-sm">Cancel</button>
                            <Link href={`/staycation/ambrose/${cart[0]?.villaId}/book`} className="flex-1 bg-white text-black py-3 rounded-lg font-inter text-sm font-semibold text-center">Go to Login</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
