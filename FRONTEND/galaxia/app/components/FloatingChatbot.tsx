"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function FloatingChatbot() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "bot" | "user", text: string }[]>([
        { role: "bot", text: "Hello! Assuming you are looking to book a beautiful stay for an upcoming celebration? 🥂" }
    ]);
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => setMounted(true), []);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/chatbot"))) return null;

    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { role: "bot", text: "Thank you for your message! Our team will get back to you shortly. In the meantime, feel free to browse our properties or call us directly." },
            ]);
        }, 1000);
    };

    // WhatsApp doodle pattern as inline SVG data URL (subtle icons)
    const doodleBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cstyle%3E.d%7Bfill:%23d4cfc6;opacity:0.25%7D%3C/style%3E%3C/defs%3E%3Ccircle class='d' cx='20' cy='20' r='3'/%3E%3Ccircle class='d' cx='80' cy='40' r='2'/%3E%3Ccircle class='d' cx='150' cy='25' r='3'/%3E%3Ccircle class='d' cx='40' cy='80' r='2'/%3E%3Ccircle class='d' cx='120' cy='90' r='3'/%3E%3Ccircle class='d' cx='180' cy='70' r='2'/%3E%3Ccircle class='d' cx='60' cy='140' r='3'/%3E%3Ccircle class='d' cx='100' cy='160' r='2'/%3E%3Ccircle class='d' cx='160' cy='150' r='3'/%3E%3Ccircle class='d' cx='30' cy='180' r='2'/%3E%3Crect class='d' x='55' y='15' width='6' height='4' rx='1'/%3E%3Crect class='d' x='135' y='55' width='6' height='4' rx='1'/%3E%3Crect class='d' x='15' y='110' width='6' height='4' rx='1'/%3E%3Crect class='d' x='95' y='110' width='6' height='4' rx='1'/%3E%3Crect class='d' x='170' y='120' width='6' height='4' rx='1'/%3E%3Crect class='d' x='45' y='55' width='4' height='6' rx='1'/%3E%3Crect class='d' x='115' y='35' width='4' height='6' rx='1'/%3E%3Crect class='d' x='75' y='175' width='4' height='6' rx='1'/%3E%3Crect class='d' x='145' y='180' width='4' height='6' rx='1'/%3E%3Cpath class='d' d='M10 50l3-3 3 3-3 3z'/%3E%3Cpath class='d' d='M170 40l3-3 3 3-3 3z'/%3E%3Cpath class='d' d='M90 70l3-3 3 3-3 3z'/%3E%3Cpath class='d' d='M50 170l3-3 3 3-3 3z'/%3E%3Cpath class='d' d='M130 170l3-3 3 3-3 3z'/%3E%3Cpath class='d' d='M185 160l2-2 2 2-2 2z'/%3E%3C/svg%3E")`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return (
        <>
            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-[70] w-[min(340px,calc(100vw-2rem))] sm:w-[380px] max-h-[70dvh] rounded-2xl shadow-2xl border border-[#d1d1d1] flex flex-col overflow-hidden animate-fade-in-up bg-[#efeae2]">
                    {/* WhatsApp-style teal header */}
                    <div className="bg-[#075e54] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DFE5E7] flex items-center justify-center overflow-hidden">
                                <svg className="w-6 h-6 text-[#075e54]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                            <div>
                                <p className="text-white font-semibold text-[15px] leading-tight">Galaxia Assistant</p>
                                <p className="text-[#8EBDB6] text-[11px]">online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors p-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages area with WhatsApp doodle wallpaper */}
                    <div
                        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
                        style={{ backgroundImage: doodleBg, backgroundColor: "#efeae2", backgroundRepeat: "repeat" }}
                    >
                        {/* Date chip */}
                        <div className="flex justify-center mb-2">
                            <span className="bg-white/80 text-[#54656f] text-[10.5px] font-medium px-3 py-1 rounded-lg shadow-sm">Today</span>
                        </div>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`relative max-w-[82%] px-3 py-1.5 text-[13.5px] leading-[1.35rem] shadow-sm
                                    ${msg.role === "user"
                                        ? "bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none"
                                        : "bg-white text-[#111b21] rounded-lg rounded-tl-none"
                                    }`}
                                >
                                    {/* WhatsApp tail */}
                                    {msg.role === "user" ? (
                                        <span className="absolute -right-2 top-0 w-0 h-0 border-t-[8px] border-t-[#d9fdd3] border-r-[8px] border-r-transparent" />
                                    ) : (
                                        <span className="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent" />
                                    )}
                                    <span>{msg.text}</span>
                                    <span className={`text-[10px] text-[#667781] ml-2 float-right mt-1.5 leading-none ${msg.role === "user" ? "flex items-center gap-0.5" : ""}`}>
                                        {timeStr}
                                        {msg.role === "user" && (
                                            <svg className="w-3.5 h-3.5 text-[#53bdeb] ml-0.5 inline-block" viewBox="0 0 16 11" fill="currentColor"><path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.14.458.458 0 0 0-.33.14l-.477.49a.497.497 0 0 0 0 .681l2.831 2.928a.613.613 0 0 0 .327.178.563.563 0 0 0 .33-.14l.432-.406 6.47-7.953a.46.46 0 0 0 .102-.33.5.5 0 0 0-.178-.356l-.294-.254z"/><path d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.38.178l-6.19 7.636-1.13-1.178-.477.49 1.95 2.012a.614.614 0 0 0 .327.178.563.563 0 0 0 .33-.14l.432-.406 6.47-7.953a.46.46 0 0 0 .101-.33.5.5 0 0 0-.178-.356l-.293-.254z" opacity=".4"/></svg>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* WhatsApp-style input bar */}
                    <div className="px-2 py-2 bg-[#f0f2f5] flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2 shadow-sm">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message"
                                className="flex-1 outline-none text-base text-[#111b21] placeholder-[#8696a0] font-normal"
                            />
                        </div>
                        <button onClick={handleSend} className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white flex items-center justify-center transition-colors shrink-0 shadow-sm">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* WhatsApp-style green floating button */}
            {mounted && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`fixed bottom-6 right-4 sm:right-6 z-[70] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen
                        ? "bg-[#54656f] text-white"
                        : "bg-[#25D366] text-white hover:bg-[#1fb855] hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)]"
                    }`}
                >
                    {isOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    )}
                </button>
            )}
        </>
    );
}
