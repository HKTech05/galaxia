"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CallbackContent() {
    const searchParams = useSearchParams();
    const [verifying, setVerifying] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function verifyPayment() {
            try {
                // Collect all query params from the return URL
                const params: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });

                console.log("HDFC Return URL params:", params);

                if (!params.order_id) {
                    setError("No order_id found in return URL. Payment may not have completed.");
                    setVerifying(false);
                    return;
                }

                // Send to backend for verification
                const res = await fetch("/api/payments/hdfc-test/verify-return", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(params),
                });

                const data = await res.json();
                setResult(data);

                if (!res.ok) {
                    setError(data.error || "Verification failed");
                }
            } catch (err: any) {
                setError(err.message || "Failed to verify payment");
            } finally {
                setVerifying(false);
            }
        }

        verifyPayment();
    }, [searchParams]);

    const isSuccess = result?.verified === true && result?.status === "success";
    const isFailed = result?.status === "failed";
    const isPending = !isSuccess && !isFailed && !error;

    return (
        <div className="min-h-screen bg-[#0F0F12] text-white flex flex-col items-center justify-center p-6 font-manrope">
            <div className="max-w-lg w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <span className="text-xl font-bold tracking-widest text-[#BA9731] font-serif">GALAXIA</span>
                    <span className="ml-3 text-xs bg-[#4F46E5]/20 text-[#818CF8] px-2.5 py-0.5 rounded-full border border-[#4F46E5]/40 font-mono">
                        HDFC SmartGateway Test
                    </span>
                </div>

                {/* Loading State */}
                {verifying && (
                    <div className="bg-[#18181C] border border-white/10 rounded-xl p-8 text-center space-y-4">
                        <div className="w-10 h-10 border-3 border-[#BA9731] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-300 text-sm">Verifying payment with HDFC SmartGateway...</p>
                        <p className="text-gray-500 text-xs">Checking order status server-to-server</p>
                    </div>
                )}

                {/* Success State */}
                {!verifying && isSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-6 space-y-4 animate-fade-in-up">
                        <div className="text-center space-y-2">
                            <div className="text-5xl">✅</div>
                            <h2 className="text-xl font-bold text-emerald-400">Payment Verified!</h2>
                            <p className="text-sm text-gray-300">₹1.00 test payment processed successfully via HDFC SmartGateway</p>
                        </div>

                        <div className="bg-black/40 rounded-lg p-4 space-y-2 text-xs font-mono">
                            {result.createdBookingRef && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Booking Ref:</span>
                                    <span className="text-emerald-300 font-bold">{result.createdBookingRef}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">HDFC Status:</span>
                                <span className="text-emerald-400">{result.hdfcStatus}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Transaction ID:</span>
                                <span className="text-gray-300">{result.txnId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Signature Valid:</span>
                                <span className={result.signatureValid ? "text-emerald-400" : "text-amber-400"}>
                                    {result.signatureValid ? "Yes ✅" : "Skipped"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Internal Payment ID:</span>
                                <span className="text-gray-300">{result.paymentId}</span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 text-center">
                            The backend webhook will also independently confirm this payment.
                        </p>
                    </div>
                )}

                {/* Failed State */}
                {!verifying && (isFailed || error) && (
                    <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-6 space-y-4">
                        <div className="text-center space-y-2">
                            <div className="text-5xl">❌</div>
                            <h2 className="text-xl font-bold text-rose-400">
                                {error ? "Verification Error" : "Payment Failed"}
                            </h2>
                            <p className="text-sm text-gray-300">
                                {error || `HDFC Status: ${result?.hdfcStatus || "Unknown"}`}
                            </p>
                        </div>

                        {result && (
                            <div className="bg-black/40 rounded-lg p-4 space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">HDFC Status:</span>
                                    <span className="text-rose-400">{result.hdfcStatus}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Payment ID:</span>
                                    <span className="text-gray-300">{result.paymentId}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending State */}
                {!verifying && isPending && !error && (
                    <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-6 space-y-4">
                        <div className="text-center space-y-2">
                            <div className="text-5xl">⏳</div>
                            <h2 className="text-xl font-bold text-amber-400">Payment Pending</h2>
                            <p className="text-sm text-gray-300">Payment is still being processed. Check the test page monitor for updates.</p>
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                {!verifying && (
                    <div className="flex items-center justify-center gap-4 pt-2">
                        <Link
                            href="/testpayment"
                            className="text-xs text-[#BA9731] hover:text-[#DACE84] font-semibold underline underline-offset-4 transition-colors"
                        >
                            ← Back to Test Page
                        </Link>
                        {isSuccess && result?.createdBookingRef && (
                            <Link
                                href="/admin22"
                                target="_blank"
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 transition-colors"
                            >
                                View in Admin Dashboard →
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TestPaymentCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F0F12] text-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-10 h-10 border-3 border-[#BA9731] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
