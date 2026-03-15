"use client";

import { useState, useEffect } from "react";
import { Star, Check, X, Trash2, Clock, Eye, Mail, Phone } from "lucide-react";
import { api } from "../../../lib/api";

interface Review {
    id: number;
    guestName: string;
    rating: number;
    reviewText: string | null;
    isApproved: boolean;
    createdAt: string;
    property: { name: string; slug: string } | null;
    user?: { email: string; phone: string } | null;
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const data = await api.get("/reviews?all=true");
            setReviews(data || []);
        } catch (err) {
            console.error("Failed to fetch reviews:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReviews(); }, []);

    const handleApprove = async (id: number, approve: boolean) => {
        try {
            await api.patch(`/reviews/${id}/approve`, { isApproved: approve });
            setReviews(prev => prev.map(r => r.id === id ? { ...r, isApproved: approve } : r));
        } catch (err) {
            console.error("Failed to update review:", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this review permanently?")) return;
        try {
            await api.delete(`/reviews/${id}`);
            setReviews(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error("Failed to delete review:", err);
        }
    };

    const filtered = reviews.filter(r => {
        if (filter === "pending") return !r.isApproved;
        if (filter === "approved") return r.isApproved;
        return true;
    });

    const pendingCount = reviews.filter(r => !r.isApproved).length;
    const approvedCount = reviews.filter(r => r.isApproved).length;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reviews Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Approve, reject, or delete guest reviews.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Status badges removed as per request */}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(["all"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === f
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        {f === "all" ? `All (${reviews.length})` : f}
                    </button>
                ))}
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                    <Star size={40} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Reviews</h3>
                    <p className="text-sm text-slate-500">
                        {filter === "all" ? "No reviews submitted yet." : "No reviews found for this filter."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(review => (
                        <div key={review.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                            {review.guestName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">{review.guestName}</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                {review.property && <span> • {review.property.name}</span>}
                                            </p>
                                        </div>
                                        <div className="flex gap-0.5 ml-2">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} size={14} className={s <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                                            ))}
                                        </div>
                                        {/* Status badge removed */}
                                    </div>
                                    {review.reviewText && (
                                        <p className="text-sm text-slate-600 leading-relaxed pl-[52px]">"{review.reviewText}"</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 pl-[52px]">
                                <button
                                    onClick={() => setSelectedReview(review)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                    <Eye size={14} /> View Details
                                </button>
                                <button
                                    onClick={() => handleDelete(review.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-50 transition-colors ml-auto"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Detail Modal */}
            {selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">Review Details</h2>
                            <button onClick={() => setSelectedReview(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                                    {selectedReview.guestName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-lg">{selectedReview.guestName}</p>
                                    <p className="text-sm text-slate-500 font-medium">Guest Account Info</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <Mail className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                                        <p className="text-sm font-semibold text-slate-700">{selectedReview.user?.email || "No email linked"}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <Phone className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                                        <p className="text-sm font-semibold text-slate-700">{selectedReview.user?.phone || "No phone linked"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Review Text</p>
                                <p className="text-sm text-slate-600 leading-relaxed italic">"{selectedReview.reviewText}"</p>
                                <div className="flex gap-1 mt-3">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={16} className={s <= selectedReview.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => { handleDelete(selectedReview.id); setSelectedReview(null); }}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
