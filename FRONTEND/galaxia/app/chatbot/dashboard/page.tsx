"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "../chatbot.css";

/* ═══════════════════════════════════════════════════════
   CHATBOT DASHBOARD — Full WhatsApp-style chat UI
   Route: /chatbot/dashboard
   ═══════════════════════════════════════════════════════ */

interface PhoneNumber { id: string; label: string; icon: string; color: string }

const PHONE_NUMBERS: Record<string, PhoneNumber> = {
    staycation_1: { id: "PLACEHOLDER_STAYCATION_1_PHONE_ID", label: "Staycation 1", icon: "🏡", color: "#7c3aed" },
    staycation_2: { id: "PLACEHOLDER_STAYCATION_2_PHONE_ID", label: "Staycation 2", icon: "🏘️", color: "#3b82f6" },
    digital_diaries: { id: "PLACEHOLDER_DIGITAL_DIARIES_PHONE_ID", label: "Digital Diaries", icon: "🎬", color: "#f59e0b" },
    website: { id: "website", label: "Website", icon: "🌐", color: "#10b981" },
};

interface ChatSession { id: string; sessionId: string; displayName: string; phoneNumberKey: string; mode: "bot" | "human"; tags: string[]; unread: number; lastMessage: string; lastMessageTime: Date; platform: string }
interface Message { role: "user" | "assistant"; message: string; time: Date; isHuman: boolean }

