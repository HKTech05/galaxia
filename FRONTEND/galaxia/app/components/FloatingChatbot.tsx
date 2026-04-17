"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════
   EMBEDDED FAQ DATA — ported from chatbot server
   ═══════════════════════════════════════════════ */

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

interface MenuNode {
    message: string;
    options?: { label: string; value: string; description?: string }[];
    link?: string;
    image?: string;
    carousel?: { title: string; rating: string; location: string; price: string; image: string; actionValue: string }[];
}

const properties = [
    { name: "Hill View", slug: "hill-view", type: "Budget Mountain View Apartment", rating: "4.6 (854 reviews)", location: "Karjat, Maharashtra", checkIn: "1:00 PM", checkOut: "10:00 AM", pricing: { weekday: 2500, weekend: 3950, prime: 4450 }, extraPerson: 600, kidsCharges: 400, foodPolicy: "Food not included. Society restaurant available (Veg & Non-Veg).", securityDeposit: 2000, petsAllowed: true, amenities: ["Mountain Balcony", "Smart TV", "2 AC", "WiFi", "Free Parking", "Society Pool Access"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/yYBcjkewtYMNXPmY9" },
    { name: "Mount View", slug: "mount-view", type: "Bathtub Mountain Apartment", rating: "4.5 (612 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 3500, weekend: 4950, prime: 5950 }, extraPerson: 800, kidsCharges: 500, foodPolicy: "Food not included. Veg & Non-Veg restaurant available.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Bathtub", "Mountain Balcony", "Smart TV", "Music Player", "WiFi"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/yYBcjkewtYMNXPmY9" },
    { name: "Heavenly Villas", slug: "heavenly-villas", type: "Studio Room Private Indoor Pool Villa", rating: "4.8 (1.1k reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 3950, weekend: 4950, prime: null }, extraPerson: 800, kidsCharges: 500, foodPolicy: "Food not included. Restaurant available nearby.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Indoor Pool", "Swing", "Smart TV", "WiFi"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/yYBcjkewtYMNXPmY9" },
    { name: "La Paraiso", slug: "la-paraiso", type: "Premium Private Pool Villa", rating: "4.9 (2.3k reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 4950, weekend: 7500, prime: 8500 }, extraPerson: 1200, kidsCharges: 800, foodPolicy: "Restaurant 10 steps away. Veg allowed inside. Non-veg in restaurant only.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "Private Garden", "Gazebo", "Smart TV"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/EsM9k4zGxDTbSufMA" },
    { name: "Amstel Nest", slug: "amstel-nest", type: "Indoor Pool Cottages (Meals Included)", rating: "4.7 (945 reviews)", location: "Karjat, Maharashtra", checkIn: "1:00 PM", checkOut: "10:00 AM", pricing: { weekday: 4950, weekend: 6950, prime: null }, extraPerson: 2000, kidsCharges: 1000, foodPolicy: "Meals Included (Veg Only). Jain available on prior notice.", securityDeposit: 2000, petsAllowed: false, amenities: ["Indoor Pool", "Gaming Zone", "Boating", "WiFi"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/RuZGUE9qZTcz7w3S7" },
    { name: "Ambrose", slug: "ambrose", type: "Themed Private Pool Villas", rating: "4.9 (3.1k reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 5500, weekend: 6500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included (Veg Only).", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "Garden Seating", "Smart TV", "2 AC"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
    { name: "Take-1", slug: "take-1", type: "Film-Inspired Themed Villa", rating: "4.8 (432 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 5500, weekend: 6500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "Indian Cinema Decor", "Smart TV", "AC"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
    { name: "Alta", slug: "alta", type: "Wooden Countryside Aesthetics Villa", rating: "4.9 (512 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 5500, weekend: 6500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "Earthy Wooden Textures", "Smart TV", "AC"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
    { name: "Santorini", slug: "santorini", type: "Mediterranean-Style Themed Villa", rating: "4.9 (893 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 5500, weekend: 6500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "White & Blue Interiors", "Smart TV", "AC"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
    { name: "Bamboosa", slug: "bamboosa", type: "Bali-Inspired 2 King Bedroom Villa", rating: "5.0 (201 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 10500, weekend: 11500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.", securityDeposit: 3000, petsAllowed: true, amenities: ["Private Pool", "Spacious Living Room", "Bali-Inspired Interiors", "2 Bedrooms", "AC", "Smart TV"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
    { name: "Cypress", slug: "cypress", type: "Elevated Treehouse-Style Villa", rating: "4.8 (342 reviews)", location: "Karjat, Maharashtra", checkIn: "2:00 PM", checkOut: "10:00 AM", pricing: { weekday: 5500, weekend: 6500, prime: null }, extraPerson: null, kidsCharges: null, foodPolicy: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.", securityDeposit: 3000, petsAllowed: true, amenities: ["Glass-Bottom Pool", "Mountain Deck", "Treehouse Style", "Smart TV", "AC"], travelInfo: "Auto/cab available from Karjat station ₹400-500. 30-40 mins.", mapLink: "https://maps.app.goo.gl/2NEib4Vz9raNqLY5A" },
];

const BACK_TO_MENU = { label: "🏠 Main Menu", value: "main" };
const PAYMENT_WARNING = "\n\n⚠️ Booking Notice: Payments can only be made securely through our website.";

function buildPropertyNodes(): Record<string, MenuNode> {
    const nodes: Record<string, MenuNode> = {};
    for (const p of properties) {
        const k = p.slug;
        nodes[`${k}_details`] = {
            message:
                `🏡 ${p.name}\n${p.type}\n\n` +
                `💰 Stay Pricing: (Excl. GST)\n` +
                `  • Weekday: ${fmt(p.pricing.weekday)} + 5% GST\n` +
                `  • Weekend: ${fmt(p.pricing.weekend)} + 5% GST\n` +
                (p.extraPerson ? `  • Extra Adult: ${fmt(p.extraPerson)} + 5% GST\n` : "") +
                (p.kidsCharges ? `  • Kids (5-10 yrs): ${fmt(p.kidsCharges)} + 5% GST\n` : "") +
                `\n🕒 Check-in: ${p.checkIn} | Check-out: ${p.checkOut}\n` +
                `🍽️ Food: ${p.foodPolicy}\n` +
                `🐾 Pets: ${p.petsAllowed ? "Allowed ✅ (₹600 extra)" : "Not Allowed ❌"}\n` +
                `💵 Security Deposit: ${fmt(p.securityDeposit)}\n` +
                `✨ Amenities: ${p.amenities.join(", ")}` +
                PAYMENT_WARNING,
            options: [
                { label: "📅 Check Availability", value: `${k}_book` },
                { label: "👤 Talk to Human", value: "human" },
                BACK_TO_MENU,
            ],
        };
        nodes[`${k}_book`] = {
            message: `📅 Check Availability & Book ${p.name}\n\nSelect your dates on our official booking portal:` + PAYMENT_WARNING,
            link: `https://galaxiaresorts.com/staycation/${p.slug}`,
            options: [{ label: "📋 Full Details", value: `${k}_details` }, BACK_TO_MENU],
        };
    }
    return nodes;
}

const menuTree: Record<string, MenuNode> = {
    /* ── STAYCATION BOT ── */
    staycation_main: {
        message: "👋 Welcome to Galaxia Staycations!\n\nExplore our luxury villas in Karjat. Choose a category below:",
        options: [
            { label: "💰 Budget Stays", value: "budget_properties" },
            { label: "✨ Premium Stays", value: "premium_properties" },
            { label: "ℹ️ More Info & FAQs", value: "staycation_more_info" },
            { label: "🌐 Visit Website", value: "visit_website" },
        ],
    },
    staycation_more_info: {
        message: "ℹ️ More Information\n\nChoose a topic below:",
        options: [
            { label: "❓ Common Questions", value: "faqs_staycation" },
            { label: "📍 Location & Travel", value: "staycation_location" },
            { label: "📜 Resort Policies", value: "policies" },
            BACK_TO_MENU,
        ],
    },
    budget_properties: {
        message: "💰 Budget-Friendly Properties (Under ₹5k)",
        options: [
            { label: "⛰️ Hill View", value: "hill-view_details", description: "1BHK Apt | Common Pool" },
            { label: "🛁 Mount View", value: "mount-view_details", description: "Bathtub in Balcony" },
            { label: "✨ Heavenly Villas", value: "heavenly-villas_details", description: "Studio | Private Indoor Pool" },
            BACK_TO_MENU,
        ],
    },
    premium_properties: {
        message: "✨ Premium Collection (₹5k+ / Themed Villas)",
        options: [
            { label: "🌴 La Paraiso", value: "la-paraiso_details", description: "Premium Private Pool Villa" },
            { label: "🏘️ Amstel Nest", value: "amstel-nest_details", description: "Indoor Pool Cottage (Meals Inc.)" },
            { label: "🎬 Take-1", value: "take-1_details", description: "Bollywood Cinema Theme" },
            { label: "🪵 Alta", value: "alta_details", description: "Rustic Countryside Theme" },
            { label: "🏛️ Santorini", value: "santorini_details", description: "Greece / Mediterranean Theme" },
            { label: "🌴 Bamboosa", value: "bamboosa_details", description: "Bali Inspired 2 BHK Villa" },
            { label: "🌲 Cypress", value: "cypress_details", description: "Machan / Treehouse Theme" },
            BACK_TO_MENU,
        ],
    },
    faqs_staycation: {
        message: "❓ Common Questions\n\nChoose a topic:",
        options: [
            { label: "🍽️ Food Options", value: "faq_food" },
            { label: "⏰ Check-in/out", value: "faq_timings" },
            { label: "🚗 Driver/Staff", value: "faq_staff" },
            { label: "🎵 Music & Parties", value: "faq_party" },
            { label: "🍺 Alcohol Policy", value: "faq_alcohol" },
            { label: "💳 Booking & Payment", value: "faq_booking" },
            { label: "👤 Talk to a Human", value: "human" },
            BACK_TO_MENU,
        ],
    },
    faq_food: { message: "🍽️ Is food available or included?\n\n• Premium Villas: Most themed villas include Breakfast, Lunch & Dinner (Veg Only).\n• Budget Apartments: Not included; society restaurant is 10 steps away.\n• Driver Food: ₹1,000 extra for all meals (Lunch, Dinner & Breakfast).", options: [{ label: "🏡 View Properties", value: "staycation_main" }, BACK_TO_MENU] },
    faq_staff: { message: "🚗 Can our Driver or Staff stay?\n\n• We do not have separate staff quarters inside the villas.\n• Drivers can stay in their cars within the parking area.\n• Food will be provided for them at ₹1,000 per person (includes Lunch, Dinner, and Breakfast).", options: [{ label: "👤 Talk to Human", value: "human" }, BACK_TO_MENU] },
    faq_timings: { message: "⏰ Check-in & Check-out\n\n• Standard Check-in: 1:00 PM / 2:00 PM\n• Standard Check-out: 10:00 AM", options: [BACK_TO_MENU] },
    faq_party: { message: "🎵 Music Policy\n\n• Moderate volume allowed during the day.\n• Loud music after 10 PM must be avoided to respect other guests and neighbors.", options: [BACK_TO_MENU] },
    faq_alcohol: { message: "🍺 Alcohol Policy\n\nAllowed inside private villas. Please maintain a peaceful environment.", options: [BACK_TO_MENU] },
    faq_booking: { message: "💳 How to Book & Pay\n\nAll bookings must be made through galaxiaresorts.com.\n\n⚠️ Payments only via official website.", options: [BACK_TO_MENU] },
    staycation_location: { message: "📍 How to Reach Galaxia Resorts\n\n📌 Google Map Links:\n• Ambrose Villas: maps.app.goo.gl/2NEib4Vz9raNqLY5A\n• Amstel Nest: maps.app.goo.gl/RuZGUE9qZTcz7w3S7\n• La Paraiso: maps.app.goo.gl/EsM9k4zGxDTbSufMA\n• Hill View/Mount View: maps.app.goo.gl/yYBcjkewtYMNXPmY9\n\n🚂 Nearest Station: Karjat (30-40 mins via auto/cab).\n🚗 From Mumbai: ~2 hours via Mumbai-Pune Expressway.", options: [BACK_TO_MENU] },
    policies: { message: "📜 Resort Policies", options: [{ label: "❌ Cancellation", value: "policy_cancellation" }, { label: "❤️ Couples Policy", value: "policy_couples" }, { label: "🐾 Pet Policy", value: "policy_pets" }, { label: "👤 Talk to Human", value: "human" }, BACK_TO_MENU] },
    policy_cancellation: { message: "❌ Cancellation & Refund\n\nAll bookings are Non-Refundable and Non-Transferable.", options: [BACK_TO_MENU] },
    policy_pets: { message: "🐾 Pets Policy\n\n✅ Pets Allowed: Hill View, Mount View, Heavenly Villas, La Paraiso, Ambrose villas.\n💰 Cost: ₹600 extra per pet.\n❌ Not Allowed: Amstel Nest.", options: [BACK_TO_MENU] },
    policy_couples: { message: "❤️ Couples Policy\n\nUnmarried couples welcome with valid gov ID (18+).", options: [BACK_TO_MENU] },
    visit_website: { message: "🌐 Galaxia Resorts Website\n\nExplore our full range of offerings, book stays, and discover more on our official website.", link: "https://galaxiaresorts.com", options: [BACK_TO_MENU] },

    /* ── CELEBRATION / DIGITAL DIARIES BOT ── */
    celebration_main: {
        message: "🎬 Welcome to Digital Diaries!\n\nPremium private cinema screenings in Wadala.",
        options: [
            { label: "🎥 Movie Time", value: "movie_time" },
            { label: "🎉 Celebration Packs", value: "deco_screens" },
            { label: "❓ FAQs & Support", value: "faqs_celebration" },
            { label: "🌐 Visit Website", value: "visit_cel_website" },
        ],
    },
    movie_time: {
        message: "🎥 Movie Time – Private Screening\n\nChoose from our unique themed screens:",
        options: [
            { label: "🏖️ Sandy Screen", value: "screen_sandy", description: "Beach theme" },
            { label: "💕 Cine Love", value: "screen_cinelove", description: "Romantic theme" },
            { label: "🚗 Park N Watch", value: "screen_parknwatch", description: "Car theme" },
            { label: "🏛️ Baywatch", value: "screen_baywatch", description: "Greece theme" },
            BACK_TO_MENU,
        ],
    },
    screen_sandy: { message: "🎭 Sandy Screen (Beach Theme)\n\n💰 Movie Time Only (for 2 people):\n• 1 Hour: ₹999\n• 2 Hours: ₹1,500\n• 3 Hours: ₹2,500\n\n✨ Includes:\n• Private Screening\n• Dry Snacks & Popcorn\n• Juice, Chocolates & Water\n\n➕ Optional Add-ons (₹400 each):\n• Cake (250g)\n• Balloons Decoration\n• LED Message Tag\n\n🚻 Extra Person: ₹300\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU] },
    screen_cinelove: { message: "🎭 Cine Love (Romantic Theme)\n\n💰 Movie Time Only (for 2 people):\n• 1 Hour: ₹999\n• 2 Hours: ₹1,500\n• 3 Hours: ₹2,500\n\n✨ Includes:\n• Private Screening\n• Dry Snacks & Popcorn\n• Juice, Chocolates & Water\n\n➕ Optional Add-ons (₹400 each):\n• Cake (250g)\n• Balloons Decoration\n• LED Message Tag\n\n🚻 Extra Person: ₹300\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU] },
    screen_parknwatch: { message: "🎭 Park N Watch (Car Theme)\n\n💰 Movie Time Only (for 2 people):\n• 1 Hour: ₹999\n• 2 Hours: ₹1,500\n• 3 Hours: ₹2,500\n\n✨ Includes:\n• Private Screening\n• Dry Snacks & Popcorn\n• Juice, Chocolates & Water\n\n➕ Optional Add-ons (₹400 each):\n• Cake (250g)\n• Balloons Decoration\n• LED Message Tag\n\n🚻 Extra Person: ₹300\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU] },
    screen_baywatch: { message: "🎭 Baywatch (Greece Theme)\n\n💰 Movie Time Only (for 2 people):\n• 1 Hour: ₹999\n• 2 Hours: ₹1,500\n• 3 Hours: ₹2,500\n\n✨ Includes:\n• Private Screening\n• Dry Snacks & Popcorn\n• Juice, Chocolates & Water\n\n➕ Optional Add-ons (₹400 each):\n• Cake (250g)\n• Balloons Decoration\n• LED Message Tag\n\n🚻 Extra Person: ₹300\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU] },
    deco_screens: {
        message: "🎉 Celebration Packs\n\nChoose a screen for your special occasion:",
        options: [
            { label: "💕 Cine Love", value: "deco_cinelove", description: "Romantic theme" },
            { label: "🏖️ Sandy Screen", value: "deco_sandy", description: "Beach theme" },
            { label: "🚗 Park N Watch", value: "deco_parknwatch", description: "Car theme" },
            { label: "🏛️ Baywatch", value: "deco_baywatch", description: "Greece theme" },
            BACK_TO_MENU,
        ],
    },
    deco_cinelove: { message: "🎉 Cine Love (Romantic Theme)\nBirthday/Anniversary Celebration Package\n\n💰 Price: ₹2,950 (for 2 people)\n\n✨ Includes:\n• Private Screening (2 Hours)\n• Cake (250g)\n• LED Message Tag\n• Heart-lit Pathway\n• Fog & Candle Effect\n• Dry Snacks, Popcorn, Juice & Water\n\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU] },
    deco_sandy: { message: "🎉 Sandy Screen (Beach Theme)\nBirthday/Anniversary Celebration Package\n\n💰 Price: ₹2,950 (for 2 people)\n\n✨ Includes:\n• Private Screening (2 Hours)\n• Cake (250g)\n• LED Message Tag\n• Heart-lit Pathway\n• Fog & Candle Effect\n• Dry Snacks, Popcorn, Juice & Water\n\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU] },
    deco_parknwatch: { message: "🎉 Park N Watch (Car Theme)\nBirthday/Anniversary Celebration Package\n\n💰 Price: ₹2,950 (for 2 people)\n\n✨ Includes:\n• Private Screening (2 Hours)\n• Cake (250g)\n• LED Message Tag\n• Heart-lit Pathway\n• Fog & Candle Effect\n• Dry Snacks, Popcorn, Juice & Water\n\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU] },
    deco_baywatch: { message: "🎉 Baywatch (Greece Theme)\nBirthday/Anniversary Celebration Package\n\n💰 Price: ₹2,950 (for 2 people)\n\n✨ Includes:\n• Private Screening (2 Hours)\n• Cake (250g)\n• LED Message Tag\n• Heart-lit Pathway\n• Fog & Candle Effect\n• Dry Snacks, Popcorn, Juice & Water\n\n🔒 No CCTV | 🆔 ID Proof Mandatory.", options: [{ label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU] },
    book_movietime: { message: "🔗 Book Movie Time Only:\nhttps://galaxiaresorts.com/celebration/movie-time" + PAYMENT_WARNING, link: "https://galaxiaresorts.com/celebration/movie-time", options: [BACK_TO_MENU] },
    book_deco: { message: "🔗 Book Celebration Pack:\nhttps://galaxiaresorts.com/celebration/celebration" + PAYMENT_WARNING, link: "https://galaxiaresorts.com/celebration/celebration", options: [BACK_TO_MENU] },
    faqs_celebration: { message: "❓ Frequently Asked Questions", options: [{ label: "🥣 Add-ons & People", value: "faq_cel_food" }, { label: "🔒 Privacy & CCTV", value: "faq_cel_privacy" }, { label: "⏰ Timings & Rules", value: "faq_cel_rules" }, { label: "👤 Talk to a Human", value: "human" }, BACK_TO_MENU] },
    faq_cel_food: { message: "🍽️ Add-ons & Extra People\n\n• Optional Add-ons (₹400 each): Extra Cake (250g), Balloons Decoration, or LED Message Tag.\n• Note: Add-ons are specifically for 'Movie Time Only' bookings.\n• Extra Person: ₹300 per head.", options: [BACK_TO_MENU] },
    faq_cel_privacy: { message: "🔒 Privacy & Safety\n\n• Your privacy is our priority.\n• Strictly No CCTV inside any screening rooms.\n• You have complete privacy for your event.", options: [BACK_TO_MENU] },
    faq_cel_rules: { message: "⏰ Timings & Rules\n\n• Slots are fixed as per your booking.\n• ID Proof is Mandatory for all guests.\n• Valid government ID (18+) required.", options: [BACK_TO_MENU] },
    human: { message: "👤 Talk to a Human\n\nOur team will reply to this chat shortly. You can also reach us on WhatsApp or call us directly.", options: [BACK_TO_MENU] },
    visit_cel_website: { message: "🌐 Digital Diaries Website\n\nExplore our full range of offerings, book premium screens, and discover more on our official website.", link: "https://www.galaxiaresorts.com/celebration", options: [BACK_TO_MENU] },
    ...buildPropertyNodes(),
};

/* ═══════════════════════════════════════════════
   CHATBOT COMPONENT
   ═══════════════════════════════════════════════ */

export default function FloatingChatbot() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string; link?: string }[]>([]);
    const [currentOptions, setCurrentOptions] = useState<{ label: string; value: string; description?: string }[]>([]);
    const [navStack, setNavStack] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [hasInit, setHasInit] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, currentOptions, isTyping]);

    // Determine botType + visibility from pathname
    const isCelebration = pathname?.startsWith("/celebration");
    const isStaycation = pathname?.startsWith("/staycation");
    const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/login");
    const shouldShow = (isCelebration || isStaycation) && !isAdmin;
    const botType = isCelebration ? "celebration" : "staycation";
    const rootNode = `${botType}_main`;

    // Reset chat when switching between celebration/staycation
    useEffect(() => {
        if (shouldShow) {
            setMessages([]);
            setCurrentOptions([]);
            setNavStack([]);
            setHasInit(false);
            setIsOpen(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [botType]);

    const navigateTo = useCallback((nodeKey: string) => {
        const node = menuTree[nodeKey];
        if (!node) {
            const fallback = menuTree[rootNode];
            setMessages(prev => [...prev, { role: "bot", text: fallback.message, link: fallback.link }]);
            setCurrentOptions(fallback.options || []);
            return;
        }
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { role: "bot", text: node.message, link: node.link }]);
            setCurrentOptions(node.options || []);
        }, 400);
    }, [rootNode]);

    const handleToggle = () => {
        const opening = !isOpen;
        setIsOpen(opening);
        if (opening && !hasInit) {
            setHasInit(true);
            navigateTo(rootNode);
        }
    };

    const handleOptionClick = (opt: { label: string; value: string }) => {
        // Show user message
        setMessages(prev => [...prev, { role: "user", text: opt.label }]);
        setCurrentOptions([]);

        if (opt.value === "main") {
            setNavStack([]);
            navigateTo(rootNode);
        } else if (opt.value === "back") {
            const newStack = [...navStack];
            const prev = newStack.pop() || rootNode;
            setNavStack(newStack);
            navigateTo(prev);
        } else {
            setNavStack(prev => [...prev, opt.value]);
            navigateTo(opt.value);
        }
    };

    if (!shouldShow || !mounted) return null;

    const headerTitle = isCelebration ? "Digital Diaries" : "Galaxia Staycations";
    const headerSubtitle = "Always online";

    return (
        <>
            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-[70] w-[min(380px,calc(100vw-2rem))] max-h-[75dvh] rounded-2xl shadow-2xl border border-[#2a2a2a] flex flex-col overflow-hidden bg-[#f5f7f9]"
                    style={{ animation: "chatFadeIn 0.25s ease-out" }}>
                    {/* Header */}
                    <div className="bg-[#1A1A1A] px-5 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#d4af37] flex items-center justify-center text-[#1A1A1A] font-bold text-lg">G</div>
                            <div>
                                <p className="text-white font-semibold text-[15px] leading-tight">{headerTitle}</p>
                                <p className="text-[#888] text-[11px]">{headerSubtitle}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#E5DDD5]" style={{ minHeight: 200, maxHeight: "50dvh" }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`relative max-w-[85%] px-3.5 py-2 text-[13.5px] leading-[1.4] shadow-sm whitespace-pre-wrap
                                    ${msg.role === "user"
                                        ? "bg-[#dcf8c6] text-[#111b21] rounded-xl rounded-tr-none"
                                        : "bg-white text-[#111b21] rounded-xl rounded-tl-none"}`}
                                >
                                    {msg.text}
                                    {msg.link && (
                                        <a href={msg.link} target="_blank" rel="noopener noreferrer"
                                            className="block mt-2 text-[#d4af37] text-[13px] font-medium hover:underline">
                                            🔗 Click here
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white px-4 py-3 rounded-xl rounded-tl-none shadow-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Options buttons */}
                    {currentOptions.length > 0 && (
                        <div className="bg-white border-t border-[#eaeaea] px-4 py-3 flex flex-col gap-2 max-h-[40%] overflow-y-auto shrink-0">
                            {currentOptions.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleOptionClick(opt)}
                                    className="w-full text-left bg-[#f8f9fa] border border-[#e0e0e0] rounded-lg px-4 py-3 text-sm font-medium text-[#222] hover:bg-[#f0f0f0] hover:border-[#d4af37] transition-all active:scale-[0.98]"
                                >
                                    <span className="font-semibold">{opt.label}</span>
                                    {opt.description && (
                                        <span className="block text-xs text-[#666] mt-0.5">{opt.description}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Floating support button */}
            <button
                onClick={handleToggle}
                className={`fixed bottom-6 right-4 sm:right-6 z-[70] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen
                    ? "bg-[#333] text-white"
                    : "bg-gradient-to-br from-[#1A1A1A] to-[#333] text-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:scale-105"
                }`}
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    /* Support / Chat bubble icon */
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                )}
            </button>

            <style jsx global>{`
                @keyframes chatFadeIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
