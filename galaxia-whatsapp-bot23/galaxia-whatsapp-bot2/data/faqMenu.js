/**
 * Centralized FAQ Menu Tree for Galaxia Resorts
 */

const { properties } = require("./properties");

/* ── helpers ─────────────────────────────────── */
const fmt = (n) => "₹" + n.toLocaleString("en-IN");

const BACK_TO_MENU = { label: "🏠 Main Menu", value: "main" };
const PAYMENT_WARNING = "\n\n⚠️ *Booking Notice:* Payments can only be made securely through our website.";
const WEBSITE_LINK = "\n\n🌐 Visit our website: https://galaxiaresorts.com";
const CELEBRATION_WEBSITE_LINK = "\n\n🌐 Visit our website: https://www.galaxiaresorts.com/celebration";

/* ── build property carousels ────────────────── */
function buildCarousel(slugs) {
  return slugs.map(slug => {
    const p = properties.find(prop => prop.slug === slug);
    if (!p) return null;
    
    let desc = `From ${fmt(p.pricing.weekday)}/night`;
    if (slug === "hill-view") desc = "1BHK Apt | Common Pool";
    if (slug === "mount-view") desc = "Bathtub in Balcony";
    if (slug === "heavenly-villas") desc = "Studio | Private Indoor Pool";
    if (slug === "bamboosa") desc = "Bali Inspired 2 BHK Villa";

    return {
      title: p.name,
      rating: p.rating,
      location: p.location,
      price: desc,
      image: p.image,
      actionValue: `${p.slug}_details`
    };
  }).filter(Boolean);
}

const budgetSlugs = ["hill-view", "mount-view", "heavenly-villas"];
const premiumSlugs = ["la-paraiso", "amstel-nest", "take-1", "alta", "santorini", "bamboosa", "cypress"];
const featuredSlugs = ["hill-view", "la-paraiso", "heavenly-villas", "santorini", "amstel-nest"];

/* ── auto-generate property detail nodes ─────── */
function buildPropertyNodes() {
  const nodes = {};

  for (const p of properties) {
    const key = p.slug;

    nodes[`${key}_details`] = {
      message:
        `🏡 *${p.name}*\n` +
        `${p.type}\n\n` +
        `💰 *Stay Pricing:* (Excl. GST)\n` +
        `  • Weekday: ${fmt(p.pricing.weekday)} + 5% GST\n` +
        `  • Weekend: ${fmt(p.pricing.weekend)} + 5% GST\n` +
        (p.extraPerson ? `  • Extra Adult: ${fmt(p.extraPerson)} + 5% GST\n` : "") +
        (p.kidsCharges ? `  • Kids (5-10 yrs): ${fmt(p.kidsCharges)} + 5% GST\n` : "") +
        `\n🕒 Check-in: ${p.checkIn} | Check-out: ${p.checkOut}\n` +
        `🍽️ Food: ${p.foodPolicy}\n` +
        `🐾 Pets: ${p.petsAllowed ? "Allowed ✅ (₹600 extra)" : "Not Allowed ❌"}\n` +
        `💵 Security Deposit: ${fmt(p.securityDeposit)}\n` +
        `✨ Amenities: ${p.amenities.join(", ")}\n` +
        `📍 Location: ${p.mapLink}\n` +
        `🚗 Travel: ${p.travelInfo}` +
        PAYMENT_WARNING,
      options: [
        { label: "📸 View Photos", value: `${key}_photos` },
        { label: "📅 Check Availability", value: `${key}_book` },
        { label: "👤 Talk to Human", value: "human" },
        BACK_TO_MENU
      ]
    };

    nodes[`${key}_photos`] = {
      message: `📸 *${p.name} Photo Gallery*\n\nTo see all the latest photos and a virtual tour of the villa, please visit our website gallery:`,
      link: `https://galaxiaresorts.com/staycation/${p.slug}`,
      options: [
        { label: "📅 Check Availability", value: `${key}_book` },
        { label: "📋 Full Details", value: `${key}_details` },
        BACK_TO_MENU
      ]
    };

    nodes[`${key}_book`] = {
      message: `📅 *Check Availability & Book ${p.name}*\n\nSelect your dates on our official booking portal:` + PAYMENT_WARNING,
      link: `https://galaxiaresorts.com/staycation/${p.slug}`,
      options: [
        { label: "📋 Full Details", value: `${key}_details` },
        BACK_TO_MENU
      ]
    };
  }
  return nodes;
}

