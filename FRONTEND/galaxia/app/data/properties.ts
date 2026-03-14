export interface PropertyData {
    id: string;
    name: string;
    subtitle: string;
    type: "standalone" | "resort";
    description: string;
    longDescription: string;
    images: string[];
    checkIn: string;
    checkOut: string;
    pricing: {
        weekday: { price: string; persons: string };
        weekend: { price: string; persons: string };
        primeDates?: string;
        extraAdult: string;
        kidsCharge: string;
        special?: { label: string; price: string }[];
    };
    gstPercent: number;
    securityDeposit: string;
    securityRefund: string;
    bookingPolicy: string;
    maxPersons: number;
    foodPolicy: {
        included: boolean;
        details: string;
        type: string;
        menuFile?: string;
    };
    amenities: { icon: string; name: string }[];
    configuration: string[];
    facilities: {
        category: string;
        icon: string;
        items: string[];
    }[];
    activities: { title: string; description: string; image: string }[];
    instagram?: string;
    googleMap?: string;
    location: string;
    subProperties?: {
        id: string;
        name: string;
        theme: string;
        description: string;
        image: string;
        maxPersons?: number;
        configuration?: string[];
        pricing?: {
            weekday: { price: string; persons: string };
            weekday4Ppl?: { price: string; persons: string };
            weekend: { price: string; persons: string };
            weekend4Ppl?: { price: string; persons: string };
            saturday?: { price: string; persons: string };
            primeDates?: string;
        };
    }[];
}

const placeholderImages = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
    "https://images.unsplash.com/photo-1615571022219-eb45cf7faa36?w=1200&q=80",
    "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=80",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
];

