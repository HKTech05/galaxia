import Link from "next/link";

export default function PropertyUnavailablePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream to-warm-white px-4">
            <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                </div>
                <h1 className="font-cinzel text-2xl sm:text-3xl font-semibold text-text-primary mb-3">
                    Property Unavailable
                </h1>
                <p className="text-text-secondary font-inter text-sm sm:text-base mb-8 leading-relaxed">
                    This property is currently unavailable for booking. Please check back later or explore our other properties.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/staycation"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-antique-gold to-dark-gold text-white font-cinzel text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        View All Properties
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-6 py-3 border border-border-light text-text-primary font-cinzel text-sm font-semibold rounded-lg hover:bg-warm-white transition-all duration-300"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
