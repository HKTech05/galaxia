"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CelebrationPackage, ScreenData } from "../../../data/celebrations";

interface ScreenDetailClientProps {
    pkg: CelebrationPackage;
    screen: ScreenData;
}

export default function ScreenDetailClient({ pkg, screen }: ScreenDetailClientProps) {
    const [currentImage, setCurrentImage] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Fetch site images from admin panel
    const [siteImages, setSiteImages] = useState<Record<string, { id: number; url: string }[]>>({});
    useEffect(() => {
        fetch("/api/site-images").then(r => r.json()).then(data => {
            if (data && typeof data === 'object') setSiteImages(data);
        }).catch(() => {});
    }, []);

    // Use per-package per-screen slideshow from API, fall back to static gallery
    const apiGallery = (siteImages[`dd/${screen.id}/${pkg.id}/slideshow`] || []).map(i => i.url);
    const displayGallery = apiGallery.length > 0 ? apiGallery : screen.gallery.filter(Boolean);

    return (
        <>
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
                <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-cel-text">{screen.name} (Digital Diaries)</h1>
            </div>

            {/* Image Slideshow */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-cel-border">
                    <Image
                        src={displayGallery[currentImage]}
                        alt={`${screen.name} - Image ${currentImage + 1}`}
                        fill
                        className="object-cover transition-all duration-500 cursor-pointer"
                        sizes="(max-width: 1024px) 100vw, 80vw"
                        onClick={() => setLightboxOpen(true)}
                    />
                    {/* Navigation arrows */}
                    <button onClick={() => setCurrentImage(prev => prev === 0 ? displayGallery.length - 1 : prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-rose-dark/60 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setCurrentImage(prev => prev === displayGallery.length - 1 ? 0 : prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-rose-dark/60 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {displayGallery.map((_, i) => (
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
                        href="/menus/Satkar_Menu.pdf"
                        download="Satkar_Menu.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 bg-gradient-to-r from-rose-medium to-rose-dark hover:shadow-lg hover:shadow-rose-dark/30 text-white font-cinzel font-semibold text-sm px-6 py-3 rounded-full transition-all duration-300"
                    >
                        <svg className="w-5 h-5 text-white/90 group-hover:-translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Food Menu
                    </a>
                </div>
                    <div className="flex items-center justify-center gap-6 mt-6 text-sm font-inter">
                        <div className="flex items-center gap-2 text-cel-text-muted">
                            <svg className="w-4 h-4 text-rose-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {screen.size}
                        </div>
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

            <style jsx>{`
                .reel-clip-wrapper {
                    position: relative;
                    overflow: hidden;
                    height: 300px;
                    border-radius: 14px 14px 0 0;
                    background: #111;
                }
                @media (min-width: 640px) {
                    .reel-clip-wrapper { height: 340px; }
                }
                @media (min-width: 1024px) {
                    .reel-clip-wrapper { height: 320px; }
                }
                .reel-clip-wrapper iframe {
                    position: absolute;
                    top: -56px;
                    left: -1px;
                    width: calc(100% + 2px);
                    height: 900px;
                    border: 0;
                    overflow: hidden;
                }
            `}</style>
            <section className="border-t border-cel-border bg-gradient-to-b from-cel-bg via-cel-card/30 to-cel-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <div className="w-10 h-[1.5px] bg-gradient-to-r from-transparent to-rose-medium" />
                            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                                <defs>
                                    <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#feda75" />
                                        <stop offset="25%" stopColor="#fa7e1e" />
                                        <stop offset="50%" stopColor="#d62976" />
                                        <stop offset="75%" stopColor="#962fbf" />
                                        <stop offset="100%" stopColor="#4f5bd5" />
                                    </linearGradient>
                                </defs>
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="url(#ig-gradient)" />
                            </svg>
                            <div className="w-10 h-[1.5px] bg-gradient-to-l from-transparent to-rose-medium" />
                        </div>
                        <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-cel-text mb-2">Catch Our Reels</h2>
                        <p className="font-inter text-cel-text-muted text-sm">See what celebrations look like at Digital Diaries</p>
                    </div>

                    {/* Reels Grid */}
                    {(() => {
                        const SCREEN_REELS: Record<string, { id: string; likes: string; comments: string }[]> = {
                            "baywatch": [
                                { id: "DUVFK0xDXvV", likes: "11K", comments: "68" },
                                { id: "DOnrAeojTZS", likes: "81", comments: "2" },
                                { id: "DNdOOKvop1K", likes: "844", comments: "56" },
                                { id: "DKonIXFIL0W", likes: "150", comments: "12" },
                            ],
                            "park-n-watch": [
                                { id: "DEE1sJUsNSr", likes: "42", comments: "0" },
                                { id: "DD4CAZfsbK9", likes: "29", comments: "0" },
                                { id: "DA2ONRZIIFS", likes: "67", comments: "0" },
                            ],
                            "cine-love": [
                                { id: "DTzIyWGDCMm", likes: "27", comments: "1" },
                                { id: "DO-o0bqjBWm", likes: "36", comments: "1" },
                                { id: "DMZaGeyoomm", likes: "271", comments: "0" },
                                { id: "DHU-jxHisDV", likes: "46", comments: "2" },
                            ],
                            "sandy-screen": [
                                { id: "DQqwtioAndH", likes: "211", comments: "35" },
                                { id: "DO6NDLTDOCH", likes: "27", comments: "2" },
                                { id: "DObFhO9jCln", likes: "22", comments: "0" },
                                { id: "C5THBU1vLqY", likes: "3.4K", comments: "132" },
                            ],
                        };
                        const reels = SCREEN_REELS[screen.id] || SCREEN_REELS["baywatch"]!;
                        const gridCols = reels.length === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
                        return (
                    <div className={`grid ${gridCols} gap-3 sm:gap-5`}>
                        {reels.map((reel) => (
                            <a
                                key={reel.id}
                                href={`https://www.instagram.com/reel/${reel.id}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-rose-medium/40 bg-[#111111] transition-all duration-300 hover:shadow-xl hover:shadow-rose-dark/15 hover:-translate-y-1"
                            >
                                {/* Reel embed */}
                                <div className="reel-clip-wrapper">
                                    <iframe
                                        src={`https://www.instagram.com/reel/${reel.id}/embed/?cr=1&hidecaption=1`}
                                        scrolling="no"
                                        allowFullScreen
                                        loading="lazy"
                                        title={`Instagram Reel ${reel.id}`}
                                        allow="encrypted-media"
                                        style={{ pointerEvents: "none" }}
                                    />
                                </div>

                                {/* Dark Stats Bar */}
                                <div className="flex items-center gap-4 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#111111]">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-rose-medium" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                        <span className="text-white/80 font-inter text-xs sm:text-sm font-medium">{reel.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                        <span className="text-white/50 font-inter text-xs sm:text-sm">{reel.comments}</span>
                                    </div>
                                    <div className="ml-auto">
                                        <svg className="w-4 h-4 text-white/30 group-hover:text-rose-medium transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                        );
                    })()}

                    {/* Follow CTA */}
                    <div className="flex justify-center mt-10">
                        <a
                            href="https://www.instagram.com/digitaldiaries_wadala?igsh=cHZic3RmcDB4b28z"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#E1306C] hover:shadow-lg hover:shadow-[#C13584]/30 text-white font-inter font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            Follow @digitaldiaries_wadala
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </a>
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
                            <p className="text-cel-text-secondary font-inter text-sm mb-4">Wadala, Mumbai, Maharashtra</p>
                            <div className="space-y-3">
                                <details className="group border border-cel-border rounded-lg" open>
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Wadala Station
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">5 Mins Walking Distance</div>
                                </details>
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Dadar Station
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">10 Mins Drive</div>
                                </details>
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        King Circle Station
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">10 Mins Drive</div>
                                </details>
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Local Transport
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">Local taxis available</div>
                                </details>
                                <details className="group border border-cel-border rounded-lg">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer text-cel-text font-cinzel text-xs sm:text-sm font-semibold uppercase tracking-wider">
                                        Location
                                        <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="px-4 pb-4 text-cel-text-secondary font-inter text-sm">Wadala, Mumbai — Easy access from Western & Central lines</div>
                                </details>
                            </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-cel-border h-64 sm:h-80 bg-cel-card flex items-center justify-center">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4680.79406035677!2d72.85311857596447!3d19.013532253929238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7cf29b87f566d%3A0x11e519df25f953af!2sDigital%20Diaries!5e0!3m2!1sen!2sin!4v1774188296796!5m2!1sen!2sin" 
                                className="w-full h-full border-0" 
                                allowFullScreen 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                    <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all" onClick={() => setLightboxOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-inter">{currentImage + 1} / {displayGallery.length}</div>
                    <div className="relative w-[90vw] h-[85vh]" onClick={e => e.stopPropagation()}>
                        <Image src={displayGallery[currentImage]} alt={`${screen.name} - Full ${currentImage + 1}`} fill className="object-contain" sizes="90vw" />
                    </div>
                    <button onClick={e => { e.stopPropagation(); setCurrentImage(prev => prev === 0 ? displayGallery.length - 1 : prev - 1); }} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setCurrentImage(prev => prev === displayGallery.length - 1 ? 0 : prev + 1); }} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {displayGallery.map((_, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); setCurrentImage(i); }} className={`transition-all duration-300 rounded-full ${i === currentImage ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`} />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
