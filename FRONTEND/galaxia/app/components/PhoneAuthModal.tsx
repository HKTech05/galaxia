"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = typeof window !== "undefined" ? "/api" : "";

interface PhoneAuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

type Step = "phone" | "otp" | "name";

export default function PhoneAuthModal({ onClose, onSuccess }: PhoneAuthModalProps) {
    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const otpRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];
    const phoneInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus phone input on mount
    useEffect(() => {
        setTimeout(() => phoneInputRef.current?.focus(), 100);
    }, []);

    // Resend countdown timer
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((t) => t - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Focus first OTP input when step changes to OTP
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => otpRefs[0].current?.focus(), 100);
        }
    }, [step]);

    /* ─── Send OTP ─────────────────────────────────────────── */
    async function handleSendOtp() {
        setError("");
        const cleaned = phone.replace(/\D/g, "");
        if (cleaned.length !== 10) {
            setError("Please enter a valid 10-digit phone number");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/phone/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");

            setStep("otp");
            setResendTimer(60);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    /* ─── Verify OTP ───────────────────────────────────────── */
    async function handleVerifyOtp(otpOverride?: string[]) {
        setError("");
        const digits = otpOverride || otp;
        const otpString = digits.join("");
        if (otpString.length !== 4) {
            setError("Please enter the 4-digit OTP");
            return;
        }

        setLoading(true);
        try {
            const cleaned = phone.replace(/\D/g, "");
            const res = await fetch(`${API_BASE}/auth/phone/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned, otp: otpString }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verification failed");

            // Store auth data
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));

            if (data.isNewUser) {
                setStep("name");
            } else {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message);
            // Clear OTP fields on error
            setOtp(["", "", "", ""]);
            setTimeout(() => otpRefs[0].current?.focus(), 50);
        } finally {
            setLoading(false);
        }
    }

    /* ─── Update Name ──────────────────────────────────────── */
    async function handleUpdateName() {
        setError("");
        if (!firstName.trim()) {
            setError("Please enter your first name");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("galaxia_token");
            const res = await fetch(`${API_BASE}/auth/phone/update-name`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update name");

            // Update stored user
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    /* ─── Resend OTP ───────────────────────────────────────── */
    async function handleResendOtp() {
        setError("");
        setOtp(["", "", "", ""]);
        setLoading(true);
        try {
            const cleaned = phone.replace(/\D/g, "");
            const res = await fetch(`${API_BASE}/auth/phone/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to resend OTP");
            setResendTimer(60);
            setTimeout(() => otpRefs[0].current?.focus(), 50);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    /* ─── OTP Input Handlers ───────────────────────────────── */
    function handleOtpChange(index: number, value: string) {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance to next field
        if (value && index < 3) {
            otpRefs[index + 1].current?.focus();
        }

        // Auto-submit when all 4 digits entered
        if (value && index === 3 && newOtp.every((d) => d !== "")) {
            setTimeout(() => handleVerifyOtp(newOtp), 100);
        }
    }

    function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
        if (e.key === "Enter") {
            handleVerifyOtp();
        }
    }

    function handleOtpPaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (pasted.length === 4) {
            const newOtp = pasted.split("");
            setOtp(newOtp);
            otpRefs[3].current?.focus();
            setTimeout(() => handleVerifyOtp(newOtp), 100);
        }
    }

    /* ─── Render ───────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 xs:p-10 relative transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Back button (for OTP step) */}
                {step === "otp" && (
                    <button onClick={() => { setStep("phone"); setError(""); setOtp(["", "", "", ""]); }} className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}

                {/* ─── STEP 1: Phone Input ─────────────────────── */}
                {step === "phone" && (
                    <>
                        {/* WhatsApp icon */}
                        <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-5">
                            <svg className="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>
                        <h2 className="font-inter text-[22px] font-semibold text-white mb-1.5 text-center tracking-tight">
                            Continue with Phone
                        </h2>
                        <p className="font-inter text-[13px] text-[#8E8EA0] text-center mb-6 px-2">
                            We&apos;ll send a verification code to your WhatsApp
                        </p>

                        <div className="w-full space-y-4">
                            <div className="flex gap-2">
                                {/* Fixed +91 prefix */}
                                <div className="flex items-center gap-1.5 bg-[#343541] border border-[#565869] rounded-lg px-3 py-3 text-white/80 font-inter text-[15px] select-none shrink-0">
                                    <span className="text-[13px]">🇮🇳</span>
                                    <span>+91</span>
                                </div>
                                <input
                                    ref={phoneInputRef}
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSendOtp(); }}
                                    placeholder="Enter 10-digit number"
                                    className="flex-1 bg-[#343541] border border-[#565869] rounded-lg px-4 py-3 text-white font-inter text-[15px] placeholder-[#6E6E80] focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 font-inter text-[13px] text-center">{error}</p>
                            )}

                            <button
                                onClick={handleSendOtp}
                                disabled={loading || phone.replace(/\D/g, "").length !== 10}
                                className="w-full bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-inter text-[15px] font-medium py-3.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send OTP via WhatsApp
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* ─── STEP 2: OTP Verification ───────────────── */}
                {step === "otp" && (
                    <>
                        <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-5">
                            <svg className="w-7 h-7 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h2 className="font-inter text-[22px] font-semibold text-white mb-1.5 text-center tracking-tight">
                            Verify OTP
                        </h2>
                        <p className="font-inter text-[13px] text-[#8E8EA0] text-center mb-6 px-2">
                            Enter the 4-digit code sent to <span className="text-white/90">+91 {phone}</span>
                        </p>

                        <div className="w-full space-y-5">
                            {/* OTP boxes */}
                            <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={otpRefs[i]}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="w-14 h-14 bg-[#343541] border-2 border-[#565869] rounded-xl text-center text-white font-inter text-2xl font-bold focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30 transition-all duration-200"
                                    />
                                ))}
                            </div>

                            {error && (
                                <p className="text-red-400 font-inter text-[13px] text-center">{error}</p>
                            )}

                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.some((d) => !d)}
                                className="w-full bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-inter text-[15px] font-medium py-3.5 rounded-lg transition-all duration-200 flex items-center justify-center"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : "Verify & Continue"}
                            </button>

                            {/* Resend */}
                            <div className="text-center">
                                {resendTimer > 0 ? (
                                    <p className="font-inter text-[13px] text-[#6E6E80]">
                                        Resend OTP in <span className="text-[#25D366]">{resendTimer}s</span>
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="font-inter text-[13px] text-[#25D366] hover:text-[#20BD5A] hover:underline transition-colors disabled:opacity-50"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ─── STEP 3: Name Collection (new users) ────── */}
                {step === "name" && (
                    <>
                        <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-5">
                            <svg className="w-7 h-7 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <h2 className="font-inter text-[22px] font-semibold text-white mb-1.5 text-center tracking-tight">
                            Almost there!
                        </h2>
                        <p className="font-inter text-[13px] text-[#8E8EA0] text-center mb-6 px-2">
                            Tell us your name to complete your account
                        </p>

                        <div className="w-full space-y-3">
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateName(); }}
                                placeholder="First Name *"
                                autoFocus
                                className="w-full bg-[#343541] border border-[#565869] rounded-lg px-4 py-3 text-white font-inter text-[15px] placeholder-[#6E6E80] focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                            />
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateName(); }}
                                placeholder="Last Name"
                                className="w-full bg-[#343541] border border-[#565869] rounded-lg px-4 py-3 text-white font-inter text-[15px] placeholder-[#6E6E80] focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                            />

                            {error && (
                                <p className="text-red-400 font-inter text-[13px] text-center">{error}</p>
                            )}

                            <button
                                onClick={handleUpdateName}
                                disabled={loading || !firstName.trim()}
                                className="w-full bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-inter text-[15px] font-medium py-3.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mt-1"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Complete Setup
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
