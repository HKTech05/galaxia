"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ReviewCarousel from "../components/ReviewCarousel";
import GoldDatePicker from "../components/GoldDatePicker";

const propertiesData = [
    { id: "ambrose", name: "Ambrose", subtitle: "Theme Villa Resort — 5 Themed Villas", startPrice: "5,500", priceNote: "with meals", description: "Five exquisitely themed villas — Bollywood, Rustic, Greek, Bali, and Machan — each with private pool.", highlights: ["5 Themes", "Private Pools", "Meals Included", "Garden"] },
    { id: "amstel-nest", name: "Amstel Nest", subtitle: "Mini Amsterdam — 15 Indoor Pool Cottages", startPrice: "4,950", priceNote: "with meals", description: "Unique cottages inspired by Amsterdam, each with its own private indoor pool. Meals included.", highlights: ["Indoor Pool", "Meals Included", "Gaming Zone", "Boating"] },
    { id: "la-paraiso", name: "La Paraiso", subtitle: "Premium Private Pool Villa", startPrice: "4,950", description: "Luxurious villa with a 25x10 ft private pool, 600 sq ft private garden, and a beautiful gazebo.", highlights: ["25x10 ft Pool", "Private Garden", "Gazebo", "Self Check-in"] },
    { id: "heavenly-villa", name: "Heavenly Villa", subtitle: "Heavenly Villa — Private Indoor Pool", startPrice: "3,950", description: "A heavenly studio villa with a private indoor swimming pool and swing. An intimate tropical paradise.", highlights: ["Indoor Pool", "Pool Swing", "Studio Room", "Free WiFi"] },
    { id: "mount-view", name: "Mount View", subtitle: "Bathtub Mountain Apartment", startPrice: "3,500", description: "Premium apartment featuring a private bathtub and enormous mountain-facing balcony. Luxury meets nature.", highlights: ["Private Bathtub", "Mountain Balcony", "Music Player", "2 AC"] },
    { id: "hill-view", name: "Hill View", subtitle: "Budget Mountain View Apartment", startPrice: "2,500", description: "A cozy apartment with a huge open balcony offering breathtaking mountain views. Perfect for couples seeking a tranquil escape.", highlights: ["Mountain View", "Queen Bed", "Smart TV", "Free WiFi"] },
];

const fmtDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export default function StaycationPage() {
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    const [filterCheckIn, setFilterCheckIn] = useState('');
    const [filterCheckOut, setFilterCheckOut] = useState('');
    const [filterResults, setFilterResults] = useState<Record<string, boolean> | null>(null);
    const [filterLoading, setFilterLoading] = useState(false);

    // Persist dates to localStorage so property detail pages can read them
    useEffect(() => {
        if (filterCheckIn && filterCheckOut) {
            localStorage.setItem('galaxia_search_checkin', filterCheckIn);
            localStorage.setItem('galaxia_search_checkout', filterCheckOut);
        }
    }, [filterCheckIn, filterCheckOut]);

    // Restore dates from localStorage on mount
    useEffect(() => {
        const ci = localStorage.getItem('galaxia_search_checkin');
        const co = localStorage.getItem('galaxia_search_checkout');
        if (ci) setFilterCheckIn(ci);
        if (co) setFilterCheckOut(co);
    }, []);

    // Auto-trigger availability check when both dates are set
    useEffect(() => {
        if (filterCheckIn && filterCheckOut) {
            checkAvailability();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterCheckIn, filterCheckOut]);

    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    const heroUrl = siteImages["staycation-hero/banner"]?.[0]?.url || "";

    const checkAvailability = async () => {
        if (!filterCheckIn || !filterCheckOut) return;
        setFilterLoading(true);
        try {
            // Fetch all property IDs first
            const propsRes = await fetch('/api/properties');
            const allProps = propsRes.ok ? await propsRes.json() : [];
            const results: Record<string, boolean> = {};
            const todayLocal = new Date();
            const minDateStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
            await Promise.all(propertiesData.map(async (prop) => {
                try {
                    const dbProp = allProps.find((p: any) => p.slug === prop.id);
                    if (!dbProp) { results[prop.id] = true; return; }
                    if (!dbProp.isActive) { results[prop.id] = false; return; }

                    // For multi-unit properties (ambrose, amstel-nest), check if at least 1 sub is available
                    const hasSubs = dbProp.subProperties && dbProp.subProperties.length > 0;
                    if (hasSubs) {
                        let anySubAvailable = false;
                        for (const sub of dbProp.subProperties) {
                            if (!sub.isActive) continue;
                            const subUrl = `/api/bookings/staycation/booked-dates?propertyId=${dbProp.id}&subPropertyId=${sub.id}&startDate=${filterCheckIn}&endDate=${filterCheckOut}`;
                            try {
                                const subRes = await fetch(subUrl);
                                if (!subRes.ok) { anySubAvailable = true; continue; }
                                const subData = await subRes.json();
                                const subBooked: string[] = subData.dates || [];
                                let subAvail = true;
                                const ci = new Date(filterCheckIn + 'T12:00:00');
                                const co = new Date(filterCheckOut + 'T12:00:00');
                                for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
                                    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    if (subBooked.includes(ds)) { subAvail = false; break; }
                                }
                                if (subAvail) { anySubAvailable = true; break; }
                            } catch { anySubAvailable = true; }
                        }
                        results[prop.id] = anySubAvailable;
                    } else {
                        // Single-unit property
                        const url = `/api/bookings/staycation/booked-dates?propertyId=${dbProp.id}&startDate=${filterCheckIn}&endDate=${filterCheckOut}`;
                        const res = await fetch(url);
                        if (!res.ok) { results[prop.id] = true; return; }
                        const data = await res.json();
                        const bookedDates: string[] = data.dates || [];
                        const ci = new Date(filterCheckIn + 'T12:00:00');
                        const co = new Date(filterCheckOut + 'T12:00:00');
                        let available = true;
                        for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
                            const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            if (bookedDates.includes(ds)) { available = false; break; }
                        }
                        results[prop.id] = available;
                    }
                } catch { results[prop.id] = true; }
            }));
            setFilterResults(results);
        } catch { }
        setFilterLoading(false);
    };

    const clearFilter = () => {
        setFilterCheckIn('');
        setFilterCheckOut('');
        setFilterResults(null);
        localStorage.removeItem('galaxia_search_checkin');
        localStorage.removeItem('galaxia_search_checkout');
    };

    return (
        <div>
            {/* Hero */}
            <section className="relative h-[55vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
                <video
                    className="absolute inset-0 w-full h-full object-cover"
                    src="/videos/hero.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ zIndex: 0 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" style={{ zIndex: 1 }} />
                <div className="relative h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
                    <p className="text-amber-300 font-inter text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">Galaxia Staycation</p>
                    <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>Luxury Escapes</h1>
                    <p className="font-cinzel text-base sm:text-lg md:text-xl text-amber-200 mb-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>Handpicked Villas & Resorts</p>
                    <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent my-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }} />
                    <p className="text-white/80 font-inter text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                        Discover our collection of exclusive properties nestled in the serene landscapes of Karjat.
                    </p>
                </div>
            </section>

            {/* Properties */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                <div className="text-center mb-12 sm:mb-16">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Our Properties</p>
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary mb-4">Featured Properties</h2>
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto" />
                </div>

                {/* ── Availability Search Bar ── */}
                <div className="mb-12">
                    <div className="relative rounded-2xl bg-white border-2 border-antique-gold/15 shadow-[0_4px_30px_rgba(183,142,58,0.08)]">
                        {/* Top accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-antique-gold to-dark-gold rounded-t-2xl" />

                        <div className="p-6 sm:p-8">
                            <p className="text-center text-antique-gold font-inter text-[10px] tracking-[0.3em] uppercase mb-5 font-semibold">Find Available Properties</p>

                            <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                {/* Check-in */}
                                <div className="flex-1">
                                    <label className="text-xs font-inter font-bold text-text-primary uppercase tracking-wider mb-2 block">Check-in Date</label>
                                    <GoldDatePicker
                                        value={filterCheckIn}
                                        onChange={val => { setFilterCheckIn(val); setFilterCheckOut(''); setFilterResults(null); }}
                                        min={toLocalDate(new Date())}
                                        placeholder="Select check-in"
                                    />
                                </div>

                                {/* Arrow */}
                                <div className="hidden sm:flex items-center justify-center pt-6">
                                    <svg className="w-5 h-5 text-antique-gold/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </div>

                                {/* Check-out */}
                                <div className="flex-1">
                                    <label className="text-xs font-inter font-bold text-text-primary uppercase tracking-wider mb-2 block">Check-out Date</label>
                                    <GoldDatePicker
                                        value={filterCheckOut}
                                        onChange={val => { setFilterCheckOut(val); setFilterResults(null); }}
                                        min={filterCheckIn || toLocalDate(new Date())}
                                        placeholder="Select check-out"
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center justify-center gap-3 mt-6">
                                {filterLoading && (
                                    <span className="flex items-center gap-2 text-sm font-inter font-medium text-antique-gold">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Searching...
                                    </span>
                                )}
                                {(filterResults || filterCheckIn) && (
                                    <button
                                        onClick={clearFilter}
                                        className="px-5 py-3 border border-slate-300 text-slate-500 text-sm font-inter font-medium rounded-full hover:bg-slate-50 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results summary */}
                    {filterResults && (
                        <div className="mt-4 text-center">
                            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-antique-gold/5 border border-antique-gold/15">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-inter font-medium text-text-primary">
                                    {Object.values(filterResults).filter(v => v).length} of {propertiesData.length} properties available
                                </span>
                                <span className="text-xs font-inter text-text-muted">
                                    · {fmtDateDisplay(filterCheckIn)} — {fmtDateDisplay(filterCheckOut)}
                                </span>
                            </div>
                            {(() => {
                                const unavailable = propertiesData.filter(p => filterResults[p.id] === false);
                                if (unavailable.length === 0) return null;
                                return (
                                    <p className="mt-2 text-xs font-inter text-text-muted">
                                        Unavailable: {unavailable.map(p => p.name).join(', ')}
                                    </p>
                                );
                            })()}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 stagger-children">
                    {propertiesData
                        .filter(p => !filterResults || filterResults[p.id] !== false)
                        .map((property) => {
                        const thumbUrl = siteImages[`${property.id}/thumbnail`]?.[0]?.url || "";
                        const isUnavailable = filterResults && filterResults[property.id] === false;
                        return (
                            <Link key={property.id} href={`/staycation/${property.id}${filterCheckIn ? `?checkIn=${filterCheckIn}` : ''}${filterCheckOut ? `&checkOut=${filterCheckOut}` : ''}`} className="group block">
                                <div className={`relative overflow-hidden rounded-xl border border-border-light bg-white transition-all duration-500 hover:border-antique-gold/30 hover:shadow-[0_8px_30px_rgba(186,151,49,0.10)] ${isUnavailable ? 'opacity-40' : ''}`}>
                                    <div className="relative h-56 sm:h-64 md:h-72 overflow-hidden">
                                        {thumbUrl ? (
                                            <Image src={thumbUrl} alt={property.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                                                <span className="text-slate-400 font-inter text-sm">Image coming soon</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border-light">
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-antique-gold font-cinzel font-semibold text-sm">{"\u20B9"}{property.startPrice}</span>
                                                <span className="text-text-muted text-[10px] font-inter">/night</span>
                                            </div>
                                            {property.priceNote && <p className="text-dark-gold text-[9px] font-inter text-center">{property.priceNote}</p>}
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6">
                                        <h3 className="font-cinzel text-lg sm:text-xl font-semibold text-text-primary mb-1 group-hover:text-antique-gold transition-colors">{property.name}</h3>
                                        <p className="text-dark-gold font-inter text-xs tracking-wide mb-2">{property.subtitle}</p>
                                        <p className="text-text-secondary font-inter text-sm leading-relaxed mb-4 line-clamp-2">{property.description}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {property.highlights.map((h) => (
                                                <span key={h} className="text-[10px] font-inter text-text-secondary bg-soft-gray border border-border-light rounded-full px-2.5 py-1">{h}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-antique-gold font-inter text-xs font-medium flex items-center gap-1.5 group-hover:gap-3 transition-all">
                                                View Details
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </span>
                                            <span className="bg-gradient-to-r from-antique-gold to-dark-gold text-white text-xs font-inter font-semibold px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:shadow-antique-gold/30 transition-all duration-300">Book Now</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>
            {/* Guest Reviews */}
            <section className="relative border-t border-border-light bg-[#fdfbf7] overflow-hidden">
                <svg className="absolute top-0 left-0 w-full h-32 text-soft-gray/40 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 120" fill="currentColor">
                    <path d="M0,64 C240,120 480,0 720,64 C960,128 1200,8 1440,64 L1440,0 L0,0 Z" />
                </svg>
                <svg className="absolute bottom-0 left-0 w-full h-24 text-soft-gray/30 pointer-events-none rotate-180" preserveAspectRatio="none" viewBox="0 0 1440 120" fill="currentColor">
                    <path d="M0,64 C240,120 480,0 720,64 C960,128 1200,8 1440,64 L1440,0 L0,0 Z" />
                </svg>
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ba9731 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 pt-20 sm:pt-28">
                    <div className="text-center mb-12 sm:mb-16">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Testimonials</p>
                        <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary mb-4">Guest Reviews</h2>
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto" />
                    </div>
                    <ReviewCarousel />
                </div>
            </section>

            {/* Policies */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="text-center mb-10">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Good to Know</p>
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Common Policies</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
                        {[
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>, title: "Valid ID Required", desc: "Government ID at check-in" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: "Security Deposit", desc: "Refunded at checkout" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: "Non-Refundable", desc: "Non-transferable booking" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: "Damage Charges", desc: "If any damage occurs" },
                        ].map((policy, i) => (
                            <div key={i} className="text-center p-4 sm:p-6 rounded-xl border border-border-light bg-soft-gray/30">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-antique-gold/10 flex items-center justify-center text-antique-gold">{policy.icon}</div>
                                <h4 className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary mb-1">{policy.title}</h4>
                                <p className="text-text-muted text-[10px] sm:text-xs font-inter">{policy.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
