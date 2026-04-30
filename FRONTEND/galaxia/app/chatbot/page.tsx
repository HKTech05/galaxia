"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./chatbot.css";

/* ═══════════════════════════════════════════════════════
   CHATBOT LOGIN — Mock Auth (replace with real API)
   Route: /chatbot
   ═══════════════════════════════════════════════════════ */

const DEFAULT_USERS: Record<string, { password: string; role: string; displayName: string; assignedNumbers: string[] }> = {
    owner: { password: "owner123", role: "owner", displayName: "Owner", assignedNumbers: ["staycation_1", "staycation_2", "digital_diaries", "dd_instagram", "website"] },
    staycation1: { password: "stay123", role: "chatbot_admin", displayName: "Staycation 1 Admin", assignedNumbers: ["staycation_1", "website"] },
    staycation2: { password: "stay123", role: "chatbot_admin", displayName: "Staycation 2 Admin", assignedNumbers: ["staycation_2", "website"] },
    ddadmin: { password: "dd123", role: "chatbot_admin", displayName: "Digital Diaries Admin", assignedNumbers: ["digital_diaries", "dd_instagram", "website"] },
    igadmin: { password: "ig123", role: "chatbot_admin", displayName: "IG Admin", assignedNumbers: ["ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
};

function getMockUsers() {
    try {
        const custom = JSON.parse(localStorage.getItem("chatbot_passwords") || "{}");
        const users: Record<string, { password: string; role: string; displayName: string; assignedNumbers: string[] }> = {};
        const keys = Object.keys(DEFAULT_USERS) as Array<keyof typeof DEFAULT_USERS>;
        for (const key of keys) {
            const customUsername = custom[`${key}_username`] || key;
            const customPassword = custom[key] || DEFAULT_USERS[key].password;
            users[customUsername] = { ...DEFAULT_USERS[key], password: customPassword };
        }
        return users;
    } catch { return DEFAULT_USERS; }
}

export default function ChatbotLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const session = localStorage.getItem("chatbot_session");
        if (session) router.replace("/chatbot/dashboard");
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        await new Promise((r) => setTimeout(r, 500));

        const MOCK_USERS = getMockUsers();
        const user = MOCK_USERS[username.trim()];
        if (user && user.password === password) {
            localStorage.setItem(
                "chatbot_session",
                JSON.stringify({ username: username.trim(), role: user.role, displayName: user.displayName, assignedNumbers: user.assignedNumbers, loginTime: new Date().toISOString() })
            );
            router.push("/chatbot/dashboard");
        } else {
            setError("Invalid credentials. Please try again.");
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
                        <input id="cb-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" required />
                    </div>
                    <div className="cb-form-group">
                        <label htmlFor="cb-pass">Password</label>
                        <input id="cb-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
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
