"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Ban, KeyRound, Mail, Phone, CalendarDays, ChevronDown, MapPin, IndianRupee, Moon, Clock } from "lucide-react";
import { api } from "../../../lib/api";

interface UserItem {
    id: string;
    dbId: number;
    name: string;
    email: string;
    phone: string;
    totalBookings: number;
    status: string;
    joined: string;
}

interface UserBooking {
    id: string;
    type: "staycation" | "celebration";
    location: string;
    amount: number;
    nights: number;
    status: string;
    date: string;
}

export default function UsersPage() {
    const [allUsers, setAllUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [userBookings, setUserBookings] = useState<Record<string, UserBooking[]>>({});
    const [bookingsLoading, setBookingsLoading] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await api.get("/users");
            setAllUsers(data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSuspend = async (user: UserItem) => {
        const newStatus = user.status === "Active" ? false : true;
        try {
            await api.patch(`/users/${user.dbId}/status`, { isVerified: newStatus });
            await fetchUsers();
        } catch (err) {
            console.error("Failed to update user status:", err);
        }
    };

    const handleExpand = async (user: UserItem) => {
        if (expandedUserId === user.id) {
            setExpandedUserId(null);
            return;
        }
        setExpandedUserId(user.id);
        if (!userBookings[user.id]) {
            setBookingsLoading(user.id);
            try {
                const bookings = await api.get<UserBooking[]>(`/users/${user.dbId}/bookings`);
                setUserBookings(prev => ({ ...prev, [user.id]: bookings }));
            } catch (err) {
                console.error("Failed to fetch user bookings:", err);
                setUserBookings(prev => ({ ...prev, [user.id]: [] }));
            } finally {
                setBookingsLoading(null);
            }
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">View registered customers and manage their account access.</p>
                </div>
                <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto">
                    Export CSV
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                    />
                </div>
            </div>

            {/* User Cards */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
                        <div className="w-6 h-6 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
                        <p className="text-sm text-slate-500 font-medium">No users found matching your search.</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => {
                        const isExpanded = expandedUserId === user.id;
                        const bookings = userBookings[user.id] || [];
                        const isLoadingBookings = bookingsLoading === user.id;

                        return (
                            <div key={user.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-200'}`}>
                                {/* Main Row */}
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => handleExpand(user)}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm border border-indigo-100 shrink-0 text-sm">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><Mail size={11} /> {user.email}</span>
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><Phone size={11} /> {user.phone}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-800">{user.totalBookings}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Bookings</p>
                                        </div>
                                        <div className="text-center">
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                <CalendarDays size={13} className="text-slate-400" /> {user.joined}
                                            </span>
                                        </div>
                                        <span className={`inline-flex px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                            user.status === 'Inactive' ? 'bg-slate-100 text-slate-600' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {user.status}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <button onClick={(e) => { e.stopPropagation(); handleSuspend(user); }} title={user.status === 'Active' ? 'Suspend Account' : 'Activate Account'} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm transition-colors">
                                                <Ban size={15} />
                                            </button>
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Detail Panel */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-200">
                                        {/* User Details */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</p>
                                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                                <p className="text-sm font-medium text-slate-700 truncate">{user.email}</p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone</p>
                                                <p className="text-sm font-medium text-slate-700">{user.phone}</p>
                                            </div>
                                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Member Since</p>
                                                <p className="text-sm font-medium text-slate-700">{user.joined}</p>
                                            </div>
                                        </div>

                                        {/* Booking History */}
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Booking History</h4>
                                        {isLoadingBookings ? (
                                            <div className="flex items-center gap-2 py-4 justify-center">
                                                <div className="w-4 h-4 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                                                <span className="text-xs text-slate-500 font-medium">Loading bookings...</span>
                                            </div>
                                        ) : bookings.length === 0 ? (
                                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-white">
                                                <p className="text-xs text-slate-400 font-medium">No booking history found.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {bookings.map((b) => (
                                                    <div key={b.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${b.type === 'staycation' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {b.type === 'staycation' ? <Moon size={14} /> : <Clock size={14} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-bold text-slate-800 truncate">{b.location}</span>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${b.status === 'confirmed' || b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {b.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(b.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                                                {b.nights > 0 && <span className="text-[10px] text-slate-400 font-medium">{b.nights} night{b.nights > 1 ? 's' : ''}</span>}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-800 shrink-0">
                                                            ₹{b.amount.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
