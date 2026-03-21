"use client";

import { useState, useEffect } from "react";
import { Shield, Key, CreditCard, Save, Settings, Users, Eye, EyeOff, Check, X } from "lucide-react";
import { api } from "../../../lib/api";

interface SubAdmin {
    id: number;
    username: string;
    displayName: string;
    role: string;
    email: string;
    isActive: boolean;
    assignedProperties: string[] | null;
    lastLogin: string | null;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("security");
    const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    // Password change state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

    // Own password change
    const [ownCurrentPassword, setOwnCurrentPassword] = useState("");
    const [ownNewPassword, setOwnNewPassword] = useState("");
    const [ownConfirmPassword, setOwnConfirmPassword] = useState("");
    const [ownSaving, setOwnSaving] = useState(false);
    const [ownMsg, setOwnMsg] = useState("");

    // Admin profile
    const [adminRole, setAdminRole] = useState("");

    useEffect(() => {
        api.get("/auth/me").then(data => {
            setAdminRole(data?.role || "");
        }).catch(() => {});

        // Fetch sub-admins
        api.get("/auth/sub-admins").then(data => {
            if (Array.isArray(data)) setSubAdmins(data);
            setLoading(false);
        }).catch(() => { setLoading(false); });
    }, []);

    const isOwnerOrDev = adminRole === "owner" || adminRole === "developer";

    const handleUpdatePassword = async (id: number) => {
        if (!newPassword || newPassword.length < 6) {
            setSaveMsg({ id, msg: "Min 6 characters", ok: false });
            return;
        }
        setSaving(true);
        try {
            await api.patch(`/auth/sub-admins/${id}/password`, { newPassword });
            setSaveMsg({ id, msg: "Updated!", ok: true });
            setEditingId(null);
            setNewPassword("");
        } catch (err: any) {
            setSaveMsg({ id, msg: err?.message || "Failed", ok: false });
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    const handleOwnPasswordChange = async () => {
        if (!ownNewPassword || ownNewPassword.length < 6) {
            setOwnMsg("Password must be at least 6 characters");
            return;
        }
        if (ownNewPassword !== ownConfirmPassword) {
            setOwnMsg("Passwords do not match");
            return;
        }
        setOwnSaving(true);
        setOwnMsg("");
        try {
            await api.patch("/auth/change-password", {
                currentPassword: ownCurrentPassword,
                newPassword: ownNewPassword,
            });
            setOwnMsg("✓ Password changed successfully");
            setOwnCurrentPassword("");
            setOwnNewPassword("");
            setOwnConfirmPassword("");
        } catch (err: any) {
            setOwnMsg(err?.message || "Failed to change password");
        } finally {
            setOwnSaving(false);
        }
    };

    const roleLabel = (role: string) => {
        switch (role) {
            case "owner": return "Owner";
            case "developer": return "Developer";
            case "dd_admin": return "DD Admin";
            case "staycation_admin": return "Property Admin";
            default: return role;
        }
    };

    const propertiesLabel = (ap: string[] | null) => {
        if (!ap) return "All Properties";
        return ap.map(s => {
            switch (s) {
                case "dd": return "Digital Diaries";
                case "hill-view": return "Hill View";
                case "heavenly-villa": return "Heavenly Villa";
                case "mount-view": return "Mount View";
                case "la-paraiso": return "La Paraiso";
                case "ambrose": return "Ambrose";
                case "amstel-nest": return "Amstel Nest";
                default: return s;
            }
        }).join(", ");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Settings & Configuration</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage security, sub-admins, and system configurations.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                {/* Navigation Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab("security")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "security" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        <Shield size={18} /> Security & Roles
                    </button>

                    {isOwnerOrDev && (
                        <button
                            onClick={() => setActiveTab("sub-admins")}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "sub-admins" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                        >
                            <Users size={18} /> Sub-Admin Management
                        </button>
                    )}

                    <div className="my-4 border-t border-slate-200"></div>

                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "payments" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        <CreditCard size={18} /> Payment Gateways
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {/* Security & Roles Tab */}
                    {activeTab === "security" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Security & Roles</h2>
                                <p className="text-sm font-medium text-slate-500">Update your password and view your access role.</p>
                            </div>

                            <div className="max-w-xl space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={18} /> Change Your Password</h3>
                                <div className="space-y-3">
                                    <input type="password" placeholder="Current Password" value={ownCurrentPassword} onChange={e => setOwnCurrentPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                    <input type="password" placeholder="New Password" value={ownNewPassword} onChange={e => setOwnNewPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                    <input type="password" placeholder="Confirm New Password" value={ownConfirmPassword} onChange={e => setOwnConfirmPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <button onClick={handleOwnPasswordChange} disabled={ownSaving} className="bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50">
                                        {ownSaving ? "Updating..." : "Update Password"}
                                    </button>
                                    {ownMsg && <span className={`text-sm font-medium ${ownMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>{ownMsg}</span>}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield size={18} /> Your Role</h3>
                                <p className="text-sm text-slate-500">You are currently operating as <strong className="text-slate-800">{roleLabel(adminRole)}</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* Sub-Admin Management Tab */}
                    {activeTab === "sub-admins" && isOwnerOrDev && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Sub-Admin Management</h2>
                                <p className="text-sm font-medium text-slate-500">View and manage all admin accounts and their passwords.</p>
                            </div>

                            {loading ? (
                                <div className="text-center text-slate-400 py-12 text-sm font-medium">Loading accounts...</div>
                            ) : (
                                <div className="space-y-3">
                                    {subAdmins.map(admin => (
                                        <div key={admin.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                            {/* Account Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800 text-sm">{admin.displayName}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        admin.role === "owner" ? "bg-amber-100 text-amber-700" :
                                                        admin.role === "developer" ? "bg-sky-100 text-sky-700" :
                                                        admin.role === "dd_admin" ? "bg-violet-100 text-violet-700" :
                                                        "bg-emerald-100 text-emerald-700"
                                                    }`}>
                                                        {roleLabel(admin.role)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                                                    <span>Username: <strong className="text-slate-700 font-mono">{admin.username}</strong></span>
                                                    <span>Password: <strong className="text-slate-700 font-mono">galaxia2026</strong></span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1">{propertiesLabel(admin.assignedProperties)}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {editingId === admin.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="New password"
                                                            value={newPassword}
                                                            onChange={e => setNewPassword(e.target.value)}
                                                            className="w-36 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-600"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdatePassword(admin.id)}
                                                            disabled={saving}
                                                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingId(null); setNewPassword(""); }}
                                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingId(admin.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                                                    >
                                                        <Key size={14} /> Change Password
                                                    </button>
                                                )}
                                                {saveMsg?.id === admin.id && (
                                                    <span className={`text-xs font-semibold ${saveMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                                                        {saveMsg.msg}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Gateways Tab */}
                    {activeTab === "payments" && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <CreditCard size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Payment Gateways</h3>
                                <p className="text-sm font-medium text-slate-500 max-w-sm mt-2">Payment gateway integration will be configured here. Coming soon.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
