"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, Bot, Sparkles, Loader2, MinusCircle, Maximize2 } from "lucide-react";

export default function FloatingChatbot() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "bot" | "user", text: string }[]>([
        { role: "bot", text: "Hello! Assuming you are looking to book a beautiful stay for an upcoming celebration? 🥂" }
    ]);

    // Do not show chatbot on admin pages
    if (pathname && pathname.startsWith("/admin")) return null;
    // Wait for client mount to avoid hydration mismatch
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isCelebration = pathname.startsWith("/celebration");
    // The original messages state was here, but the new code above already defines `messages`.
    // I will keep the new `messages` state and its initial value.
    // The original `messages` state was:
    // const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    //     { role: "bot", text: "Hi! 👋 Welcome to Galaxia. How can I help you today? I can assist with bookings, property information, or any questions." },
    // ]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        // Simulated bot response
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    text: "Thank you for your message! Our team will get back to you shortly. In the meantime, feel free to browse our properties or call us directly.",
                },
            ]);
        }, 1000);
    };

    return (
        <>
            {/* Chat window */}
            {isOpen && (
                <div className={`fixed bottom-24 right-4 sm:right-6 z-[70] w-[340px] sm:w-[380px] max-h-[500px] ${isCelebration ? "bg-[#1A1A1A] border-[#2A2A2A]" : "bg-white border-border-light"} rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-fade-in-up`}>
                    {/* Header */}
                    <div className={`${isCelebration ? "bg-gradient-to-r from-[#d87f82] to-[#9f353a]" : "bg-gradient-to-r from-antique-gold to-dark-gold"} px-5 py-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-cinzel text-sm font-semibold">Galaxia Assistant</p>
                                <p className="text-white/70 text-[10px] font-inter">Online • Typically replies instantly</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-3 max-h-[320px] ${isCelebration ? "bg-[#0D0D0D]" : "bg-soft-gray/30"}`}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-inter leading-relaxed ${msg.role === "user"
                                    ? isCelebration ? "bg-[#9f353a] text-white rounded-br-sm" : "bg-antique-gold text-white rounded-br-sm"
                                    : isCelebration ? "bg-[#1A1A1A] text-[#F2F2F2] border border-[#2A2A2A] rounded-bl-sm" : "bg-white text-text-primary border border-border-light rounded-bl-sm shadow-sm"
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className={`p-3 border-t ${isCelebration ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-border-light bg-white"}`}>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message..."
                                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-inter outline-none transition-colors 
                                    ${isCelebration
                                        ? "bg-[#0D0D0D] border border-[#333333] text-[#F2F2F2] placeholder-[#777777] focus:border-[#d87f82]"
                                        : "bg-soft-gray border border-border-light text-text-primary placeholder-text-muted focus:border-antique-gold"}`}
                            />
                            <button onClick={handleSend} className={`w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors shrink-0 
                                ${isCelebration ? "bg-[#9f353a] hover:bg-[#d87f82]" : "bg-antique-gold hover:bg-dark-gold"}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating button */}
            {mounted && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`fixed bottom-6 right-4 sm:right-6 z-[70] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen
                        ? isCelebration ? "bg-[#333333] text-white rotate-0" : "bg-text-primary text-white rotate-0"
                        : isCelebration
                            ? "bg-gradient-to-br from-[#d87f82] to-[#9f353a] text-white animate-bounce-subtle hover:shadow-[0_8px_30px_rgba(159,53,58,0.3)]"
                            : "bg-gradient-to-br from-antique-gold to-dark-gold text-white animate-bounce-subtle hover:shadow-[0_8px_30px_rgba(186,151,49,0.3)]"
                        }`}
                >
                    {isOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    )}
                </button>
            )}
        </>
    );
}