/* ── celebration bot helpers ─────────────────── */
const MOVIE_TIME_MSG = (name, theme) => 
  `🎭 *${name}* (${theme})\n\n` +
  `💰 *Movie Time Only (for 2 people):*\n` +
  `• 1 Hour: ₹999\n` +
  `• 2 Hours: ₹1,500\n` +
  `• 3 Hours: ₹2,500\n\n` +
  `✨ *Includes:*\n• Private Screening\n• Dry Snacks & Popcorn\n• Juice, Chocolates & Water\n\n` +
  `➕ *Optional Add-ons (₹400 each):*\n` +
  `• Cake (250g)\n` +
  `• Balloons Decoration\n` +
  `• LED Message Tag\n\n` +
  `🚻 Extra Person: ₹300\n` +
  `🔒 No CCTV | 🆔 ID Proof Mandatory.`;

const CELEBRATION_MSG = (name, theme) =>
  `🎉 *${name}* (${theme})\n` +
  `*Birthday/Anniversary Celebration Package*\n\n` +
  `💰 *Celebration Package Price* (for 2 people):\n` +
  `• 2 Hours: ₹2,950\n` +
  `• 3 Hours: ₹3,450 (Weekday) / ₹3,950 (Weekend)\n\n` +
  `✨ *Includes:*\n• Private Screening\n• Cake (250g)\n• LED Message Tag\n• Heart-lit Pathway\n• Fog & Candle Effect\n• Dry Snacks, Popcorn, Juice & Water\n\n` +
  `🚻 Extra Person: ₹300\n` +
  `🔒 No CCTV | 🆔 ID Proof Mandatory.`;

