import Link from "next/link";
import Image from "next/image";

export const metadata = {
    title: "About Us — Galaxia | Crafting Private Escapes",
    description: "Learn about Galaxia — curating luxury staycation experiences in Karjat with private pool villas, themed stays, and mountain retreats.",
};

const values = [
    { title: "Privacy as Luxury", description: "True luxury is space — space to relax, celebrate, reconnect, and unwind without disturbance." },
    { title: "Experiences Over Rooms", description: "Morning coffee with mountain views. An evening swim in your private pool. Laughter echoing in a villa garden." },
    { title: "Simplicity with Sophistication", description: "Elegant design. Thoughtful amenities. Seamless support. No excess — only what enhances your comfort." },
];

const collection = [
    { label: "Mountain-view apartments", description: "for cozy escapes" },
    { label: "Bathtub retreats", description: "for romantic stays" },
    { label: "Indoor private pool villas", description: "for intimate luxury" },
    { label: "Garden pool villas", description: "for families" },
    { label: "Theme-inspired villas", description: "Bollywood to Santorini to Bali" },
    { label: "Indoor pool cottages", description: "with curated dining" },
];

const commitments = [
    "Clear pricing structure",
    "Defined policies",
    "Verified properties",
    "Secure booking process",
    "Responsive guest support",
];

// SVG Background Patterns Component
const BackgroundDecoration = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center z-0 opacity-20">
        <svg className="absolute w-[800px] h-[800px] text-antique-gold stroke-current -top-40 -left-[300px]" viewBox="0 0 100 100" fill="none" strokeWidth="0.2">
            <circle cx="50" cy="50" r="40" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="30" strokeDasharray="1 3" />
            <circle cx="50" cy="50" r="20" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" strokeWidth="0.1" />
            <line x1="50" y1="0" x2="50" y2="100" strokeWidth="0.1" />
        </svg>

        <svg className="absolute w-[1200px] h-[400px] text-antique-gold stroke-current top-[30%] -right-40 opacity-30" viewBox="0 0 500 150" preserveAspectRatio="none">
            <path d="M0,75 C100,0 200,150 300,75 C400,0 500,150 500,75" fill="none" strokeWidth="1" />
            <path d="M0,85 C100,10 200,160 300,85 C400,10 500,160 500,85" fill="none" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>

        <svg className="absolute w-[600px] h-[600px] text-antique-gold stroke-current bottom-0 -left-[100px] opacity-20" viewBox="0 0 100 100">
            <polygon points="50,10 90,90 10,90" fill="none" strokeWidth="0.3" transform="rotate(20 50 50)" />
            <polygon points="50,20 80,80 20,80" fill="none" strokeWidth="0.2" strokeDasharray="1 2" transform="rotate(-10 50 50)" />
        </svg>

        <div className="absolute right-[10%] top-[15%] w-32 h-32 rounded-full border border-antique-gold/20 bg-antique-gold/5" />
        <div className="absolute left-[20%] bottom-[20%] w-64 h-64 rounded-full border border-antique-gold/10 bg-antique-gold/[0.02]" />
    </div>
);

