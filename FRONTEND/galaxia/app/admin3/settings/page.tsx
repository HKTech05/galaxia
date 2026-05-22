"use client";

import { useState, useEffect } from "react";
import { Shield, Key, CreditCard, Users, Pencil, Check, X } from "lucide-react";
import { api } from "../../../lib/api";

interface SubAdmin {
    id: number;
    username: string;
    displayName: string;
    role: string;
    email: string;
    isActive: boolean;
    assignedProperties: string[] | null;
    plainPassword: string | null;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("security");
    const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    // Inline editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

    const [adminRole, setAdminRole] = useState("");

    useEffect(() => {
        api.get("/auth/me").then(data => {
            setAdminRole(data?.role || "");
        }).catch(() => {});
        api.get("/auth/sub-admins").then(data => {
            if (Array.isArray(data)) setSubAdmins(data);
            setLoading(false);
        }).catch(() => { setLoading(false); });
    }, []);

    const isOwnerOrDev = adminRole === "owner" || adminRole === "developer";

    const startEditing = (admin: SubAdmin) => {
        setEditingId(admin.id);
        setEditUsername(admin.username);
        setEditPassword(admin.plainPassword || "");
        setSaveMsg(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditUsername("");
        setEditPassword("");
    };

    const handleSave = async (id: number) => {
        const original = subAdmins.find(a => a.id === id);
        if (!original) return;

        const updates: any = {};
        if (editUsername !== original.username) updates.username = editUsername;
        if (editPassword !== (original.plainPassword || "")) updates.password = editPassword;

        if (Object.keys(updates).length === 0) {
            cancelEditing();
            return;
        }

        setSaving(true);
        try {
            const res = await api.patch(`/auth/sub-admins/${id}`, updates);
            setSubAdmins(prev => prev.map(a => a.id === id ? {
                ...a,
                username: res.username || a.username,
                plainPassword: res.plainPassword || a.plainPassword,
            } : a));
            setSaveMsg({ id, msg: "Saved!", ok: true });
            setEditingId(null);
        } catch (err: any) {
            setSaveMsg({ id, msg: err?.message || "Failed", ok: false });
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    const propertiesLabel = (ap: string[] | null) => {
        if (!ap) return "All Properties (Full Access)";
        return ap.map(s => {
            switch (s) {
                case "dd": return "Digital Diaries";
                case "hill-view": return "Hill View";
                case "heavenly-villa": return "Heavenly Villa";
                case "mount-view": return "Mount View";
                case "la-paraiso": return "La Paraiso";
                case "ambrose": return "Ambrose";
                case "amstel-nest": return "Amstel Nest";
                case "chef": return "Kitchen / Chef";
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

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col lg:flex-row overflow-hidden min-h-[600px]">
                {/* Sidebar */}
                <div className="w-full lg:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
                    <button onClick={() => setActiveTab("security")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "security" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                        <Shield size={18} /> Security & Roles
                    </button>
                    <div className="my-4 border-t border-slate-200"></div>
                    <button onClick={() => setActiveTab("payments")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "payments" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                        <CreditCard size={18} /> Payment Gateways
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {/* Security & Roles (with sub-admin table merged in) */}
                    {activeTab === "security" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Security & Roles</h2>
                            </div>

                            {/* Sub-Admin Table (owner/dev only) */}
                            {isOwnerOrDev && (
                                <>
                                    {loading ? (
                                        <div className="text-center text-slate-400 py-12 text-sm font-medium">Loading...</div>
                                    ) : (
                                        <>
                                        {/* Desktop table */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden hidden lg:block">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">ID</th>
                                                        <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Location</th>
                                                        <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Username</th>
                                                        <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Password</th>
                                                        <th className="text-center px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {subAdmins.map(admin => (
                                                        <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">#{admin.id}</td>
                                                            <td className="px-5 py-3.5">
                                                                <span className="text-slate-800 font-medium">{propertiesLabel(admin.assignedProperties)}</span>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                {editingId === admin.id ? (
                                                                    <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                                                                        className="w-full bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" autoFocus />
                                                                ) : (
                                                                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono text-[13px]">{admin.username}</code>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                {editingId === admin.id ? (
                                                                    <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                                                                        className="w-full bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                                                                ) : (
                                                                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono text-[13px]">{admin.plainPassword || "••••••"}</code>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-center">
                                                                {editingId === admin.id ? (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button onClick={() => handleSave(admin.id)} disabled={saving}
                                                                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50" title="Save">
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button onClick={cancelEditing}
                                                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors" title="Cancel">
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button onClick={() => startEditing(admin)}
                                                                            className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-purple-600 hover:border-purple-200 transition-colors" title="Edit">
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                        {saveMsg?.id === admin.id && (
                                                                            <span className={`text-xs font-semibold ${saveMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{saveMsg.msg}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile card layout */}
                                        <div className="lg:hidden space-y-3">
                                            {subAdmins.map(admin => (
                                                <div key={admin.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="text-xs text-slate-400 font-mono mb-1">#{admin.id}</p>
                                                            <p className="text-sm font-semibold text-slate-800">{propertiesLabel(admin.assignedProperties)}</p>
                                                        </div>
                                                        {editingId === admin.id ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <button onClick={() => handleSave(admin.id)} disabled={saving}
                                                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50" title="Save">
                                                                    <Check size={14} />
                                                                </button>
                                                                <button onClick={cancelEditing}
                                                                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors" title="Cancel">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => startEditing(admin)}
                                                                    className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-purple-600 hover:border-purple-200 transition-colors" title="Edit">
                                                                    <Pencil size={14} />
                                                                </button>
                                                                {saveMsg?.id === admin.id && (
                                                                    <span className={`text-xs font-semibold ${saveMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{saveMsg.msg}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</span>
                                                            {editingId === admin.id ? (
                                                                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                                                                    className="bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-28 text-right" autoFocus />
                                                            ) : (
                                                                <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-xs">{admin.username}</code>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</span>
                                                            {editingId === admin.id ? (
                                                                <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                                                                    className="bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-28 text-right" />
                                                            ) : (
                                                                <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-xs">{admin.plainPassword || "••••••"}</code>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Your Role */}
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2"><Shield size={18} /> Your Role</h3>
                                <p className="text-sm text-slate-500">You are currently operating as <strong className="text-slate-800">{adminRole === "owner" ? "Owner" : adminRole === "developer" ? "Developer" : adminRole}</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* Payment Gateways */}
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
