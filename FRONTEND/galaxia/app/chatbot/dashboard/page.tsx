"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "../chatbot.css";

/* ═══════════════════════════════════════════════════════
   CHATBOT DASHBOARD — WhatsApp-style chat UI
   Route: /chatbot/dashboard
   
   Connected to the chatbot bot server via REST API.
   The BOT_API_BASE points to the bot server proxied through Vercel.
   Uses fast REST polling (5s) for real-time updates.
   ═══════════════════════════════════════════════════════ */

// Bot server — proxied through Vercel rewrites (/bot/* → EC2:4001/*)
const BOT_API_BASE = "/bot";

interface PhoneNumber { id: string; label: string; icon: string; color: string; iconType: "whatsapp" | "instagram" | "website" | "all" }

const PHONE_NUMBERS: Record<string, PhoneNumber> = {
    digital_diaries: { id: "1117204771469353", label: "Digital Diaries", icon: "🎬", color: "#f59e0b", iconType: "whatsapp" },
    dd_instagram: { id: "instagram", label: "DD Instagram", icon: "📷", color: "#e1306c", iconType: "instagram" },
    wa_amstelnest: { id: "1265812873275552", label: "Amstel Nest WA", icon: "🏡", color: "#06b6d4", iconType: "whatsapp" },
    website: { id: "website", label: "Website", icon: "🌐", color: "#10b981", iconType: "website" },
    ig_ambrose: { id: "ig_ambrose", label: "Ambrose IG", icon: "📷", color: "#8b5cf6", iconType: "instagram" },
    ig_amstelnest: { id: "ig_amstelnest", label: "Amstelnest IG", icon: "📷", color: "#06b6d4", iconType: "instagram" },
    ig_laparaiso: { id: "ig_laparaiso", label: "La Paraiso IG", icon: "📷", color: "#f97316", iconType: "instagram" },
    ig_mountview: { id: "ig_mountview", label: "Mount View IG", icon: "📷", color: "#84cc16", iconType: "instagram" },
    ig_heavenlyvilla: { id: "ig_heavenlyvilla", label: "Heavenly Villa IG", icon: "📷", color: "#ec4899", iconType: "instagram" },
    ig_hillview: { id: "ig_hillview", label: "Hill View IG", icon: "📷", color: "#14b8a6", iconType: "instagram" },
};

function PlatformIcon({ type, size = 16, color }: { type: string; size?: number; color?: string }) {
    if (type === "whatsapp") return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "#25D366"}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );
    if (type === "instagram") return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "#E1306C"}>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
    );
    if (type === "website") return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "#10b981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    );
    // "all" fallback
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "#8696a0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    );
}

// DB session shape from the bot server
interface DbChatSession {
    id: number;
    session_id: string;
    customer_phone: string;
    display_name: string;
    phone_number_id: string;
    bot_type: string;
    platform: string;
    is_human_active: boolean;
    tags: string[];
    unread_count: number;
    last_message: string | null;
    last_message_at: string | null;
    created_at: string;
    updated_at: string;
}

interface DbChatMessage {
    id: number;
    session_id: string;
    role: "user" | "assistant";
    message: string;
    is_human: boolean;
    created_at: string;
}

// Unified session shape used by the UI (merges WhatsApp + website human requests)
interface ChatSession {
    id: string;
    sessionId: string;
    displayName: string;
    phoneNumberKey: string;
    mode: "bot" | "human";
    tags: string[];
    unread: number;
    lastMessage: string;
    lastMessageTime: Date;
    platform: string;
    // Keep DB session_id for API calls
    dbSessionId?: string;
}

interface Message {
    role: "user" | "assistant";
    message: string;
    time: Date;
    isHuman: boolean;
}

