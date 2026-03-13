"use client";

import { useState, useEffect } from "react";
import { api, getToken, isLoggedIn } from "@/lib/api";
import Link from "next/link";

interface Review {
    id: number;
    guestName: string;
    rating: number;
    reviewText: string | null;
    isApproved: boolean;
    createdAt: string;
    property: { name: string; slug: string } | null;
}

interface DBProperty {
    id: number;
    name: string;
    slug: string;
}

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [dbProperties, setDbProperties] = useState<DBProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ rating: 5, reviewText: "", propertyId: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loggedIn = isLoggedIn();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [reviewsData, propsData] = await Promise.all([
                    api.get<Review[]>("/reviews"),
                    api.get<DBProperty[]>("/properties")
                ]);
                
                let allVisibleReviews = Array.isArray(reviewsData) ? reviewsData : [];
                
                // If logged in, also fetch "my" reviews to show private ones (<= 3 stars)
                if (isLoggedIn()) {
                    try {
                        const myReviews = await api.get<Review[]>("/reviews/me");
                        if (Array.isArray(myReviews)) {
                            // Merge and deduplicate by id
                            const existingIds = new Set(allVisibleReviews.map(r => r.id));
                            const personalReviews = myReviews.filter(r => !existingIds.has(r.id));
                            allVisibleReviews = [...allVisibleReviews, ...personalReviews];
                            // Re-sort by date
                            allVisibleReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        }
                    } catch (err) {
                        console.error("Load personal reviews error:", err);
                    }
                }

                setReviews(allVisibleReviews);
                setDbProperties(Array.isArray(propsData) ? propsData : []);
            } catch (err) {
                console.error("Load reviews error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [loggedIn]);

    const handleLogin = () => {
        if (typeof window !== "undefined") {
            const redirectUri = `${window.location.origin}/auth/callback`;
            const currentUrl = window.location.pathname + window.location.search;
            const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/oauth2/authorize?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(currentUrl)}&identity_provider=Google`;
            window.location.href = cognitoUrl;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setSubmitting(true);
        try {
            const res = await api.post("/reviews", formData);
            setSuccessMessage(res.message || "Review submitted successfully!");
            setFormData({ rating: 5, reviewText: "", propertyId: "" });
            // If it's a high rating, refresh reviews list
            if (formData.rating > 3) {
                const updated = await api.get<Review[]>("/reviews");
                setReviews(updated);
            }
        } catch (err: any) {
            setError(err.message || "Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    const filterList = ["All", ...dbProperties.map(p => p.name)];
    const filteredReviews = activeFilter === "All" 
        ? reviews 
        : reviews.filter(r => r.property?.name === activeFilter);
        
    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
        : "0.0";

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
                                <svg key={s} className={`w-5 h-5 ${s <= parseFloat(averageRating) ? "text-antique-gold fill-current" : "text-border-light fill-none"}`} viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            ))}
                        </div>
                        <p className="font-inter text-sm text-text-secondary mt-2">Based on {reviews.length} verified stays</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); setSuccessMessage(null); setError(null); }}
                        className="bg-antique-gold text-white px-8 py-3.5 rounded-full font-inter text-sm font-bold hover:bg-dark-gold transition-all shadow-lg shadow-antique-gold/30 hover:shadow-antique-gold/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {showForm ? "Close Form" : "✍ Leave a Review"}
                    </button>
                </div>
            </section>

            {/* Review Form Section */}
            {showForm && (
                <section className="max-w-2xl mx-auto px-4 sm:px-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-white rounded-3xl border border-border-light p-8 sm:p-10 shadow-xl shadow-antique-gold/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-antique-gold via-dark-gold to-antique-gold" />
                        
                        {!loggedIn ? (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-antique-gold/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-xl font-bold text-text-primary mb-3">Authentication Required</h3>
                                <p className="font-inter text-sm text-text-secondary mb-8 max-w-sm mx-auto">Please log in to your account to share your staycation experience.</p>
                                <button onClick={handleLogin} className="bg-text-primary text-white px-8 py-3 rounded-xl font-inter text-sm font-bold hover:bg-black transition-colors flex items-center gap-2 mx-auto">
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
                                    Continue with Google
                                </button>
                            </div>
                        ) : successMessage ? (
                            <div className="text-center py-10 scale-in-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="font-cinzel text-2xl font-bold text-emerald-900 mb-3 tracking-tight">Success!</h3>
                                <p className="font-inter text-base text-emerald-700/80 mb-8 px-4">{successMessage}</p>
                                <button onClick={() => setShowForm(false)} className="text-text-muted font-inter text-sm hover:text-text-primary underline font-medium">Back to Reviews</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-cinzel text-xl font-bold text-text-primary">Share Your Story</h3>
                                    <span className="text-[10px] font-inter font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Member
                                    </span>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 animate-in fade-in zoom-in-95">
                                        <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-sm font-medium text-rose-600 leading-tight">{error}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-inter font-bold text-text-secondary uppercase tracking-wider mb-2">Select Property *</label>
                                        <select
                                            required value={formData.propertyId}
                                            onChange={e => setFormData(p => ({ ...p, propertyId: e.target.value }))}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-border-light rounded-xl font-inter text-sm focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Whered did you stay?</option>
                                            {dbProperties.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-inter font-bold text-text-secondary uppercase tracking-wider mb-2">How was your stay? *</label>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl border border-border-light">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s} type="button" onClick={() => setFormData(p => ({ ...p, rating: s }))}
                                                    className={`group relative flex-1 py-3 rounded-xl transition-all duration-300 ${s <= formData.rating
                                                        ? "text-antique-gold scale-100"
                                                        : "text-text-muted opacity-40 hover:opacity-80 scale-90 hover:scale-100"
                                                        }`}>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <svg className={`w-8 h-8 ${s <= formData.rating ? "fill-antique-gold" : "fill-transparent stroke-current"}`} strokeWidth={1} viewBox="0 0 24 24">
                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                        </svg>
                                                        <span className="text-[10px] font-bold">{s}★</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-inter font-bold text-text-secondary uppercase tracking-wider mb-2">Your Review</label>
                                        <textarea
                                            value={formData.reviewText}
                                            onChange={e => setFormData(p => ({ ...p, reviewText: e.target.value }))}
                                            className="w-full px-5 py-4 bg-slate-50 border border-border-light rounded-2xl font-inter text-sm focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 outline-none resize-none h-32 transition-all"
                                            placeholder="The pool was amazing, the host was very helpful..."
                                        />
                                        <p className="text-[10px] text-text-muted mt-2 px-1 italic">
                                            Note: Reviews with 3 stars or less are stored privately for our team to improve.
                                        </p>
                                    </div>
                                </div>

                                <button type="submit" disabled={submitting}
                                    className="w-full bg-antique-gold text-white py-4 rounded-2xl font-inter text-sm font-bold hover:bg-dark-gold transition-all disabled:opacity-50 shadow-xl shadow-antique-gold/20 flex items-center justify-center gap-2 group">
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Post Review
                                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            )}

            {/* Filters */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {filterList.map((prop) => (
                        <button key={prop} onClick={() => setActiveFilter(prop)}
                            className={`px-6 py-2.5 text-[11px] font-inter font-bold uppercase tracking-widest rounded-full transition-all duration-300 ${activeFilter === prop
                                ? "bg-text-primary text-white shadow-xl shadow-black/10"
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
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin w-10 h-10 border-2 border-antique-gold border-t-transparent rounded-full shadow-lg" />
                        <p className="text-xs font-inter font-bold text-text-muted uppercase tracking-[0.2em] animate-pulse">Fetching Experiences</p>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-24 bg-white/60 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-border-light max-w-4xl mx-auto px-6">
                        <div className="w-20 h-20 bg-soft-gray rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <h3 className="font-cinzel text-2xl font-bold text-text-primary mb-2">No reviews found yet</h3>
                        <p className="font-inter text-sm text-text-secondary max-w-md mx-auto mb-8">Be the first guest to share your wonderful experience with the Galaxia community.</p>
                        <button onClick={() => setShowForm(true)} className="text-antique-gold font-inter text-sm font-bold hover:underline underline-offset-8">Write the First Review</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                        {filteredReviews.map((review) => (
                            <div key={review.id} className="group bg-white rounded-[32px] border border-border-light p-8 sm:p-10 hover:shadow-2xl hover:shadow-antique-gold/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-antique-gold opacity-[0.02] -mr-8 -mt-8 rounded-full group-hover:scale-150 transition-transform duration-700" />
                                
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center text-white font-cinzel font-bold text-xl shadow-lg ring-4 ring-white">
                                            {review.guestName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-cinzel text-base font-bold text-text-primary leading-tight group-hover:text-dark-gold transition-colors">{review.guestName}</h3>
                                            <p className="font-inter text-[10px] font-bold text-text-muted mt-1 uppercase tracking-wider">
                                                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <svg key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-antique-gold fill-current" : "text-border-light fill-none"}`} viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        ))}
                                    </div>
                                </div>

                                {review.property && (
                                    <div className="mb-6 relative z-10">
                                        <span className="inline-block px-4 py-1.5 bg-soft-gray text-text-secondary text-[10px] font-inter font-bold rounded-xl uppercase tracking-widest border border-border-light shadow-sm">
                                            {review.property.name}
                                        </span>
                                    </div>
                                )}

                                {review.reviewText && (
                                    <div className="relative z-10 flex-grow">
                                        <svg className="absolute -top-4 -left-2 w-8 h-8 text-antique-gold/5" fill="currentColor" viewBox="0 0 32 32"><path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H7.6c.3-1.8 1.9-3.2 3.8-3.2.4 0 .7.1 1.1.2l1.2-3.8c-.8-.1-1.6-.2-2.7-.2zm16 0c-3.3 0-6 2.7-6 6v10h10V14h-6.4c.3-1.8 1.9-3.2 3.8-3.2.4 0 .7.1 1.1.2l1.2-3.8c-.8-.1-1.6-.2-2.7-.2z"/></svg>
                                        <p className="font-inter text-[15px] text-text-secondary leading-relaxed pl-4 italic">"{review.reviewText}"</p>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-emerald-50 rounded-full">
                                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="font-inter text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Verified Stay</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