export const properties: Record<string, PropertyData> = {
    ambrose: {
        id: "ambrose",
        name: "Ambrose",
        subtitle: "Themed Villa Resort",
        type: "resort",
        description: "Five exquisitely themed villas — Bollywood, Rustic, Greek, Bali, and Machan — each with a private pool.",
        longDescription:
            "Ambrose is where imagination meets luxury. This extraordinary resort features five uniquely themed villas, each designed to transport you to a different world. From the dramatic flair of Bollywood's TAKE-1 to the serene whites of Santorini, the earthy charm of Alta, the tropical grandeur of Bamboosa, and the elevated magic of Cypress's machan — every stay is a new story. All villas include private pools, garden seating, and delicious vegetarian meals.",
        images: placeholderImages.slice(0, 10),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "5,500", persons: "2 with meals" },
            weekend: { price: "6,500", persons: "2 with meals" },
            extraAdult: "2,000",
            kidsCharge: "1,000 (5–12 yrs)",
        },
        gstPercent: 5,
        securityDeposit: "3,000",
        securityRefund: "Refund within 24 hours",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 8,
        foodPolicy: {
            included: true,
            details: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.",
            type: "Veg Only",
            menuFile: "/menus/ambrose-amstel-menu.jpeg",
        },
        amenities: [
            { icon: "bed", name: "King Bedroom" },
            { icon: "sofa", name: "Sofa Cum Bed Room" },
            { icon: "bath", name: "2 Washrooms" },
            { icon: "swim", name: "Private Pool" },
            { icon: "tree", name: "Garden Seating" },
            { icon: "snowflake", name: "2 AC" },
            { icon: "tv", name: "Smart TV" },
            { icon: "food", name: "Meals Included" },
        ],
        configuration: [
            "1 King Bedroom",
            "1 Sofa Cum Bed Room",
            "2 Washrooms",
            "Private Pool",
            "Garden Seating",
            "2 AC",
            "Smart TV",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["5 Themed Villas", "King Size Beds", "Sofa Cum Beds", "2 Washrooms"],
            },
            {
                category: "Dining",
                icon: "food",
                items: ["Breakfast Included", "Lunch Included", "Dinner Included", "Veg Only"],
            },
            {
                category: "Pool & Outdoors",
                icon: "swim",
                items: ["Private Pool per Villa", "Garden Seating", "Mountain Views", "Nature Trails"],
            },
            {
                category: "Comfort",
                icon: "snowflake",
                items: ["2 AC per Villa", "Smart TV", "Themed Interiors", "Premium Bedding"],
            },
        ],
        activities: [
            {
                title: "Themed Villa Experience",
                description: "Each villa transports you to a different world — Bollywood, Greek, Bali, and more.",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
            },
            {
                title: "Private Pool Retreat",
                description: "Every villa comes with its own private pool for an exclusive swimming experience.",
                image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
            },
            {
                title: "Culinary Journey",
                description: "All meals included — enjoy delicious vegetarian cuisine throughout your stay.",
                image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
            },
        ],
        subProperties: [
            {
                id: "take-1",
                name: "TAKE-1",
                theme: "Bollywood Theme",
                description: "Film-inspired interiors with vibrant dramatic decor that celebrates Indian cinema.",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
                configuration: ["1 King Bedroom", "1 Sofa Cum Bed Room", "2 Washrooms", "Private Pool", "Garden Seating", "2 AC", "Smart TV"],
                maxPersons: 8,
                pricing: {
                    weekday: { price: "5,500", persons: "2 with meals" },
                    weekday4Ppl: { price: "9,500", persons: "4 with meals" },
                    weekend: { price: "6,500", persons: "2 with meals" },
                    weekend4Ppl: { price: "10,500", persons: "4 with meals" },
                    saturday: { price: "12,000", persons: "Up to 4 with meals" },
                },
            },
            {
                id: "alta",
                name: "ALTA",
                theme: "Rustic Theme",
                description: "Earthy wooden textures with countryside aesthetics for a grounded, cozy escape.",
                image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=80",
                configuration: ["2 King Size Beds", "2 Washrooms", "Private Pool", "Garden Seating", "2 AC", "Smart TV"],
                maxPersons: 8,
                pricing: {
                    weekday: { price: "5,500", persons: "2 with meals" },
                    weekday4Ppl: { price: "9,500", persons: "4 with meals" },
                    weekend: { price: "6,500", persons: "2 with meals" },
                    weekend4Ppl: { price: "10,500", persons: "4 with meals" },
                    saturday: { price: "12,000", persons: "Up to 4 with meals" },
                },
            },
            {
                id: "santorini",
                name: "SANTORINI",
                theme: "Greek Inspired Theme",
                description: "White & blue Mediterranean-style interiors that bring Santorini to Karjat.",
                image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80",
                configuration: ["1 King Size Bed", "1 Queen Size Bed", "2 Washrooms", "Private Pool", "Garden Seating", "2 AC", "Smart TV"],
                maxPersons: 8,
                pricing: {
                    weekday: { price: "5,500", persons: "2 with meals" },
                    weekday4Ppl: { price: "9,500", persons: "4 with meals" },
                    weekend: { price: "6,500", persons: "2 with meals" },
                    weekend4Ppl: { price: "10,500", persons: "4 with meals" },
                    saturday: { price: "12,000", persons: "Up to 4 with meals" },
                },
            },
            {
                id: "bamboosa",
                name: "BAMBOOSA",
                theme: "Bali Theme (Premium)",
                description: "Premium villa with 2 king bedrooms, spacious living room, and tropical Bali-inspired interiors.",
                image: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=600&q=80",
                configuration: ["2 King Bedrooms", "Spacious Living Room", "4 Bathrooms", "4 AC", "Private Pool", "Garden Seating"],
                maxPersons: 12,
                pricing: {
                    weekday: { price: "10,500", persons: "4 with meals" },
                    weekend: { price: "11,500", persons: "4 with meals" },
                    saturday: { price: "13,000", persons: "4 with meals" },
                },
            },
            {
                id: "cypress",
                name: "CYPRESS",
                theme: "Machan Theme",
                description: "Elevated treehouse-style villa with a glass-bottom pool view and mountain deck.",
                image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80",
                configuration: ["1 Queen Bedroom", "Glass Bottom Pool View", "Private Pool", "Kids Sleeping Area", "Mountain Deck"],
                maxPersons: 4,
                pricing: {
                    weekday: { price: "5,500", persons: "2 with meals" },
                    weekend: { price: "6,500", persons: "2 with meals" },
                },
            },
        ],
        instagram: "https://instagram.com/ambrose_villas",
        location: "Karjat, Maharashtra, India",
    },
    "amstel-nest": {
        id: "amstel-nest",
        name: "Amstel Nest",
        subtitle: "Mini Amsterdam — Indoor Pool Cottages",
        type: "resort",
        description: "14 unique cottages inspired by Amsterdam, each with a private indoor pool. Meals included.",
        longDescription:
            "Welcome to Amstel Nest — a slice of Amsterdam in the heart of Karjat. This one-of-a-kind resort features 14 charming cottages, each equipped with its own private indoor pool. But the experience goes far beyond just swimming — enjoy the gaming zone with pool tables and table tennis, go boating on the lake, and savor delicious vegetarian meals included in your stay. One special cottage offers extra space with 2 double beds for larger groups.",
        images: placeholderImages.slice(0, 10),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "4,950", persons: "2 persons with meals" },
            weekend: { price: "6,950", persons: "2 persons with meals" },
            extraAdult: "2,000",
            kidsCharge: "1,000 (5–12 yrs)",
        },
        gstPercent: 5,
        securityDeposit: "2,000",
        securityRefund: "Refund at checkout",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 4,
        foodPolicy: {
            included: true,
            details: "Meals Included — Lunch, Dinner & Breakfast. Only Veg. Jain food available on prior notice.",
            type: "Veg Only (Jain on request)",
            menuFile: "/menus/ambrose-amstel-menu.jpeg",
        },
        amenities: [
            { icon: "bed", name: "Double Bed" },
            { icon: "tv", name: "Smart TV" },
            { icon: "snowflake", name: "Air Conditioner" },
            { icon: "bath", name: "Washroom" },
            { icon: "swim", name: "Indoor Private Pool" },
            { icon: "tree", name: "Garden Sitting Area" },
            { icon: "game", name: "Gaming Zone" },
            { icon: "wifi", name: "WiFi" },
            { icon: "boat", name: "Boating" },
            { icon: "food", name: "Meals Included" },
        ],
        configuration: [
            "Double Bed (1 cottage has 2 double beds)",
            "Smart TV",
            "Air Conditioner",
            "Washroom",
            "Indoor Private Pool",
            "Garden Sitting Area",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["14 Private Cottages", "Double Beds", "Smart TV", "AC & Washroom"],
            },
            {
                category: "Dining",
                icon: "food",
                items: ["Breakfast Included", "Lunch Included", "Dinner Included", "Jain Food on Request"],
            },
            {
                category: "Recreation",
                icon: "game",
                items: ["Pool Table", "Table Tennis", "Table Soccer", "Foosball"],
            },
            {
                category: "Outdoors",
                icon: "swim",
                items: ["Indoor Private Pool", "Boating", "Garden Sitting", "Nature Walk"],
            },
        ],
        activities: [
            {
                title: "Private Pool Experience",
                description: "Each cottage comes with its very own private indoor pool for the ultimate privacy.",
                image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
            },
            {
                title: "Gaming Zone",
                description: "Challenge friends to pool, table tennis, foosball, and more in our gaming area.",
                image: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&q=80",
            },
            {
                title: "Boating Adventure",
                description: "Take a peaceful boat ride on the lake and enjoy the surrounding natural beauty.",
                image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
            },
        ],
        subProperties: [
            ...Array.from({ length: 13 }, (_, i) => ({
                id: `cottage-${i + 1}`,
                name: `Cottage ${i + 1}`,
                theme: "Amsterdam-Inspired",
                description: "Cozy cottage with double bed and private indoor pool — the essence of Amstel Nest.",
                image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=80",
                configuration: ["Double Bed", "Smart TV", "AC", "Washroom", "Indoor Private Pool", "Garden Area"],
                maxPersons: 4,
                pricing: {
                    weekday: { price: "4,950", persons: "2 persons with meals" },
                    weekend: { price: "6,950", persons: "2 persons with meals" },
                },
            })),
            {
                id: "family-cottage",
                name: "Family Cottage (14)",
                theme: "Amsterdam-Inspired (Larger)",
                description: "Spacious cottage with 2 double beds — perfect for families or groups of friends.",
                image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
                configuration: ["2 Double Beds", "Smart TV", "AC", "Washroom", "Indoor Private Pool", "Garden Area"],
                maxPersons: 4,
                pricing: {
                    weekday: { price: "4,950", persons: "2 persons with meals" },
                    weekend: { price: "6,950", persons: "2 persons with meals" },
                },
            },
        ],
        location: "Karjat, Maharashtra, India",
    },
    "la-paraiso": {
        id: "la-paraiso",
        name: "La Paraiso",
        subtitle: "Premium Private Pool Villa",
        type: "standalone",
        description: "Luxurious villa with a 25x10 ft private pool, 600 sq ft private garden, and beautiful gazebo.",
        longDescription:
            "La Paraiso is the crown jewel of our collection — a premium villa that redefines luxury. Dive into a sprawling 25x10 ft private pool, lounge in your 600 sq ft private garden, or find serenity under the beautiful gazebo. With a self check-in smart lock, Sony music player, and meticulous attention to detail, this villa delivers an experience that rivals five-star resorts. The nearby restaurant is just 10 steps away for when hunger strikes.",
        images: placeholderImages.slice(0, 8),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "4,950", persons: "2 persons" },
            weekend: { price: "7,500", persons: "Up to 4 persons" },
            primeDates: "8,500",
            extraAdult: "1,200",
            kidsCharge: "800 (5–12 yrs)",
            special: [
                { label: "Mon–Thu (4 persons)", price: "6,500" },
            ],
        },
        gstPercent: 5,
        securityDeposit: "3,000",
        securityRefund: "Refund at checkout",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 8,
        foodPolicy: {
            included: false,
            details: "Restaurant 10 steps away. Veg allowed inside villa. Non-Veg must be consumed in restaurant.",
            type: "Veg in villa, Non-Veg in restaurant",
            menuFile: "/menus/terracotta-menu.pdf",
        },
        amenities: [
            { icon: "bed", name: "1 Bedroom (Queen Bed)" },
            { icon: "sofa", name: "1 Sofa Cum Bed Room" },
            { icon: "bath", name: "2 Washrooms" },
            { icon: "kitchen", name: "Kitchen" },
            { icon: "tv", name: "Smart TV" },
            { icon: "music", name: "Sony Music Player" },
            { icon: "snowflake", name: "2 AC" },
            { icon: "swim", name: "Private Pool (25x10 ft)" },
            { icon: "tree", name: "600 sq ft Garden" },
            { icon: "star", name: "Private Gazebo" },
            { icon: "lock", name: "Self Check-in Lock" },
            { icon: "battery", name: "Inverter" },
            { icon: "wifi", name: "Free WiFi" },
            { icon: "car", name: "Free Parking" },
        ],
        configuration: [
            "1 Bedroom (Queen Bed)",
            "1 Sofa Cum Bed Room",
            "2 Washrooms",
            "Kitchen",
            "Private Pool (25x10 ft)",
            "600 sq ft Private Garden",
            "Private Gazebo",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["Queen Bedroom", "Sofa Cum Bed Room", "2 Washrooms", "Full Kitchen"],
            },
            {
                category: "Pool & Outdoors",
                icon: "swim",
                items: ["25x10 ft Private Pool", "600 sq ft Garden", "Private Gazebo", "Outdoor Seating"],
            },
            {
                category: "Entertainment",
                icon: "tv",
                items: ["Smart TV", "Sony Music Player", "WiFi", "Garden Activities"],
            },
            {
                category: "Premium Features",
                icon: "star",
                items: ["Self Check-in Lock", "2 AC", "Inverter", "Free Parking"],
            },
        ],
        activities: [
            {
                title: "Pool & Garden Paradise",
                description: "Swim in your massive 25x10 ft private pool and relax in the sprawling garden.",
                image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
            },
            {
                title: "Gazebo Evenings",
                description: "Spend magical evenings under the private gazebo with music and starlight.",
                image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
            },
            {
                title: "Dining Experience",
                description: "Enjoy delicious meals at the restaurant just 10 steps from your villa.",
                image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
            },
        ],
        instagram: "https://instagram.com/la_paraiso001",
        location: "Karjat, Maharashtra, India",
    },
    "heavenly-villa": {
        id: "heavenly-villa",
        name: "Heavenly Villa",
        subtitle: "Heavenly Villa — Private Indoor Pool",
        type: "standalone",
        description: "A heavenly studio villa with a private indoor swimming pool and a charming swing near the pool.",
        longDescription:
            "Heavenly Villa is not just a villa — it's a feeling. Step into this heavenly studio retreat featuring a private indoor swimming pool that's exclusively yours. A charming swing by the pool sets the mood for lazy afternoons, while the studio room with its queen bed and smart TV ensures comfort around the clock. Whether you're planning a romantic getaway or a peaceful solo retreat, Heavenly Villa delivers paradise indoors.",
        images: placeholderImages.slice(2, 10),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "3,950", persons: "2 persons" },
            weekend: { price: "4,950", persons: "2 persons" },
            extraAdult: "800",
            kidsCharge: "500 (5–12 yrs)",
        },
        gstPercent: 5,
        securityDeposit: "3,000",
        securityRefund: "Refund at checkout",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 4,
        foodPolicy: {
            included: false,
            details: "Restaurant available nearby",
            type: "Veg & Non-Veg",
            menuFile: "/menus/terracotta-menu.pdf",
        },
        amenities: [
            { icon: "bed", name: "Queen Bed" },
            { icon: "sofa", name: "Sofa Cum Bed" },
            { icon: "swim", name: "Private Indoor Pool" },
            { icon: "star", name: "Swing Near Pool" },
            { icon: "kitchen", name: "Kitchen (Basic Utensils)" },
            { icon: "tv", name: "Smart TV" },
            { icon: "music", name: "Music Player" },
            { icon: "snowflake", name: "1 AC" },
            { icon: "battery", name: "Inverter" },
            { icon: "wifi", name: "Free WiFi" },
            { icon: "car", name: "Free Parking" },
        ],
        configuration: [
            "Studio Room (Queen Bed)",
            "Sofa Cum Bed",
            "Private Indoor Swimming Pool",
            "Swing Near Pool",
            "Kitchen (Basic Utensils)",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["Studio Room", "Queen Bed", "Sofa Cum Bed", "Kitchen"],
            },
            {
                category: "Pool & Recreation",
                icon: "swim",
                items: ["Private Indoor Pool", "Pool Swing", "Garden Area", "Peaceful Setting"],
            },
            {
                category: "Entertainment",
                icon: "tv",
                items: ["Smart TV", "Music Player", "WiFi", "Reading Corner"],
            },
            {
                category: "Comfort",
                icon: "snowflake",
                items: ["Air Conditioner", "Inverter Backup", "Free Parking", "Free WiFi"],
            },
        ],
        activities: [
            {
                title: "Private Pool Bliss",
                description: "Enjoy your own private indoor pool anytime — no sharing, no schedules.",
                image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
            },
            {
                title: "Poolside Swing",
                description: "Relax on the charming swing right next to the pool for the perfect lazy afternoon.",
                image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
            },
            {
                title: "Explore Karjat",
                description: "Visit local waterfalls, temples, and scenic spots just minutes away.",
                image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
            },
        ],
        instagram: "https://www.instagram.com/heavenly_villa01",
        location: "Karjat, Maharashtra, India",
    },
    "mount-view": {
        id: "mount-view",
        name: "Mount View",
        subtitle: "Bathtub Mountain Apartment",
        type: "standalone",
        description: "Premium apartment with a private bathtub and enormous mountain-facing balcony.",
        longDescription:
            "Mount View elevates your staycation with a private bathtub experience set against a stunning mountain backdrop. The spacious apartment features a queen bed, a sofa-cum-bed for extra guests, and a huge balcony that frames the mountains like a living painting. With a music player to set the mood and modern amenities throughout, this is where luxury meets the wild beauty of Karjat.",
        images: placeholderImages.slice(1, 9),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "3,500", persons: "2 persons" },
            weekend: { price: "4,950", persons: "2 persons" },
            primeDates: "5,950",
            extraAdult: "800",
            kidsCharge: "500 (5–12 yrs)",
            special: [
                { label: "30 Dec", price: "5,450" },
                { label: "31 Dec", price: "10,000" },
                { label: "Extra Person (31st)", price: "2,500" },
            ],
        },
        gstPercent: 5,
        securityDeposit: "3,000",
        securityRefund: "Refund within 24 hours",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 6,
        foodPolicy: {
            included: false,
            details: "Veg & Non-Veg restaurant available nearby",
            type: "Veg & Non-Veg",
            menuFile: "/menus/terracotta-menu.pdf",
        },
        amenities: [
            { icon: "bed", name: "Queen Bed" },
            { icon: "sofa", name: "Sofa Cum Bed" },
            { icon: "bath", name: "Private Bathtub" },
            { icon: "mountain", name: "Mountain Balcony" },
            { icon: "kitchen", name: "Small Kitchen" },
            { icon: "bath", name: "2 Washrooms" },
            { icon: "tv", name: "Smart TV" },
            { icon: "music", name: "Music Player" },
            { icon: "snowflake", name: "2 AC" },
            { icon: "battery", name: "Inverter" },
            { icon: "wifi", name: "WiFi" },
            { icon: "car", name: "Free Parking" },
        ],
        configuration: [
            "1 Bedroom (Queen Bed)",
            "1 Sofa Cum Bed",
            "Private Bathtub",
            "Huge Mountain Balcony",
            "Small Kitchen",
            "2 Washrooms",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["Queen Bed", "Sofa Cum Bed", "Mountain Balcony", "Small Kitchen"],
            },
            {
                category: "Entertainment",
                icon: "tv",
                items: ["Smart TV", "Music Player", "WiFi", "Mountain Views"],
            },
            {
                category: "Wellness",
                icon: "heart",
                items: ["Private Bathtub", "Mountain View", "Peaceful Ambience", "Fresh Air"],
            },
            {
                category: "Comfort",
                icon: "snowflake",
                items: ["2 Air Conditioners", "Inverter Backup", "Free Parking", "2 Washrooms"],
            },
        ],
        activities: [
            {
                title: "Bathtub & Mountain Views",
                description: "Indulge in a luxurious bathtub experience while gazing at the mountains.",
                image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&q=80",
            },
            {
                title: "Sunset Watching",
                description: "Witness spectacular sunsets from your private mountain-facing balcony.",
                image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
            },
            {
                title: "Nature Walks",
                description: "Take leisurely walks through the surrounding countryside and villages.",
                image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
            },
        ],
        googleMap: "https://maps.app.goo.gl/1v6azy4nLhHe7Hzq6",
        location: "Karjat, Maharashtra, India",
    },
    "hill-view": {
        id: "hill-view",
        name: "Hill View",
        subtitle: "Budget Mountain View Apartment",
        type: "standalone",
        description: "A comfortable apartment with a stunning mountain view balcony — perfect for a peaceful retreat.",
        longDescription:
            "Perched amidst the lush green hills of Karjat, Hill View offers an unmatched mountain panorama from its huge open balcony. This thoughtfully designed apartment blends comfort with nature, featuring a queen-size bedroom, a cozy living room, and a small kitchen — everything you need for a serene getaway. Wake up to birdsong, sip your morning chai with a view, and let the mountains recharge your soul.",
        images: placeholderImages.slice(0, 8),
        checkIn: "1:00 PM",
        checkOut: "10:00 AM",
        pricing: {
            weekday: { price: "2,500", persons: "2 persons" },
            weekend: { price: "3,950", persons: "2 persons" },
            primeDates: "4,450",
            extraAdult: "600",
            kidsCharge: "400 (5–12 yrs)",
        },
        gstPercent: 5,
        securityDeposit: "2,000",
        securityRefund: "Refunded at checkout",
        bookingPolicy: "80% payable online at booking · 20% payable at the venue",
        maxPersons: 6,
        foodPolicy: {
            included: false,
            details: "Society restaurant available (Veg & Non-Veg)",
            type: "Veg & Non-Veg",
            menuFile: "/menus/terracotta-menu.pdf",
        },
        amenities: [
            { icon: "bed", name: "Queen Size Bed" },
            { icon: "sofa", name: "3-Seater Sofa" },
            { icon: "mountain", name: "Mountain View Balcony" },
            { icon: "kitchen", name: "Small Kitchen" },
            { icon: "bath", name: "2 Washrooms" },
            { icon: "tv", name: "Smart TV" },
            { icon: "flame", name: "Induction" },
            { icon: "snowflake", name: "2 Air Conditioners" },
            { icon: "battery", name: "Battery Backup" },
            { icon: "wifi", name: "Free WiFi" },
            { icon: "car", name: "Free Parking" },
            { icon: "swim", name: "Society Pool Access" },
        ],
        configuration: [
            "1 Bedroom with Queen Size Bed",
            "1 Living Room with 3-Seater Sofa",
            "Huge Open Balcony with Mountain View",
            "Small Kitchen with Basic Utensils",
            "2 Washrooms",
        ],
        facilities: [
            {
                category: "Accommodation",
                icon: "home",
                items: ["Queen Size Bed", "3-Seater Sofa", "Mountain View Balcony", "Kitchen with Utensils"],
            },
            {
                category: "Technology",
                icon: "tv",
                items: ["Smart TV", "Free WiFi", "Induction", "Battery Backup Inverter"],
            },
            {
                category: "Comfort",
                icon: "snowflake",
                items: ["2 Air Conditioners", "2 Washrooms", "Basic Utensils", "Comfortable Bedding"],
            },
            {
                category: "Extras",
                icon: "star",
                items: ["Free Parking", "Society Pool Access", "Restaurant Nearby", "Mountain Trails"],
            },
        ],
        activities: [
            {
                title: "Mountain Trekking",
                description: "Explore scenic trails through lush green mountains and discover hidden waterfalls.",
                image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80",
            },
            {
                title: "Pool & Relaxation",
                description: "Unwind at the society pool and enjoy a refreshing swim amidst nature.",
                image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80",
            },
            {
                title: "Local Cuisine",
                description: "Savor authentic local dishes at the nearby restaurant with veg and non-veg options.",
                image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
            },
        ],
        instagram: "https://www.instagram.com/hill_view101",
        location: "Karjat, Maharashtra, India",
    },
};

