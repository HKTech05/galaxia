"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "../../lib/api";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        phone: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const res = await api.post("/auth/login-guest", {
                    email: formData.email,
                    password: formData.password,
                });
                
                if (res.token) {
                    localStorage.setItem("galaxia_token", res.token);
                    localStorage.setItem("galaxia_user", JSON.stringify(res.user));
                    window.location.href = callbackUrl;
                }
            } else {
                const res = await api.post("/auth/register-guest", {
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    phone: formData.phone,
                });
                
                if (res.id) {
                    // Auto-login after registration
                    const loginRes = await api.post("/auth/login-guest", {
                        email: formData.email,
                        password: formData.password,
                    });
                    
                    if (loginRes.token) {
                        localStorage.setItem("galaxia_token", loginRes.token);
                        localStorage.setItem("galaxia_user", JSON.stringify(loginRes.user));
                        window.location.href = callbackUrl;
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-white flex">
            {/* Left Side — Image */}
            <div className="hidden lg:block lg:w-1/2 relative bg-soft-gray">
                <Image
                    src="https://images.unsplash.com/photo-1542314831-c6a4d14d8376?q=80&w=2070&auto=format&fit=crop"
                    alt="Galaxia Luxury Resort"
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-16 left-16 text-white max-w-md">
                    <h2 className="font-cinzel text-4xl mb-4 font-bold tracking-wide">Enter the extraordinary.</h2>
                    <p className="font-inter text-sm text-white/80 leading-relaxed">
                        Access your bookings, manage your stays, and unlock exclusive experiences reserved for our members.
                    </p>
                </div>
            </div>

            {/* Right Side — Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-16">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-block mb-8">
                            <span className="font-cinzel font-semibold text-gold-gradient text-3xl">GALAXIA</span>
                        </Link>
                        <h1 className="font-cinzel text-3xl text-text-primary mb-2">
                            {isLogin ? "Welcome Back" : "Create an Account"}
                        </h1>
                        <p className="font-inter text-sm text-text-secondary">
                            {isLogin
                                ? "Sign in to manage your luxury stay"
                                : "Join Galaxia to unlock premium experiences"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 font-inter text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="text-text-muted text-xs font-inter uppercase tracking-wider mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2.5 font-inter text-base text-text-primary focus:ring-0 focus:border-antique-gold transition-colors"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-text-muted text-xs font-inter uppercase tracking-wider mb-1 block">Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2.5 font-inter text-base text-text-primary focus:ring-0 focus:border-antique-gold transition-colors"
                                        placeholder="+91 9876543210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-text-muted text-xs font-inter uppercase tracking-wider mb-1 block">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2.5 font-inter text-base text-text-primary focus:ring-0 focus:border-antique-gold transition-colors"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-text-muted text-xs font-inter uppercase tracking-wider mb-1 block">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-transparent border-0 border-b border-border-medium rounded-none px-0 py-2.5 font-inter text-base text-text-primary focus:ring-0 focus:border-antique-gold transition-colors"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-8 bg-gradient-to-r from-antique-gold to-dark-gold text-white py-4 rounded-md font-inter tracking-widest uppercase text-xs hover:shadow-lg hover:shadow-antique-gold/20 transition-all disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-border-light pt-6">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError("");
                                setFormData({ email: "", password: "", fullName: "", phone: "" });
                            }}
                            className="font-inter text-xs text-text-secondary hover:text-antique-gold transition-colors block w-full"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
