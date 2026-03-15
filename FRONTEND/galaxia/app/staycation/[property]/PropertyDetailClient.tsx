"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PropertyData } from "../../data/properties";
import ImageSlideshow from "../../components/ImageSlideshow";
import AvailabilityCalendar from "../../components/AvailabilityCalendar";

const amenityIcons: Record<string, React.ReactNode> = {
    bed: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v11a1 1 0 001 1h16a1 1 0 001-1V7M3 7l9-4 9 4" /></svg>,
    sofa: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 10V7a2 2 0 00-2-2H6a2 2 0 00-2 2v3m16 0a2 2 0 00-2 2v2H6v-2a2 2 0 00-2-2m16 0V7M4 10V7m0 7v4h16v-4" /></svg>,
    mountain: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20l4.5-9 3.5 5 4-7 4 11H4z" /></svg>,
    kitchen: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h18v18H3V3zm0 9h18M12 3v18" /></svg>,
    bath: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12V7a3 3 0 013-3h1" /></svg>,
    tv: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={1.5} d="M8 21h8m-4-4v4" /></svg>,
    flame: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>,
    snowflake: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v20m0-20l4 4m-4-4l-4 4m4 16l4-4m-4 4l-4-4M2 12h20M2 12l4-4M2 12l4 4m14-4l-4-4m4 4l-4 4" /></svg>,
    wifi: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>,
    car: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10H8s-2.7.6-4.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" /></svg>,
    swim: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 16c.6.5 1.2 1 2.5 1C7 17 7 15 9.5 15S12 17 14.5 17 17 15 19.5 15c1.3 0 1.9.5 2.5 1" /></svg>,
    music: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13" /></svg>,
    tree: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21V12m0 0l-4 4m4-4l4 4M7 8l5-6 5 6H7z" /></svg>,
    lock: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={1.5} d="M7 11V7a5 5 0 0110 0v4" /></svg>,
    star: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    game: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    battery: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={1.5} d="M22 11v2" /></svg>,
    food: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>,
    heart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    home: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    boat: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 17l6-6 4 4 8-8" /></svg>,
};

function getAmenityIcon(iconName: string) {
    return amenityIcons[iconName] || amenityIcons.star;
}

