"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./chatbot.css";

/* ═══════════════════════════════════════════════════════
   CHATBOT LOGIN — Real Backend API Auth
   Route: /chatbot
   ═══════════════════════════════════════════════════════ */

export default function ChatbotLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("chatbot_token");
        const session = localStorage.getItem("chatbot_session");
        if (token && session) router.replace("/chatbot/dashboard");
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/chatbot-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Store token + session
            localStorage.setItem("chatbot_token", data.token);
            localStorage.setItem(
                "chatbot_session",
                JSON.stringify({
                    username: data.user.username,
                    role: data.user.role,
                    displayName: data.user.displayName,
                    assignedNumbers: data.user.assignedNumbers,
                    isReadOnly: data.user.role === "test_viewer",
                    loginTime: new Date().toISOString(),
                })
            );
            router.push("/chatbot/dashboard");
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cb-login-wrapper">
            <div className="cb-login-glow-tr" />
            <div className="cb-login-glow-bl" />
            <div className="cb-login-card">
                <div className="cb-login-logo">
                    <h1>Galaxia</h1>
                    <p>CHATBOT DASHBOARD</p>
                </div>
                <form onSubmit={handleSubmit} className="cb-login-form">
                    <div className="cb-form-group">
                        <label htmlFor="cb-user">Username</label>
                        <input
                            id="cb-user"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="cb-form-group">
                        <label htmlFor="cb-pass">Password</label>
                        <input
                            id="cb-pass"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    {error && <div className="cb-login-error">{error}</div>}
                    <button type="submit" disabled={loading} className="cb-btn-primary">
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
                <div className="cb-login-footer">
                    <p>Galaxia Resorts — Internal Use Only</p>
                </div>
            </div>
        </div>
    );
}
