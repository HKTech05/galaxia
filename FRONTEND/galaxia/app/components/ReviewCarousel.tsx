"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Review {
    name: string;
    property: string;
    role: string;
    rating: number;
    text: string;
    date: string;
    verified: boolean;
    initials: string;
}

const allReviews: Review[] = [
    { name: "Aditya & Priya", property: "Euphoria", role: "Anniversary Stay", rating: 5, text: "The private pool villa was absolutely stunning! The indoor pool was a highlight and the ambiance was perfect for our anniversary weekend.", date: "2026-02-15", verified: true, initials: "AP" },
    { name: "Neha Gupta", property: "Mount View", role: "Solo Traveller", rating: 5, text: "The bathtub experience with mountain views was surreal. Such a peaceful getaway — we didn't want to leave!", date: "2026-02-10", verified: true, initials: "NG" },
    { name: "Kavya & Rishi", property: "Ambrose – Bali Villa", role: "Couple's Retreat", rating: 5, text: "The Bali-themed villa exceeded all expectations. The private pool, the décor, the meals — everything was 5-star quality.", date: "2026-02-05", verified: true, initials: "KR" },
    { name: "Sneha Patel", property: "La Paraiso", role: "Group Staycation", rating: 5, text: "The private pool was amazing and the gazebo area was perfect for our evening get-together. Highly recommend for group staycations.", date: "2026-01-28", verified: true, initials: "SP" },
    { name: "Rohit Sharma", property: "Hill View", role: "Budget Traveller", rating: 5, text: "Incredible mountain views from the balcony. Waking up to the sunrise over the hills was magical. Great value for money!", date: "2026-01-20", verified: true, initials: "RS" },
    { name: "Arjun Mehta", property: "Amstel Nest", role: "Family Trip", rating: 4, text: "Unique Amsterdam-themed cottages with indoor pools — felt like a completely different world. Food was delicious too.", date: "2026-01-12", verified: true, initials: "AM" },
    { name: "Meera & Aman", property: "Ambrose – Santorini", role: "Couple's Retreat", rating: 5, text: "The Greek-inspired villa was dreamy. White & blue interiors, a sparkling pool, and incredible food. Felt like a Mediterranean escape!", date: "2025-12-30", verified: true, initials: "MA" },
    { name: "Vikram Desai", property: "La Paraiso", role: "Weekend Escape", rating: 5, text: "Massive 25x10 ft pool, a beautiful garden, and the gazebo was perfect for an evening barbecue. An absolute gem.", date: "2025-12-22", verified: true, initials: "VD" },
    { name: "Tanvi Joshi", property: "Euphoria", role: "Birthday Getaway", rating: 5, text: "The pool swing was such a unique touch! We spent hours just relaxing in our private pool villa. Will come back for sure.", date: "2025-12-15", verified: true, initials: "TJ" },
];

const reviews = allReviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// Avatar gradient colors
const avatarColors = [
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-violet-400 to-purple-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-blue-500",
    "from-amber-500 to-yellow-500",
    "from-red-400 to-rose-500",
    "from-indigo-400 to-violet-500",
    "from-lime-400 to-green-500",
];

