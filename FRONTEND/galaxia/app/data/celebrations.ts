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
    size?: string;
}

// Time slots from 10:00 AM to 12:00 AM (Midnight)
export const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const startHour = 10 + i;
    const endHour = startHour + 1;
    const format12 = (h: number) => {
        if (h === 24 || h === 0) return "12:00 AM";
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
            "Enjoy a premium private movie screening with your loved ones. Sink into the atmosphere with your favourite film on the big screen, accompanied by snacks and drinks.",
        image: "",
        inclusions: [
            { icon: "film", label: "Private Movie Screening" },
            { icon: "popcorn", label: "Popcorn & Dry Snacks" },
            { icon: "drink", label: "Juice & Mineral Water" },
            { icon: "chocolate", label: "Chocolates" },
            { icon: "privacy", label: "No CCTV — Complete Privacy" },
        ],
        pricing: [
            { hours: 1, label: "1 Hour", weekday: 999, weekend: 999 },
            { hours: 2, label: "2 Hours", weekday: 1500, weekend: 1500 },
            { hours: 3, label: "3 Hours", weekday: 2500, weekend: 2500 },
        ],
        extraPerson: 300,
        extraHourRate: 1000,
    },
    celebration: {
        id: "celebration",
        name: "Decoration + Movie Time",
        tagline: "Private Screening Experience Here",
        description:
            "Transform your private screening into an unforgettable celebration. Whether it's a birthday, anniversary, proposal, or bachelorette — we set the stage with dreamy décor, fog effects, candlelight, and a personalized LED message tag.",
        image: "",
        inclusions: [
            { icon: "film", label: "Private Movie Screening" },
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
        image: "",
        gallery: [
            "",
            "",
            "",
            "",
        ],
        capacity: "3 Guests",
        size: "15 x 8 sq foot",
    },
    "cine-love": {
        id: "cine-love",
        name: "Cine Love",
        theme: "Romantic Theme",
        tagline: "The perfect date night screen",
        description:
            "Cine Love is crafted for romance — think fairy-light canopies, plush cushions, rose-petal pathways, and intimate seating for two. Whether it's a proposal, anniversary, or simply a date night, this screen sets the mood like no other.",
        image: "",
        gallery: [
            "",
            "",
            "",
            "",
        ],
        capacity: "8 Guests",
        size: "15 x 8 sq foot",
    },
    "park-n-watch": {
        id: "park-n-watch",
        name: "Park N Watch",
        theme: "Car / Drive-In Theme",
        tagline: "Your own drive-in cinema",
        description:
            "Experience the nostalgia of a classic American drive-in cinema. Park N Watch features a retro setting with vintage car elements, neon signage, and a giant outdoor screen — all within a private enclosure. Roll down the windows and enjoy the show.",
        image: "",
        gallery: [
            "",
            "",
            "",
            "",
        ],
        capacity: "3 Guests",
        size: "15 x 8 sq foot",
    },
    baywatch: {
        id: "baywatch",
        name: "Baywatch",
        theme: "Greece Theme",
        tagline: "Mediterranean cinema under the stars",
        description:
            "Baywatch brings the whitewashed charm of Santorini to your screening. Blue domes, flowing drapes, and Mediterranean ambiance create a breathtaking backdrop for watching movies under starlit ceilings. A truly Grecian escape.",
        image: "",
        gallery: [
            "",
            "",
            "",
            "",
        ],
        capacity: "3 Guests",
        size: "15 x 8 sq foot",
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