export default function AboutPage() {
    return (
        <div className="bg-cream-white relative min-h-screen pt-20">
            <BackgroundDecoration />

            {/* Introduction - Replaces Hero */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
                <div className="text-center">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.4em] uppercase mb-4">Crafting Private Escapes</p>
                    <h1 className="font-cinzel text-5xl sm:text-6xl md:text-7xl font-bold text-text-primary mb-8 leading-tight">About GALAXIA</h1>
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-10" />

                    <p className="font-inter text-text-secondary text-base sm:text-xl leading-relaxed mb-8 max-w-3xl mx-auto">
                        In the quiet embrace of Karjat&apos;s mountains, where mist rolls gently over green valleys and time slows down, we create more than stays — we craft <span className="text-antique-gold font-medium italic">private experiences</span>.
                    </p>
                    <p className="font-inter text-text-secondary text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                        Our collection of villas and resorts is built on a simple philosophy: Luxury should feel personal. Comfort should feel effortless. And every getaway should feel <span className="text-antique-gold font-medium">unforgettable</span>.
                    </p>
                </div>
            </section>

            {/* Our Story */}
            <section className="relative z-10 bg-white/90 border-y border-border-light overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3 text-center lg:text-left">The Beginning</p>
                            <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-6 text-center lg:text-left">Our Story</h2>
                            <div className="w-12 h-[1px] bg-antique-gold mb-8 mx-auto lg:mx-0" />
                            <div className="space-y-6 font-inter text-sm text-text-secondary leading-relaxed">
                                <p className="text-base">What began as a vision to redefine weekend getaways in Karjat has grown into a curated portfolio of distinctive stays — each with its own character, ambiance, and story.</p>

                                <div className="space-y-3 pl-4 border-l-2 border-antique-gold/30">
                                    <p className="font-medium text-text-primary mb-2 text-sm uppercase tracking-widest">We saw a need for:</p>
                                    <ul className="space-y-3">
                                        {[
                                            "Private spaces instead of crowded resorts",
                                            "Transparent pricing instead of hidden surprises",
                                            "Clean, secure properties guests can trust",
                                            "Experiences that feel exclusive yet accessible",
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-antique-gold mt-1.5 shrink-0" />
                                                <span className="text-text-primary/80">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="pt-2">Today, our collection ranges from mountain-view apartments to immersive themed villas — serving couples, families, and celebration seekers alike.</p>
                            </div>
                        </div>
                        <div className="relative h-[450px] lg:h-[550px] rounded-[2rem] overflow-hidden shadow-xl p-4 bg-white border border-border-light transform rotate-3 hover:rotate-0 transition-transform duration-500">
                            <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden">
                                <Image src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80" alt="Galaxia Villa" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
                <div className="text-center mb-16">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">What Drives Us</p>
                    <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-4">Our Philosophy</h2>
                    <div className="w-16 h-[1px] bg-antique-gold mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
                    {values.map((v, i) => (
                        <div key={i} className={`group relative bg-white/95 border border-border-light p-10 transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl ${i === 0 ? "rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-xl rounded-bl-xl" :
                            i === 1 ? "rounded-3xl" :
                                "rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-xl rounded-br-xl"
                            }`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-cinzel text-6xl font-black text-antique-gold pointer-events-none group-hover:scale-110 transition-transform duration-300">0{i + 1}</div>
                            <h3 className="font-cinzel text-xl font-bold text-text-primary mb-4 relative z-10">{v.title}</h3>
                            <div className="w-8 h-0.5 bg-antique-gold/50 mb-4 group-hover:w-16 transition-all duration-300" />
                            <p className="font-inter text-sm text-text-secondary leading-loose relative z-10">{v.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Collection */}
            <section className="relative z-10 py-20 sm:py-32 bg-[#faf8f4] border-y border-border-light">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-16">
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Our Portfolio</p>
                        <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-6">Our Collection</h2>
                        <div className="w-16 h-[1px] bg-antique-gold mx-auto mb-8" />
                        <p className="font-inter text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">Each property reflects a unique identity, but all share a common promise: <br /><span className="text-antique-gold font-semibold uppercase tracking-widest text-xs mt-2 inline-block">Cleanliness. Comfort. Privacy. Trust.</span></p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                        {collection.map((item, i) => (
                            <div key={i} className="group relative">
                                <div className="absolute inset-0 bg-antique-gold/5 transform translate-x-1.5 translate-y-1.5 rounded-xl group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
                                <div className="relative bg-white border border-border-light p-8 rounded-xl h-full flex flex-col items-center text-center justify-center hover:border-antique-gold/40 transition-colors duration-300">
                                    <h4 className="font-cinzel text-lg font-bold text-text-primary mb-2 line-clamp-2">{item.label}</h4>
                                    <p className="font-inter text-sm text-text-secondary italic">&ldquo;{item.description}&rdquo;</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Commitment */}
            <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Our Promise</p>
                        <h2 className="font-cinzel text-3xl sm:text-4xl font-semibold text-text-primary mb-6">Our Commitment</h2>
                        <div className="w-12 h-[1px] bg-antique-gold mb-8" />
                        <p className="font-inter text-base text-text-secondary leading-relaxed mb-8">We operate with transparency and clarity. Every detail — from check-in to checkout — is managed with care.</p>
                        <div className="flex flex-col gap-4">
                            {commitments.map((c, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-full border border-antique-gold/30 flex items-center justify-center shrink-0 group-hover:bg-antique-gold/10 transition-colors">
                                        <svg className="w-4 h-4 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <span className="font-inter text-sm font-medium text-text-primary/90 tracking-wide uppercase">{c}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 border-2 border-dashed border-antique-gold/30 rounded-full animate-[spin_60s_linear_infinite] motion-reduce:animate-none" />
                        <div className="bg-white rounded-full aspect-square border-4 border-[#faf8f4] shadow-lg p-10 sm:p-14 flex flex-col items-center justify-center text-center m-4 z-10 relative">
                            <p className="text-antique-gold font-inter text-[10px] tracking-[0.4em] uppercase mb-3">Rooted In</p>
                            <h3 className="font-cinzel text-3xl font-bold text-text-primary mb-4">Karjat</h3>
                            <div className="w-8 h-px bg-border-light mb-4" />
                            <p className="font-inter text-xs text-text-secondary leading-relaxed mb-4">proximity without chaos. Just a short drive from Mumbai & Pune, yet surrounded by greenery, hills, and stillness.</p>
                            <p className="font-cinzel text-[10px] text-antique-gold uppercase tracking-wider">&ldquo;Escape and connection.&rdquo;</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision CTA */}
            <section className="relative z-10 bg-cream-white py-20 sm:py-24 border-t border-border-light overflow-hidden">
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-6">Looking Ahead</p>
                    <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-10">Your Escape Awaits</h2>

                    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-12">
                        <div className="flex items-center gap-3 font-cinzel text-lg sm:text-xl md:text-2xl">
                            <span className="text-text-muted line-through decoration-1">Not bigger.</span>
                            <span className="text-antique-gold font-semibold uppercase tracking-wider">Better.</span>
                        </div>
                        <div className="flex items-center gap-3 font-cinzel text-lg sm:text-xl md:text-2xl">
                            <span className="text-text-muted line-through decoration-1">Not louder.</span>
                            <span className="text-antique-gold font-semibold uppercase tracking-wider">More meaningful.</span>
                        </div>
                    </div>

                    <p className="font-inter text-sm sm:text-base text-text-secondary leading-relaxed mb-12 max-w-2xl mx-auto">Whether you seek romance, celebration, solitude, or a themed indulgence — we invite you to experience Karjat in a way that feels entirely your own.</p>

                    <Link href="/staycation" className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-antique-gold bg-transparent text-antique-gold font-inter text-sm font-semibold tracking-widest uppercase hover:bg-antique-gold hover:text-white transition-all duration-300">
                        Explore Our Properties
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                </div>
            </section>
        </div>
    );
}
