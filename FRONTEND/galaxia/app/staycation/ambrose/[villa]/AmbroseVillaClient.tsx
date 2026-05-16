"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { PropertyData } from "../../../data/properties";
import ImageSlideshow from "../../../components/ImageSlideshow";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import DateSelectionBar from "../../../components/DateSelectionBar";
import { useBookedDates } from "../../../hooks/useBookedDates";

interface AmbroseVillaClientProps {
    parent: PropertyData;
    villa: {
        id: string;
        name: string;
        theme: string;
        description: string;
        image: string;
        maxPersons?: number;
        configuration?: string[];
        pricing?: {
            weekday: { price: string; persons: string };
            weekend: { price: string; persons: string };
            saturday?: { price: string; persons: string };
            primeDates?: string;
        };
    };
}

export default function AmbroseVillaClient({ parent, villa }: AmbroseVillaClientProps) {
    const [calCheckIn, setCalCheckIn] = useState<Date | null>(null);
    const [calCheckOut, setCalCheckOut] = useState<Date | null>(null);
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [dbSubPropertyId, setDbSubPropertyId] = useState<number | null>(null);
    const [isVillaDisabled, setIsVillaDisabled] = useState(false);
    const [liveWeekday, setLiveWeekday] = useState<string | null>(null);
    const [liveWeekend, setLiveWeekend] = useState<string | null>(null);
    const [liveSaturday, setLiveSaturday] = useState<string | null>(null);
    const [livePersonsLabel, setLivePersonsLabel] = useState<string | null>(null);
    const [dateOverrides, setDateOverrides] = useState<Record<string, number>>({});
    const [dateWarning, setDateWarning] = useState('');

    // Fetch booked dates for the date picker
    const bookedDatesForPicker = useBookedDates(dbPropertyId, dbSubPropertyId);

    // Read persisted search dates
    useEffect(() => {
        const ci = localStorage.getItem('galaxia_search_checkin');
        const co = localStorage.getItem('galaxia_search_checkout');
        if (ci) setCalCheckIn(new Date(ci + 'T12:00:00'));
        if (co) setCalCheckOut(new Date(co + 'T12:00:00'));
    }, []);

    // Validate persisted dates against booked dates for this sub-villa
    useEffect(() => {
        if (!dbPropertyId || !dbSubPropertyId || !calCheckIn || !calCheckOut) return;
        const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        (async () => {
            try {
                const ciStr = fmtD(calCheckIn);
                const coStr = fmtD(calCheckOut);
                const url = `/api/bookings/staycation/booked-dates?propertyId=${dbPropertyId}&subPropertyId=${dbSubPropertyId}&startDate=${ciStr}&endDate=${coStr}`;
                const res = await fetch(url);
                if (!res.ok) return;
                const data = await res.json();
                const booked: string[] = data.dates || [];
                // Check if any date in range is booked
                for (let d = new Date(calCheckIn); d < calCheckOut; d.setDate(d.getDate() + 1)) {
                    const ds = fmtD(d);
                    if (booked.includes(ds)) {
                        setCalCheckIn(null);
                        setCalCheckOut(null);
                        setDateWarning('The dates you selected are not available for this villa. Please select new dates.');
                        localStorage.removeItem('galaxia_search_checkin');
                        localStorage.removeItem('galaxia_search_checkout');
                        return;
                    }
                }
            } catch {}
        })();
    }, [dbPropertyId, dbSubPropertyId]);

    // Site images from admin panel
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});

    // Cart state
    const [cartCount, setCartCount] = useState(0);
    const [isInCart, setIsInCart] = useState(false);
    const [cartMessage, setCartMessage] = useState("");

    const refreshCart = useCallback(() => {
        try {
            const cart = JSON.parse(localStorage.getItem("ambrose_cart") || "[]");
            setCartCount(cart.length);
            setIsInCart(cart.some((item: any) => item.villaId === villa.id));
        } catch { setCartCount(0); setIsInCart(false); }
    }, [villa.id]);

    useEffect(() => { refreshCart(); }, [refreshCart]);

    // Fetch site images
    useEffect(() => {
        const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
        fetch(`${baseUrl}/site-images`).then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    const addToCart = () => {
        try {
            const cart = JSON.parse(localStorage.getItem("ambrose_cart") || "[]");
            if (cart.some((item: any) => item.villaId === villa.id)) {
                setCartMessage("Already in cart!");
                setTimeout(() => setCartMessage(""), 2000);
                return;
            }
            if (cart.length >= 2) {
                setCartMessage("Max 2 villas in cart");
                setTimeout(() => setCartMessage(""), 2000);
                return;
            }
            cart.push({
                villaId: villa.id,
                villaName: villa.name,
                theme: villa.theme,
                weekdayPrice: liveWeekday || villa.pricing?.weekday.price || "5,500",
                weekendPrice: liveWeekend || villa.pricing?.weekend.price || "6,500",
                saturdayPrice: liveSaturday || villa.pricing?.saturday?.price || liveWeekend || villa.pricing?.weekend.price || "6,500",
                personsLabel: livePersonsLabel || villa.pricing?.weekday.persons || "2 with meals",
                maxPersons: villa.maxPersons || 8,
                maxAdults: (villa as any).maxAdults || parent.maxAdults || 6,
                maxKids: (villa as any).maxKids ?? parent.maxKids ?? 2,
            });
            localStorage.setItem("ambrose_cart", JSON.stringify(cart));
            if (calCheckIn && calCheckOut) {
                const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                localStorage.setItem("ambrose_cart_dates", JSON.stringify({ checkIn: fmtD(calCheckIn), checkOut: fmtD(calCheckOut) }));
            }
            refreshCart();
            setCartMessage("Added to cart!");
            setTimeout(() => setCartMessage(""), 2000);
        } catch {}
    };

    const removeFromCart = () => {
        try {
            const cart = JSON.parse(localStorage.getItem("ambrose_cart") || "[]").filter((item: any) => item.villaId !== villa.id);
            localStorage.setItem("ambrose_cart", JSON.stringify(cart));
            refreshCart();
        } catch {}
    };

    // Fetch DB property IDs + live pricing
    useEffect(() => {
        (async () => {
            try {
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                const res = await fetch(`${baseUrl}/properties/ambrose/availability`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isActive === false) setIsVillaDisabled(true);
                    const sub = (data.subProperties || []).find((sp: any) => sp.id === parseInt(villa.id) || sp.slug === villa.id);
                    if (sub && sub.isActive === false) setIsVillaDisabled(true);
                    
                    // Use sub-property pricing if available, else parent pricing
                    const subId = sub?.id;
                    const spPricing = subId && data.subPropertyPricing ? data.subPropertyPricing[subId] : null;
                    if (spPricing) {
                        if (spPricing.weekday) { setLiveWeekday(spPricing.weekday.price); if (spPricing.weekday.personsLabel) setLivePersonsLabel(spPricing.weekday.personsLabel); }
                        if (spPricing.weekend) setLiveWeekend(spPricing.weekend.price);
                        if (spPricing.saturday) setLiveSaturday(spPricing.saturday.price);
                        if (spPricing.dateOverrides) setDateOverrides(spPricing.dateOverrides);
                    } else if (data.pricing) {
                        if (data.pricing.weekday) { setLiveWeekday(data.pricing.weekday.price); if (data.pricing.weekday.personsLabel) setLivePersonsLabel(data.pricing.weekday.personsLabel); }
                        if (data.pricing.weekend) setLiveWeekend(data.pricing.weekend.price);
                        if (data.pricing.saturday) setLiveSaturday(data.pricing.saturday.price);
                        if (data.pricing.dateOverrides) setDateOverrides(data.pricing.dateOverrides);
                    }

                    // Also get the numeric IDs
                    const resMeta = await fetch(`${baseUrl}/properties/ambrose`);
                    if (resMeta.ok) {
                        const dbProp = await resMeta.json();
                        setDbPropertyId(dbProp.id);
                        const subMeta = (dbProp.subProperties || []).find((sp: any) => sp.slug === villa.id);
                        if (subMeta) setDbSubPropertyId(subMeta.id);
                    }
                }
            } catch (err) { /* silently fail */ }
        })();
    }, [villa.id]);

    // Use dynamic site-images if available, otherwise static fallback
    const dynamicSlideshow = (siteImages[`ambrose/${villa.id}/slideshow`] || []).map(i => i.url);
    const images = dynamicSlideshow.length > 0 ? dynamicSlideshow : [villa.image, ...parent.images.slice(1, 4)];
    const weekdayPrice = liveWeekday || villa.pricing?.weekday.price || "5,500";
    const weekendPrice = liveWeekend || villa.pricing?.weekend.price || "6,500";
    const saturdayPrice = liveSaturday || villa.pricing?.saturday?.price || weekendPrice;

    const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const bookNowUrl = `/staycation/ambrose/${villa.id}/book${calCheckIn ? `?checkIn=${fmtDate(calCheckIn)}` : ''}${calCheckOut ? `&checkOut=${fmtDate(calCheckOut)}` : ''}`;

    return (
        <div>
            <ImageSlideshow images={images} alt={villa.name} />

            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border-light">
                <nav className="flex items-center gap-2 text-xs font-inter text-text-muted">
                    <Link href="/" className="hover:text-antique-gold transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/staycation" className="hover:text-antique-gold transition-colors">Staycation</Link>
                    <span>/</span>
                    <Link href="/staycation/ambrose" className="hover:text-antique-gold transition-colors">Ambrose</Link>
                    <span>/</span>
                    <span className="text-antique-gold">{villa.name}</span>
                </nav>
            </div>

            {/* Hero Info */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="max-w-3xl">
                    <div className="inline-block px-3 py-1 mb-4 bg-antique-gold/10 border border-antique-gold/30 rounded-full">
                        <span className="text-dark-gold font-inter text-[10px] tracking-widest uppercase">{villa.theme}</span>
                    </div>
                    <h1 className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4 tracking-tight flex items-center gap-4">
                        <img src="/logos/ambrose.png" alt="Ambrose" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                        {villa.name}
                    </h1>
                    <p className="font-inter text-base sm:text-lg text-text-secondary leading-relaxed mb-6">{villa.description}</p>
                    <div className="flex items-center gap-2 text-text-muted font-inter text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        {parent.location}
                    </div>
                </div>
            </section>

            {/* Configuration & Amenities */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Villa Configuration & Amenities</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {villa.configuration && villa.configuration.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30 hover:border-antique-gold/30 transition-all">
                                <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/50 shrink-0" />
                                <span className="text-text-primary font-inter text-xs sm:text-sm">{item}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-text-primary font-inter text-xs sm:text-sm">Max {villa.maxPersons || 8} Guests</span>
                        </div>
                        {parent.amenities
                            .filter((amenity) => {
                                if (!villa.configuration) return true;
                                const configLower = villa.configuration.map((c: string) => c.toLowerCase());
                                return !configLower.some((c: string) => c.includes(amenity.name.toLowerCase()) || amenity.name.toLowerCase().includes(c));
                            })
                            .map((amenity, i) => (
                            <div key={`amenity-${i}`} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-white hover:border-antique-gold/30 hover:shadow-sm transition-all">
                                <span className="text-antique-gold">★</span>
                                <span className="text-text-primary font-inter text-xs sm:text-sm">{amenity.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing & Availability */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Pricing & Availability</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            {dateWarning && (
                                <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-300/60 flex items-start gap-2.5">
                                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    <div className="flex-1">
                                        <p className="text-sm font-inter font-semibold text-amber-800">Dates Unavailable</p>
                                        <p className="text-xs font-inter text-amber-700 mt-0.5">{dateWarning}</p>
                                    </div>
                                    <button onClick={() => setDateWarning('')} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0 mt-0.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                            <div className="mb-4">
                                <DateSelectionBar
                                    checkIn={calCheckIn ? fmtDate(calCheckIn) : undefined}
                                    checkOut={calCheckOut ? fmtDate(calCheckOut) : undefined}
                                    disabledDates={bookedDatesForPicker.size > 0 ? bookedDatesForPicker : undefined}
                                    onDatesChange={(ci, co) => {
                                        setCalCheckIn(new Date(ci + 'T12:00:00'));
                                        setCalCheckOut(new Date(co + 'T12:00:00'));
                                        setDateWarning('');
                                    }}
                                />
                            </div>
                            <AvailabilityCalendar
                                propertyId={dbPropertyId}
                                subPropertyId={dbSubPropertyId}
                                weekdayPrice={weekdayPrice}
                                weekendPrice={weekendPrice}
                                saturdayPrice={saturdayPrice}
                                dateOverrides={dateOverrides}
                                initialCheckIn={calCheckIn}
                                initialCheckOut={calCheckOut}
                                onDatesChange={(ci, co) => {
                                    setCalCheckIn(ci); setCalCheckOut(co);
                                    if (ci) localStorage.setItem('galaxia_search_checkin', fmtDate(ci));
                                    if (co) localStorage.setItem('galaxia_search_checkout', fmtDate(co));
                                }}
                                isDisabled={isVillaDisabled}
                            />
                            <div className="mt-5 flex flex-col sm:flex-row gap-3">
                                <Link href={bookNowUrl} className="block w-full sm:w-auto bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3 rounded-lg text-center hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">
                                    BOOK NOW
                                </Link>
                                {isInCart ? (
                                    <button onClick={removeFromCart} className="block w-full sm:w-auto border-2 border-red-400 text-red-600 font-inter font-semibold text-sm px-6 py-3 rounded-lg text-center hover:bg-red-50 transition-all duration-300 flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Remove from Cart
                                    </button>
                                ) : (
                                    <button onClick={addToCart} className="block w-full sm:w-auto border-2 border-antique-gold/50 text-antique-gold font-inter font-semibold text-sm px-6 py-3 rounded-lg text-center hover:bg-antique-gold/5 transition-all duration-300 flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                                        Add to Cart
                                    </button>
                                )}
                            </div>
                            {cartMessage && (
                                <div className="mt-2 text-sm font-inter font-medium text-antique-gold animate-fade-in">{cartMessage}</div>
                            )}
                            {cartCount > 0 && (
                                <Link href="/staycation/ambrose/book-multi" className="mt-3 flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-inter font-bold text-sm px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                                    View Cart ({cartCount} villa{cartCount > 1 ? 's' : ''})
                                </Link>
                            )}
                        </div>
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Additional Charges</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Extra Adult</span><span className="text-text-primary">₹{parent.pricing.extraAdult} per person</span></div>
                                    <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Kids</span><span className="text-text-primary">₹{parent.pricing.kidsCharge}</span></div>
                                    {saturdayPrice && (
                                        <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Saturday Rate</span><span className="text-text-primary font-medium">₹{parseInt(saturdayPrice.toString().replace(/,/g, '')).toLocaleString('en-IN')} ({livePersonsLabel || villa.pricing?.weekday?.persons || "2 with meals"})</span></div>
                                    )}
                                    <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Pets</span><span className="text-text-primary font-medium">{parent.petsAllowed ? "₹600 per pet (Allowed)" : "Not Allowed"}</span></div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Food Policy</h3>
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-inter font-medium mb-2 bg-green-50 text-green-700 border border-green-200">MEALS INCLUDED</span>
                                <p className="text-text-secondary font-inter text-sm">{parent.foodPolicy.details}</p>
                                {parent.foodPolicy.menuFile && (
                                    <a href={`/api/download?url=${encodeURIComponent(parent.foodPolicy.menuFile!)}&name=${encodeURIComponent(parent.name + "-Menu")}`} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-xs font-medium hover:shadow-md hover:shadow-antique-gold/20 transition-all duration-300">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Download Menu
                                    </a>
                                )}
                            </div>
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Booking & Deposit</h3>
                                <div className="space-y-2 text-sm font-inter">
                                    <div className="flex justify-between"><span className="text-text-secondary">Security Deposit</span><span className="text-text-primary">₹{parent.securityDeposit}</span></div>
                                    <div className="flex justify-between"><span className="text-text-secondary">Refund</span><span className="text-text-primary">Refund at checkout</span></div>
                                    <div className="pt-3 mt-3 border-t border-border-light">
                                        <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold mb-1">Booking Amount Payment</p>
                                        <p className="text-text-secondary text-xs">80% payable online at booking · 20% payable at the venue</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Location */}
            <section className="border-t border-border-light">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Location & Directions</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <p className="text-text-secondary font-inter text-sm mb-4">{parent.location}</p>
                            {parent.googleMap && <a href={parent.googleMap} target="_blank" rel="noopener noreferrer" className="text-antique-gold font-inter text-xs hover:text-dark-gold transition-colors inline-block mb-6">OPEN GOOGLE MAPS →</a>}
                            <div className="space-y-3">
                                <details className="group border border-border-light rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-text-primary font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Nearest Railway Station
                                        <svg className="w-4 h-4 text-antique-gold transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-text-secondary font-inter text-sm">
                                        Karjat (30-40 mins journey from station via auto/cab).
                                    </div>
                                </details>
                                <details className="group border border-border-light rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-text-primary font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        From Mumbai
                                        <svg className="w-4 h-4 text-antique-gold transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-text-secondary font-inter text-sm">
                                        ~2 hours via Mumbai-Pune Expressway.
                                    </div>
                                </details>
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-border-light h-64 sm:h-80 bg-soft-gray flex items-center justify-center">
                            {(parent as any).googleMapSrc ? (
                                <iframe 
                                    src={(parent as any).googleMapSrc} 
                                    className="w-full h-full border-0" 
                                    allowFullScreen 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            ) : (
                                <div className="text-center">
                                    <svg className="w-12 h-12 text-border-medium mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="text-text-muted font-inter text-sm">Google Maps Location</p>
                                    <p className="text-text-muted font-inter text-xs mt-1">{parent.location}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Book Now CTA */}
            <section className="border-t border-border-light bg-gradient-to-r from-soft-gray via-cream-white to-soft-gray">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Ready to Experience</p>
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-4">{villa.name}</h2>
                    <p className="text-text-secondary font-inter text-sm max-w-lg mx-auto mb-8">{villa.description}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={bookNowUrl} className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">
                            Book Now — Starting ₹{weekdayPrice}
                        </Link>
                        {!isInCart && (
                            <button onClick={addToCart} className="border border-antique-gold/30 text-antique-gold font-inter text-sm px-8 py-3.5 rounded-full hover:bg-antique-gold/5 transition-all duration-300 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                                Add Another Villa
                            </button>
                        )}
                        <Link href="/staycation/ambrose" className="border border-antique-gold/30 text-antique-gold font-inter text-sm px-8 py-3.5 rounded-full hover:bg-antique-gold/5 transition-all duration-300">
                            Back to All Villas
                        </Link>
                    </div>
                </div>
            </section>



        </div>
    );
}
