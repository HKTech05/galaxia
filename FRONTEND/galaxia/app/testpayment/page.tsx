"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { loadRazorpayScript } from "../../lib/razorpay";

interface SystemLog {
    time: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
}

export default function TestPaymentPage() {
    // Form state
    const [name, setName] = useState("Galaxia Tester");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Payment & status state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
    const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>("idle");
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [razorpayPaymentId, setRazorpayPaymentId] = useState<string | null>(null);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { time, message, type }]);
    };

    // Cleanup polling timer on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // Polling function to check backend DB status
    const startPollingStatus = (paymentId: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        addLog(`Started real-time backend status polling for Payment ID: ${paymentId}`, "info");

        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/payments/test-status/${paymentId}`);
                if (!res.ok) return;

                const data = await res.json();
                setPaymentStatus(data.status);
                setPaymentVerified(data.verified);

                if (data.razorpayPaymentId) {
                    setRazorpayPaymentId(data.razorpayPaymentId);
                }

                if (data.verified && data.status === "success") {
                    addLog(`🎉 BACKEND CONFIRMED! System status turned TRUE! (Razorpay Pay ID: ${data.razorpayPaymentId || "Captured"})`, "success");
                    addLog(`Email confirmation automatically triggered by backend to ${data.customerEmail}`, "success");
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setIsSubmitting(false);
                } else if (data.status === "failed") {
                    addLog(`❌ Backend recorded payment failure.`, "error");
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setIsSubmitting(false);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);
    };

    const handleInitiatePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !phone) {
            alert("Please fill in Name, Email, and Phone.");
            return;
        }

        setIsSubmitting(true);
        setLogs([]);
        setPaymentVerified(false);
        setPaymentStatus("initiating");
        setActivePaymentId(null);
        setRazorpayPaymentId(null);

        addLog("1. Initializing 1 INR Test Payment Intent on backend...", "info");

        try {
            // Load Razorpay Checkout Script
            await loadRazorpayScript();

            // 1. Create order & track payment intent on backend
            const orderRes = await fetch("/api/payments/test-create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: name,
                    customerEmail: email,
                    customerPhone: phone,
                }),
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json();
                throw new Error(errData.error || "Failed to create order");
            }

            const { orderId, paymentId, keyId } = await orderRes.json();
            setActivePaymentId(paymentId);

            addLog(`2. Created Order: ${orderId} | Payment ID: ${paymentId}`, "info");
            addLog(`3. System status in DB set to verified = FALSE (waiting for payment)...`, "warning");

            // Start polling status in background immediately
            startPollingStatus(paymentId);

            // 2. Open Razorpay Modal using Digital Diaries keyId
            addLog("4. Opening Razorpay Checkout Modal...", "info");

            const rzp = new (window as any).Razorpay({
                key: keyId,
                order_id: orderId,
                amount: 100, // 1 INR in paise
                currency: "INR",
                name: "Digital Diaries (Test Payment)",
                description: "1 INR System Resiliency Test Transaction",
                image: "/logo.png",
                prefill: {
                    name,
                    email,
                    contact: phone,
                },
                theme: {
                    color: "#4F46E5",
                },
                handler: async function (response: any) {
                    addLog(`5. Razorpay Modal completed on client side! Payment ID: ${response.razorpay_payment_id}`, "info");
                    addLog("6. Client signature verification in progress...", "info");

                    // Send verification to backend
                    try {
                        const verifyRes = await fetch("/api/payments/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                type: "dd",
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.verified) {
                            addLog("Client-side signature verified. Waiting for backend status to switch to TRUE...", "info");
                        }
                    } catch (err) {
                        addLog("Client signature check failed, but backend Webhook will still process payment!", "warning");
                    }
                },
                modal: {
                    ondismiss: function () {
                        addLog("Razorpay modal closed by user.", "warning");
                        setIsSubmitting(false);
                    },
                },
            });

            rzp.on("payment.failed", function (failedResp: any) {
                addLog(`Payment failed: ${failedResp?.error?.description || "Failed"}`, "error");
                setIsSubmitting(false);
            });

            rzp.open();
        } catch (err: any) {
            addLog(`Error: ${err.message || "Failed to initiate payment"}`, "error");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col justify-between p-4 md:p-8 font-manrope selection:bg-[#BA9731] selection:text-black">
            {/* Top Navigation */}
            <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-xl md:text-2xl font-bold tracking-widest text-[#BA9731] font-serif">GALAXIA</span>
                    <span className="text-xs bg-[#4F46E5]/20 text-[#818CF8] px-2.5 py-0.5 rounded-full border border-[#4F46E5]/40 font-mono">
                        System Test Mode
                    </span>
                </div>
                <Link
                    href="/"
                    className="text-xs text-gray-400 hover:text-white transition-colors duration-200"
                >
                    ← Back to Website
                </Link>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto w-full py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Information & Form */}
                <div className="lg:col-span-6 space-y-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            Backend-Verified Payment Test
                        </h1>
                        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                            This page tests our resilient payment verification system. 
                            A <span className="text-[#BA9731] font-semibold">₹1.00 INR transaction</span> is processed via the <span className="text-[#818CF8] font-semibold">Digital Diaries</span> Razorpay account.
                        </p>
                    </div>

                    {/* How It Works Alert Box */}
                    <div className="bg-[#18181C] border border-[#BA9731]/30 rounded-xl p-4 md:p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#BA9731]/10 rounded-full blur-2xl pointer-events-none"></div>
                        <h2 className="text-sm font-semibold text-[#BA9731] flex items-center gap-2">
                            🛡️ How Backend Verification Works
                        </h2>
                        <ul className="text-xs text-gray-300 space-y-2 leading-normal list-disc list-inside">
                            <li>Before payment, a unique Payment ID is stored in the DB as <code className="bg-black/50 text-amber-300 px-1 py-0.5 rounded font-mono">verified = false</code>.</li>
                            <li>When payment completes on Razorpay, our backend Webhook catches the <code className="bg-black/50 text-indigo-300 px-1 py-0.5 rounded font-mono">order.paid</code> event directly.</li>
                            <li>Even if you **close the browser tab** or lose network right after paying, the backend automatically flips <code className="bg-black/50 text-emerald-300 px-1 py-0.5 rounded font-mono">verified = true</code> and sends your email!</li>
                        </ul>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleInitiatePayment} className="bg-[#18181C] border border-white/10 rounded-xl p-5 space-y-4 shadow-xl">
                        <h3 className="text-sm font-semibold text-gray-200 border-b border-white/10 pb-3">
                            Tester Customer Details
                        </h3>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA9731] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address (To Receive Test Voucher)</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA9731] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="9876543210"
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA9731] transition-colors"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-[#BA9731] to-[#DACE84] hover:from-[#A88628] hover:to-[#C8BB73] text-black font-semibold text-sm py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                        <span>Processing ₹1.00 Test Payment...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Pay ₹1.00 (Digital Diaries Razorpay)</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Real-Time Console Monitor */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Live System Status Card */}
                    <div className="bg-[#18181C] border border-white/10 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                📡 System Status Monitor
                            </h2>
                            {activePaymentId && (
                                <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                    Polling Status...
                                </span>
                            )}
                        </div>

                        {/* Status Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0F0F12] p-3 rounded-lg border border-white/5">
                                <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Backend Verified</span>
                                <span className={`text-sm font-bold mt-1 block font-mono ${
                                    paymentVerified === true 
                                        ? "text-emerald-400" 
                                        : paymentVerified === false 
                                        ? "text-amber-400" 
                                        : "text-gray-500"
                                }`}>
                                    {paymentVerified === true ? "TRUE (Verified ✅)" : paymentVerified === false ? "FALSE (Waiting ⏳)" : "Idle"}
                                </span>
                            </div>

                            <div className="bg-[#0F0F12] p-3 rounded-lg border border-white/5">
                                <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Transaction Status</span>
                                <span className={`text-sm font-bold mt-1 block capitalize font-mono ${
                                    paymentStatus === "success" 
                                        ? "text-emerald-400" 
                                        : paymentStatus === "failed" 
                                        ? "text-rose-400" 
                                        : "text-gray-400"
                                }`}>
                                    {paymentStatus}
                                </span>
                            </div>
                        </div>

                        {activePaymentId && (
                            <div className="bg-[#0F0F12] p-3 rounded-lg border border-white/5 text-xs font-mono space-y-1 text-gray-300">
                                <div><span className="text-gray-500">Payment ID:</span> {activePaymentId}</div>
                                {razorpayPaymentId && (
                                    <div><span className="text-gray-500">Razorpay Pay ID:</span> {razorpayPaymentId}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Console Activity Log */}
                    <div className="bg-[#18181C] border border-white/10 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-xs font-semibold text-gray-300 font-mono">
                                REAL-TIME ACTIVITY LOGS
                            </h3>
                            <button
                                onClick={() => setLogs([])}
                                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Clear Logs
                            </button>
                        </div>

                        <div className="bg-[#0A0A0C] border border-white/5 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-2">
                            {logs.length === 0 ? (
                                <p className="text-gray-600 italic text-center py-8">
                                    No activity yet. Click "Pay ₹1.00" to start test.
                                </p>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                                        <span className="text-gray-600 shrink-0 text-[10px] pt-0.5">[{log.time}]</span>
                                        <span className={
                                            log.type === "success" 
                                                ? "text-emerald-400" 
                                                : log.type === "error" 
                                                ? "text-rose-400" 
                                                : log.type === "warning" 
                                                ? "text-amber-300" 
                                                : "text-gray-300"
                                        }>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Resiliency Test Instructions Banner */}
                    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 text-xs text-indigo-200 space-y-1.5">
                        <span className="font-semibold text-indigo-400 block">🧪 Want to simulate a network crash or browser close?</span>
                        <p className="leading-relaxed text-gray-300">
                            As soon as you complete the ₹1 payment inside the Razorpay modal, **close this browser tab immediately**. 
                            Our backend Webhook will receive the event directly from Razorpay, update the DB status to TRUE, and send your confirmation email without needing the browser to stay open!
                        </p>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto w-full border-t border-white/10 pt-4 text-center text-xs text-gray-500">
                Galaxia Resorts — Independent Payment Authentication Test System (Isolated Environment)
            </footer>
        </div>
    );
}
