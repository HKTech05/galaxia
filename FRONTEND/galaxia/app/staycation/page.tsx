import Link from "next/link";
import Image from "next/image";
import ReviewCarousel from "../components/ReviewCarousel";

const properties = [
    { id: "ambrose", name: "Ambrose", subtitle: "Theme Villa Resort — 5 Themed Villas", startPrice: "5,500", priceNote: "with meals", description: "Five exquisitely themed villas — Bollywood, Rustic, Greek, Bali, and Machan — each with private pool.", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", highlights: ["5 Themes", "Private Pools", "Meals Included", "Garden"] },
    { id: "amstel-nest", name: "Amstel Nest", subtitle: "Mini Amsterdam — 14 Indoor Pool Cottages", startPrice: "4,950", priceNote: "with meals", description: "Unique cottages inspired by Amsterdam, each with its own private indoor pool. Meals included.", image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80", highlights: ["Indoor Pool", "Meals Included", "Gaming Zone", "Boating"] },
    { id: "la-paraiso", name: "La Paraiso", subtitle: "Premium Private Pool Villa", startPrice: "4,950", description: "Luxurious villa with a 25x10 ft private pool, 600 sq ft private garden, and a beautiful gazebo.", image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", highlights: ["25x10 ft Pool", "Private Garden", "Gazebo", "Self Check-in"] },
    { id: "euphoria", name: "Euphoria", subtitle: "Heavenly Villa — Private Indoor Pool", startPrice: "3,950", description: "A heavenly studio villa with a private indoor swimming pool and swing. An intimate tropical paradise.", image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80", highlights: ["Indoor Pool", "Pool Swing", "Studio Room", "Free WiFi"] },
    { id: "mount-view", name: "Mount View", subtitle: "Bathtub Mountain Apartment", startPrice: "3,500", description: "Premium apartment featuring a private bathtub and enormous mountain-facing balcony. Luxury meets nature.", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", highlights: ["Private Bathtub", "Mountain Balcony", "Music Player", "2 AC"] },
    { id: "hill-view", name: "Hill View", subtitle: "Budget Mountain View Apartment", startPrice: "2,500", description: "A cozy apartment with a huge open balcony offering breathtaking mountain views. Perfect for couples seeking a tranquil escape.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", highlights: ["Mountain View", "Queen Bed", "Smart TV", "Free WiFi"] },
];

export default function StaycationPage() {
    return (
        <div>
            {/* Hero */}
            <section className="relative h-[55vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80')` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-cream-white" />
                <div className="relative h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
                    <p className="text-amber-300 font-inter text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">Galaxia Staycation</p>
                    <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>Luxury Escapes</h1>
                    <p className="font-cinzel text-base sm:text-lg md:text-xl text-amber-200 mb-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>Handpicked Villas & Resorts</p>
                    <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent my-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }} />
                    <p className="text-white/80 font-inter text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                        Discover our collection of exclusive properties nestled in the serene landscapes of Karjat.
                    </p>
                </div>
            </section>

            {/* Properties */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                <div className="text-center mb-12 sm:mb-16">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Our Properties</p>
                    <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary mb-4">Featured Properties</h2>
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 stagger-children">
                    {properties.map((property) => (
                        <Link key={property.id} href={`/staycation/${property.id}`} className="group block">
                            <div className="relative overflow-hidden rounded-xl border border-border-light bg-white transition-all duration-500 hover:border-antique-gold/30 hover:shadow-[0_8px_30px_rgba(186,151,49,0.10)]">
                                <div className="relative h-56 sm:h-64 md:h-72 overflow-hidden">
                                    <Image src={property.image} alt={property.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border-light">
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-antique-gold font-cinzel font-semibold text-sm">₹{property.startPrice}</span>
                                            <span className="text-text-muted text-[10px] font-inter">/night</span>
                                        </div>
                                        {property.priceNote && <p className="text-dark-gold text-[9px] font-inter text-center">{property.priceNote}</p>}
                                    </div>
                                </div>
                                <div className="p-5 sm:p-6">
                                    <h3 className="font-cinzel text-lg sm:text-xl font-semibold text-text-primary mb-1 group-hover:text-antique-gold transition-colors">{property.name}</h3>
                                    <p className="text-dark-gold font-inter text-xs tracking-wide mb-2">{property.subtitle}</p>
                                    <p className="text-text-secondary font-inter text-sm leading-relaxed mb-4 line-clamp-2">{property.description}</p>
                                    <div className="flex flex-wrap gap-1.5 mb-5">
                                        {property.highlights.map((h) => (
                                            <span key={h} className="text-[10px] font-inter text-text-secondary bg-soft-gray border border-border-light rounded-full px-2.5 py-1">{h}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-antique-gold font-inter text-xs font-medium flex items-center gap-1.5 group-hover:gap-3 transition-all">
                                            View Details
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </span>
                                        <span className="bg-antique-gold/10 border border-antique-gold/30 text-antique-gold text-xs font-inter font-medium px-4 py-2 rounded-full hover:bg-antique-gold hover:text-white transition-all">Book Now</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
            {/* Guest Reviews */}
            <section className="relative border-t border-border-light bg-[#fdfbf7] overflow-hidden">
                {/* Wavy background pattern */}
                <svg className="absolute top-0 left-0 w-full h-32 text-soft-gray/40 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 120" fill="currentColor">
                    <path d="M0,64 C240,120 480,0 720,64 C960,128 1200,8 1440,64 L1440,0 L0,0 Z" />
                </svg>
                <svg className="absolute bottom-0 left-0 w-full h-24 text-soft-gray/30 pointer-events-none rotate-180" preserveAspectRatio="none" viewBox="0 0 1440 120" fill="currentColor">
                    <path d="M0,64 C240,120 480,0 720,64 C960,128 1200,8 1440,64 L1440,0 L0,0 Z" />
                </svg>
                {/* Subtle dot pattern in background */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ba9731 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 pt-20 sm:pt-28">
                    <div className="text-center mb-12 sm:mb-16">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Testimonials</p>
                        <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary mb-4">Guest Reviews</h2>
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto" />
                    </div>
                    <ReviewCarousel />
                </div>
            </section>

            {/* Policies */}
            <section className="border-t border-border-light bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="text-center mb-10">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Good to Know</p>
                        <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary">Common Policies</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
                        {[
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>, title: "Valid ID Required", desc: "Government ID at check-in" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: "Security Deposit", desc: "Refunded at checkout" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: "Non-Refundable", desc: "Non-transferable booking" },
                            { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: "Damage Charges", desc: "If any damage occurs" },
                        ].map((policy, i) => (
                            <div key={i} className="text-center p-4 sm:p-6 rounded-xl border border-border-light bg-soft-gray/30">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-antique-gold/10 flex items-center justify-center text-antique-gold">{policy.icon}</div>
                                <h4 className="font-cinzel text-xs sm:text-sm font-semibold text-text-primary mb-1">{policy.title}</h4>
                                <p className="text-text-muted text-[10px] sm:text-xs font-inter">{policy.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
