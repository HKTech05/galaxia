"use client";

import Link from "next/link";
import Image from "next/image";
import { CelebrationPackage, ScreenData, formatPrice } from "../../data/celebrations";

// Icon mapping
function InclusionIcon({ icon }: { icon: string }) {
    const iconMap: Record<string, React.ReactNode> = {
        film: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>,
        gift: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a4 4 0 00-4-4c-1.38 0-2.5 1.12-2.5 2.5S6.62 7 8 7h4zm0 0V6a4 4 0 014-4c1.38 0 2.5 1.12 2.5 2.5S17.38 7 16 7h-4zm-8 5h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z" /></svg>,
        popcorn: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
        drink: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        chocolate: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        privacy: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        cake: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 013 15.546M12 4v4m-4 4h8a2 2 0 012 2v4H6v-4a2 2 0 012-2z" /></svg>,
        led: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
        fog: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
        heart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        candle: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>,
    };
    return <span className="text-rose-medium">{iconMap[icon] || iconMap.film}</span>;
}

interface PackageDetailClientProps {
    pkg: CelebrationPackage;
    screens: ScreenData[];
}

export default function PackageDetailClient({ pkg, screens }: PackageDetailClientProps) {
    return (
        <div>
            {/* Breadcrumb */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 border-b border-cel-border">
                <nav className="flex items-center gap-2 text-xs font-inter text-cel-text-muted">
                    <Link href="/" className="hover:text-rose-light transition-colors">Home</Link>
                    <span className="text-cel-border">/</span>
                    <Link href="/celebration" className="hover:text-rose-light transition-colors">Digital Diaries</Link>
                    <span className="text-cel-border">/</span>
                    <span className="text-rose-medium">{pkg.name}</span>
                </nav>
            </div>

            {/* Package Header */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
                <div className="inline-block px-4 py-1 mb-5 bg-rose-dark/15 border border-rose-dark/30 rounded-full">
                    <span className="text-rose-light font-inter text-[10px] tracking-widest uppercase">{pkg.tagline}</span>
                </div>
                <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-cel-text mb-4">{pkg.name.toUpperCase()}</h1>
                <p className="font-inter text-cel-text-secondary text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{pkg.description}</p>
            </section>

            {/* Package Inclusions */}
            <section className="border-t border-cel-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="text-center mb-8 sm:mb-10">
                        <h2 className="font-cinzel text-lg sm:text-xl font-semibold text-cel-text uppercase tracking-wider">Package Inclusions</h2>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
                        {pkg.inclusions.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-cel-border bg-cel-card hover:border-rose-dark/30 transition-all w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]">
                                <InclusionIcon icon={item.icon} />
                                <span className="text-cel-text font-inter text-xs sm:text-sm">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="border-t border-cel-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="text-center mb-8">
                        <h2 className="font-cinzel text-lg sm:text-xl font-semibold text-cel-text uppercase tracking-wider mb-2">Pricing</h2>
                        <p className="font-inter text-cel-text-secondary text-xs">For 2 people | Extra person above 2: {formatPrice(pkg.extraPerson)}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
                        {pkg.pricing.map((tier, i) => (
                            <div key={i} className="flex-1 min-w-[200px] max-w-[260px] rounded-xl border border-cel-border bg-cel-card p-5 sm:p-6 text-center hover:border-rose-dark/40 transition-all">
                                <p className="font-inter text-cel-text-muted text-xs uppercase tracking-wider mb-2">{tier.label}</p>
                                <p className="font-cinzel text-2xl font-bold text-cel-text mb-1">{formatPrice(tier.weekday)}</p>
                                {tier.weekday !== tier.weekend && (
                                    <p className="font-inter text-xs text-cel-text-secondary">Weekend: {formatPrice(tier.weekend)}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Screen Cards */}
            <section className="border-t border-cel-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="text-center mb-10 sm:mb-14">
                        <p className="font-inter text-rose-medium text-xs tracking-[0.3em] uppercase mb-3">Choose Your Screen</p>
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-cel-text">Where Would You Like to Watch?</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                        {screens.map((screen) => (
                            <Link key={screen.id} href={`/celebration/${pkg.id}/${screen.id}`} className="group block">
                                <div className="relative overflow-hidden rounded-xl border border-cel-border h-[250px] sm:h-[300px] transition-all duration-500 hover:border-rose-medium/40 hover:shadow-[0_4px_20px_rgba(159,53,58,0.12)]">
                                    <div className="absolute inset-0">
                                        <Image src={screen.image} alt={screen.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                                        <span className="inline-block px-2 py-0.5 mb-2 bg-white/10 backdrop-blur-sm rounded text-[9px] font-inter text-white/80 tracking-wider uppercase">{screen.theme}</span>
                                        <h3 className="font-cinzel text-lg sm:text-xl font-semibold text-white mb-1 group-hover:text-rose-light transition-colors">{screen.name} (Digital Diaries)</h3>
                                        <p className="font-inter text-xs text-white/60">{screen.tagline}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