/* ── static menu tree ────────────────────────── */
const staticMenu = {

  staycation_main: {
    message:
      "👋 *Welcome to Galaxia Staycations!*\n\n" +
      "Explore our luxury villas in Karjat. Choose a category below:",
    carousel: buildCarousel(featuredSlugs),
    options: [
      { label: "💰 Budget Stays", value: "budget_properties" },
      { label: "✨ Premium Stays", value: "premium_properties" },
      { label: "ℹ️ More Info & FAQs", value: "staycation_more_info" },
      { label: "🌐 Visit Website", value: "visit_website" }
    ]
  },

  staycation_more_info: {
    message: "ℹ️ *More Information*\n\nChoose a topic below:",
    options: [
      { label: "❓ Common Questions", value: "faqs_staycation" },
      { label: "📍 Location & Travel", value: "staycation_location" },
      { label: "📜 Resort Policies", value: "policies" },
      BACK_TO_MENU
    ]
  },

  budget_properties: {
    message: "💰 *Budget-Friendly Properties* (Under ₹5k)",
    carousel: buildCarousel(budgetSlugs),
    options: [
      { label: "⛰️ Hill View", value: "hill-view_details", description: "1BHK Apt | Common Pool" },
      { label: "🛁 Mount View", value: "mount-view_details", description: "Bathtub in Balcony" },
      { label: "✨ Heavenly Villas", value: "heavenly-villas_details", description: "Studio | Private Indoor Pool" },
      BACK_TO_MENU
    ]
  },

  premium_properties: {
    message: "✨ *Premium Collection* (₹5k+ / Themed Villas)",
    carousel: buildCarousel(premiumSlugs),
    options: [
      { label: "🌴 La Paraiso", value: "la-paraiso_details", description: "Premium Private Pool Villa" },
      { label: "🏘️ Amstel Nest", value: "amstel-nest_details", description: "Indoor Pool Cottage (Meals Inc.)" },
      { label: "🎬 Take-1", value: "take-1_details", description: "Bollywood Cinema Theme" },
      { label: "🪵 Alta", value: "alta_details", description: "Rustic Countryside Theme" },
      { label: "🏛️ Santorini", value: "santorini_details", description: "Greece / Mediterranean Theme" },
      { label: "🌴 Bamboosa", value: "bamboosa_details", description: "Bali Inspired 2 BHK Villa" },
      { label: "🌲 Cypress", value: "cypress_details", description: "Machan / Treehouse Theme" },
      { label: "🌐 Visit Website", value: "visit_website" },
      BACK_TO_MENU
    ]
  },

  faqs_staycation: {
    message: "❓ *Common Questions*\n\nChoose a topic:",
    options: [
      { label: "🍽️ Food Options", value: "faq_food" },
      { label: "⏰ Check-in/out", value: "faq_timings" },
      { label: "🚗 Driver/Staff", value: "faq_staff" },
      { label: "🎵 Music & Parties", value: "faq_party" },
      { label: "🍺 Alcohol Policy", value: "faq_alcohol" },
      { label: "💳 Booking & Payment", value: "faq_booking" },
      { label: "👤 Talk to a Human", value: "human" },
      BACK_TO_MENU
    ]
  },

  faq_food: {
    message: "🍽️ *Is food available or included?*\n\n" +
             "• *Premium Villas:* Most themed villas include Breakfast, Lunch & Dinner (Veg Only).\n" +
             "• *Budget Apartments:* Not included; society restaurant is 10 steps away.\n" +
             "• *Driver Food:* ₹1,000 extra for all meals (Lunch, Dinner & Breakfast).",
    options: [ { label: "🏡 View Properties", value: "staycation_main" }, BACK_TO_MENU ]
  },

  faq_staff: {
      message: "🚗 *Can our Driver or Staff stay?*\n\n" +
               "• We do not have separate staff quarters inside the villas.\n" +
               "• Drivers can stay in their cars within the parking area.\n" +
               "• Food will be provided for them at ₹1,000 per person (includes Lunch, Dinner, and Breakfast).",
      options: [ { label: "👤 Talk to Human", value: "human" }, BACK_TO_MENU ]
  },

  faq_timings: {
    message: "⏰ *Check-in & Check-out*\n\n• Standard Check-in: 1:00 PM / 2:00 PM\n• Standard Check-out: 10:00 AM",
    options: [ BACK_TO_MENU ]
  },

  faq_party: {
    message: "🎵 *Music Policy*\n\n• Moderate volume allowed during the day.\n• *Loud music after 10 PM must be avoided* to respect other guests and neighbors.",
    options: [ BACK_TO_MENU ]
  },

  faq_alcohol: {
    message: "🍺 *Alcohol Policy*\n\nAllowed inside private villas. Please maintain a peaceful environment.",
    options: [ BACK_TO_MENU ]
  },

  staycation_location: {
    message: "📍 *How to Reach Galaxia Resorts*\n\n" +
             "📌 *Google Map Links:*\n" +
             "• Ambrose Villas: https://maps.app.goo.gl/2NEib4Vz9raNqLY5A\n" +
             "• Amstel Nest: https://maps.app.goo.gl/RuZGUE9qZTcz7w3S7\n" +
             "• La Paraiso: https://maps.app.goo.gl/EsM9k4zGxDTbSufMA\n" +
             "• Hill View/Mount View: https://maps.app.goo.gl/yYBcjkewtYMNXPmY9\n\n" +
             "🚂 Nearest Station: Karjat (30-40 mins via auto/cab).\n" +
             "🚗 From Mumbai: ~2 hours via Mumbai-Pune Expressway.",
    options: [ BACK_TO_MENU ]
  },

  policies: {
    message: "📜 *Resort Policies*",
    options: [
      { label: "❌ Cancellation", value: "policy_cancellation" },
      { label: "❤️ Couples Policy", value: "policy_couples" },
      { label: "🐾 Pet Policy", value: "policy_pets" },
      { label: "👤 Talk to Human", value: "human" },
      BACK_TO_MENU
    ]
  },

  policy_cancellation: {
    message: "❌ *Cancellation & Refund*\n\nAll bookings are *Non-Refundable* and *Non-Transferable*.",
    options: [ BACK_TO_MENU ]
  },

  policy_pets: {
    message: "🐾 *Pets Policy*\n\n✅ Pets Allowed: Hill View, Mount View, Heavenly Villas, La Paraiso, Ambrose villas.\n💰 Cost: ₹600 extra per pet.\n❌ Not Allowed: Amstel Nest.",
    options: [ BACK_TO_MENU ]
  },

  policy_couples: {
    message: "❤️ *Couples Policy*\n\nUnmarried couples welcome with valid gov ID (18+).",
    options: [ BACK_TO_MENU ]
  },

  faq_booking: {
    message: "💳 *How to Book & Pay*\n\nAll bookings must be made through *galaxiaresorts.com*.\n\n⚠️ *Payments only via official website.*",
    options: [ BACK_TO_MENU ]
  },

  /* ==========================================================
     CELEBRATION BOT TREE
  ========================================================== */
  celebration_main: {
    message: "🎬 *Welcome to Digital Diaries!*\n\nPremium private cinema screenings in Wadala.\n\n🤖 _I'm an automated assistant here to help you explore our screens, pricing, and book your experience. Choose an option below to get started!_",
    options: [
      { label: "🎥 Movie Time", value: "movie_time" },
      { label: "🎉 Celebration Packs", value: "deco_screens" },
      { label: "❓ FAQs & Live Chat Support", value: "faqs_celebration" },
      { label: "🌐 Visit Website", value: "visit_cel_website" }
    ]
  },

  movie_time: {
    message: "🎥 *Movie Time – Private Screening*\n\nChoose from our unique themed screens:",
    options: [
      { label: "🏖️ Sandy Screen", value: "screen_sandy", description: "Beach theme" },
      { label: "💕 Cine Love", value: "screen_cinelove", description: "Romantic theme" },
      { label: "🚗 Park N Watch", value: "screen_parknwatch", description: "Car theme" },
      { label: "🏛️ Baywatch", value: "screen_baywatch", description: "Greece theme" },
      BACK_TO_MENU
    ]
  },

  screen_parknwatch: {
    message: MOVIE_TIME_MSG("Park N Watch", "Car Theme"),
    options: [ { label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU ]
  },
  screen_cinelove: {
    message: MOVIE_TIME_MSG("Cine Love", "Romantic Theme"),
    options: [ { label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU ]
  },
  screen_sandy: {
    message: MOVIE_TIME_MSG("Sandy Screen", "Beach Theme"),
    options: [ { label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU ]
  },
  screen_baywatch: {
    message: MOVIE_TIME_MSG("Baywatch", "Greece Theme"),
    options: [ { label: "📅 Book Now", value: "book_movietime" }, BACK_TO_MENU ]
  },

  deco_screens: {
    message: "🎉 *Celebration Packs*\n\nChoose a screen for your special occasion:",
    options: [
      { label: "💕 Cine Love", value: "deco_cinelove", description: "Romantic theme" },
      { label: "🏖️ Sandy Screen", value: "deco_sandy", description: "Beach theme" },
      { label: "🚗 Park N Watch", value: "deco_parknwatch", description: "Car theme" },
      { label: "🏛️ Baywatch", value: "deco_baywatch", description: "Greece theme" },
      BACK_TO_MENU
    ]
  },

  deco_cinelove: { message: CELEBRATION_MSG("Cine Love", "Romantic Theme"), options: [ { label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU ] },
  deco_sandy: { message: CELEBRATION_MSG("Sandy Screen", "Beach Theme"), options: [ { label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU ] },
  deco_parknwatch: { message: CELEBRATION_MSG("Park N Watch", "Car Theme"), options: [ { label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU ] },
  deco_baywatch: { message: CELEBRATION_MSG("Baywatch", "Greece Theme"), options: [ { label: "📅 Book Now", value: "book_deco" }, BACK_TO_MENU ] },

  book_movietime: { message: "🔗 *Book Movie Time Only:*\nhttps://galaxiaresorts.com/celebration/movie-time" + PAYMENT_WARNING, options: [BACK_TO_MENU] },
  book_deco: { message: "🔗 *Book Celebration Pack:*\nhttps://galaxiaresorts.com/celebration/celebration" + PAYMENT_WARNING, options: [BACK_TO_MENU] },

  faqs_celebration: {
    message: "❓ *Frequently Asked Questions*",
    options: [
      { label: "🍽️ Food & Menu", value: "faq_cel_food" },
      { label: "🥣 Add-ons & People", value: "faq_cel_food_addons" },
      { label: "🔒 Privacy & CCTV", value: "faq_cel_privacy" },
      { label: "⏰ Timings & Rules", value: "faq_cel_rules" },
      { label: "👤 Talk to a Human", value: "human" },
      BACK_TO_MENU
    ]
  },

  faq_cel_food_addons: {
    message: "🍽️ *Add-ons & Extra People*\n\n• *Optional Add-ons (₹400 each):* Extra Cake (250g), Balloons Decoration, or LED Message Tag.\n• _Note: Add-ons are specifically for 'Movie Time Only' bookings._\n• *Extra Person:* ₹300 per head.",
    options: [ BACK_TO_MENU ]
  },

  faq_cel_privacy: {
    message: "🔒 *Privacy & Safety*\n\n• Your privacy is our priority.\n• *Strictly No CCTV* inside any screening rooms.\n• You have complete privacy for your event.",
    options: [ BACK_TO_MENU ]
  },

  faq_cel_rules: {
    message: "⏰ *Timings & Rules*\n\n• Slots are fixed as per your booking.\n• *ID Proof is Mandatory* for all guests.\n• Valid government ID (18+) required.",
    options: [ BACK_TO_MENU ]
  },

  faq_cel_food: {
    message: "🍽️ *Food & Beverages*\n\n" +
             "🎉 *Celebration Package* includes a complimentary snacks hamper (Popcorn, Dry Snacks, Juice, Chocolates & Water).\n\n" +
             "🎥 *Movie Time* includes Dry Snacks, Popcorn, Juice, Chocolates & Water.\n\n" +
             "🍕 *Additional Food Menu:*\nWe offer a variety of snacks and beverages at the venue. Outside food is *not allowed*.\n\n" +
             "📄 *Download our full food menu here:*\nhttps://galaxiaresorts.com/menus/DigitalDiariesMenu.pdf",
    options: [ BACK_TO_MENU ]
  },

  human: { message: "👤 *Talk to a Human*\n\nOur team will reply to this chat shortly.", options: [BACK_TO_MENU] },

  visit_website: { message: "🌐 *Galaxia Resorts Website*\n\nExplore our full range of offerings, book stays, and discover more on our official website." + WEBSITE_LINK, options: [BACK_TO_MENU] },

  visit_cel_website: { message: "🌐 *Digital Diaries Website*\n\nExplore our full range of offerings, book premium screens, and discover more on our official website." + CELEBRATION_WEBSITE_LINK, options: [BACK_TO_MENU] }
};

const menuTree = { ...staticMenu, ...buildPropertyNodes() };
module.exports = { menuTree };
