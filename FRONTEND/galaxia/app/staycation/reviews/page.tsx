"use client";

import { useState, useEffect } from "react";

interface Review {
    id: number;
    guestName: string;
    rating: number;
    reviewText: string | null;
    isApproved: boolean;
    createdAt: string;
    property: { name: string; slug: string } | null;
}

const properties = ["All", "Hill View", "Mount View", "Euphoria", "La Paraiso", "Amstel Nest", "Ambrose"];

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ guestName: "", rating: 5, reviewText: "", propertyId: "", bookingRef: "" });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        fetch(`/api/reviews`)
            .then(r => {
                if (!r.ok) throw new Error("API error");
                return r.json();
            })
            .then(data => { setReviews(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => { setReviews([]); setLoading(false); });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setSubmitted(true);
                setFormData({ guestName: "", rating: 5, reviewText: "", propertyId: "", bookingRef: "" });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredReviews = activeFilter === "All" ? reviews : reviews.filter(r => r.property?.name === activeFilter);
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) : "0.0";

    return (
        <div className="bg-cream-white min-h-screen pt-20">
            {/* Header */}
            <section className="relative px-4 sm:px-6 py-16 sm:py-24 text-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                    <svg className="absolute w-[600px] h-[600px] text-antique-gold stroke-current -top-20 -left-[100px]" viewBox="0 0 100 100" fill="none" strokeWidth="0.2">
                        <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
                        <circle cx="50" cy="50" r="20" strokeWidth="0.5" />
                    </svg>
                </div>
                <div className="relative z-10 max-w-3xl mx-auto">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.4em] uppercase mb-4">Guest Experiences</p>
                    <h1 className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-6">Real Reviews</h1>
                    <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-8" />
                    <div className="flex flex-col items-center justify-center gap-2 mb-8">
                        <div className="text-5xl font-cinzel text-text-primary font-bold">{averageRating}</div>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} className="w-5 h-5 text-antique-gold fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            ))}
                        </div>
                        <p className="font-inter text-sm text-text-secondary mt-2">Based on {reviews.length} verified stays</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); setSubmitted(false); }}
                        className="bg-antique-gold text-white px-6 py-3 rounded-full font-inter text-sm font-medium hover:bg-dark-gold transition-colors shadow-lg shadow-antique-gold/20"
                    >
                        {showForm ? "Close" : "✍ Write a Review"}
                    </button>
                </div>
            </section>

            {/* Review Form */}
            {showForm && (
                <section className="max-w-2xl mx-auto px-4 sm:px-6 mb-12">
                    <div className="bg-white rounded-2xl border border-border-light p-6 sm:p-8 shadow-sm">
                        {submitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="font-cinzel text-xl font-bold text-text-primary mb-2">Thank You!</h3>
                                <p className="font-inter text-sm text-text-secondary">Your review has been submitted and is pending approval.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <h3 className="font-cinzel text-lg font-bold text-text-primary">Share Your Experience</h3>
                                <div>
                                    <label className="block text-xs font-inter font-semibold text-text-secondary mb-1.5">Your Name *</label>
                                    <input
                                        type="text" required value={formData.guestName}
                                        onChange={e => setFormData(p => ({ ...p, guestName: e.target.value }))}
                                        className="w-full px-4 py-3 border border-border-light rounded-lg font-inter text-sm focus:border-antique-gold focus:ring-1 focus:ring-antique-gold/20 outline-none"
                                        placeholder="e.g. Priya Sharma"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-inter font-semibold text-text-secondary mb-1.5">Rating *</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <button key={s} type="button" onClick={() => setFormData(p => ({ ...p, rating: s }))}
                                                className={`w-10 h-10 rounded-lg border transition-all ${s <= formData.rating
                                                    ? "bg-antique-gold border-antique-gold text-white"
                                                    : "bg-white border-border-light text-text-muted hover:border-antique-gold/40"
                                                    }`}>
                                                {s}★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-inter font-semibold text-text-secondary mb-1.5">Your Review</label>
                                    <textarea
                                        value={formData.reviewText}
                                        onChange={e => setFormData(p => ({ ...p, reviewText: e.target.value }))}
                                        className="w-full px-4 py-3 border border-border-light rounded-lg font-inter text-sm focus:border-antique-gold focus:ring-1 focus:ring-antique-gold/20 outline-none resize-none h-24"
                                        placeholder="Tell us about your experience..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-inter font-semibold text-text-secondary mb-1.5">Booking Reference (optional)</label>
                                    <input
                                        type="text" value={formData.bookingRef}
                                        onChange={e => setFormData(p => ({ ...p, bookingRef: e.target.value }))}
                                        className="w-full px-4 py-3 border border-border-light rounded-lg font-inter text-sm focus:border-antique-gold focus:ring-1 focus:ring-antique-gold/20 outline-none"
                                        placeholder="e.g. ST-20260310-001"
                                    />
                                </div>
                                <button type="submit" disabled={submitting}
                                    className="w-full bg-antique-gold text-white py-3 rounded-lg font-inter text-sm font-semibold hover:bg-dark-gold transition-colors disabled:opacity-50 shadow-lg shadow-antique-gold/20">
                                    {submitting ? "Submitting..." : "Submit Review"}
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            )}

            {/* Filters */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {properties.map((prop) => (
                        <button key={prop} onClick={() => setActiveFilter(prop)}
                            className={`px-5 py-2.5 text-xs font-inter font-medium rounded-full transition-all duration-300 ${activeFilter === prop
                                ? "bg-antique-gold text-white shadow-lg shadow-antique-gold/20"
                                : "bg-white text-text-secondary border border-border-light hover:border-antique-gold/40 hover:text-antique-gold"
                                }`}>
                            {prop}
                        </button>
                    ))}
                </div>
            </section>

            {/* Reviews Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-2 border-antique-gold border-t-transparent rounded-full" />
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border-light">
                        <p className="font-inter text-text-secondary">No reviews found{activeFilter !== "All" ? ` for ${activeFilter}` : ""} yet.</p>
                        {activeFilter !== "All" && (
                            <button onClick={() => setActiveFilter("All")} className="mt-4 text-antique-gold font-inter text-sm hover:underline">View all reviews</button>
                        )}
                        <p className="font-inter text-xs text-text-muted mt-4">Be the first to share your experience!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {filteredReviews.map((review) => (
                            <div key={review.id} className="bg-white rounded-2xl border border-border-light p-6 sm:p-8 hover:shadow-xl hover:shadow-antique-gold/5 transition-all duration-300 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center text-white font-cinzel font-bold text-lg shadow-inner">
                                            {review.guestName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="font-cinzel text-sm font-bold text-text-primary leading-tight">{review.guestName}</h3>
                                            <p className="font-inter text-[11px] text-text-muted mt-0.5">
                                                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <svg key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-antique-gold fill-current" : "text-border-light fill-none"}`} viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        ))}
                                    </div>
                                </div>
                                {review.property && (
                                    <div className="mb-4">
                                        <span className="inline-block px-3 py-1 bg-soft-gray text-text-secondary text-[10px] font-inter font-medium rounded uppercase tracking-wider border border-border-light">
                                            {review.property.name}
                                        </span>
                                    </div>
                                )}
                                {review.reviewText && (
                                    <p className="font-inter text-sm text-text-secondary leading-relaxed flex-grow">"{review.reviewText}"</p>
                                )}
                                <div className="mt-6 pt-4 border-t border-border-light flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    <span className="font-inter text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Verified Review</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
