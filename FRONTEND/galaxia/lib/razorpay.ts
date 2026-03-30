// Razorpay integration helper for frontend
// Key ID is public — safe to expose in browser

const RAZORPAY_KEY_ID = "rzp_live_SX8ZYJXcRBJV2x";

// Dynamically load the Razorpay checkout script
let razorpayScriptLoaded = false;
export function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (razorpayScriptLoaded || (typeof window !== "undefined" && (window as any).Razorpay)) {
            razorpayScriptLoaded = true;
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => { razorpayScriptLoaded = true; resolve(); };
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
        document.body.appendChild(script);
    });
}

interface RazorpayPaymentOptions {
    amount: number; // in INR (rupees, not paise)
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
    receipt?: string;
    notes?: Record<string, string>;
}

interface RazorpayPaymentResult {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

// Full payment flow: create order → open checkout → verify
export async function initiateRazorpayPayment(
    options: RazorpayPaymentOptions
): Promise<RazorpayPaymentResult> {
    // 1. Load Razorpay SDK
    await loadRazorpayScript();

    // 2. Create order on our backend
    const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: options.amount,
            receipt: options.receipt || `rcpt_${Date.now()}`,
            notes: options.notes || {},
        }),
    });

    if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create payment order");
    }

    const { orderId } = await orderRes.json();

    // 3. Open Razorpay checkout modal
    return new Promise<RazorpayPaymentResult>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
            key: RAZORPAY_KEY_ID,
            order_id: orderId,
            amount: Math.round(options.amount * 100), // paise for display
            currency: "INR",
            name: "Galaxia Resorts",
            description: options.description || "Booking Payment",
            image: "/logo.png", // will fall back gracefully if missing
            prefill: {
                name: options.customerName,
                email: options.customerEmail || "",
                contact: options.customerPhone || "",
            },
            notes: options.notes || {},
            theme: {
                color: "#C4A265", // antique gold
            },
            handler: async function (response: RazorpayPaymentResult) {
                // 4. Verify payment signature on backend
                try {
                    const verifyRes = await fetch("/api/payments/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(response),
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.verified) {
                        resolve(response);
                    } else {
                        reject(new Error("Payment verification failed. Please contact support."));
                    }
                } catch (err) {
                    reject(new Error("Payment verification failed. Please contact support."));
                }
            },
            modal: {
                ondismiss: function () {
                    reject(new Error("Payment cancelled by user"));
                },
            },
        });

        rzp.on("payment.failed", function (failedResponse: any) {
            reject(new Error(failedResponse?.error?.description || "Payment failed"));
        });

        rzp.open();
    });
}
