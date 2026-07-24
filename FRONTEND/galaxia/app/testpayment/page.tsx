"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { loadRazorpayScript } from "../../lib/razorpay";

interface SystemLog {
    time: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
}

interface PropertyOption {
    id: number;
    name: string;
    slug: string;
}

interface ScreenOption {
    id: number;
    name: string;
    slug: string;
}

export default function TestPaymentPage() {
    // Selection options from backend
    const [properties, setProperties] = useState<PropertyOption[]>([]);
    const [screens, setScreens] = useState<ScreenOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    // Form selection state
    const [moduleType, setModuleType] = useState<"staycation" | "dd">("staycation");
    const [selectedPropertyId, setSelectedPropertyId] = useState<number>(1);
    const [selectedScreenId, setSelectedScreenId] = useState<number>(1);
    
    // Dates & details
    const [checkInDate, setCheckInDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
    });
    const [checkOutDate, setCheckOutDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 4);
        return d.toISOString().split("T")[0];
    });
    const [numGuests, setNumGuests] = useState(2);

    // Customer details
    const [name, setName] = useState("Galaxia Tester");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // Payment & status state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
    const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>("idle");
    const [createdBookingRef, setCreatedBookingRef] = useState<string | null>(null);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [razorpayPaymentId, setRazorpayPaymentId] = useState<string | null>(null);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { time, message, type }]);
    };

    // Load available properties & screens from backend
    useEffect(() => {
        async function fetchOptions() {
            try {
                const res = await fetch("/api/payments/test-options");
                if (res.ok) {
                    const data = await res.json();
                    if (data.properties?.length > 0) {
                        setProperties(data.properties);
                        setSelectedPropertyId(data.properties[0].id);
                    }
                    if (data.screens?.length > 0) {
                        setScreens(data.screens);
                        setSelectedScreenId(data.screens[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load test options:", err);
            } finally {
                setLoadingOptions(false);
            }
        }
        fetchOptions();
    }, []);

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

                if (data.createdBookingRef) {
                    setCreatedBookingRef(data.createdBookingRef);
                }

                if (data.verified && data.status === "success") {
                    addLog(`🎉 BACKEND CONFIRMED! System status turned TRUE! (Pay ID: ${data.razorpayPaymentId || "Captured"})`, "success");
                    if (data.createdBookingRef) {
                        addLog(`🏆 REAL BOOKING CREATED IN DB: ${data.createdBookingRef}`, "success");
                        addLog(`Confirmation voucher & email sent to ${data.customerEmail}`, "success");
                    }
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
        setCreatedBookingRef(null);

        const selectedVillaObj = properties.find((p) => p.id === selectedPropertyId);
        const selectedScreenObj = screens.find((s) => s.id === selectedScreenId);
        const selectedName = moduleType === "staycation" 
            ? (selectedVillaObj?.name || "Staycation Villa") 
            : (selectedScreenObj?.name || "DD Screen");

        addLog(`1. Initializing 1 INR Test Payment for [${selectedName}] on backend...`, "info");

        try {
            await loadRazorpayScript();

            const bookingDetails = {
                moduleType,
                propertyId: selectedPropertyId,
                screenId: selectedScreenId,
                checkInDate,
                checkOutDate,
                bookingDate: checkInDate,
                numGuests,
                price: moduleType === "staycation" ? 5000 : 2500,
            };

            // 1. Create order & track payment intent on backend
            const orderRes = await fetch("/api/payments/test-create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: name,
                    customerEmail: email,
                    customerPhone: phone,
                    bookingDetails,
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
                name: `Test Booking — ${selectedName}`,
                description: `1 INR Booking Test (${moduleType.toUpperCase()})`,
                image: "/logo.png",
                prefill: {
                    name,
                    email,
                    contact: phone,
                },
                theme: {
                    color: moduleType === "staycation" ? "#C4A265" : "#4F46E5",
                },
                handler: async function (response: any) {
                    addLog(`5. Razorpay Modal completed on client side! Payment ID: ${response.razorpay_payment_id}`, "info");
                    addLog("6. Client signature verification in progress...", "info");

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
                            addLog("Client signature verified. Backend Webhook is finalizing booking creation in DB...", "info");
                        }
                    } catch (err) {
                        addLog("Client signature check failed, but backend Webhook will still process & create booking!", "warning");
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
                        Booking Verification Test
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
                
                {/* Left Column: Form & Selections */}
                <div className="lg:col-span-6 space-y-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            Live Villa & Date Booking Test
                        </h1>
                        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                            Select any villa or screen, pick check-in dates, and pay <span className="text-[#BA9731] font-semibold">₹1.00 INR</span>. 
                            Our backend will verify the payment and create an actual test booking in your database!
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleInitiatePayment} className="bg-[#18181C] border border-white/10 rounded-xl p-5 space-y-4 shadow-xl">
                        
                        {/* Module Type Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Select Module</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0F0F12] border border-white/10 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setModuleType("staycation")}
                                    className={`py-2 text-xs font-semibold rounded-md transition-all ${
                                        moduleType === "staycation" 
                                            ? "bg-[#BA9731] text-black shadow-md" 
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    🏡 Staycation Villa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModuleType("dd")}
                                    className={`py-2 text-xs font-semibold rounded-md transition-all ${
                                        moduleType === "dd" 
                                            ? "bg-[#4F46E5] text-white shadow-md" 
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    🎬 Digital Diaries
                                </button>
                            </div>
                        </div>

                        {/* Villa / Screen Selection */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                                {moduleType === "staycation" ? "Choose Villa / Property" : "Choose Digital Diaries Screen"}
                            </label>
                            {loadingOptions ? (
                                <div className="text-xs text-gray-500 py-2">Loading options...</div>
                            ) : moduleType === "staycation" ? (
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                                    className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA9731] transition-colors"
                                >
                                    {properties.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={selectedScreenId}
                                    onChange={(e) => setSelectedScreenId(Number(e.target.value))}
                                    className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                                >
                                    {screens.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Date Selectors */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    {moduleType === "staycation" ? "Check-In Date" : "Booking Date"}
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={checkInDate}
                                    onChange={(e) => setCheckInDate(e.target.value)}
                                    className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#BA9731]"
                                />
                            </div>
                            {moduleType === "staycation" && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Check-Out Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={checkOutDate}
                                        onChange={(e) => setCheckOutDate(e.target.value)}
                                        className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#BA9731]"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Guest Count */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Number of Guests</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={numGuests}
                                onChange={(e) => setNumGuests(Number(e.target.value))}
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#BA9731]"
                            />
                        </div>

                        <hr className="border-white/10" />

                        <h3 className="text-xs font-semibold text-gray-300">Customer Info</h3>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#BA9731]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address (To Receive Voucher)</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#BA9731]"
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
                                className="w-full bg-[#0F0F12] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#BA9731]"
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
                                        <span>Pay ₹1.00 & Create Test Booking</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Console Monitor & Results */}
                <div className="lg:col-span-6 space-y-6">
                    
                    {/* Created Booking Card */}
                    {createdBookingRef && (
                        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-5 space-y-3 relative overflow-hidden animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">🎉 Booking Created in Database!</span>
                                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                                    Confirmed
                                </span>
                            </div>

                            <div className="bg-black/40 rounded-lg p-3 border border-emerald-500/30">
                                <span className="text-xs text-gray-400 block">Booking Reference ID:</span>
                                <span className="text-lg font-bold font-mono text-emerald-300">{createdBookingRef}</span>
                            </div>

                            <p className="text-xs text-gray-300 leading-relaxed">
                                This booking has been created in your backend PostgreSQL database! You can look up <strong className="text-white font-mono">{createdBookingRef}</strong> in your Admin Dashboard or database tables.
                            </p>

                            <div className="pt-1">
                                <Link
                                    href={moduleType === "staycation" ? "/admin22" : "/admin1"}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
                                >
                                    View in Admin Dashboard →
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Live System Status Card */}
                    <div className="bg-[#18181C] border border-white/10 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                📡 Backend Status Monitor
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
                                    Select villa & dates, then click Pay ₹1.00.
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

                    {/* Instructions Banner */}
                    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 text-xs text-indigo-200 space-y-1.5">
                        <span className="font-semibold text-indigo-400 block">🧪 Network Resiliency Test</span>
                        <p className="leading-relaxed text-gray-300">
                            Close the browser tab right after Razorpay completes. The backend webhook will still process the payment and create the booking reference in the database!
                        </p>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto w-full border-t border-white/10 pt-4 text-center text-xs text-gray-500">
                Galaxia Resorts — Independent Payment Authentication Test System
            </footer>
        </div>
    );
}
