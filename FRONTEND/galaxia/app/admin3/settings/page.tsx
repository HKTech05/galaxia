"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Bell, Shield, Key, Building, CreditCard, Save, Settings } from "lucide-react";
import { api } from "../../../lib/api";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [profile, setProfile] = useState({ displayName: "", email: "", username: "" });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");

    useEffect(() => {
        api.get("/auth/me").then(data => {
            setProfile({ displayName: data.displayName || "", email: data.email || "", username: data.username || "" });
        }).catch(err => console.error("Failed to load profile:", err));
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        setSaveMsg("");
        try {
            await api.patch("/auth/profile", { displayName: profile.displayName, email: profile.email });
            setSaveMsg("✓ Profile saved");
        } catch (err) {
            console.error("Failed to save profile:", err);
            setSaveMsg("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Settings & Configuration</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Manage your account preferences and global system configurations.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                {/* Navigation Sidebar inside Settings */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "profile" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <User size={18} /> My Profile
                    </button>

                    <button
                        onClick={() => setActiveTab("security")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "security" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Shield size={18} /> Security & Roles
                    </button>

                    <button
                        onClick={() => setActiveTab("notifications")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "notifications" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Bell size={18} /> Notifications
                    </button>

                    <div className="my-4 border-t border-slate-200"></div>

                    <button
                        onClick={() => setActiveTab("business")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "business" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <Building size={18} /> Business Info
                    </button>

                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "payments" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        <CreditCard size={18} /> Payment Gateways
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {activeTab === "profile" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Profile Information</h2>
                                <p className="text-sm font-medium text-slate-500">Update your account&apos;s profile information and email address.</p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-3xl shadow-inner border border-purple-200">
                                    {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : "A"}
                                </div>
                                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                                    Change Photo
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Display Name</label>
                                    <input type="text" value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                                    <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Username</label>
                                    <input type="text" value={profile.username} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                                <button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors disabled:opacity-50">
                                    <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                                </button>
                                {saveMsg && <span className="text-sm font-medium text-emerald-600">{saveMsg}</span>}
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Security & Roles</h2>
                                <p className="text-sm font-medium text-slate-500">Update your password and manage global access roles.</p>
                            </div>

                            <div className="max-w-xl space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={18} /> Change Password</h3>
                                <div className="space-y-3">
                                    <input type="password" placeholder="Current Password" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                    <input type="password" placeholder="New Password" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                    <input type="password" placeholder="Confirm New Password" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-600" />
                                </div>
                                <button className="bg-slate-800 text-white px-5 py-2 mt-2 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors">
                                    Update Password
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield size={18} /> Role Configuration</h3>
                                <p className="text-sm text-slate-500 mb-4">You are currently operating in <strong>Super Admin / God Mode</strong>. This gives you global read/write privileges over all Staycation and Digital Diary modules.</p>
                                <button className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors">
                                    Manage Sub-Admins
                                </button>
                            </div>
                        </div>
                    )}

                    {(activeTab !== "profile" && activeTab !== "security") && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <Settings size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Configuration Module</h3>
                                <p className="text-sm font-medium text-slate-500 max-w-sm mt-2">This settings section will be wired up to the Supabase backend to handle global platform configurations.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
