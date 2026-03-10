"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("/auth/login", { username, password });
            if (res.token) {
                // Store admin token specifically
                localStorage.setItem("galaxia_admin_token", res.token);
                // Also set a secure cookie so the Next.js Middleware can read it
                document.cookie = `admin_token=${res.token}; path=/; max-age=604800; samesite=strict`;
                
                router.push("/admin3");
            }
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Access denied.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute w-[500px] h-[500px] bg-antique-gold/10 rounded-full blur-[100px] -top-48 -left-48" />
                <div className="absolute w-[600px] h-[600px] bg-dark-gold/10 rounded-full blur-[120px] -bottom-64 -right-32" />
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-antique-gold to-dark-gold rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(196,163,103,0.3)]">
                        <svg className="w-8 h-8 text-[#111]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h1 className="font-cinzel text-3xl text-white tracking-widest mb-2">GALAXIA<span className="text-antique-gold ml-2">ADMIN</span></h1>
                    <p className="font-inter text-xs text-white/50 tracking-[0.2em] uppercase">Authorized Personnel Only</p>
                </div>

                <div className="bg-[#1A1A1A] border border-[#333] rounded-xl p-8 shadow-2xl backdrop-blur-sm">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 font-inter text-xs text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-white/60 text-[10px] font-inter uppercase tracking-[0.1em] mb-2 block">Username</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 font-inter text-sm text-white focus:outline-none focus:border-antique-gold/50 transition-colors placeholder:text-white/20"
                                placeholder="Admin ID"
                            />
                        </div>

                        <div>
                            <label className="text-white/60 text-[10px] font-inter uppercase tracking-[0.1em] mb-2 block">Secure Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 font-inter text-sm text-white focus:outline-none focus:border-antique-gold/50 transition-colors placeholder:text-white/20"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-antique-gold to-dark-gold text-[#111] py-3.5 rounded-lg font-cinzel font-bold tracking-widest text-sm hover:shadow-[0_0_20px_rgba(196,163,103,0.4)] transition-all disabled:opacity-50 mt-4"
                        >
                            {loading ? "Authenticating..." : "Establish Connection"}
                        </button>
                    </form>
                </div>
                
                <p className="text-center mt-8 text-[10px] font-inter text-white/30 uppercase tracking-widest">
                    Galaxia Management Protocol v2.5
                </p>
            </div>
        </div>
    );
}