function formatTime(d: Date) {
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMsg(text: string) {
    if (!text || !text.trim()) return '<em style="opacity:0.5">(Empty message)</em>';
    return text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

// Map DB session → UI session
function dbToUiSession(db: DbChatSession): ChatSession {
    // Route Instagram sessions to their own tab based on phone_number_id
    const isInstagram = db.platform === "instagram";
    let phoneNumberKey = "digital_diaries";

    if (isInstagram) {
        // Map IG bot phone_number_ids to their dashboard tab keys
        const igPhoneMap: Record<string, string> = {
            ig_ambrose: "ig_ambrose",
            ig_amstelnest: "ig_amstelnest",
            ig_laparaiso: "ig_laparaiso",
            ig_mountview: "ig_mountview",
            ig_heavenlyvilla: "ig_heavenlyvilla",
            ig_hillview: "ig_hillview",
            instagram: "dd_instagram",
        };
        phoneNumberKey = igPhoneMap[db.phone_number_id] || "dd_instagram";
    } else if (db.phone_number_id === "1265812873275552" || db.bot_type === "amstel_nest") {
        // Amstel Nest WhatsApp
        phoneNumberKey = "wa_amstelnest";
    }

    return {
        id: db.session_id,
        sessionId: db.customer_phone,
        displayName: db.display_name || db.customer_phone,
        phoneNumberKey,
        mode: db.is_human_active ? "human" : "bot",
        tags: db.tags || [],
        unread: db.unread_count || 0,
        lastMessage: db.last_message || "",
        lastMessageTime: db.last_message_at ? new Date(db.last_message_at) : new Date(db.created_at),
        platform: db.platform || "whatsapp",
        dbSessionId: db.session_id,
    };
}

function dbToUiMessage(db: DbChatMessage): Message {
    return {
        role: db.role,
        message: db.message,
        time: new Date(db.created_at),
        isHuman: db.is_human,
    };
}

const DEFAULT_PASSWORDS: Record<string, string> = { owner: "owner123", stay123: "stay123", staycation1: "stay123", staycation2: "stay123", ddadmin: "dd123", igadmin: "ig123" };
const ACCOUNTS = [
    { key: "owner", label: "Owner", access: "All Numbers" },
    { key: "stay123", label: "Staycation Call Manager", access: "Staycation Chatbots" },
    { key: "staycation1", label: "Staycation 1", access: "Staycation Chatbots" },
    { key: "staycation2", label: "Staycation 2", access: "Staycation 2" },
    { key: "ddadmin", label: "DD Admin", access: "Digital Diaries" },
    { key: "igadmin", label: "IG Admin", access: "All IG Bots" },
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
    const [msgFilter, setMsgFilter] = useState<"all" | "human" | "collab">("all");
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [msgInput, setMsgInput] = useState("");
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [connected, setConnected] = useState(false);
    const [sending, setSending] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const msgEndRef = useRef<HTMLDivElement>(null);

    // ─── Auth check ───
    useEffect(() => {
        setMounted(true);
        try {
            const s = JSON.parse(localStorage.getItem("chatbot_session") || "null");
            if (!s) { router.replace("/chatbot"); return; }
            setSession(s);
        } catch { router.replace("/chatbot"); }
    }, [router]);

    // ─── Load chats from bot server ───
    const loadChats = useCallback(async () => {
        try {
            const res = await fetch(`${BOT_API_BASE}/api/chats`);
            if (!res.ok) return;
            const data: DbChatSession[] = await res.json();
            const whatsappSessions = data.map(dbToUiSession);

            setSessions(prev => {
                const webSessions = prev.filter(s => s.id.startsWith("web_"));
                return [...whatsappSessions, ...webSessions];
            });
        } catch (err) {
            console.error("Failed to load chats from bot server:", err);
        }
    }, []);

    // ─── Load website human requests ───
    const fetchHumanRequests = useCallback(async () => {
        if (!session) return;
        try {
            const res = await fetch("/api/human-requests");
            if (!res.ok) return;
            const data = await res.json();

            const nums = session.assignedNumbers || [];
            const isOwner = session.role === "owner" || session.role === "developer" || (nums.includes("staycation_1") && nums.includes("digital_diaries"));
            const canSeeCelebration = isOwner || nums.includes("digital_diaries");
            const canSeeStaycation = isOwner || nums.includes("staycation_1") || nums.includes("staycation_2");

            const websiteSessions: ChatSession[] = data
                .filter((req: any) => {
                    if (req.source === "celebration") return canSeeCelebration;
                    if (req.source === "staycation") return canSeeStaycation;
                    return isOwner;
                })
                .map((req: any) => ({
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
    }, [session]);

    // ─── Real-time updates via fast REST polling ───
    // (Vercel serverless doesn't support WebSocket, so we poll the REST API)
    const activeChatRef = useRef<string | null>(null);
    activeChatRef.current = activeChat;

    useEffect(() => {
        if (!session) return;

        // Initial load
        loadChats();
        fetchHumanRequests();
        setConnected(true); // Mark connected once we start polling

        // Fast polling for chat list (every 5s)
        const chatPoll = setInterval(() => {
            loadChats();
        }, 5000);

        // Refresh active chat messages (every 5s)
        const msgPoll = setInterval(async () => {
            const chatId = activeChatRef.current;
            if (!chatId || chatId.startsWith("web_")) return;
            try {
                const res = await fetch(`${BOT_API_BASE}/api/chats/${chatId}`);
                if (!res.ok) return;
                const data = await res.json();
                const uiMessages = (data.messages || []).map(dbToUiMessage);
                setMessages(prev => {
                    // Only update if message count changed (avoid re-renders)
                    if (prev[chatId]?.length === uiMessages.length) return prev;
                    return { ...prev, [chatId]: uiMessages };
                });
            } catch { /* ignore */ }
        }, 5000);

        // Human requests poll (every 30s)
        const hrPoll = setInterval(fetchHumanRequests, 30000);

        return () => {
            clearInterval(chatPoll);
            clearInterval(msgPoll);
            clearInterval(hrPoll);
        };
    }, [session, loadChats, fetchHumanRequests]);

    // ─── Auto-scroll messages ───
    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat, messages]);

    // ─── Close dropdown on click outside ───
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownOpen]);

    const allowed = (session?.role === "owner" || session?.role === "developer") ? Object.keys(PHONE_NUMBERS) : (session?.assignedNumbers || Object.keys(PHONE_NUMBERS));

    // Memoize filtered sessions for extreme UI speed & low GPU/CPU usage
    const filteredSessions = useCallback((t: string) => {
        return sessions.filter(s => {
            if (s.id.startsWith("1015208551685641")) return false;
            if (["917355630009", "919867677811", "7355630009", "9867677811"].includes(s.sessionId)) return false;

            if (!allowed.includes(s.phoneNumberKey)) return false;
            // Hide Instagram sessions from the "All" tab — they have their own tab
            if (t === "all" && (s.phoneNumberKey === "dd_instagram" || s.phoneNumberKey.startsWith("ig_") || s.phoneNumberKey === "wa_amstelnest")) return false;
            if (t !== "all" && s.phoneNumberKey !== t) return false;
            // Message type filter
            if (msgFilter === "human" && s.mode !== "human") return false;
            if (msgFilter === "collab" && !s.tags.includes("collab")) return false;
            if (search) {
                const q = search.toLowerCase();
                return s.displayName.toLowerCase().includes(q) || s.sessionId.includes(q) || s.lastMessage.toLowerCase().includes(q);
            }
            return true;
        }).sort((a, b) => {
            // Pin human-mode chats to top
            if (a.mode === "human" && b.mode !== "human") return -1;
            if (a.mode !== "human" && b.mode === "human") return 1;
            return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
    }, [sessions, allowed, search, msgFilter]);

    // ─── Open chat — load messages from API ───
    const openChat = async (id: string) => {
        setActiveChat(id);
        setMobileShowChat(true);

        const chat = sessions.find(s => s.id === id);
        if (!chat) return;

        // Mark read locally
        setSessions(prev => prev.map(s => s.id === id ? { ...s, unread: 0 } : s));

        // For WhatsApp chats, load messages from bot server
        if (chat.dbSessionId) {
            try {
                const res = await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    const uiMessages = (data.messages || []).map(dbToUiMessage);
                    setMessages(prev => ({ ...prev, [id]: uiMessages }));
                }

                // Mark read on server
                await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}/read`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                });
            } catch (err) {
                console.error("Failed to load chat messages:", err);
            }
        }
    };

    // ─── Mark all visible bot chats as read ───
    const handleMarkAllAsRead = async () => {
        const visibleSessions = filteredSessions(tab);
        const toMark = visibleSessions.filter(s => s.mode === "bot" && s.unread > 0);
        if (toMark.length === 0) return;

        // Optimistic UI update
        const idsToMark = new Set(toMark.map(s => s.id));
        setSessions(prev => prev.map(s => idsToMark.has(s.id) ? { ...s, unread: 0 } : s));

        // Background API calls
        await Promise.all(toMark.map(async (chat) => {
            if (chat.dbSessionId) {
                try {
                    await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}/read`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: "{}",
                    });
                } catch (e) {
                    console.error("Failed to mark read:", e);
                }
            }
        }));
    };

    // ─── Toggle mode — call bot server API ───
    const toggleMode = async () => {
        if (!activeChat) return;
        const chat = sessions.find(s => s.id === activeChat);
        if (!chat) return;

        const newMode = chat.mode === "bot" ? "human" : "bot";

        // Optimistic update
        setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, mode: newMode } : s));

        if (chat.dbSessionId) {
            try {
                await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}/mode`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_human_active: newMode === "human" }),
                });
            } catch (err) {
                console.error("Failed to toggle mode:", err);
                // Revert
                setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, mode: chat.mode } : s));
            }
        }
    };

    // ─── Toggle tag — call bot server API ───
    const toggleTag = async (tag: string) => {
        if (!activeChat) return;
        const chat = sessions.find(s => s.id === activeChat);
        if (!chat) return;

        const newTags = chat.tags.includes(tag) ? chat.tags.filter(t => t !== tag) : [...chat.tags, tag];

        // Optimistic update
        setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, tags: newTags } : s));

        if (chat.dbSessionId) {
            try {
                await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}/tags`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tags: newTags }),
                });
            } catch (err) {
                console.error("Failed to update tags:", err);
                setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, tags: chat.tags } : s));
            }
        }
    };

    // ─── Send message — call bot server API (sends to WhatsApp too) ───
    const sendMessage = async () => {
        if (!msgInput.trim() || !activeChat || sending) return;
        const text = msgInput.trim();
        const chat = sessions.find(s => s.id === activeChat);
        if (!chat) return;

        setMsgInput("");
        setSending(true);

        if (chat.dbSessionId) {
            try {
                await fetch(`${BOT_API_BASE}/api/chats/${chat.dbSessionId}/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text }),
                });
                // Polling will pick up the new message
            } catch (err) {
                console.error("Failed to send message:", err);
                setMsgInput(text); // Restore on failure
            }
        } else {
            // Website human requests — local only
            const newMsg: Message = { role: "assistant", message: text, time: new Date(), isHuman: true };
            setMessages(prev => ({ ...prev, [activeChat]: [...(prev[activeChat] || []), newMsg] }));
            setSessions(prev => prev.map(s => s.id === activeChat ? { ...s, lastMessage: text, lastMessageTime: new Date() } : s));
        }

        setSending(false);
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
                    <span className="cb-role-badge">{session.role === "owner" || session.role === "developer" ? (session.role === "developer" ? "Developer" : "Owner") : session.displayName}</span>
                </div>
                <div className="cb-topbar-right">
                    <div className="cb-conn-status">
                        <div className="cb-conn-dot" style={{ background: connected ? "#00e676" : "#8696a0" }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }}>
                            {connected ? "Connected" : "Connecting…"}
                        </span>
                    </div>
                    <button className="cb-btn-settings" onClick={() => setShowSettings(true)} title="Settings">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button className="cb-btn-logout" onClick={handleLogout}>Log Out</button>
                </div>
            </header>

            <div className="cb-main">
                {/* Left Panel */}
                <div className={`cb-left ${mobileShowChat ? "hidden" : ""}`}>
                    <div className="cb-tabs" style={{ padding: "8px 12px", position: "relative" }} ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--cb-border)",
                                background: "var(--cb-bg)",
                                color: "var(--cb-text)",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                outline: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <PlatformIcon type={tab === "all" ? "all" : (PHONE_NUMBERS[tab]?.iconType || "all")} size={16} />
                                <span>{tab === "all" ? "All" : PHONE_NUMBERS[tab]?.label || tab}</span>
                                {(() => { const u = filteredSessions(tab).reduce((s, c) => s + c.unread, 0); return u > 0 ? <span style={{ background: "#25D366", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{u}</span> : null; })()}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {dropdownOpen && (
                            <div style={{
                                position: "absolute", top: "100%", left: 12, right: 12, zIndex: 100,
                                background: "var(--cb-bg)", border: "1px solid var(--cb-border)", borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxHeight: 320, overflowY: "auto",
                            }}>
                                <button
                                    onClick={() => { setTab("all"); setDropdownOpen(false); }}
                                    style={{
                                        width: "100%", padding: "9px 14px", border: "none", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: tab === "all" ? 700 : 500,
                                        background: tab === "all" ? "var(--cb-active)" : "transparent", color: "var(--cb-text)",
                                        transition: "background 0.12s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--cb-hover)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = tab === "all" ? "var(--cb-active)" : "transparent")}
                                >
                                    <PlatformIcon type="all" size={16} />
                                    <span style={{ flex: 1, textAlign: "left" }}>All</span>
                                    {(() => { const u = filteredSessions("all").reduce((s, c) => s + c.unread, 0); return u > 0 ? <span style={{ background: "#25D366", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{u}</span> : null; })()}
                                </button>
                                {allowed.map(key => {
                                    const num = PHONE_NUMBERS[key];
                                    if (!num) return null;
                                    const u = filteredSessions(key).reduce((s, c) => s + c.unread, 0);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => { setTab(key); setDropdownOpen(false); }}
                                            style={{
                                                width: "100%", padding: "9px 14px", border: "none", cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: tab === key ? 700 : 500,
                                                background: tab === key ? "var(--cb-active)" : "transparent", color: "var(--cb-text)",
                                                transition: "background 0.12s",
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "var(--cb-hover)")}
                                            onMouseLeave={e => (e.currentTarget.style.background = tab === key ? "var(--cb-active)" : "transparent")}
                                        >
                                            <PlatformIcon type={num.iconType} size={16} color={num.color} />
                                            <span style={{ flex: 1, textAlign: "left" }}>{num.label}</span>
                                            {u > 0 && <span style={{ background: "#25D366", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{u}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="cb-search">
                        <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 4, padding: "6px 12px", borderBottom: "1px solid var(--cb-border)" }}>
                        {(["all", "human", "collab"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setMsgFilter(f)}
                                style={{
                                    flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer",
                                    fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase",
                                    transition: "all 0.15s",
                                    background: msgFilter === f
                                        ? f === "human" ? "rgba(220,38,38,0.12)" : f === "collab" ? "rgba(139,92,246,0.12)" : "rgba(0,168,132,0.12)"
                                        : "transparent",
                                    color: msgFilter === f
                                        ? f === "human" ? "#dc2626" : f === "collab" ? "#8b5cf6" : "#00a884"
                                        : "var(--cb-text-dim)",
                                }}
                            >
                                {f === "all" ? "All" : f === "human" ? "👤 Human" : "🤝 Collab"}
                            </button>
                        ))}
                    </div>
                    {(() => {
                        const unreadBotCount = filteredSessions(tab).filter(s => s.mode === "bot" && s.unread > 0).length;
                        if (unreadBotCount > 0) {
                            return (
                                <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--cb-border)", display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        style={{
                                            background: "none", border: "none", color: "#00a884", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, transition: "background 0.2s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,168,132,0.1)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 18l4 4L19 12" style={{opacity: 0.5}} /></svg>
                                        Mark {unreadBotCount} Bot {unreadBotCount === 1 ? "Chat" : "Chats"} as Read
                                    </button>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <div className="cb-chatlist">
                        {(() => {
                            const list = filteredSessions(tab);
                            if (list.length === 0) {
                                return (
                                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cb-text-dim)" }}>
                                        <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
                                        <p style={{ fontSize: 13, fontWeight: 600 }}>No conversations found</p>
                                    </div>
                                );
                            }
                            return list.slice(0, 100).map(s => {
                            // Deterministic dark hue per phone number (WhatsApp dark mode style)
                            const AVATAR_PAIRS = [
                                { bg: "#1a3a36", fg: "#00d26a" },
                                { bg: "#1a2d44", fg: "#53bdeb" },
                                { bg: "#3d3524", fg: "#ffd279" },
                                { bg: "#3d302a", fg: "#ffb8a0" },
                                { bg: "#2a1a3d", fg: "#c4a0ff" },
                                { bg: "#1a3636", fg: "#00bfa5" },
                                { bg: "#3d1a2a", fg: "#ff8fa3" },
                                { bg: "#2d3a1a", fg: "#b8e655" },
                            ];
                            const colorIdx = s.sessionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PAIRS.length;
                            const { bg: avatarBg, fg: avatarFg } = AVATAR_PAIRS[colorIdx];
                            return (
                                <div key={s.id} className={`cb-chat-item ${activeChat === s.id ? "active" : ""}`} onClick={() => openChat(s.id)}>
                                    <div className="cb-avatar" style={{ background: avatarBg, border: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill={avatarFg}><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                                    </div>
                                    <div className="cb-chat-info">
                                        <div className="cb-chat-top">
                                            <span className="cb-chat-name">{s.platform === "instagram" ? "📷 " : ""}{s.displayName}</span>
                                            <span className={`cb-chat-time ${s.unread > 0 ? "unread" : ""}`}>{formatTime(s.lastMessageTime)}</span>
                                        </div>
                                        <div className="cb-chat-bottom">
                                            <span className="cb-chat-preview">{s.lastMessage}</span>
                                            {s.unread > 0 && <span className="cb-unread">{s.unread}</span>}
                                            <span style={{
                                                fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 4,
                                                textTransform: "uppercase" as const, letterSpacing: 0.5, marginLeft: 6, flexShrink: 0,
                                                background: s.mode === "human" ? "rgba(220,38,38,0.12)" : "rgba(245,158,11,0.12)",
                                                color: s.mode === "human" ? "#dc2626" : "#f59e0b",
                                                animation: s.mode === "human" ? "pulse 2s infinite" : "none"
                                            }}>
                                                {s.mode === "human" ? "HUMAN" : "BOT"}
                                            </span>
                                            {s.tags.includes("booked") && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
                                                    textTransform: "uppercase" as const, letterSpacing: 0.5, marginLeft: 4, flexShrink: 0,
                                                    background: "rgba(16,185,129,0.12)", color: "#059669",
                                                }}>
                                                    ✓ BOOKED
                                                </span>
                                            )}
                                        </div>
                                        {s.tags.length > 0 && (
                                            <div className="cb-chat-tags">
                                                {s.tags.map(t => (
                                                    <span key={t} className={`cb-tag cb-tag-${t}`}>
                                                        {t === "hot" ? "🔥 Hot Lead" : t === "followup" ? "📌 Follow-up" : t === "resolved" ? "✅ Resolved" : t === "booked" ? "🎫 Booked" : t === "website" ? "🌐 Website" : t === "dd" ? "🎬 DD" : t === "staycation" ? "🏡 Staycation" : t === "collab" ? "🤝 Collab" : "🆕 New"}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        });
                    })()}
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
                                        <div className="cb-header-name">{active.displayName}</div>
                                        <div className="cb-header-sub">{PHONE_NUMBERS[active.phoneNumberKey]?.icon} {PHONE_NUMBERS[active.phoneNumberKey]?.label} · {active.platform} · {formatTime(active.lastMessageTime)}</div>
                                    </div>
                                </div>
                                <div className="cb-header-right">
                                    <div className="cb-tag-btns">
                                        {["hot", "followup", "resolved"].map(t => (
                                            <button key={t} className={`cb-tag-btn ${active.tags.includes(t) ? `active-${t}` : ""}`} onClick={() => toggleTag(t)}>
                                                {t === "hot" ? "🔥 Hot" : t === "followup" ? "📌 Follow-up" : "✅ Resolved"}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="cb-mode-toggle" onClick={toggleMode}>
                                        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: 0.5, background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>BOT</span>
                                        <div className={`cb-toggle-track ${active.mode === "human" ? "human-mode" : "bot-mode"}`}>
                                            <div className="cb-toggle-thumb" />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: 0.5, background: "rgba(220,38,38,0.12)", color: "#dc2626" }}>HUMAN</span>
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
                                        disabled={sending}
                                    />
                                    <button className="cb-btn-send" onClick={sendMessage} disabled={sending}>➤</button>
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
