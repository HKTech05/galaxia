export const metadata = {
    title: "Sightseeing — Galaxia | Nearby Attractions in Karjat",
    description: "Discover stunning attractions near Karjat — from ancient caves and forts to waterfalls, hill stations, and Bollywood studios.",
};

interface Attraction {
    name: string;
    distance: string;
    driveTime: string;
    description: string;
    image: string;
    category: string;
    icon: string;
}

const attractions: Attraction[] = [
    {
        name: "Kondana Caves & Fort",
        distance: "28.4 km",
        driveTime: "58 mins",
        description: "A historic Buddhist cave complex believed to date back to the 1st century BC. The caves feature intricate carvings, stupas, and ancient architecture. Especially beautiful during the monsoon season when waterfalls flow around the caves.",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        category: "History",
        icon: "🏛️",
    },
    {
        name: "Kothaligad (Peth Fort)",
        distance: "11.4 km",
        driveTime: "25 mins",
        description: "Nestled in the Bhivpuri region, this fort is well-known for its cave temple and scenic views from the top. A short trek leads to breathtaking panoramic views at approximately 3,100 ft altitude.",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        category: "Adventure",
        icon: "⛰️",
    },
    {
        name: "Solanpada Waterfalls",
        distance: "12.4 km",
        driveTime: "26 mins",
        description: "A hidden gem offering lush greenery and peaceful surroundings. Popular during the monsoon season, this waterfall provides a refreshing natural retreat and is perfect for nature lovers.",
        image: "https://images.unsplash.com/photo-1432405972618-c6b0cfba5849?w=800&q=80",
        category: "Nature",
        icon: "🌊",
    },
    {
        name: "Matheran",
        distance: "25 km",
        driveTime: "40 mins to Neral",
        description: "One of the very few vehicle-free hill stations in India. Famous for scenic viewpoints, toy train rides, red soil paths, and serene surroundings — a peaceful mountain escape near Karjat.",
        image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
        category: "Hill Station",
        icon: "🚂",
    },
    {
        name: "ND Studio",
        distance: "29.2 km",
        driveTime: "58 mins",
        description: "A renowned film studio known for Bollywood movie sets. Visitors can explore grand shooting locations and experience behind-the-scenes glimpses of Indian cinema.",
        image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
        category: "Entertainment",
        icon: "🎬",
    },
    {
        name: "Shri Bal Digambar Ganesh Mandir",
        distance: "9 km",
        driveTime: "15 mins",
        description: "A divine idol of Lord Ganesha, believed to be 8–9 feet tall, carved from a single marble stone. A spiritually significant temple attracting devotees, especially during Ganesh festivals.",
        image: "https://images.unsplash.com/photo-1609619385002-f40f1df9b5a4?w=800&q=80",
        category: "Spiritual",
        icon: "🛕",
    },
];

const categories = ["All", "History", "Adventure", "Nature", "Hill Station", "Entertainment", "Spiritual"];

export default function SightseeingPage() {
    return (
        <div className="bg-cream-white min-h-screen">
            {/* Hero */}
            <section className="relative h-[45vh] sm:h-[55vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80')` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-cream-white" />
                <div className="relative z-10 text-center px-4">
                    <p className="text-antique-gold font-inter text-xs tracking-[0.4em] uppercase mb-4">Explore Karjat</p>
                    <h1 className="font-cinzel text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">Sightseeing</h1>
                    <div className="w-20 h-[2px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-4" />
                    <p className="font-inter text-white/80 text-sm sm:text-base max-w-md mx-auto">
                        Discover the beauty and adventure that surrounds our properties
                    </p>
                </div>
            </section>

            {/* Vertical Cards — Reference Style */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                <div className="flex flex-col lg:flex-row gap-4 lg:h-[550px]">
                    {attractions.map((spot, i) => (
                        <div
                            key={spot.name}
                            className="group relative flex-none h-[300px] lg:flex-1 lg:h-auto rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 lg:hover:flex-[3] border border-border-light"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${spot.image}')` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 group-hover:from-black/70" />

                            {/* Vertical Name Label — visible when collapsed */}
                            <div className="hidden lg:flex absolute inset-0 items-center justify-center group-hover:opacity-0 transition-opacity duration-500">
                                <div className="writing-mode-vertical transform -rotate-180 font-cinzel text-white text-xl font-bold tracking-widest whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
                                    {spot.name.toUpperCase()}
                                </div>
                            </div>

                            {/* Content — slides up on hover */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 transform lg:translate-y-4 lg:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                {/* Category Badge */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{spot.icon}</span>
                                    <span className="text-[10px] font-inter font-medium text-antique-gold uppercase tracking-widest">{spot.category}</span>
                                </div>

                                {/* Name */}
                                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white mb-2">{spot.name}</h3>

                                {/* Distance & Drive Time */}
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="font-inter text-xs text-white/80 font-medium">{spot.distance}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span className="font-inter text-xs text-white/80 font-medium">{spot.driveTime}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="font-inter text-xs text-white/70 leading-relaxed line-clamp-3">{spot.description}</p>
                            </div>

                            {/* Mobile — always show basic info */}
                            <div className="lg:hidden absolute bottom-0 left-0 right-0 p-5">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">{spot.icon}</span>
                                    <span className="text-[10px] font-inter font-medium text-antique-gold uppercase tracking-widest">{spot.category}</span>
                                </div>
                                <h3 className="font-cinzel text-base font-bold text-white mb-1">{spot.name}</h3>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-inter text-[11px] text-white/70">{spot.distance}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/40" />
                                    <span className="font-inter text-[11px] text-white/70">{spot.driveTime}</span>
                                </div>
                                <p className="font-inter text-[11px] text-white/60 leading-relaxed line-clamp-2">{spot.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Explore More CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 text-center">
                <div className="bg-[#faf8f4] rounded-2xl border border-border-light p-8 sm:p-12">
                    <div className="text-3xl mb-4">🌿</div>
                    <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-3">Explore More Around Karjat</h2>
                    <p className="font-inter text-sm text-text-secondary max-w-md mx-auto mb-6">Whether you&apos;re seeking adventure, spirituality, nature, or cinematic experiences — Karjat offers a diverse range of attractions just a short drive away.</p>
                    <a
                        href="https://maps.app.goo.gl/1v6azy4nLhHe7Hzq6"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-antique-gold to-dark-gold text-white font-inter text-sm font-medium hover:shadow-lg hover:shadow-antique-gold/20 transition-all duration-300"
                    >
                        View on Google Maps
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
            </section>
        </div>
    );
}
