"use client";

import { useState } from "react";

export default function DDContactPage() {
    const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus("sending");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, source: "digital-diaries" }),
            });
            if (res.ok) {
                setFormStatus("sent");
            } else {
                setFormStatus("error");
            }
        } catch {
            setFormStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-cel-bg">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-dark/15 rounded-full blur-[120px]" />
                    <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-rose-medium/10 rounded-full blur-[150px]" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-medium/30 bg-rose-dark/10 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-medium" />
                        <span className="font-inter text-[10px] tracking-[0.3em] uppercase text-rose-light">Get in Touch</span>
                    </div>
                    <h1 className="font-cinzel text-4xl sm:text-5xl md:text-7xl font-bold mb-5">
                        <span className="text-white">CONTACT </span>
                        <span className="text-rose-light">US</span>
                    </h1>
                    <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-rose-medium to-transparent mx-auto mb-5" />
                    <p className="font-inter text-cel-text-secondary text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                        Have a question about our private screenings? Planning a celebration?
                        We&apos;d love to hear from you.
                    </p>
                </div>
            </section>

            {/* Contact Cards + Form */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 -mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left — Info Cards */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Card: Location */}
                        <div className="relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/5 border border-cel-border p-6 overflow-hidden transition-all duration-300 hover:border-rose-medium/30">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-dark/40 to-rose-medium/20 border border-rose-medium/30 flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-base font-bold text-rose-light mb-1">Our Location</h3>
                                <p className="font-inter text-sm text-cel-text-secondary leading-relaxed">Wadala, Mumbai, Maharashtra</p>
                                <p className="font-inter text-xs text-cel-text-muted mt-1 font-normal">5 min from Wadala Station</p>
                            </div>
                        </div>

                        {/* Card: Get in Touch */}
                        <div className="relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/5 border border-cel-border p-6 overflow-hidden transition-all duration-300 hover:border-rose-medium/30">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-dark/40 to-rose-medium/20 border border-rose-medium/30 flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-rose-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-base font-bold text-rose-light mb-2">Get in Touch</h3>
                                <a href="tel:+919876543210" className="font-inter text-sm text-cel-text-secondary hover:text-rose-light transition-colors block mb-1">Call us at +91 98765 43210</a>
                                <p className="font-inter text-xs text-cel-text-muted mb-3">Mon – Sun, 10 AM – 10 PM</p>
                                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/15 border border-green-500/30 text-green-400 font-inter text-xs font-medium hover:bg-green-600/25 transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    Message on WhatsApp
                                </a>
                                <p className="font-inter text-[10px] text-cel-text-muted mt-2">24×7 Support via WhatsApp</p>
                            </div>
                        </div>

                        {/* Card: Follow Us */}
                        <div className="relative rounded-2xl bg-gradient-to-br from-cel-card to-rose-dark/5 border border-cel-border p-6 overflow-hidden transition-all duration-300 hover:border-rose-medium/30">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-dark/40 to-rose-medium/20 border border-rose-medium/30 flex items-center justify-center mb-4">
                                    <svg className="w-5 h-5 text-rose-light" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                </div>
                                <h3 className="font-cinzel text-base font-bold text-rose-light mb-2">Follow Us</h3>
                                <p className="font-inter text-xs text-cel-text-muted mb-3">Stay updated with our latest screenings, offers, and behind-the-scenes moments on Instagram.</p>
                                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600/15 to-pink-600/15 border border-purple-500/30 text-purple-300 font-inter text-xs font-medium hover:from-purple-600/25 hover:to-pink-600/25 transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                    Follow on Instagram
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right — Contact Form */}
                    <div className="lg:col-span-3">
                        <div className="relative rounded-2xl bg-cel-card border border-cel-border p-8 sm:p-10 overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-cel-text mb-1">Send us a Message</h2>
                                <p className="font-inter text-sm text-cel-text-muted mb-8">We&apos;ll get back to you as soon as possible.</p>

                                {formStatus === "sent" ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <h3 className="font-cinzel text-2xl font-bold text-cel-text mb-2">Message Sent!</h3>
                                        <p className="font-inter text-sm text-cel-text-secondary">Thank you for reaching out. We&apos;ll respond within 24 hours.</p>
                                        <button onClick={() => { setFormStatus("idle"); setForm({ name: "", email: "", phone: "", message: "" }); }} className="mt-6 font-inter text-xs text-rose-light hover:text-rose-medium transition-colors underline underline-offset-4">
                                            Send Another Message
                                        </button>
                                    </div>
                                ) : formStatus === "error" ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </div>
                                        <h3 className="font-cinzel text-2xl font-bold text-cel-text mb-2">Something went wrong</h3>
                                        <p className="font-inter text-sm text-cel-text-secondary">Please try again or reach out via WhatsApp.</p>
                                        <button onClick={() => setFormStatus("idle")} className="mt-6 font-inter text-xs text-rose-light hover:text-rose-medium transition-colors underline underline-offset-4">
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block font-inter text-xs font-medium text-cel-text-secondary uppercase tracking-wider mb-2">Your Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={form.name}
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                    className="w-full bg-cel-bg/50 border border-cel-border rounded-xl px-4 py-3 font-inter text-sm text-cel-text placeholder-cel-text-muted focus:outline-none focus:border-rose-medium/50 focus:ring-1 focus:ring-rose-medium/30 transition-all"
                                                    placeholder="e.g. Priya Sharma"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-inter text-xs font-medium text-cel-text-secondary uppercase tracking-wider mb-2">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                    maxLength={10}
                                                    className="w-full bg-cel-bg/50 border border-cel-border rounded-xl px-4 py-3 font-inter text-sm text-cel-text placeholder-cel-text-muted focus:outline-none focus:border-rose-medium/50 focus:ring-1 focus:ring-rose-medium/30 transition-all"
                                                    placeholder="10-digit mobile number"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-inter text-xs font-medium text-cel-text-secondary uppercase tracking-wider mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                className="w-full bg-cel-bg/50 border border-cel-border rounded-xl px-4 py-3 font-inter text-sm text-cel-text placeholder-cel-text-muted focus:outline-none focus:border-rose-medium/50 focus:ring-1 focus:ring-rose-medium/30 transition-all"
                                                placeholder="you@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-inter text-xs font-medium text-cel-text-secondary uppercase tracking-wider mb-2">Your Message</label>
                                            <textarea
                                                required
                                                rows={5}
                                                value={form.message}
                                                onChange={e => setForm({ ...form, message: e.target.value })}
                                                className="w-full bg-cel-bg/50 border border-cel-border rounded-xl px-4 py-3 font-inter text-sm text-cel-text placeholder-cel-text-muted focus:outline-none focus:border-rose-medium/50 focus:ring-1 focus:ring-rose-medium/30 transition-all resize-none"
                                                placeholder="Tell us about your event, preferred date, number of guests..."
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={formStatus === "sending"}
                                            className="w-full relative overflow-hidden bg-gradient-to-r from-rose-medium to-rose-dark text-white font-cinzel font-semibold text-sm py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-lg hover:shadow-rose-dark/30"
                                        >
                                            <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full pointer-events-none" />
                                            {formStatus === "sending" ? (
                                                <>
                                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                    Send Message
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-cel-bg relative overflow-hidden pb-20">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cel-border to-transparent" />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20">
                    <div className="text-center mb-10">
                        <p className="font-inter text-rose-medium text-xs tracking-[0.3em] uppercase mb-3">Common</p>
                        <h2 className="font-cinzel text-2xl sm:text-3xl font-semibold text-cel-text">Questions</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { q: "What are the operating hours?", a: "We operate from 10:00 AM to 10:00 PM, seven days a week including holidays." },
                            { q: "Can I bring my own decorations?", a: "For safety and quality, we provide all decorations for celebration packages. Custom requests can be discussed with our team." },
                            { q: "Can I bring outside food?", a: "Outside food is not allowed. We offer a food menu (Satkar) with snacks and beverages at reasonable prices." },
                        ].map((faq, i) => (
                            <details key={i} className="group rounded-xl border border-cel-border bg-cel-card overflow-hidden transition-all hover:border-rose-medium/30">
                                <summary className="flex items-center justify-between p-5 cursor-pointer font-cinzel text-sm font-semibold text-cel-text">
                                    {faq.q}
                                    <svg className="w-4 h-4 text-rose-medium transform group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </summary>
                                <div className="px-5 pb-5 font-inter text-sm text-cel-text-secondary leading-relaxed -mt-1">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
