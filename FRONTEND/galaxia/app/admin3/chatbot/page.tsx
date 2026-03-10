"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Settings2, BarChart2, Eye, User, Bot, HelpCircle, Users, CalendarDays, TrendingUp } from "lucide-react";
import { api } from "../../../lib/api";

interface DashboardStats {
    totalBookings?: number;
    totalUsers?: number;
    totalRevenue?: number;
    todayBookings?: number;
    ddBookings?: number;
    stayBookings?: number;
}

export default function ChatbotPage() {
    const [stats, setStats] = useState<DashboardStats>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.get("/admin/dashboard");
                setStats(data || {});
            } catch (err) {
                console.error("Failed to fetch dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Chatbot Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Monitor WhatsApp & IG conversations, analytics, and responses.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto">
                        <Settings2 size={16} className="inline mr-2" /> Bot Settings
                    </button>
                    <button className="bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors w-full sm:w-auto">
                        + Add New FAQ
                    </button>
                </div>
            </div>

            {/* Real Stats from Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CalendarDays size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Total Bookings</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">
                                {loading ? "..." : (stats.totalBookings ?? 0)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4">
                        <span>Staycation: {loading ? "..." : (stats.stayBookings ?? 0)}</span>
                        <span>Digital Diaries: {loading ? "..." : (stats.ddBookings ?? 0)}</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Registered Users</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">
                                {loading ? "..." : (stats.totalUsers ?? 0)}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4 text-center">
                        From website & chatbot signups
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Chatbot Status</h3>
                            <p className="text-lg font-black text-amber-600 mt-1">Not Connected</p>
                        </div>
                    </div>
                    <div className="text-xs font-medium text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4 text-center">
                        Connect your WhatsApp / IG bot to see live stats
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Chats Stream — Placeholder */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300" /> Live Conversations
                        </h2>
                        <span className="text-slate-400 text-xs font-bold">Awaiting Bot Connection</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <MessageSquare size={28} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">No Live Conversations</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Connect your WhatsApp Business API or Instagram Messaging to see real-time customer conversations here.
                        </p>
                        <button className="mt-6 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold shadow-md hover:bg-purple-700 transition-colors">
                            Setup WhatsApp Bot
                        </button>
                    </div>
                </div>

                {/* FAQ Quick Editor */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-bold text-slate-800">Top Detected Queries</h2>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">Review AI suggested responses</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <p className="text-xs font-bold text-slate-800 mb-2">"Can we bring our pet?" <span className="text-[10px] font-normal text-slate-500 ml-1">(Common query)</span></p>
                            <textarea
                                className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-purple-300 resize-none h-16"
                                defaultValue="We are a pet-friendly property! We charge a nominal cleaning fee of ₹500 per pet."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest px-2 py-1">Ignore</button>
                                <button className="text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded uppercase tracking-widest px-3 py-1 shadow-sm">Save to Bot</button>
                            </div>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <p className="text-xs font-bold text-slate-800 mb-2">"Is outside food allowed?" <span className="text-[10px] font-normal text-slate-500 ml-1">(Common query)</span></p>
                            <textarea
                                className="w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-purple-300 resize-none h-16"
                                defaultValue="Outside food is allowed in all our villas. However, we do not allow cooking heavy meals inside to maintain cleanliness."
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest px-2 py-1">Ignore</button>
                                <button className="text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded uppercase tracking-widest px-3 py-1 shadow-sm">Save to Bot</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
