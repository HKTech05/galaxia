"use client";

import { useState, useEffect } from "react";
import { Star, Check, X, Trash2, Clock, Eye } from "lucide-react";
import { api } from "../../../lib/api";

interface Review {
    id: number;
    guestName: string;
    rating: number;
    reviewText: string | null;
    isApproved: boolean;
    createdAt: string;
    property: { name: string; slug: string } | null;
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

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
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                        {pendingCount} Pending
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        {approvedCount} Approved
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(["all", "pending", "approved"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === f
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        {f === "all" ? `All (${reviews.length})` : f === "pending" ? `Pending (${pendingCount})` : `Approved (${approvedCount})`}
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
                        {filter === "pending" ? "No pending reviews." : filter === "approved" ? "No approved reviews yet." : "No reviews submitted yet."}
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
                                        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${review.isApproved
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                            {review.isApproved ? "Approved" : "Pending"}
                                        </span>
                                    </div>
                                    {review.reviewText && (
                                        <p className="text-sm text-slate-600 leading-relaxed pl-[52px]">"{review.reviewText}"</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 pl-[52px]">
                                {!review.isApproved && (
                                    <button
                                        onClick={() => handleApprove(review.id, true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                                    >
                                        <Check size={14} /> Approve
                                    </button>
                                )}
                                {review.isApproved && (
                                    <button
                                        onClick={() => handleApprove(review.id, false)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-600 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                                    >
                                        <Clock size={14} /> Unapprove
                                    </button>
                                )}
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
        </div>
    );
}
