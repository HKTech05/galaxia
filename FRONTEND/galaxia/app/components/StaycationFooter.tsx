import Link from "next/link";

export default function StaycationFooter() {
    return (
        <footer className="bg-white border-t border-border-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center">
                                <span className="text-white font-cinzel font-bold text-sm">G</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-cinzel text-lg font-semibold text-gold-gradient leading-tight">GALAXIA</span>
                                <span className="text-[9px] font-inter text-text-muted tracking-[0.2em] uppercase">Staycation</span>
                            </div>
                        </div>
                        <p className="text-text-secondary text-sm font-inter leading-relaxed">
                            Premium luxury staycation experiences in handpicked villas and resorts nestled in the heart of nature.
                        </p>
                    </div>
                    {/* Properties */}
                    <div>
                        <h3 className="font-cinzel text-sm font-semibold text-text-primary tracking-wider mb-4">PROPERTIES</h3>
                        <ul className="space-y-2.5">
                            {[
                                { name: "Ambrose Villas", href: "/staycation/ambrose" },
                                { name: "Amstel Nest", href: "/staycation/amstel-nest" },
                                { name: "La Paraiso", href: "/staycation/la-paraiso" },
                                { name: "Heavenly Villa", href: "/staycation/heavenly-villa" },
                                { name: "Mount View", href: "/staycation/mount-view" },
                                { name: "Hill View", href: "/staycation/hill-view" },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-text-secondary hover:text-antique-gold text-sm font-inter transition-colors">{link.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Quick Links */}
                    <div>
                        <h3 className="font-cinzel text-sm font-semibold text-text-primary tracking-wider mb-4">QUICK LINKS</h3>
                        <ul className="space-y-2.5">
                            {[
                                { name: "About Us", href: "/staycation/about" },
                                { name: "Sightseeing", href: "/staycation/sightseeing" },
                                { name: "Contact Us", href: "/staycation/contact" },
                                { name: "Reviews", href: "/staycation/reviews" },
                                { name: "My Dashboard", href: "/dashboard" },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-text-secondary hover:text-antique-gold text-sm font-inter transition-colors">{link.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Contact */}
                    <div>
                        <h3 className="font-cinzel text-sm font-semibold text-text-primary tracking-wider mb-4">CONTACT</h3>
                        <div className="space-y-3 text-text-secondary text-sm font-inter">
                            <p className="flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 text-antique-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Karjat, Maharashtra, India
                            </p>
                            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-antique-gold transition-colors">
                                <svg className="w-4 h-4 text-antique-gold shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z" /></svg>
                                WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
                <div className="mt-10 pt-8 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-text-muted text-xs font-inter">© {new Date().getFullYear()} Galaxia. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        {["Privacy Policy", "Terms of Service", "Booking Policy"].map((t) => (
                            <Link key={t} href="#" className="text-text-muted hover:text-antique-gold text-xs font-inter transition-colors">{t}</Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