const INITIAL_SESSIONS: ChatSession[] = [
    { id: "sess_1", sessionId: "+91 98765 43210", displayName: "Arjun Mehta", phoneNumberKey: "staycation_1", mode: "bot", tags: ["hot"], unread: 3, lastMessage: "What is the check-in time for La Paraiso?", lastMessageTime: new Date(Date.now() - 2 * 60000), platform: "whatsapp" },
    { id: "sess_2", sessionId: "+91 87654 32109", displayName: "Priya Sharma", phoneNumberKey: "staycation_1", mode: "human", tags: ["followup"], unread: 0, lastMessage: "Thank you! We will arrive by 3 PM.", lastMessageTime: new Date(Date.now() - 15 * 60000), platform: "whatsapp" },
    { id: "sess_3", sessionId: "+91 76543 21098", displayName: "Rohan Patel", phoneNumberKey: "staycation_2", mode: "bot", tags: [], unread: 1, lastMessage: "Is Amstel Nest pet friendly?", lastMessageTime: new Date(Date.now() - 45 * 60000), platform: "whatsapp" },
    { id: "sess_4", sessionId: "+91 65432 10987", displayName: "Sneha Kulkarni", phoneNumberKey: "digital_diaries", mode: "bot", tags: ["new"], unread: 5, lastMessage: "Hi! I want to book Sandy Screen for Saturday", lastMessageTime: new Date(Date.now() - 5 * 60000), platform: "whatsapp" },
    { id: "sess_5", sessionId: "+91 54321 09876", displayName: "Amit Desai", phoneNumberKey: "staycation_1", mode: "human", tags: ["resolved"], unread: 0, lastMessage: "Booking confirmed. Ref: STY-2024-0341", lastMessageTime: new Date(Date.now() - 3 * 3600000), platform: "whatsapp" },
    { id: "sess_6", sessionId: "+91 43210 98765", displayName: "Kavita Joshi", phoneNumberKey: "staycation_2", mode: "bot", tags: [], unread: 0, lastMessage: "Can we bring our pet dog?", lastMessageTime: new Date(Date.now() - 5 * 3600000), platform: "instagram" },
    { id: "sess_7", sessionId: "+91 32109 87654", displayName: "Nikhil Rao", phoneNumberKey: "digital_diaries", mode: "human", tags: ["hot"], unread: 2, lastMessage: "Is Park N Watch available for a birthday party?", lastMessageTime: new Date(Date.now() - 30 * 60000), platform: "whatsapp" },
    { id: "sess_8", sessionId: "+91 21098 76543", displayName: "Meera Iyer", phoneNumberKey: "staycation_1", mode: "bot", tags: [], unread: 0, lastMessage: "What are the weekend prices for Santorini?", lastMessageTime: new Date(Date.now() - 8 * 3600000), platform: "whatsapp" },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
    sess_1: [
        { role: "user", message: "Hi", time: new Date(Date.now() - 10 * 60000), isHuman: false },
        { role: "assistant", message: "👋 *Welcome to Galaxia Staycations!*\n\nExplore our luxury villas in Karjat.", time: new Date(Date.now() - 10 * 60000 + 2000), isHuman: false },
        { role: "user", message: "I want to see La Paraiso", time: new Date(Date.now() - 8 * 60000), isHuman: false },
        { role: "assistant", message: "🏡 *La Paraiso*\nPremium Private Pool Villa\n\n💰 *Stay Pricing:* (Excl. GST)\n  • Weekday: ₹4,950 + 5% GST\n  • Weekend: ₹7,500 + 5% GST\n\n🕒 Check-in: 2:00 PM | Check-out: 10:00 AM\n🐾 Pets: Allowed ✅ (₹600 extra)\n💵 Security Deposit: ₹3,000", time: new Date(Date.now() - 8 * 60000 + 3000), isHuman: false },
        { role: "user", message: "What is the check-in time for La Paraiso?", time: new Date(Date.now() - 2 * 60000), isHuman: false },
    ],
    sess_2: [
        { role: "user", message: "Hello, we want to book Heavenly Villas for this weekend", time: new Date(Date.now() - 2 * 3600000), isHuman: false },
        { role: "assistant", message: "Great news! Heavenly Villas is available. The rate is ₹4,950 + GST per night.", time: new Date(Date.now() - 1.5 * 3600000), isHuman: true },
        { role: "user", message: "Yes please! 2 adults, checking in Saturday 2 PM", time: new Date(Date.now() - 1 * 3600000), isHuman: false },
        { role: "assistant", message: "Perfect! I've reserved Heavenly Villas for you:\n📅 Sat → Sun\n👥 2 Adults\n💰 ₹4,950 + 5% GST = ₹5,198", time: new Date(Date.now() - 50 * 60000), isHuman: true },
        { role: "user", message: "Thank you! We will arrive by 3 PM.", time: new Date(Date.now() - 15 * 60000), isHuman: false },
    ],
    sess_3: [
        { role: "user", message: "Hi is Amstel Nest pet friendly?", time: new Date(Date.now() - 50 * 60000), isHuman: false },
        { role: "assistant", message: "🐾 *Pets Policy*\n\n✅ Allowed: Hill View, Mount View, Heavenly Villas, La Paraiso, Ambrose.\n❌ Not Allowed: Amstel Nest.", time: new Date(Date.now() - 50 * 60000 + 2000), isHuman: false },
    ],
    sess_4: [
        { role: "user", message: "Hi! I want to book Sandy Screen for Saturday", time: new Date(Date.now() - 5 * 60000), isHuman: false },
        { role: "assistant", message: "🎬 *Welcome to Digital Diaries!*\n\nLet me help you with Sandy Screen booking!", time: new Date(Date.now() - 5 * 60000 + 2000), isHuman: false },
    ],
    sess_5: [
        { role: "user", message: "Can I speak to someone?", time: new Date(Date.now() - 5 * 3600000), isHuman: false },
        { role: "assistant", message: "Let me connect you with our team.", time: new Date(Date.now() - 4 * 3600000), isHuman: true },
        { role: "assistant", message: "Done! Booking moved to next weekend. Enjoy your stay! 🎉", time: new Date(Date.now() - 3 * 3600000), isHuman: true },
    ],
    sess_7: [
        { role: "user", message: "Hey, is Park N Watch available for a birthday party on 30th?", time: new Date(Date.now() - 60 * 60000), isHuman: false },
        { role: "assistant", message: "🎬 Let me check Park N Watch availability!", time: new Date(Date.now() - 60 * 60000 + 2000), isHuman: false },
        { role: "user", message: "Also, can we get decoration?", time: new Date(Date.now() - 55 * 60000), isHuman: false },
    ],
};