export function getProperty(slug: string): PropertyData | undefined {
    return properties[slug];
}

export function getAllPropertySlugs(): string[] {
    return Object.keys(properties);
}

export function getAmbroseVilla(villaSlug: string) {
    const ambrose = properties["ambrose"];
    if (!ambrose || !ambrose.subProperties) return undefined;
    const sub = ambrose.subProperties.find(s => s.id === villaSlug);
    if (!sub) return undefined;
    // Build a PropertyData-like object from the sub-property + parent
    return {
        parent: ambrose,
        villa: sub,
    };
}

export function getAllAmbroseVillaSlugs(): string[] {
    const ambrose = properties["ambrose"];
    if (!ambrose || !ambrose.subProperties) return [];
    return ambrose.subProperties.map(s => s.id);
}

export function getAmstelNestCottage(cottageSlug: string) {
    const amstel = properties["amstel-nest"];
    if (!amstel || !amstel.subProperties) return undefined;
    const sub = amstel.subProperties.find(s => s.id === cottageSlug);
    if (!sub) return undefined;
    return {
        parent: amstel,
        cottage: sub,
    };
}

export function getAllAmstelNestCottageSlugs(): string[] {
    const amstel = properties["amstel-nest"];
    if (!amstel || !amstel.subProperties) return [];
    return amstel.subProperties.map(s => s.id);
}
