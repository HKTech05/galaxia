"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api");

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            setStatus("error");
            setErrorMsg(error === "access_denied" ? "Login was cancelled." : `Login error: ${error}`);
            return;
        }

        if (!code) {
            setStatus("error");
            setErrorMsg("No authorization code received.");
            return;
        }

        // Exchange the code for tokens via our backend
        exchangeCode(code);
    }, [searchParams]);

    async function exchangeCode(code: string) {
        try {
            const redirectUri = `${window.location.origin}/auth/callback`;
            const res = await fetch(`${API_BASE}/auth/cognito/callback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, redirectUri }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server error ${res.status}`);
            }

            const data = await res.json();

            // Store auth data
            localStorage.setItem("galaxia_token", data.token);
            localStorage.setItem("galaxia_user", JSON.stringify(data.user));

            if (window.opener) {
                // We are inside a popup! Notify the opener window to continue
                window.opener.postMessage("COGNITO_LOGIN_SUCCESS", "*");
                window.close();
            } else {
                // Full page redirect
                router.replace("/dashboard");
            }
        } catch (err: any) {
            console.error("Auth callback error:", err);
            setStatus("error");
            setErrorMsg(err.message || "Authentication failed. Please try again.");
        }
    }

    if (status === "error") {
        return (
            <div className="min-h-screen bg-cream-white flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="font-cinzel text-2xl font-bold text-text-primary mb-2">Login Failed</h1>
                    <p className="font-inter text-sm text-text-secondary mb-6">{errorMsg}</p>
                    <a
                        href="/"
                        className="inline-block bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-sm font-medium px-6 py-2.5 rounded-full hover:shadow-lg transition-all"
                    >
                        Back to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-white flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-antique-gold/30 border-t-antique-gold rounded-full animate-spin" />
                <p className="font-cinzel text-lg text-text-primary font-semibold tracking-wide">Signing you in...</p>
                <p className="font-inter text-xs text-text-secondary mt-1">Please wait while we verify your identity.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-cream-white flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-antique-gold/30 border-t-antique-gold rounded-full animate-spin" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
