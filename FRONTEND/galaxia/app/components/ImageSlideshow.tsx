"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface ImageSlideshowProps {
    images: string[];
    alt: string;
}

export default function ImageSlideshow({ images, alt }: ImageSlideshowProps) {
    const [current, setCurrent] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const next = useCallback(() => { setCurrent((prev) => (prev + 1) % images.length); }, [images.length]);
    const prev = useCallback(() => { setCurrent((prev) => (prev - 1 + images.length) % images.length); }, [images.length]);

    useEffect(() => {
        if (!isAutoPlaying || lightboxOpen) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [isAutoPlaying, lightboxOpen, next]);

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false);
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [lightboxOpen, next, prev]);

    return (
        <>
            <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[65vh] overflow-hidden group" onMouseEnter={() => setIsAutoPlaying(false)} onMouseLeave={() => setIsAutoPlaying(true)}>
                {images.map((img, i) => (
                    <div key={i} onClick={() => { setCurrent(i); setLightboxOpen(true); }} className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                        <Image src={img} alt={`${alt} - Image ${i + 1}`} fill className="object-cover" sizes="100vw" priority={i === 0} />
                    </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-cream-white/40 via-transparent to-black/10 pointer-events-none" />
                <button onClick={prev} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-text-primary hover:text-antique-gold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg" aria-label="Previous">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={next} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-text-primary hover:text-antique-gold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg" aria-label="Next">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)} className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-2 bg-antique-gold" : "w-2 h-2 bg-white/60 hover:bg-white/80"}`} aria-label={`Image ${i + 1}`} />
                    ))}
                </div>
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-inter text-text-secondary shadow-sm">{current + 1} / {images.length}</div>
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                    {/* Close button */}
                    <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all" onClick={() => setLightboxOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {/* Counter */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-inter">{current + 1} / {images.length}</div>
                    {/* Image */}
                    <div className="relative w-[90vw] h-[85vh]" onClick={e => e.stopPropagation()}>
                        <Image src={images[current]} alt={`${alt} - Image ${current + 1}`} fill className="object-contain" sizes="90vw" />
                    </div>
                    {/* Nav arrows */}
                    <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {/* Dot indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        {images.map((_, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }} className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`} />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
