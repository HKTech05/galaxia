"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { packages as staticPackages } from "../data/celebrations";

export default function CelebrationPage() {
    const [pkgList, setPkgList] = useState<any[]>(Object.values(staticPackages));
    const [loading, setLoading] = useState(false);

    // Fetch package card images from admin photo manager
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    return (
        <div>
            {/* Hero */}
            <section className="relative h-[50vh] sm:h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80')` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-cel-bg/60 via-cel-bg/40 to-cel-bg" />
                <div className="relative z-10 text-center px-4">
                    <p className="font-inter text-rose-light text-xs tracking-[0.4em] uppercase mb-4 animate-fade-in-up">Private Screenings</p>
                    <h1 className="font-cinzel text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                        DIGITAL DIARIES
                    </h1>
                    <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-rose-medium to-transparent mx-auto mb-4" />
                    <p className="font-inter text-cel-text-secondary text-sm sm:text-base max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                        Choose your experience — movie night or a full celebration with décor
                    </p>
                </div>
            </section>

            {/* Package Cards */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
                <div className="text-center mb-10 sm:mb-14">
                    <p className="font-inter text-rose-medium text-xs tracking-[0.3em] uppercase mb-3">Select Your</p>
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-cel-text">Experience</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {pkgList.filter(pkg => pkg.isActive !== false).map((pkg) => (
                        <Link key={pkg.id} href={`/celebration/${pkg.id}`} className="group block">
                            <div className="relative overflow-hidden rounded-2xl border border-cel-border h-[350px] sm:h-[450px] md:h-[500px] transition-all duration-700 hover:border-rose-medium/40 hover:shadow-[0_8px_40px_rgba(159,53,58,0.15)]">
                                <div className="absolute inset-0">
                                        {(siteImages[`dd/landing/${pkg.id}`]?.[0]?.url || pkg.image) && <Image src={siteImages[`dd/landing/${pkg.id}`]?.[0]?.url || pkg.image} alt={pkg.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 768px) 100vw, 50vw" />}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                    <p className="font-inter text-rose-light text-[10px] tracking-[0.3em] uppercase mb-2">{pkg.tagline}</p>
                                    <h3 className="font-cinzel text-2xl sm:text-3xl font-bold text-white mb-2">{pkg.name.toUpperCase()}</h3>
                                    <p className="font-inter text-white/70 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2">{pkg.description}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-cinzel text-lg text-white font-semibold">₹{pkg.pricing[0].weekday}</span>
                                            <span className="font-inter text-[10px] text-white/50">/ {pkg.pricing[0].label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-rose-light font-inter text-xs font-medium group-hover:gap-3 transition-all duration-300">
                                            <span>Explore</span>
                                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-5 right-5 w-10 h-10 border-t border-r border-white/15 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Info Section */}
            <section className="bg-cel-bg relative overflow-hidden pb-16">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cel-border to-transparent" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {/* Card 1 */}
                        <div className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-medium/10 rounded-full blur-[50px] -mr-16 -mb-16" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center mb-6 shadow-lg shadow-rose-dark/20">
                                    <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-lg font-bold text-rose-light mb-3">Choose Your Movie</h3>
                                <p className="font-inter text-sm text-cel-text-secondary leading-relaxed">Pick any movie of your choice — from OTT platforms (Netflix, Video Prime, Hotstar etc.)</p>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden transform md:-translate-y-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-medium/10 rounded-full blur-[50px] -mr-16 -mb-16" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center mb-6 shadow-lg shadow-rose-dark/20">
                                    <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 013 15.546m18-7.092c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 013 8.454" /></svg>
                                </div>
                                <h3 className="font-cinzel text-lg font-bold text-rose-light mb-3">What We Offer</h3>
                                <p className="font-inter text-sm text-cel-text-secondary leading-relaxed">Birthdays, anniversaries, proposals, bachelorettes, or just a cozy movie night — we&apos;ve got it all.</p>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-medium/10 rounded-full blur-[50px] -mr-16 -mb-16" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center mb-6 shadow-lg shadow-rose-dark/20">
                                    <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-lg font-bold text-rose-light mb-3">Rules & Privacy</h3>
                                <p className="font-inter text-sm text-cel-text-secondary leading-relaxed">No CCTV — complete privacy. Valid ID proof required. All guests are required to provide ID during booking.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How to Reach */}
            <section className="bg-cel-bg relative overflow-hidden pb-16">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cel-border to-transparent" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
                    <div className="text-center mb-10 sm:mb-14">
                        <p className="font-inter text-rose-medium text-xs tracking-[0.3em] uppercase mb-3">How to Reach</p>
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-cel-text">Getting Here</h2>
                        <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-rose-medium to-transparent mx-auto mt-4" />
                    </div>

                    {/* Train Stations Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-6">
                        {[
                            { name: "Wadala Station", detail: "5 mins walking distance", icon: <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17l3 3m0 0l3-3m-3 3V10m0-4V3m-4 7h8M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                            { name: "Dadar Station", detail: "10 mins drive", icon: <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg> },
                            { name: "King Circle Station", detail: "10 mins drive", icon: <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                        ].map((station, i) => (
                            <div key={i} className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                                <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-medium/10 rounded-full blur-[50px] -mr-16 -mb-16" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center mb-6 shadow-lg shadow-rose-dark/20">
                                        {station.icon}
                                    </div>
                                    <h3 className="font-cinzel text-lg font-bold text-rose-light mb-3">{station.name}</h3>
                                    <p className="font-inter text-sm text-cel-text-secondary leading-relaxed">{station.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Local Transport + Location Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6">
                        <div className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                            <div className="relative z-10 flex items-center gap-5 h-full">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center shadow-lg shadow-rose-dark/20 shrink-0">
                                    <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-cinzel text-lg font-bold text-rose-light mb-1">Local Transport</h3>
                                    <p className="font-inter text-sm text-cel-text-secondary">Local taxis available</p>
                                </div>
                            </div>
                        </div>
                        <div className="group relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/10 border border-rose-medium/40 p-8 transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(159,53,58,0.25)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-dark/15 via-rose-dark/5 to-transparent" />
                            <div className="absolute top-0 left-0 w-40 h-40 bg-rose-dark/15 rounded-full blur-[60px] -ml-20 -mt-20" />
                            <div className="relative z-10 flex items-center gap-5 h-full">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-dark/50 to-rose-medium/30 border border-rose-medium/40 flex items-center justify-center shadow-lg shadow-rose-dark/20 shrink-0">
                                    <svg className="w-6 h-6 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-cinzel text-lg font-bold text-rose-light mb-1">Location</h3>
                                    <p className="font-inter text-sm text-cel-text-secondary">Wadala, Mumbai</p>
                                    <p className="font-inter text-xs text-cel-text-secondary/60 mt-0.5">Easy access from Western & Central lines</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Embedded Map */}
                    <div className="rounded-xl overflow-hidden border border-cel-border/60 h-64 sm:h-80">
                        <iframe 
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4680.79406035677!2d72.85311857596447!3d19.013532253929238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7cf29b87f566d%3A0x11e519df25f953af!2sDigital%20Diaries!5e0!3m2!1sen!2sin!4v1774188296796!5m2!1sen!2sin" 
                            className="w-full h-full border-0" 
                            allowFullScreen 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