export default function PropertyDetailClient({ property }: { property: PropertyData }) {
    const [calCheckIn, setCalCheckIn] = useState<Date | null>(null);
    const [calCheckOut, setCalCheckOut] = useState<Date | null>(null);
    const [dbPropertyId, setDbPropertyId] = useState<number | null>(null);
    const [isPropertyDisabled, setIsPropertyDisabled] = useState(false);
    const [subPropertyStatus, setSubPropertyStatus] = useState<Record<number, boolean>>({});

    // Fetch DB property ID on mount
    useEffect(() => {
        (async () => {
            try {
                const baseUrl = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
                const res = await fetch(`${baseUrl}/properties/${property.id}/availability`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isActive === false) setIsPropertyDisabled(true);
                    if (data.subProperties) {
                        const status: Record<number, boolean> = {};
                        data.subProperties.forEach((sp: any) => {
                            status[sp.id] = sp.isActive === false;
                        });
                        setSubPropertyStatus(status);
                    }
                }
                
                // Still need the numeric ID for the generic properties list for some lookups if needed
                const resList = await fetch(`${baseUrl}/properties`);
                if (resList.ok) {
                    const props = await resList.json();
                    const dbProp = props.find((p: any) => p.slug === property.id);
                    if (dbProp) setDbPropertyId(dbProp.id);
                }
            } catch (err) { /* silently fail */ }
        })();
    }, [property.id]);

    const bookNowUrl = `/staycation/${property.id}/book${calCheckIn ? `?checkIn=${calCheckIn.toISOString().split('T')[0]}` : ''}${calCheckOut ? `&checkOut=${calCheckOut.toISOString().split('T')[0]}` : ''}`;

    return (
        <div>
            <ImageSlideshow images={property.images} alt={property.name} />

            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border-light">
                <nav className="flex items-center gap-2 text-xs font-inter text-text-muted">
                    <Link href="/" className="hover:text-antique-gold transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/staycation" className="hover:text-antique-gold transition-colors">Staycation</Link>
                    <span>/</span>
                    <span className="text-antique-gold">{property.name}</span>
                </nav>
                <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-antique-gold transition-colors font-inter">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    SHARE
                </button>
            </div>

            {/* Overview */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <div>
                        <div className="w-10 h-[2px] bg-antique-gold mb-4" />
                        <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-2">{property.name}</h1>
                        <p className="text-dark-gold font-cinzel text-base sm:text-lg mb-5">{property.subtitle}</p>
                        <p className="text-text-secondary font-inter text-sm leading-relaxed mb-6">{property.longDescription}</p>
                        <div className="flex flex-wrap gap-6 text-sm font-inter">
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Check-in</span><p className="text-text-primary mt-1">{property.checkIn}</p></div>
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Check-out</span><p className="text-text-primary mt-1">{property.checkOut}</p></div>
                            <div><span className="text-text-muted text-xs uppercase tracking-wider">Starting from</span><p className="text-antique-gold mt-1 font-semibold">₹{property.pricing.weekday.price}</p></div>
                        </div>
                    </div>
                    <div className="relative h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden shadow-lg">
                        <Image src={property.images[1] || property.images[0]} alt={property.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                    </div>
                </div>
            </section>

            {/* Sub-properties — shown ABOVE experiences for Ambrose */}
            {property.id === "ambrose" && property.subProperties && property.subProperties.length > 0 && (
                <section className="border-t border-border-light">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                        <div className="text-center mb-10 sm:mb-12">
                            <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Choose Your</p>
                            <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Themed Villas</h2>
                        </div>
                        <div className="flex flex-wrap justify-center gap-5 sm:gap-6">
                            {property.subProperties.map((sub) => (
                                <div key={sub.id} className="group rounded-xl overflow-hidden border border-border-light bg-white hover:shadow-lg hover:border-antique-gold/30 transition-all duration-500 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                                    <div className="relative h-48 sm:h-52 overflow-hidden">
                                        <Image src={sub.image} alt={sub.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm">
                                            <span className="text-dark-gold text-[10px] font-inter tracking-wide">{sub.theme}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <h3 className="font-cinzel text-base sm:text-lg font-semibold text-text-primary mb-1 group-hover:text-antique-gold transition-colors">{sub.name}</h3>
                                        <p className="text-text-secondary font-inter text-xs leading-relaxed mb-3">{sub.description}</p>
                                        {sub.configuration && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {sub.configuration.slice(0, 4).map((c) => (
                                                    <span key={c} className="text-[9px] font-inter text-text-secondary bg-soft-gray border border-border-light rounded-full px-2 py-0.5">{c}</span>
                                                ))}
                                            </div>
                                        )}
                                        {sub.pricing && (
                                            <div className="flex items-baseline gap-1 mb-3">
                                                <span className="text-antique-gold font-cinzel font-semibold text-sm">₹{sub.pricing.weekday.price}</span>
                                                <span className="text-text-muted text-[10px] font-inter">/ {sub.pricing.weekday.persons}</span>
                                            </div>
                                        )}
                                        {subPropertyStatus[sub.entryDbId || 0] ? (
                                            <div className="block w-full text-center bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold py-2.5 rounded-lg uppercase tracking-widest">Under Maintenance</div>
                                        ) : (
                                            <Link href={`/staycation/ambrose/${sub.id}`} className="block w-full text-center bg-antique-gold/10 border border-antique-gold/30 text-antique-gold text-xs font-inter font-medium py-2.5 rounded-lg hover:bg-antique-gold hover:text-white transition-all duration-300">View Details & Book</Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Experiences */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="text-center mb-10 sm:mb-12">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Discover</p>
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Experiences & Activities</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                        {property.activities.map((activity, i) => (
                            <div key={i} className="group rounded-xl overflow-hidden border border-border-light bg-white hover:shadow-lg hover:border-antique-gold/30 transition-all duration-500">
                                <div className="relative h-44 sm:h-48 overflow-hidden">
                                    <Image src={activity.image} alt={activity.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                                </div>
                                <div className="p-4 sm:p-5">
                                    <h3 className="font-cinzel text-sm sm:text-base font-semibold text-text-primary mb-2 group-hover:text-antique-gold transition-colors">{activity.title}</h3>
                                    <p className="text-text-secondary font-inter text-xs leading-relaxed">{activity.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sub-properties — for NON-ambrose resorts (Amstel Nest) */}
            {property.id !== "ambrose" && property.subProperties && property.subProperties.length > 0 && (
                <section className="border-t border-border-light">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                        <div className="text-center mb-10 sm:mb-12">
                            <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Choose Your</p>
                            <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Cottage Types</h2>
                        </div>
                        <div className="flex flex-wrap justify-center gap-5 sm:gap-6">
                            {property.subProperties.map((sub) => (
                                <div key={sub.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] group rounded-xl overflow-hidden border border-border-light bg-white hover:shadow-lg hover:border-antique-gold/30 transition-all duration-500">
                                    <div className="relative h-48 sm:h-52 overflow-hidden">
                                        <Image src={sub.image} alt={sub.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm">
                                            <span className="text-dark-gold text-[10px] font-inter tracking-wide">{sub.theme}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <h3 className="font-cinzel text-base sm:text-lg font-semibold text-text-primary mb-1 group-hover:text-antique-gold transition-colors">{sub.name}</h3>
                                        <p className="text-text-secondary font-inter text-xs leading-relaxed mb-3">{sub.description}</p>
                                        {sub.configuration && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {sub.configuration.slice(0, 4).map((c) => (
                                                    <span key={c} className="text-[9px] font-inter text-text-secondary bg-soft-gray border border-border-light rounded-full px-2 py-0.5">{c}</span>
                                                ))}
                                            </div>
                                        )}
                                        {sub.pricing && (
                                            <div className="flex items-baseline gap-1 mb-3">
                                                <span className="text-antique-gold font-cinzel font-semibold text-sm">₹{sub.pricing.weekday.price}</span>
                                                <span className="text-text-muted text-[10px] font-inter">/ {sub.pricing.weekday.persons}</span>
                                            </div>
                                        )}
                                        <Link href={`/staycation/${property.id}/${sub.id}`} className="block w-full bg-antique-gold/10 border border-antique-gold/30 text-antique-gold text-xs font-inter font-medium py-2.5 rounded-lg hover:bg-antique-gold hover:text-white transition-all duration-300 text-center">View Details & Book</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Property Info Grid */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex items-center gap-3 mb-8 sm:mb-10">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Property Information</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                        <div className="p-5 sm:p-6 rounded-xl border border-border-light bg-soft-gray/30">
                            <div className="flex items-center gap-2 mb-4 text-antique-gold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">Check-in / Check-out</span>
                            </div>
                            <div className="space-y-2 text-sm font-inter">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-antique-gold/40" /><span className="text-text-primary">Check-in from {property.checkIn}</span></div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-antique-gold/40" /><span className="text-text-primary">Check-out until {property.checkOut}</span></div>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6 rounded-xl border border-border-light bg-soft-gray/30">
                            <div className="flex items-center gap-2 mb-4 text-antique-gold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                <span className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">Rooms & Configuration</span>
                            </div>
                            <div className="space-y-2 text-sm font-inter">
                                {property.configuration.slice(0, 4).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-antique-gold/40" /><span className="text-text-primary">{item}</span></div>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 sm:p-6 rounded-xl border border-border-light bg-soft-gray/30">
                            <div className="flex items-center gap-2 mb-4 text-antique-gold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                <span className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">Contact</span>
                            </div>
                            <div className="space-y-3 text-sm font-inter">
                                <p className="flex items-center gap-2 text-text-primary"><svg className="w-4 h-4 text-antique-gold/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>{property.location}</p>
                                {property.googleMap && <a href={property.googleMap} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-antique-gold hover:text-dark-gold transition-colors"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>View on Google Maps</a>}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Amenities */}
            <section className="border-t border-border-light">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex items-center gap-3 mb-8 sm:mb-10">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Amenities</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {property.amenities.map((amenity, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-border-light bg-white hover:border-antique-gold/30 hover:shadow-sm transition-all duration-300">
                                <div className="text-antique-gold shrink-0">{getAmenityIcon(amenity.icon)}</div>
                                <span className="text-text-primary font-inter text-xs sm:text-sm">{amenity.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Facilities */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex items-center gap-3 mb-8 sm:mb-10">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Facilities</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {property.facilities.map((facility, i) => (
                            <div key={i}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="text-antique-gold">{getAmenityIcon(facility.icon)}</div>
                                    <h3 className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">{facility.category}</h3>
                                </div>
                                <ul className="space-y-2">
                                    {facility.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-text-secondary font-inter text-xs sm:text-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/40 shrink-0" />{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing & Availability — hidden for Ambrose & Amstel Nest (each sub-property has its own) */}
            {property.id !== "ambrose" && property.id !== "amstel-nest" && (
                <section className="border-t border-border-light">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                        <div className="flex items-center gap-3 mb-8 sm:mb-10">
                            <div className="w-10 h-[2px] bg-antique-gold" />
                            <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Pricing & Availability</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                            <div>
                                <AvailabilityCalendar
                                    propertyId={dbPropertyId}
                                    weekdayPrice={property.pricing.weekday.price}
                                    primeDatePrice={property.pricing.primeDates}
                                    onDatesChange={(ci, co) => { setCalCheckIn(ci); setCalCheckOut(co); }}
                                    isDisabled={isPropertyDisabled}
                                />
                                {isPropertyDisabled ? (
                                    <div className="mt-5 w-full bg-red-50 border border-red-200 text-red-600 font-cinzel font-semibold text-sm px-8 py-3 rounded-lg text-center uppercase tracking-widest">Under Maintenance</div>
                                ) : (
                                    <Link href={bookNowUrl} className="mt-5 block w-full sm:w-auto sm:inline-block bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3 rounded-lg text-center hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">
                                        BOOK NOW
                                    </Link>
                                )}
                            </div>
                            <div className="space-y-5 sm:space-y-6">
                                <div className="rounded-xl border border-border-light bg-white p-5 sm:p-6 shadow-sm">
                                    <h3 className="font-cinzel text-base sm:text-lg font-semibold text-text-primary mb-4">Additional Charges</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Extra Adult</span><span className="text-text-primary">₹{property.pricing.extraAdult} per person</span></div>
                                        <div className="flex justify-between text-sm font-inter"><span className="text-text-secondary">Kids</span><span className="text-text-primary">₹{property.pricing.kidsCharge}</span></div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border-light bg-white p-5 sm:p-6 shadow-sm">
                                    <h3 className="font-cinzel text-base sm:text-lg font-semibold text-text-primary mb-4">Food Policy</h3>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-inter font-medium mb-2 ${property.foodPolicy.included ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{property.foodPolicy.included ? "MEALS INCLUDED" : "NOT INCLUDED"}</span>
                                    <p className="text-text-secondary font-inter text-sm">{property.foodPolicy.details}</p>
                                    {property.foodPolicy.menuFile && (
                                        <a href={property.foodPolicy.menuFile} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-xs font-medium hover:shadow-md hover:shadow-antique-gold/20 transition-all duration-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Download Menu
                                        </a>
                                    )}
                                </div>
                                <div className="rounded-xl border border-border-light bg-white p-5 sm:p-6 shadow-sm">
                                    <h3 className="font-cinzel text-base sm:text-lg font-semibold text-text-primary mb-4">Booking & Deposit</h3>
                                    <div className="space-y-2 text-sm font-inter">
                                        <div className="flex justify-between"><span className="text-text-secondary">Security Deposit</span><span className="text-text-primary">₹{property.securityDeposit}</span></div>
                                        <div className="pt-2 mt-2 border-t border-border-light"><p className="text-warning text-xs">{property.bookingPolicy}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Location */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex items-center gap-3 mb-8 sm:mb-10">
                        <div className="w-10 h-[2px] bg-antique-gold" />
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Location & Directions</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <h3 className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider mb-2">Getting Here</h3>
                            <p className="text-text-secondary font-inter text-sm mb-2">{property.location}</p>
                            {property.googleMap && <a href={property.googleMap} target="_blank" rel="noopener noreferrer" className="text-antique-gold font-inter text-xs hover:text-dark-gold transition-colors inline-block mb-6">OPEN GOOGLE MAPS →</a>}
                            <div className="space-y-3">
                                {["Nearest Railway Station", "Local Transportation"].map((title) => (
                                    <details key={title} className="group border border-border-light rounded-lg">
                                        <summary className="flex items-center justify-between p-4 cursor-pointer text-text-primary font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                            {title}
                                            <svg className="w-4 h-4 text-antique-gold transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </summary>
                                        <div className="px-4 pb-4 text-text-secondary font-inter text-sm">
                                            {title === "Nearest Railway Station"
                                                ? "Karjat Railway Station (approx. 45 min drive)"
                                                : "Local taxis and auto-rickshaws available. Contact +91 123456789 for pre-booking an auto rickshaw."}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-border-light h-64 sm:h-80 bg-soft-gray flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-12 h-12 text-border-medium mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-text-muted font-inter text-sm">Google Maps will be embedded here</p>
                                <p className="text-text-muted font-inter text-xs mt-1">{property.location}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Book Now CTA (standalone properties only) */}
            {property.type === "standalone" && (
                <section className="border-t border-border-light bg-gradient-to-r from-soft-gray via-cream-white to-soft-gray">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Ready to Experience</p>
                        <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-4">{property.name}</h2>
                        <p className="text-text-secondary font-inter text-sm max-w-lg mx-auto mb-8">{property.description}</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {isPropertyDisabled ? (
                                <div className="bg-red-50 border border-red-200 text-red-600 font-cinzel font-semibold text-sm px-8 py-3.5 rounded-full uppercase tracking-widest">Under Maintenance</div>
                            ) : (
                                <Link href={`/staycation/${property.id}/book`} className="bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel font-semibold text-sm px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300">Book Now — Starting ₹{property.pricing.weekday.price}</Link>
                            )}
                            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="border border-antique-gold/30 text-antique-gold font-inter text-sm px-8 py-3.5 rounded-full hover:bg-antique-gold/5 transition-all duration-300">Contact via WhatsApp</a>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
