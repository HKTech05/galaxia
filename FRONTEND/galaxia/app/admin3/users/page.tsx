"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MoreVertical, Ban, KeyRound, Mail, Phone, CalendarDays } from "lucide-react";
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

export default function UsersPage() {
    const [allUsers, setAllUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Engagement</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No users found matching your search.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm border border-indigo-100 shrink-0">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><Mail size={12} /> {user.email}</span>
                                                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500"><Phone size={12} /> {user.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-slate-800">{user.totalBookings} Bookings</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                                <CalendarDays size={14} className="text-slate-400" /> {user.joined}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                user.status === 'Inactive' ? 'bg-slate-100 text-slate-600' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button title="Reset Password" className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 rounded-lg shadow-sm transition-colors">
                                                    <KeyRound size={16} />
                                                </button>
                                                <button onClick={() => handleSuspend(user)} title={user.status === 'Active' ? 'Suspend Account' : 'Activate Account'} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm transition-colors">
                                                    <Ban size={16} />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors ml-2">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