function formatTime(d: Date) {
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMsg(text: string) {
    return text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

// Stable offsets for mock data so they are consistent
function getOffsetMs(id: string): number {
    const offsets: Record<string, number> = {
        sess_1: 2 * 60000, sess_2: 15 * 60000, sess_3: 45 * 60000, sess_4: 5 * 60000,
        sess_5: 3 * 3600000, sess_6: 5 * 3600000, sess_7: 30 * 60000, sess_8: 8 * 3600000,
    };
    return offsets[id] || 0;
}

const DEFAULT_PASSWORDS: Record<string, string> = { owner: "owner123", staycation1: "stay123", staycation2: "stay123", ddadmin: "dd123" };
const ACCOUNTS = [
    { key: "owner", label: "Owner", access: "All Numbers" },
    { key: "staycation1", label: "Staycation 1", access: "Staycation 1" },
    { key: "staycation2", label: "Staycation 2", access: "Staycation 2" },
    { key: "ddadmin", label: "DD Admin", access: "Digital Diaries" },
];

function SettingsModal({ onClose }: { onClose: () => void }) {
    const [credentials, setCredentials] = useState<{ username: string; password: string }[]>([]);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        try {
            const custom = JSON.parse(localStorage.getItem("chatbot_passwords") || "{}");
            const creds = ACCOUNTS.map(a => ({
                username: custom[`${a.key}_username`] || a.key,
                password: custom[a.key] || DEFAULT_PASSWORDS[a.key] || "",
            }));
            setCredentials(creds);
        } catch {
            setCredentials(ACCOUNTS.map(a => ({ username: a.key, password: DEFAULT_PASSWORDS[a.key] || "" })));
        }
    }, []);

    const handleSave = () => {
        const toSave: Record<string, string> = {};
        ACCOUNTS.forEach((a, i) => {
            toSave[a.key] = credentials[i]?.password || DEFAULT_PASSWORDS[a.key] || "";
            toSave[`${a.key}_username`] = credentials[i]?.username || a.key;
        });
        localStorage.setItem("chatbot_passwords", JSON.stringify(toSave));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="cb-settings-overlay" onClick={onClose}>
            <div className="cb-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="cb-settings-header">
                    <h3>⚙️ Settings</h3>
                    <button className="cb-settings-close" onClick={onClose}>✕</button>
                </div>
                <div className="cb-settings-body">
                    <table className="cb-settings-table">
                        <thead><tr><th>Username</th><th>Password</th><th>Access</th></tr></thead>
                        <tbody>
                            {ACCOUNTS.map((a, i) => (
                                <tr key={a.key}>
                                    <td>
                                        <input
                                            type="text"
                                            value={credentials[i]?.username || ""}
                                            onChange={e => { const c = [...credentials]; c[i] = { ...c[i], username: e.target.value }; setCredentials(c); }}
                                            style={{ width: "100%", border: "1px solid #e9edef", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", fontWeight: 600 }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={credentials[i]?.password || ""}
                                            onChange={e => { const c = [...credentials]; c[i] = { ...c[i], password: e.target.value }; setCredentials(c); }}
                                            style={{ width: "100%", border: "1px solid #e9edef", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                                        />
                                    </td>
                                    <td>{a.access}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                        {saved && <span style={{ color: "#00a884", fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
                        <button onClick={handleSave} style={{ background: "#075e54", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ChatbotDashboard() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [session, setSession] = useState<{ role: string; displayName: string; assignedNumbers: string[] } | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [msgInput, setMsgInput] = useState("");
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const msgEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        try {
            const s = JSON.parse(localStorage.getItem("chatbot_session") || "null");
            if (!s) { router.replace("/chatbot"); return; }
            setSession(s);
            // Initialize mock data on the client only to avoid hydration mismatch
            setSessions(INITIAL_SESSIONS.map(sess => ({
                ...sess,
                lastMessageTime: new Date(Date.now() - getOffsetMs(sess.id)),
            })));
            setMessages(INITIAL_MESSAGES);
        } catch { router.replace("/chatbot"); }
    }, [router]);

    // Fetch real website human requests from API
    const fetchHumanRequests = useCallback(async () => {
        try {
            const token = localStorage.getItem("galaxia_token");
            if (!token) return;
            const res = await fetch("/api/human-requests", { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const websiteSessions: ChatSession[] = data.map((req: any) => ({
                id: `web_${req.id}`,
                sessionId: req.phone,
                displayName: req.phone,
                phoneNumberKey: "website",
                mode: "human" as const,
                tags: ["website", req.source === "celebration" ? "dd" : "staycation"],
                unread: req.status === "pending" ? 1 : 0,
                lastMessage: `Talk to Human request from ${req.source} page`,
                lastMessageTime: new Date(req.createdAt),
                platform: "website",
            }));
            setSessions(prev => {
                const nonWeb = prev.filter(s => !s.id.startsWith("web_"));
                return [...nonWeb, ...websiteSessions];
            });
        } catch { /* silently fail */ }
    }, []);

    useEffect(() => {
        if (session) {
            fetchHumanRequests();
            const interval = setInterval(fetchHumanRequests, 30000); // refresh every 30s
            return () => clearInterval(interval);
        }
    }, [session, fetchHumanRequests]);

    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat, messages]);

    const allowed = session?.assignedNumbers || Object.keys(PHONE_NUMBERS);

    const getFiltered = useCallback((t: string) => {
        return sessions.filter(s => {
            if (!allowed.includes(s.phoneNumberKey)) return false;
            if (t !== "all" && s.phoneNumberKey !== t) return false;
            if (search) {
                const q = search.toLowerCase();
                return s.displayName.toLowerCase().includes(q) || s.sessionId.includes(q) || s.lastMessage.toLowerCase().includes(q);
            }
            return true;
        }).sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    }, [sessions, allowed, search]);

    const openChat = (id: string) => {
        setActiveChat(id);
        setSessions(prev => prev.map(s => s.id === id ? { ...s, unread: 0 } : s));
        setMobileShowChat(true);
    };

    const toggleMode = () => {
        if (!activeChat) return;
        setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, mode: s.mode === "bot" ? "human" : "bot" } : s));
    };

    const toggleTag = (tag: string) => {
        if (!activeChat) return;
        setSessions(prev => prev.map(s => {
            if (s.id !== activeChat) return s;
            const tags = s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag];
            return { ...s, tags };
        }));
    };

    const sendMessage = () => {
        if (!msgInput.trim() || !activeChat) return;
        const newMsg: Message = { role: "assistant", message: msgInput.trim(), time: new Date(), isHuman: true };
        setMessages(prev => ({ ...prev, [activeChat]: [...(prev[activeChat] || []), newMsg] }));
        setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, lastMessage: msgInput.trim(), lastMessageTime: new Date() } : s));
        setMsgInput("");
    };

    const handleLogout = () => { localStorage.removeItem("chatbot_session"); router.push("/chatbot"); };
    const goBack = () => setMobileShowChat(false);

    if (!mounted || !session) return null;

    const active = sessions.find(s => s.id === activeChat);
    const chatMsgs = activeChat ? (messages[activeChat] || []) : [];

    return (
        <div className="cb-dashboard">
            {/* Top Bar */}
            <header className="cb-topbar">
                <div className="cb-topbar-left">
                    <h1>Galaxia</h1>
                    <span className="cb-role-badge">{session.role === "owner" ? "Owner" : session.displayName}</span>
                </div>
                <div className="cb-topbar-right">
                    <button className="cb-btn-settings" onClick={() => setShowSettings(true)} title="Settings">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button className="cb-btn-logout" onClick={handleLogout}>Log Out</button>
                </div>
            </header>

            <div className="cb-main">
                {/* Left Panel */}
                <div className={`cb-left ${mobileShowChat ? "hidden" : ""}`}>
                    <div className="cb-tabs">
                        <button className={`cb-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
                            All
                            {(() => { const u = getFiltered("all").reduce((s, c) => s + c.unread, 0); return u > 0 ? <span className="cb-tab-count">{u}</span> : null; })()}
                        </button>
                        {allowed.map(key => {
                            const num = PHONE_NUMBERS[key];
                            if (!num) return null;
                            const u = getFiltered(key).reduce((s, c) => s + c.unread, 0);
                            return (
                                <button key={key} className={`cb-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
                                    {num.icon} {num.label}{u > 0 && <span className="cb-tab-count">{u}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="cb-search">
                        <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="cb-chatlist">
                        {getFiltered(tab).length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cb-text-dim)" }}>
                                <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
                                <p style={{ fontSize: 13, fontWeight: 600 }}>No conversations found</p>
                            </div>
                        ) : getFiltered(tab).map(s => {
                            const num = PHONE_NUMBERS[s.phoneNumberKey];
                            return (
                                <div key={s.id} className={`cb-chat-item ${activeChat === s.id ? "active" : ""}`} onClick={() => openChat(s.id)}>
                                    <div className={`cb-avatar ${s.mode === "bot" ? "bot-border" : "human-border"}`}>
                                        {s.displayName.charAt(0)}
                                    </div>
                                    <div className="cb-chat-info">
                                        <div className="cb-chat-top">
                                            <span className="cb-chat-name">{s.platform === "instagram" ? "📷 " : ""}{s.displayName}</span>
                                            <span className={`cb-chat-time ${s.unread > 0 ? "unread" : ""}`}>{formatTime(s.lastMessageTime)}</span>
                                        </div>
                                        <div className="cb-chat-bottom">
                                            <span className="cb-chat-preview">{s.lastMessage}</span>
                                            {s.unread > 0 && <span className="cb-unread">{s.unread}</span>}
                                            <span className="cb-mode-icon">{s.mode === "bot" ? "🤖" : "👤"}</span>
                                        </div>
                                        {s.tags.length > 0 && (
                                            <div className="cb-chat-tags">
                                                {s.tags.map(t => (
                                                    <span key={t} className={`cb-tag cb-tag-${t}`}>
                                                        {t === "hot" ? "🔥 Hot Lead" : t === "followup" ? "📌 Follow-up" : t === "resolved" ? "✅ Resolved" : t === "website" ? "🌐 Website" : t === "dd" ? "🎬 DD" : t === "staycation" ? "🏡 Staycation" : "🆕 New"}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel */}
                <div className={`cb-right ${!mobileShowChat ? "cb-right-inactive" : ""}`}>
                    {!active ? (
                        <div className="cb-empty">
                            <div className="cb-empty-icon">💬</div>
                            <h2>Galaxia Chat Dashboard</h2>
                            <p>Select a conversation from the left to view messages. Toggle between bot and human mode for each chat.</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="cb-chat-header">
                                <div className="cb-header-left">
                                    <button className="cb-btn-back" onClick={goBack} style={mobileShowChat ? { display: "block" } : undefined}>←</button>
                                    <div className="cb-header-avatar">{active.displayName.charAt(0)}</div>
                                    <div>
                                        <div className="cb-header-name">{active.displayName} · {active.sessionId}</div>
                                        <div className="cb-header-sub">{PHONE_NUMBERS[active.phoneNumberKey]?.icon} {PHONE_NUMBERS[active.phoneNumberKey]?.label} · {active.platform} · {formatTime(active.lastMessageTime)}</div>
                                    </div>
                                </div>
                                <div className="cb-header-right">
                                    <div className="cb-tag-btns">
                                        {["hot", "followup", "resolved", "website"].map(t => (
                                            <button key={t} className={`cb-tag-btn ${active.tags.includes(t) ? `active-${t}` : ""}`} onClick={() => toggleTag(t)}>
                                                {t === "hot" ? "🔥 Hot" : t === "followup" ? "📌 Follow-up" : t === "website" ? "🌐 Website" : "✅ Resolved"}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="cb-mode-toggle" onClick={toggleMode}>
                                        <span className="cb-mode-lbl bot">🤖</span>
                                        <div className={`cb-toggle-track ${active.mode === "human" ? "human-mode" : "bot-mode"}`}>
                                            <div className="cb-toggle-thumb" />
                                        </div>
                                        <span className="cb-mode-lbl human">👤</span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="cb-messages">
                                {chatMsgs.map((msg, i) => {
                                    const showDate = i === 0 || chatMsgs[i - 1].time.toDateString() !== msg.time.toDateString();
                                    const isUser = msg.role === "user";
                                    const rowClass = isUser ? "user" : msg.isHuman ? "admin" : "bot";
                                    const senderLabel = isUser ? "Customer" : msg.isHuman ? "Admin" : "Bot";
                                    const senderClass = isUser ? "user-label" : msg.isHuman ? "human-label" : "bot-label";
                                    return (
                                        <div key={i}>
                                            {showDate && (
                                                <div className="cb-date-divider">
                                                    <span>{msg.time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                                                </div>
                                            )}
                                            <div className={`cb-msg-row ${rowClass}`}>
                                                <div className="cb-bubble">
                                                    <div dangerouslySetInnerHTML={{ __html: formatMsg(msg.message) }} />
                                                    <div className="cb-msg-meta">
                                                        <span className={`cb-msg-sender ${senderClass}`}>{senderLabel}</span>
                                                        <span className="cb-msg-time">{msg.time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={msgEndRef} />
                            </div>

                            {/* Input / Bot Banner */}
                            {active.mode === "human" ? (
                                <div className="cb-input-area">
                                    <input
                                        value={msgInput}
                                        onChange={e => setMsgInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                                        placeholder="Type a message..."
                                    />
                                    <button className="cb-btn-send" onClick={sendMessage}>➤</button>
                                </div>
                            ) : (
                                <div className="cb-bot-banner">
                                    <p>🤖 Bot is handling this conversation · <a onClick={toggleMode}>Switch to Human</a></p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}
