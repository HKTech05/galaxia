"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { PropertyData } from "../../../data/properties";
import ImageSlideshow from "../../../components/ImageSlideshow";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";
import { api } from "../../../../lib/api";

interface AmstelNestCottageClientProps {
    parent: PropertyData;
    cottage: {
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

export default function AmstelNestCottageClient({ parent, cottage }: AmstelNestCottageClientProps) {
    const [calCheckIn, setCalCheckIn] = useState<Date | null>(null);
    const [calCheckOut, setCalCheckOut] = useState<Date | null>(null);
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [dbSubPropertyId, setDbSubPropertyId] = useState<number | null>(null);
    const [isCottageDisabled, setIsCottageDisabled] = useState(false);
    const [liveWeekday, setLiveWeekday] = useState<string | null>(null);
    const [liveWeekend, setLiveWeekend] = useState<string | null>(null);
    const [dateOverrides, setDateOverrides] = useState<Record<string, number>>({});

    // Fetch DB property ID + live pricing for parent property (Amstel Nest)
    useEffect(() => {
        (async () => {
            try {
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                const res = await fetch(`${baseUrl}/properties/amstel-nest/availability`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isActive === false) setIsCottageDisabled(true);
                    const sub = (data.subProperties || []).find((sp: any) => sp.id === parseInt(cottage.id) || sp.slug === cottage.id);
                    if (sub && sub.isActive === false) setIsCottageDisabled(true);

                    // Use sub-property pricing if available, fallback to parent
                    const subId = sub?.id;
                    const spPricing = subId && data.subPropertyPricing ? data.subPropertyPricing[subId] : null;
                    const hasSubPricing = spPricing && (spPricing.weekday || spPricing.weekend);
                    if (hasSubPricing) {
                        if (spPricing.weekday) setLiveWeekday(spPricing.weekday.price);
                        if (spPricing.weekend) setLiveWeekend(spPricing.weekend.price);
                        if (spPricing.dateOverrides) setDateOverrides(spPricing.dateOverrides);
                    }
                    // Always try parent pricing for anything not set by sub-property
                    if (data.pricing) {
                        if (!hasSubPricing || !spPricing?.weekday) {
                            if (data.pricing.weekday) setLiveWeekday(data.pricing.weekday.price);
                        }
                        if (!hasSubPricing || !spPricing?.weekend) {
                            if (data.pricing.weekend) setLiveWeekend(data.pricing.weekend.price);
                        }
                        if (data.pricing.dateOverrides && (!hasSubPricing || !spPricing?.dateOverrides || Object.keys(spPricing.dateOverrides).length === 0)) {
                            setDateOverrides(data.pricing.dateOverrides);
                        }
                    }

                    // Get numeric ID
                    const resMeta = await fetch(`${baseUrl}/properties/amstel-nest`);
                    if (resMeta.ok) {
                        const dbProp = await resMeta.json();
                        setDbPropertyId(dbProp.id);
                        const subMeta = (dbProp.subProperties || []).find((sp: any) => sp.slug === cottage.id);
                        if (subMeta) setDbSubPropertyId(subMeta.id);
                    }
                }
            } catch (err) { /* silently fail */ }
        })();
    }, [cottage.id]);

    // ── Occupancy X/15 calendar ──
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [occMonth, setOccMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
    useEffect(() => {
        (async () => { try { const d = await api.get("/bookings/staycation"); if (Array.isArray(d)) setAllBookings(d); } catch {} })();
    }, []);
    const occData = useMemo(() => {
        if (!dbPropertyId) return {} as Record<string, number>;
        const y = occMonth.getFullYear(), m = occMonth.getMonth();
        const days = new Date(y, m + 1, 0).getDate();
        const occ: Record<string, number> = {};
        const ab = allBookings.filter(b => b.propertyId === dbPropertyId && b.status !== "cancelled" && b.status !== "no_show");
        for (let d = 1; d <= days; d++) {
            const dt = new Date(y, m, d);
            const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            let c = 0;
            for (const b of ab) { const ci = new Date(b.checkInDate), co = new Date(b.checkOutDate); if (ci <= dt && dt < co) c++; }
            occ[ds] = c;
        }
        return occ;
    }, [allBookings, occMonth, dbPropertyId]);

    const images = [cottage.image, ...parent.images.slice(1, 4)];
    const weekdayPrice = liveWeekday || cottage.pricing?.weekday.price || parent.pricing.weekday.price;
    const weekendPrice = liveWeekend || cottage.pricing?.weekend.price || parent.pricing.weekend.price;

    const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const bookNowUrl = `/staycation/amstel-nest/${cottage.id}/book${calCheckIn ? `?checkIn=${fmtDate(calCheckIn)}` : ''}${calCheckOut ? `&checkOut=${fmtDate(calCheckOut)}` : ''}`;

    return (
        <div>
            <ImageSlideshow images={images} alt={cottage.name} />

            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border-light">
                <nav className="flex items-center gap-2 text-xs font-inter text-text-muted">
                    <Link href="/" className="hover:text-antique-gold transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/staycation" className="hover:text-antique-gold transition-colors">Staycation</Link>
                    <span>/</span>
                    <Link href="/staycation/amstel-nest" className="hover:text-antique-gold transition-colors">Amstel Nest</Link>
                    <span>/</span>
                    <span className="text-antique-gold">{cottage.name}</span>
                </nav>
            </div>

            {/* Hero Info */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <div>
                        <div className="inline-block px-3 py-1 mb-4 bg-antique-gold/10 border border-antique-gold/30 rounded-full">
                            <span className="text-dark-gold font-inter text-[10px] tracking-widest uppercase">{cottage.theme}</span>
                        </div>
                        <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight flex items-center gap-4">
                            <img src="/logos/amstel-nest.jpeg" alt="Amstel Nest" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-lg" />
                            {cottage.name} (Amstel Nest)
                        </h1>
                        <p className="font-inter text-base sm:text-lg text-text-secondary leading-relaxed mb-6">{cottage.description}</p>
                        <div className="flex flex-wrap gap-6 text-sm font-inter mb-4">
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Check-in</span><p className="text-text-primary mt-1">{parent.checkIn}</p></div>
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Check-out</span><p className="text-text-primary mt-1">{parent.checkOut}</p></div>
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Starting from</span><p className="text-antique-gold mt-1 font-semibold">₹{weekdayPrice}</p></div>
                        </div>
                        <div className="flex items-center gap-2 text-text-muted font-inter text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            {parent.location}
                        </div>
                    </div>
                    <div className="relative h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden shadow-lg">
                        <Image src={cottage.image} alt={cottage.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                    </div>
                </div>
            </section>

            {/* Configuration & Amenities */}
            {cottage.configuration && (
                <section className="border-t border-border-light bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-[2px] bg-antique-gold" />
                            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Cottage Configuration & Amenities</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {cottage.configuration.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30 hover:border-antique-gold/30 transition-all">
                                    <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/50 shrink-0" />
                                    <span className="text-text-primary font-inter text-xs sm:text-sm">{item}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                <span className="text-text-primary font-inter text-xs sm:text-sm">Max {cottage.maxPersons || 4} Guests</span>
                            </div>
                            {parent.amenities.map((amenity, i) => (
                                <div key={`amenity-${i}`} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-white hover:border-antique-gold/30 hover:shadow-sm transition-all">
                                    <span className="text-antique-gold">★</span>
                                    <span className="text-text-primary font-inter text-xs sm:text-sm">{amenity.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Pricing & Availability */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Pricing & Availability</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            {/* Occupancy Mini Calendar */}
                            {dbPropertyId && (() => {
                                const y = occMonth.getFullYear(), m = occMonth.getMonth();
                                const daysInMonth = new Date(y, m + 1, 0).getDate();
                                const firstDay = new Date(y, m, 1).getDay();
                                const today = new Date(); today.setHours(0,0,0,0);
                                const weeks: (number | null)[][] = [];
                                let week: (number | null)[] = Array(firstDay).fill(null);
                                for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = []; } }
                                if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
                                return (
                                    <div className="mb-6 rounded-xl border border-border-light bg-white shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-soft-gray/40">
                                            <button onClick={() => setOccMonth(new Date(y, m - 1, 1))} className="p-1.5 text-text-muted hover:text-antique-gold rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                            <div className="text-center">
                                                <p className="text-xs font-cinzel font-bold text-text-primary uppercase tracking-wider">{occMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
                                                <p className="text-[10px] text-text-muted font-inter mt-0.5">Amstel Nest Availability (15 cottages)</p>
                                            </div>
                                            <button onClick={() => setOccMonth(new Date(y, m + 1, 1))} className="p-1.5 text-text-muted hover:text-antique-gold rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 border-b border-border-light">
                                            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1.5 text-center text-[10px] font-bold text-text-muted uppercase">{d}</div>)}
                                        </div>
                                        <div className="p-1.5">
                                            {weeks.map((wk, wi) => (
                                                <div key={wi} className="grid grid-cols-7 gap-0.5">
                                                    {wk.map((day, di) => {
                                                        if (!day) return <div key={di} className="aspect-square" />;
                                                        const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                                                        const booked = occData[ds] || 0;
                                                        const vacant = 15 - booked;
                                                        const isPast = new Date(y, m, day) < today;
                                                        const isToday = new Date(y, m, day).getTime() === today.getTime();
                                                        let bg = "bg-emerald-50 border-emerald-100", txt = "text-emerald-700", badge = "text-emerald-600";
                                                        if (booked > 0 && booked < 15) {
                                                            if (booked >= 10) { bg = "bg-amber-50 border-amber-100"; txt = "text-amber-800"; badge = "text-amber-600"; }
                                                            else { bg = "bg-sky-50 border-sky-100"; txt = "text-sky-800"; badge = "text-sky-600"; }
                                                        }
                                                        if (booked >= 15) { bg = "bg-red-50 border-red-100"; txt = "text-red-700"; badge = "text-red-500"; }
                                                        if (isPast) { bg = "bg-slate-50/50 border-transparent"; txt = "text-text-muted/40"; badge = "text-text-muted/40"; }
                                                        return (
                                                            <div key={di} className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${bg} ${isToday ? "ring-1 ring-antique-gold ring-offset-1" : ""}`}>
                                                                <span className={`text-[11px] font-bold ${txt}`}>{day}</span>
                                                                {!isPast && <span className={`text-[8px] font-bold ${badge} leading-none`}>{booked}/15</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-3 py-2 border-t border-border-light flex flex-wrap gap-2 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200" />All Free</div>
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-sky-100 border border-sky-200" />Some Booked</div>
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200" />Mostly Full</div>
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200" />Full</div>
                                        </div>
                                    </div>
                                );
                            })()}
                            <AvailabilityCalendar
                                propertyId={dbPropertyId}
                                subPropertyId={dbSubPropertyId}
                                weekdayPrice={weekdayPrice}
                                weekendPrice={weekendPrice}
                                dateOverrides={dateOverrides}
                                onDatesChange={(ci, co) => { setCalCheckIn(ci); setCalCheckOut(co); }}
                                isDisabled={isCottageDisabled}
                            />
                            <Link href={bookNowUrl} className="mt-5 block w-full sm:w-auto sm:inline-block bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3 rounded-lg text-center hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">
                                BOOK NOW
                            </Link>
                        </div>
                        <div className="space-y-5">
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Additional Charges</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Extra Adult</span><span className="text-text-primary">₹{parent.pricing.extraAdult} per person</span></div>
                                    <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Kids</span><span className="text-text-primary">₹{parent.pricing.kidsCharge}</span></div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Food Policy</h3>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-inter font-medium mb-2 ${parent.foodPolicy.included ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{parent.foodPolicy.included ? "MEALS INCLUDED" : "NOT INCLUDED"}</span>
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
                                    <div className="flex justify-between"><span className="text-text-secondary">Refund</span><span className="text-text-primary">{parent.securityRefund}</span></div>
                                    <div className="pt-2 mt-2 border-t border-border-light"><p className="text-warning text-xs">{parent.bookingPolicy}</p></div>
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
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-4">{cottage.name}</h2>
                    <p className="text-text-secondary font-inter text-sm max-w-lg mx-auto mb-8">{cottage.description}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={bookNowUrl} className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">
                            Book Now — Starting ₹{weekdayPrice}
                        </Link>
                        <Link href="/staycation/amstel-nest" className="border border-antique-gold/30 text-antique-gold font-inter text-sm px-8 py-3.5 rounded-full hover:bg-antique-gold/5 transition-all duration-300">
                            Back to All Cottages
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