export default function ReviewCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [itemsPerView, setItemsPerView] = useState(3);
    const trackRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef(0);
    const touchDeltaRef = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
        const update = () => {
            if (window.innerWidth < 768) setItemsPerView(1);
            else if (window.innerWidth < 1024) setItemsPerView(2);
            else setItemsPerView(3);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const maxIndex = Math.max(0, reviews.length - itemsPerView);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, [maxIndex]);

    const goToPrev = useCallback(() => {
        setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
    }, [maxIndex]);

    // Auto-scroll
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(goToNext, 4000);
        return () => clearInterval(timer);
    }, [isPaused, goToNext]);

    // Touch / swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.touches[0].clientX;
        touchDeltaRef.current = 0;
        isDragging.current = true;
        setIsPaused(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current;
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        const delta = touchDeltaRef.current;
        if (Math.abs(delta) > 50) {
            if (delta < 0) goToNext();
            else goToPrev();
        }
        setTimeout(() => setIsPaused(false), 2000);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
    };

    // Calculate opacity for desktop side-peek effect
    const getCardStyle = (index: number) => {
        if (itemsPerView < 3) return { opacity: 1, transform: "scale(1)" };
        const relativePos = index - currentIndex;
        // Side-peek cards (partially visible on edges)
        if (relativePos === -1 || relativePos === itemsPerView) {
            return { opacity: 0.4, transform: "scale(0.92)" };
        }
        // Visible cards
        if (relativePos >= 0 && relativePos < itemsPerView) {
            return { opacity: 1, transform: "scale(1)" };
        }
        return { opacity: 0, transform: "scale(0.9)" };
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Carousel Track */}
            <div
                className="overflow-hidden pt-8"
                ref={trackRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className="flex transition-transform ease-out"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                        transitionDuration: "700ms",
                    }}
                >
                    {reviews.map((review, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 px-3 transition-all duration-500"
                            style={{
                                width: `${100 / itemsPerView}%`,
                                ...getCardStyle(i),
                            }}
                        >
                            {/* Card — cream/warm bg, rounded, centered avatar */}
                            <div className="relative bg-[#faf6f0] rounded-2xl p-6 pt-14 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-[#efe9df] hover:shadow-[0_8px_30px_rgba(186,151,49,0.12)] transition-all duration-500 h-full">
                                {/* Avatar circle — positioned on top edge */}
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center shadow-lg ring-4 ring-[#faf6f0]`}>
                                        <span className="font-cinzel text-sm font-bold text-white">{review.initials}</span>
                                    </div>
                                </div>

                                {/* Name & Role */}
                                <h4 className="font-cinzel text-base font-bold text-text-primary mb-0.5">{review.name}</h4>
                                <p className="font-inter text-[10px] text-dark-gold uppercase tracking-widest mb-3">{review.role}</p>

                                {/* Stars */}
                                <div className="flex items-center justify-center gap-0.5 mb-4">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                        <svg key={s} className={`w-4 h-4 ${s < review.rating ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>

                                {/* Quotation mark */}
                                <div className="flex justify-center mb-2">
                                    <span className="text-antique-gold/30 text-4xl font-serif leading-none">&ldquo;&rdquo;</span>
                                </div>

                                {/* Review text */}
                                <p className="font-inter text-sm text-text-secondary leading-relaxed mb-4">{review.text}</p>

                                {/* Footer: property + date + verified */}
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <span className="font-inter text-[10px] text-dark-gold font-medium">{review.property}</span>
                                    <span className="w-[3px] h-[3px] rounded-full bg-border-medium" />
                                    <span className="font-inter text-[10px] text-text-muted">{formatDate(review.date)}</span>
                                    {review.verified && (
                                        <>
                                            <span className="w-[3px] h-[3px] rounded-full bg-border-medium" />
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-inter font-semibold text-emerald-600">
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                Verified Stay
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows — desktop only, appear on hover */}
            <button
                onClick={goToPrev}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-border-light shadow-lg items-center justify-center text-text-muted hover:text-antique-gold hover:border-antique-gold/40 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
                aria-label="Previous reviews"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
                onClick={goToNext}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-border-light shadow-lg items-center justify-center text-text-muted hover:text-antique-gold hover:border-antique-gold/40 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
                aria-label="Next reviews"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            {/* Progress + dots */}
            <div className="flex flex-col items-center gap-3 mt-10">
                <div className="w-24 h-[2px] bg-border-light rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-antique-gold to-dark-gold rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${((currentIndex + 1) / (maxIndex + 1)) * 100}%` }}
                    />
                </div>
                <div className="flex gap-1.5">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-5 bg-antique-gold" : "w-1.5 bg-border-medium/50 hover:bg-antique-gold/40"}`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
