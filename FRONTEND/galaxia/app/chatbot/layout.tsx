"use client";

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="chatbot-root" style={{ minHeight: '100vh' }}>
            {children}
        </div>
    );
}
