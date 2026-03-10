// Celebration data for Digital Diaries

export interface CelebrationPackage {
    id: string;
    name: string;
    tagline: string;
    description: string;
    image: string;
    inclusions: { icon: string; label: string }[];
    pricing: {
        hours: number;
        label: string;
        weekday: number;
        weekend: number;
    }[];
    extraPerson: number;
    extraHourRate?: number;
    minHours?: number;
}

export interface ScreenData {
    id: string;
    name: string;
    theme: string;
    tagline: string;
    description: string;
    image: string;
    gallery: string[];
    capacity: string;
}

// Time slots from 10:00 AM to 10:00 PM
export const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const startHour = 10 + i;
    const endHour = startHour + 1;
    const format12 = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return `${hour12}:00 ${period}`;
    };
    const period = startHour < 12 ? "Morning" : startHour < 17 ? "Afternoon" : startHour < 20 ? "Evening" : "Night";
    return {
        id: `slot-${startHour}`,
        start: format12(startHour),
        end: format12(endHour),
        label: `${format12(startHour)} – ${format12(endHour)}`,
        period,
    };
});

export const packages: Record<string, CelebrationPackage> = {
    "movie-time": {
        id: "movie-time",
        name: "Movie Time",
        tagline: "Private Screening Experience",
        description:
            "Enjoy a premium private movie screening with your loved ones. Sink into the atmosphere with your favourite film on the big screen, accompanied by a complimentary hamper of snacks and drinks.",
        image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
        inclusions: [
            { icon: "film", label: "Private Movie Screening" },
            { icon: "gift", label: "Complimentary Hamper" },
            { icon: "popcorn", label: "Popcorn & Dry Snacks" },
            { icon: "drink", label: "Juice & Mineral Water" },
            { icon: "chocolate", label: "Chocolates" },
            { icon: "privacy", label: "No CCTV — Complete Privacy" },
        ],
        pricing: [
            { hours: 1, label: "1 Hour", weekday: 999, weekend: 999 },
            { hours: 2, label: "2 Hours", weekday: 1500, weekend: 1500 },
            { hours: 3, label: "3 Hours", weekday: 1950, weekend: 1950 },
        ],
        extraPerson: 300,
        extraHourRate: 1000,
    },
    celebration: {
        id: "celebration",
        name: "Celebration",
        tagline: "Movie Time + Decoration",
        description:
            "Transform your private screening into an unforgettable celebration. Whether it's a birthday, anniversary, proposal, or bachelorette — we set the stage with dreamy décor, fog effects, candlelight, and a personalized LED message tag.",
        image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
        inclusions: [
            { icon: "film", label: "Private Movie Screening" },
            { icon: "gift", label: "Complimentary Hamper" },
            { icon: "cake", label: "Celebration Cake (250g)" },
            { icon: "led", label: "LED Message Tag" },
            { icon: "fog", label: "Walking on Cloud (Fog Effect)" },
            { icon: "heart", label: "Heart-Lit Pathway" },
            { icon: "candle", label: "Candle Setup" },
            { icon: "privacy", label: "No CCTV — Complete Privacy" },
        ],
        pricing: [
            { hours: 2, label: "2 Hours", weekday: 2950, weekend: 2950 },
            { hours: 3, label: "3 Hours", weekday: 3450, weekend: 3950 },
        ],
        extraPerson: 300,
        extraHourRate: 1000,
        minHours: 2,
    },
};

export const screens: Record<string, ScreenData> = {
    "sandy-screen": {
        id: "sandy-screen",
        name: "Sandy Screen",
        theme: "Beach Theme",
        tagline: "Feel the sand between your toes",
        description:
            "Step onto a sun-kissed beach right in the heart of the city. Sandy Screen is designed with warm tones, real sand textures, and coastal décor to bring the ocean vibes to your private screening. Perfect for a laid-back, tropical movie night.",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
            "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&q=80",
            "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&q=80",
        ],
        capacity: "Up to 10 guests",
    },
    "cine-love": {
        id: "cine-love",
        name: "Cine Love",
        theme: "Romantic Theme",
        tagline: "The perfect date night screen",
        description:
            "Cine Love is crafted for romance — think fairy-light canopies, plush cushions, rose-petal pathways, and intimate seating for two. Whether it's a proposal, anniversary, or simply a date night, this screen sets the mood like no other.",
        image: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&q=80",
            "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80",
            "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80",
            "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80",
        ],
        capacity: "Up to 6 guests",
    },
    "park-n-watch": {
        id: "park-n-watch",
        name: "Park N Watch",
        theme: "Car / Drive-In Theme",
        tagline: "Your own drive-in cinema",
        description:
            "Experience the nostalgia of a classic American drive-in cinema. Park N Watch features a retro setting with vintage car elements, neon signage, and a giant outdoor screen — all within a private enclosure. Roll down the windows and enjoy the show.",
        image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
            "https://images.unsplash.com/photo-1440169378057-587b21f3d699?w=800&q=80",
            "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=800&q=80",
            "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
        ],
        capacity: "Up to 8 guests",
    },
    baywatch: {
        id: "baywatch",
        name: "Baywatch",
        theme: "Greece Theme",
        tagline: "Mediterranean cinema under the stars",
        description:
            "Baywatch brings the whitewashed charm of Santorini to your screening. Blue domes, flowing drapes, and Mediterranean ambiance create a breathtaking backdrop for watching movies under starlit ceilings. A truly Grecian escape.",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
            "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
            "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=800&q=80",
            "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80",
        ],
        capacity: "Up to 8 guests",
    },
};

export function getPackage(slug: string): CelebrationPackage | undefined {
    return packages[slug];
}

export function getScreen(slug: string): ScreenData | undefined {
    return screens[slug];
}

export function getAllPackageSlugs(): string[] {
    return Object.keys(packages);
}

export function getAllScreenSlugs(): string[] {
    return Object.keys(screens);
}

export function formatPrice(amount: number): string {
    return `₹${amount.toLocaleString("en-IN")}`;
}
