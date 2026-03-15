"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PropertyData } from "../../../data/properties";
import ImageSlideshow from "../../../components/ImageSlideshow";
import AvailabilityCalendar from "../../../components/AvailabilityCalendar";

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

    // Fetch DB property IDs
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
                    
                    // Also get the numeric IDs if needed
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

    const images = [villa.image, ...parent.images.slice(1, 4)];
    const weekdayPrice = villa.pricing?.weekday.price || "5,500";
    const weekendPrice = villa.pricing?.weekend.price || "6,500";

    const bookNowUrl = `/staycation/ambrose/${villa.id}/book${calCheckIn ? `?checkIn=${calCheckIn.toISOString().split('T')[0]}` : ''}${calCheckOut ? `&checkOut=${calCheckOut.toISOString().split('T')[0]}` : ''}`;

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
                    <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight flex items-center gap-4">
                        <img src="/logos/ambrose.png" alt="Ambrose" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                        {villa.name} (Ambrose)
                    </h1>
                    <p className="font-inter text-base sm:text-lg text-text-secondary leading-relaxed mb-6">{villa.description}</p>
                    <div className="flex items-center gap-2 text-text-muted font-inter text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        {parent.location}
                    </div>
                </div>
            </section>

            {/* Configuration */}
            {villa.configuration && (
                <section className="border-t border-border-light bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-[2px] bg-antique-gold" />
                            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Villa Configuration</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {villa.configuration.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30 hover:border-antique-gold/30 transition-all">
                                    <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/50 shrink-0" />
                                    <span className="text-text-primary font-inter text-xs sm:text-sm">{item}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-soft-gray/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                <span className="text-text-primary font-inter text-xs sm:text-sm">Max {villa.maxPersons || 8} Guests</span>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Amenities — shared from parent */}
            <section className="border-t border-border-light">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary">Amenities</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {parent.amenities.map((amenity, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-white hover:border-antique-gold/30 hover:shadow-sm transition-all">
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
                            <AvailabilityCalendar
                                propertyId={dbPropertyId}
                                subPropertyId={dbSubPropertyId}
                                weekdayPrice={weekdayPrice}
                                weekendPrice={weekendPrice}
                                onDatesChange={(ci, co) => { setCalCheckIn(ci); setCalCheckOut(co); }}
                                isDisabled={isVillaDisabled}
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
                                    {villa.pricing?.saturday && (
                                        <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Saturday Rate</span><span className="text-text-primary font-medium">₹{villa.pricing.saturday.price} ({villa.pricing.saturday.persons})</span></div>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border-light bg-soft-gray/30 p-5 sm:p-6 shadow-sm">
                                <h3 className="font-cinzel text-base font-semibold text-text-primary mb-4">Food Policy</h3>
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-inter font-medium mb-2 bg-green-50 text-green-700 border border-green-200">MEALS INCLUDED</span>
                                <p className="text-text-secondary font-inter text-sm">{parent.foodPolicy.details}</p>
                                {parent.foodPolicy.menuFile && (
                                    <a href={parent.foodPolicy.menuFile} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-xs font-medium hover:shadow-md hover:shadow-antique-gold/20 transition-all duration-300">
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
                                    <div className="px-4 pb-4 text-text-secondary font-inter text-sm">Karjat Railway Station (approx. 45 min drive)</div>
                                </details>
                                <details className="group border border-border-light rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-text-primary font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Local Transportation
                                        <svg className="w-4 h-4 text-antique-gold transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-text-secondary font-inter text-sm">
                                        Local taxis and auto-rickshaws available. Contact +91 123456789 for pre-booking an auto rickshaw.
                                    </div>
                                </details>
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-border-light h-64 sm:h-80 bg-soft-gray flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-12 h-12 text-border-medium mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-text-muted font-inter text-sm">Google Maps will be embedded here</p>
                                <p className="text-text-muted font-inter text-xs mt-1">{parent.location}</p>
                            </div>
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
                        <Link href="/staycation/ambrose" className="border border-antique-gold/30 text-antique-gold font-inter text-sm px-8 py-3.5 rounded-full hover:bg-antique-gold/5 transition-all duration-300">
                            Back to All Villas
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
