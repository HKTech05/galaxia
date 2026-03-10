"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CelebrationPackage, ScreenData } from "../../../data/celebrations";

interface ScreenDetailClientProps {
    pkg: CelebrationPackage;
    screen: ScreenData;
}

export default function ScreenDetailClient({ pkg, screen }: ScreenDetailClientProps) {
    const [currentImage, setCurrentImage] = useState(0);

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
                    <span className="text-rose-medium">{screen.name}</span>
                </nav>
            </div>

            {/* Screen Name */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 text-center">
                <div className="inline-block px-3 py-1 mb-3 bg-rose-dark/15 border border-rose-dark/30 rounded-full">
                    <span className="text-rose-light font-inter text-[10px] tracking-widest uppercase">{screen.theme}</span>
                </div>
                <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-cel-text">{screen.name}</h1>
            </div>

            {/* Image Slideshow */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-cel-border">
                    <Image
                        src={screen.gallery[currentImage]}
                        alt={`${screen.name} - Image ${currentImage + 1}`}
                        fill
                        className="object-cover transition-all duration-500"
                        sizes="(max-width: 1024px) 100vw, 80vw"
                    />
                    {/* Navigation arrows */}
                    <button onClick={() => setCurrentImage(prev => prev === 0 ? screen.gallery.length - 1 : prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-rose-dark/60 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setCurrentImage(prev => prev === screen.gallery.length - 1 ? 0 : prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-rose-dark/60 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {screen.gallery.map((_, i) => (
                            <button key={i} onClick={() => setCurrentImage(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? "bg-rose-medium w-5" : "bg-white/40 hover:bg-white/60"}`} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Description & Menu */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <p className="font-inter text-cel-text-secondary text-sm sm:text-base leading-relaxed text-center">{screen.description}</p>

                {/* Download Menu Button */}
                <div className="flex justify-center mt-8">
                    <a
                        href="/food-menu.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-md text-white font-cinzel font-semibold text-sm px-6 py-3 rounded-full hover:shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-all duration-300"
                    >
                        <svg className="w-5 h-5 text-white/90 group-hover:-translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Food Menu
                    </a>
                </div>
                <div className="flex items-center justify-center gap-6 mt-6 text-sm font-inter">
                    <div className="flex items-center gap-2 text-cel-text-muted">
                        <svg className="w-4 h-4 text-rose-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {screen.capacity}
                    </div>
                    <div className="flex items-center gap-2 text-cel-text-muted">
                        <svg className="w-4 h-4 text-rose-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Complete Privacy
                    </div>
                </div>
            </section>

            {/* Book Now CTA */}
            <section className="border-t border-cel-border bg-gradient-to-b from-cel-bg to-cel-card">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <p className="text-rose-medium font-inter text-xs tracking-[0.3em] uppercase mb-3">Ready to Book</p>
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-cel-text mb-2">{screen.name}</h2>
                    <p className="font-inter text-cel-text-secondary text-sm mb-3">{pkg.name} Package — Starting {pkg.pricing[0].label} at ₹{pkg.pricing[0].weekday}</p>
                    <p className="font-inter text-cel-text-muted text-xs mb-8">Extra person above 2: ₹{pkg.extraPerson}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href={`/celebration/${pkg.id}/${screen.id}/book`} className="bg-gradient-to-r from-rose-medium to-rose-dark text-white font-cinzel font-semibold text-sm px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-rose-dark/30 transition-all duration-300">
                            Book Now
                        </Link>
                        <Link href={`/celebration/${pkg.id}`} className="border border-rose-dark/30 text-rose-light font-inter text-sm px-8 py-3.5 rounded-full hover:bg-rose-dark/10 transition-all duration-300">
                            Back to {pkg.name}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Instagram Section */}
            <section className="border-t border-cel-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-cel-text mb-6">Follow us on Instagram!</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                        {screen.gallery.concat(screen.gallery).slice(0, 6).map((img, i) => (
                            <a key={i} href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="group relative aspect-square rounded-lg overflow-hidden border border-cel-border hover:border-rose-medium/40 transition-all">
                                <Image src={img} alt={`Instagram ${i + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 33vw, 16vw" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Location */}
            <section className="border-t border-cel-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-[2px] bg-rose-medium" />
                        <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-cel-text">Location & Directions</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <p className="text-cel-text-secondary font-inter text-sm mb-4">Karjat, Maharashtra, India</p>
                            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-rose-medium font-inter text-xs hover:text-rose-light transition-colors inline-block mb-6">OPEN GOOGLE MAPS →</a>
                            <div className="space-y-3">
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Nearest Railway Station
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">Karjat Railway Station (approx. 45 min drive)</div>
                                </details>
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Local Transportation
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">
                                        Local taxis and auto-rickshaws available from the station. Contact +91 123456789 for pre-booking an auto rickshaw.
                                    </div>
                                </details>
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-cel-border h-64 sm:h-80 bg-cel-card flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-12 h-12 text-cel-border-light mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-cel-text-muted font-inter text-sm">Google Maps will be embedded here</p>
                                <p className="text-cel-text-muted font-inter text-xs mt-1">Karjat, Maharashtra, India</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
