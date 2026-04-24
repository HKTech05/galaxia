"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "", subject: "General Inquiry" });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const formRef = useRef<HTMLDivElement>(null);

    // Intersection observer for scroll animations
    const [visible, setVisible] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) setVisible((v) => ({ ...v, [e.target.id]: true })); }),
            { threshold: 0.15 }
        );
        document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError("");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, source: "staycation" }),
            });
            if (res.ok) {
                setSent(true);
                setFormData({ name: "", email: "", phone: "", message: "", subject: "General Inquiry" });
            } else {
                setError("Something went wrong. Please try again.");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const contactInfo = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            ),
            label: "Luxury Awaits",
            value: "Curated Experiences Just for You",
            href: null,
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ),
            label: "Location",
            value: "Karjat, Maharashtra, India",
            href: "https://goo.gl/maps/karjat",
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            ),
            label: "Personal Touch",
            value: "Every Stay Tailored to Perfection",
            href: null,
        },
    ];

    const subjects = ["General Inquiry", "Booking Assistance", "Group / Event Booking", "Partnership / Collaboration", "Feedback / Complaint"];

    return (
        <div className="bg-cream-white relative min-h-screen pt-20 overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <svg className="absolute w-[900px] h-[900px] text-antique-gold stroke-current -top-60 -right-[300px] opacity-[0.06]" viewBox="0 0 100 100" fill="none" strokeWidth="0.15">
                    <circle cx="50" cy="50" r="45" strokeDasharray="2 3" />
                    <circle cx="50" cy="50" r="35" strokeDasharray="1 2" />
                    <circle cx="50" cy="50" r="25" strokeWidth="0.3" />
                    <circle cx="50" cy="50" r="15" strokeDasharray="0.5 1.5" />
                </svg>
                <svg className="absolute w-[700px] h-[700px] text-antique-gold stroke-current bottom-0 -left-[250px] opacity-[0.05]" viewBox="0 0 100 100" fill="none" strokeWidth="0.2">
                    <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" strokeDasharray="3 2" />
                    <polygon points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" strokeWidth="0.15" />
                </svg>
                <div className="absolute top-[30%] left-[8%] w-48 h-48 rounded-full border border-antique-gold/10 bg-antique-gold/[0.02]" />
                <div className="absolute bottom-[15%] right-[12%] w-72 h-72 rounded-full border border-dashed border-antique-gold/10" />
            </div>

            {/* Hero */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
                <div id="hero" data-animate className={`transition-all duration-1000 ${visible["hero"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <p className="text-antique-gold font-inter text-xs tracking-[0.4em] uppercase mb-4">We&apos;d Love to Hear From You</p>
                    <h1 className="font-cinzel text-5xl sm:text-6xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">Get in Touch</h1>
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-8" />
                    <p className="font-inter text-text-secondary text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                        Whether you&apos;re planning your next escape, have a question about our properties, or simply want to say hello — we&apos;re here for you.
                    </p>
                </div>
            </section>

            {/* Contact Cards */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div id="cards" data-animate className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-1000 delay-200 ${visible["cards"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    {contactInfo.map((info, i) => (
                        <div key={i} className="group relative">
                            <div className="absolute inset-0 bg-antique-gold/5 rounded-2xl transform translate-x-1 translate-y-1 group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform duration-300" />
                            {info.href ? (
                                <a href={info.href} target={info.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="relative block bg-white border border-border-light rounded-2xl p-6 text-center hover:border-antique-gold/40 hover:shadow-lg hover:shadow-antique-gold/5 transition-all duration-300 h-full">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-antique-gold/10 to-antique-gold/5 border border-antique-gold/20 flex items-center justify-center mx-auto mb-4 text-antique-gold group-hover:scale-110 transition-transform duration-300">
                                        {info.icon}
                                    </div>
                                    <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1.5">{info.label}</p>
                                    <p className="font-cinzel text-sm font-semibold text-text-primary">{info.value}</p>
                                </a>
                            ) : (
                                <div className="relative bg-white border border-border-light rounded-2xl p-6 text-center hover:border-antique-gold/40 hover:shadow-lg hover:shadow-antique-gold/5 transition-all duration-300 h-full">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-antique-gold/10 to-antique-gold/5 border border-antique-gold/20 flex items-center justify-center mx-auto mb-4 text-antique-gold group-hover:scale-110 transition-transform duration-300">
                                        {info.icon}
                                    </div>
                                    <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1.5">{info.label}</p>
                                    <p className="font-cinzel text-sm font-semibold text-text-primary">{info.value}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Form + Map Section */}
            <section className="relative z-10 bg-white/90 border-y border-border-light">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div id="form-section" data-animate className={`transition-all duration-1000 delay-300 ${visible["form-section"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 sm:gap-14">
                            {/* Form - takes 3 cols */}
                            <div ref={formRef} className="lg:col-span-3">
                                <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Send a Message</p>
                                <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-2">Write to Us</h2>
                                <div className="w-12 h-[1px] bg-antique-gold mb-8" />

                                {sent ? (
                                    <div className="text-center py-16 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
                                            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <h3 className="font-cinzel text-2xl font-bold text-text-primary mb-3">Message Sent!</h3>
                                        <p className="font-inter text-sm text-text-secondary mb-8 max-w-md mx-auto">Thank you for reaching out. Our team will get back to you within 24 hours during business hours.</p>
                                        <button onClick={() => setSent(false)} className="text-antique-gold font-inter text-sm font-semibold hover:underline underline-offset-4">
                                            Send another message →
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {error && (
                                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600 font-inter animate-in fade-in">
                                                {error}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="group">
                                                <label className="block font-inter text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mb-2">Full Name *</label>
                                                <input
                                                    required value={formData.name}
                                                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-border-light rounded-xl font-inter text-sm text-text-primary focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 focus:bg-white outline-none transition-all"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                            <div className="group">
                                                <label className="block font-inter text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mb-2">Email Address *</label>
                                                <input
                                                    required type="email" value={formData.email}
                                                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-border-light rounded-xl font-inter text-sm text-text-primary focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 focus:bg-white outline-none transition-all"
                                                    placeholder="you@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block font-inter text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mb-2">Phone Number</label>
                                                <input
                                                    type="tel" value={formData.phone}
                                                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                                    maxLength={10}
                                                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-border-light rounded-xl font-inter text-sm text-text-primary focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 focus:bg-white outline-none transition-all"
                                                    placeholder="10-digit mobile number"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-inter text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mb-2">Subject</label>
                                                <select
                                                    value={formData.subject}
                                                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                                                    className="w-full px-4 py-3.5 bg-slate-50/80 border border-border-light rounded-xl font-inter text-sm text-text-primary focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    {subjects.map((s) => (
                                                        <option key={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-inter text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mb-2">Your Message *</label>
                                            <textarea
                                                required value={formData.message}
                                                onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                                                rows={5}
                                                className="w-full px-4 py-3.5 bg-slate-50/80 border border-border-light rounded-2xl font-inter text-sm text-text-primary focus:border-antique-gold focus:ring-4 focus:ring-antique-gold/10 focus:bg-white outline-none transition-all resize-none"
                                                placeholder="Tell us how we can help..."
                                            />
                                        </div>

                                        <button
                                            type="submit" disabled={sending}
                                            className="group w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-antique-gold to-dark-gold text-white rounded-full font-inter text-sm font-bold tracking-wider uppercase hover:shadow-xl hover:shadow-antique-gold/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                                        >
                                            {sending ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Send Message
                                                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Info sidebar - 2 cols */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                {/* Map */}
                                <div className="rounded-2xl overflow-hidden border border-border-light h-64 lg:h-72 shadow-sm">
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d60399.00776454397!2d73.26924283125!3d18.910000099999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7e8b27d0f6df7%3A0x5f9d12d1e1b4d44c!2sKarjat%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1711000000000!5m2!1sen!2sin"
                                        className="w-full h-full border-0"
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>

                                {/* Quick Links */}
                                <div className="bg-[#faf8f4] rounded-2xl border border-border-light p-6">
                                    <h4 className="font-cinzel text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Quick Links</h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: "Explore Properties", href: "/staycation" },
                                            { label: "About Galaxia", href: "/staycation/about" },
                                            { label: "Digital Diaries", href: "/celebration" },
                                            { label: "Guest Reviews", href: "/staycation/reviews" },
                                        ].map((link) => (
                                            <Link key={link.href} href={link.href} className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                                                <span className="font-inter text-sm text-text-secondary group-hover:text-antique-gold transition-colors">{link.label}</span>
                                                <svg className="w-4 h-4 text-text-muted group-hover:text-antique-gold group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Social */}
                                <div className="bg-white rounded-2xl border border-border-light p-6">
                                    <h4 className="font-cinzel text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Follow Us</h4>
                                    <div className="flex items-center gap-3">
                                        {[
                                            { name: "Instagram", href: "https://instagram.com/galaxia_resorts", icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /> },
                                        ].map((s) => (
                                            <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" title={s.name}
                                                className="group w-11 h-11 rounded-xl bg-slate-50 border border-border-light flex items-center justify-center text-text-muted hover:bg-antique-gold hover:border-antique-gold hover:text-white transition-all duration-300 hover:shadow-md hover:shadow-antique-gold/20 hover:-translate-y-0.5"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">{s.icon}</svg>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                <div id="faq" data-animate className={`transition-all duration-1000 delay-200 ${visible["faq"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <div className="text-center mb-14">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Common Questions</p>
                        <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-4">FAQ</h2>
                        <div className="w-16 h-[1px] bg-antique-gold mx-auto" />
                    </div>

                    <div className="space-y-3">
                        {[
                            { q: "How do I book a villa?", a: "Browse our properties, select your dates, choose your villa, and complete the booking online. You can also call us directly for assistance." },
                            { q: "What is the cancellation policy?", a: "All bookings are non-refundable — no cancellations, amendments, or date changes are permitted once confirmed. Please ensure your dates are final before booking." },
                            { q: "Are pets allowed?", a: "Pet policies vary by property. Please contact us directly to confirm pet-friendly options before booking." },
                            { q: "Do you offer group bookings or events?", a: "Yes! We can accommodate larger groups and special events. Send us a message with your requirements and we'll create a custom package." },
                            { q: "What meals are included?", a: "Most of our properties include meals (breakfast, lunch & dinner) as part of the stay. Specific inclusions vary by villa and plan selected." },
                        ].map((faq, i) => (
                            <details key={i} className="group bg-white border border-border-light rounded-2xl overflow-hidden hover:shadow-md hover:shadow-antique-gold/5 transition-all duration-300">
                                <summary className="flex items-center justify-between p-5 sm:p-6 cursor-pointer font-cinzel text-sm sm:text-base font-semibold text-text-primary select-none">
                                    {faq.q}
                                    <div className="w-7 h-7 rounded-full border border-border-light flex items-center justify-center shrink-0 ml-4 group-open:bg-antique-gold group-open:border-antique-gold group-open:text-white transition-all duration-300">
                                        <svg className="w-3.5 h-3.5 transform group-open:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </summary>
                                <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1">
                                    <div className="w-8 h-[1px] bg-antique-gold/30 mb-3" />
                                    <p className="font-inter text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="relative z-10 border-t border-border-light bg-gradient-to-b from-[#faf8f4] to-cream-white">
                <div id="cta" data-animate className={`max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center transition-all duration-1000 delay-200 ${visible["cta"] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-4">Ready for Your Escape?</p>
                    <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-6">Your Private Getaway Starts Here</h2>
                    <p className="font-inter text-sm sm:text-base text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
                        Explore our curated collection of villas and find the perfect destination for your next unforgettable experience.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/staycation" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-sm font-bold tracking-widest uppercase hover:shadow-xl hover:shadow-antique-gold/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
                            Explore Properties
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </Link>
                        <Link href="/celebration" className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-antique-gold/40 text-antique-gold font-inter text-sm font-bold tracking-widest uppercase hover:bg-antique-gold hover:text-white transition-all duration-300">
                            Digital Diaries
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
