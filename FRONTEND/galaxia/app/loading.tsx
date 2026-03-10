export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCF9]">
            <div className="flex flex-col items-center gap-6">
                {/* Animated rings */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-antique-gold/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-antique-gold animate-spin" style={{ animationDuration: '1s' }} />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-dark-gold animate-spin" style={{ animationDuration: '0.7s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-cinzel font-bold text-antique-gold text-sm">G</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-antique-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-antique-gold/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}
