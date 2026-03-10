"use client";

import { Bell, Search, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Notification {
    id: number;
    title: string;
    message: string | null;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export default function AdminHeader() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [adminName, setAdminName] = useState("Admin User");
    const [adminRole, setAdminRole] = useState("Super Admin");

    useEffect(() => {
        // Fetch notifications
        api.get("/notifications").then(data => {
            if (Array.isArray(data)) setNotifications(data);
        }).catch(() => { });

        // Fetch admin profile
        api.get("/auth/me").then(data => {
            if (data?.displayName) setAdminName(data.displayName);
            if (data?.role) setAdminRole(data.role);
        }).catch(() => { });
    }, []);

    const markAllRead = async () => {
        try {
            const unread = notifications.filter(n => !n.isRead);
            await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error("Error marking notifications:", err);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        return isToday ? `Today, ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 ml-0 lg:ml-72" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {/* Left side: Search */}
            <div className="flex-1 max-w-lg hidden sm:flex items-center ml-12 lg:ml-0">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search booking ID, customer, or property..."
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex-1 sm:hidden ml-12">
                <h2 className="font-bold text-lg text-slate-800 tracking-tight">Galaxia</h2>
            </div>

            {/* Right side: Actions & Profile */}
            <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full hover:bg-slate-100"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
                        )}
                    </button>

                    {/* Notification Tray */}
                    {isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40 hidden sm:block" onClick={() => setIsNotificationOpen(false)} />
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <Bell size={16} className="text-purple-600" /> Notifications
                                    </h3>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} className="text-[10px] font-bold text-purple-600 uppercase tracking-widest hover:text-purple-700">
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto w-full">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-xs font-medium">No new notifications.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {notifications.map(notif => (
                                                <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-purple-50/30' : ''}`}>
                                                    <div className="flex items-start gap-3 w-full">
                                                        <div className={`mt-0.5 w-2 h-2 rounded-full ${!notif.isRead ? 'bg-purple-500' : 'bg-transparent'}`} />
                                                        <div className="flex-1 pr-4">
                                                            <p className={`text-sm tracking-tight ${!notif.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{notif.title}</p>
                                                            {notif.message && <p className="text-[11px] text-slate-500 mt-0.5">{notif.message}</p>}
                                                            <p className="text-[11px] text-slate-400 font-medium mt-1">{formatDate(notif.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                <button className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200">
                    <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden">
                        <User size={18} className="text-purple-600" />
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-[13px] font-bold text-slate-800 leading-tight">{adminName}</p>
                        <p className="text-[11px] font-medium text-slate-500">{adminRole}</p>
                    </div>
                </button>
            </div>
        </header>
    );
}
