/**
 * Instagram Chatbot Menu Trees — 6 Individual Property Bots
 *
 * Each property has its own self-contained menu tree with:
 * 1. View Details
 * 2. Visit Website
 * 3. FAQs & Live Chat Support (human mode, same as DD IG)
 * 4. Collab (flags session with 'collab' tag)
 *
 * Bot types: ambrose_ig, amstelnest_ig, laparaiso_ig, mountview_ig, heavenlyvilla_ig, hillview_ig
 */

const { properties } = require("./properties");

const fmt = (n) => "₹" + n.toLocaleString("en-IN");
const BACK_TO_MENU = { label: "🏠 Main Menu", value: "main" };
const PAYMENT_WARNING = "\n\n⚠️ *Booking Notice:* Payments can only be made securely through our website.";

/* ── helpers ─────────────────────────────────── */

function buildPropertyDetailMsg(p) {
  return (
    `🏡 *${p.name}*\n` +
    `${p.type}\n\n` +
    `💰 *Stay Pricing:* (Excl. GST)\n` +
    `  • Mon-Thu: ${fmt(p.pricing.weekday)} + 5% GST\n` +
    `  • Fri/Sun: ${fmt(p.pricing.weekend)} + 5% GST\n` +
    (p.pricing.prime ? `  • Saturday: ${fmt(p.pricing.prime)} + 5% GST\n` : "") +
    (p.extraPerson ? `  • Extra Adult: ${fmt(p.extraPerson)} + 5% GST\n` : "") +
    (p.kidsCharges ? `  • Kids (5-12 yrs): ${fmt(p.kidsCharges)} + 5% GST\n` : "") +
    `\n🕒 Check-in: ${p.checkIn} | Check-out: ${p.checkOut}\n` +
    `🍽️ Food: ${p.foodPolicy}\n` +
    `🐾 Pets: ${p.petsAllowed ? "Allowed ✅ (₹600 extra)" : "Not Allowed ❌"}\n` +
    `💵 Security Deposit: ${fmt(p.securityDeposit)}\n` +
    `✨ Amenities: ${p.amenities.join(", ")}\n` +
    `📍 Location: ${p.mapLink}\n` +
    `🚗 Travel: ${p.travelInfo}` +
    PAYMENT_WARNING
  );
}

/* ── Build a single-property IG bot tree ──────── */

function buildSinglePropertyIgTree(prefix, slug, welcomeName, websiteLink) {
  const p = properties.find(prop => prop.slug === slug);
  if (!p) return {};

  return {
    [`${prefix}_main`]: {
      message:
        `👋 *Welcome to ${welcomeName}!*\n\n` +
        `Luxury villa experience in Karjat, Maharashtra.\n\n` +
        `🤖 _I'm an automated assistant. Choose an option below to explore!_`,
      options: [
        { label: "📋 View Details", value: `${prefix}_details` },
        { label: "🌐 Visit Website", value: `${prefix}_website` },
        { label: "❓ FAQs & Live Chat", value: `${prefix}_faqs` },
        { label: "🤝 Collab", value: "collab" }
      ]
    },

    [`${prefix}_details`]: {
      message: buildPropertyDetailMsg(p),
      options: [
        { label: "🌐 Visit Website", value: `${prefix}_website` },
        { label: "❓ FAQs & Live Chat", value: `${prefix}_faqs` },
        BACK_TO_MENU
      ]
    },

    [`${prefix}_website`]: {
      message:
        `🌐 *${p.name} — Official Website*\n\n` +
        `Browse photos, check availability, and book your stay:\n\n` +
        `🔗 ${websiteLink}` +
        PAYMENT_WARNING,
      options: [
        { label: "📋 View Details", value: `${prefix}_details` },
        BACK_TO_MENU
      ]
    },

    [`${prefix}_faqs`]: {
      message: "❓ *FAQs & Live Chat Support*\n\nChoose a topic or talk to our team:",
      options: [
        { label: "🍽️ Food Options", value: `${prefix}_faq_food` },
        { label: "⏰ Check-in/out", value: `${prefix}_faq_timings` },
        { label: "🐾 Pet Policy", value: `${prefix}_faq_pets` },
        { label: "🎵 Music Policy", value: `${prefix}_faq_music` },
        { label: "🍺 Alcohol Policy", value: `${prefix}_faq_alcohol` },
        { label: "💳 Booking & Payment", value: `${prefix}_faq_booking` },
        { label: "📍 Location", value: `${prefix}_faq_location` },
        { label: "👤 Talk to a Human", value: "human" },
        BACK_TO_MENU
      ]
    },

    [`${prefix}_faq_food`]: {
      message: `🍽️ *Food at ${p.name}*\n\n${p.foodPolicy}` +
               (p.foodPolicy.includes("Meals Included")
                 ? "\n\n• Driver Food: ₹1,000 extra for all meals."
                 : "\n\n• Society restaurant available (Veg & Non-Veg), just steps away.\n• Driver Food: ₹1,000 extra for all meals."),
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_timings`]: {
      message: `⏰ *Check-in & Check-out — ${p.name}*\n\n• Check-in: ${p.checkIn}\n• Check-out: ${p.checkOut}`,
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_pets`]: {
      message: p.petsAllowed
        ? `🐾 *Pet Policy — ${p.name}*\n\n✅ Pets are allowed!\n💰 ₹600 extra per pet.`
        : `🐾 *Pet Policy — ${p.name}*\n\n❌ Pets are not allowed at this property.`,
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_music`]: {
      message: "🎵 *Music Policy*\n\n• Moderate volume allowed during the day.\n• *Loud music after 10 PM must be avoided* to respect other guests and neighbors.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_alcohol`]: {
      message: "🍺 *Alcohol Policy*\n\nAllowed inside private villas. Please maintain a peaceful environment.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_booking`]: {
      message: "💳 *How to Book & Pay*\n\nAll bookings must be made through *galaxiaresorts.com*.\n\n⚠️ *Payments only via official website.*",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_location`]: {
      message:
        `📍 *How to Reach ${p.name}*\n\n` +
        `📌 Google Maps: ${p.mapLink}\n\n` +
        `🚂 Nearest Station: Karjat (30-40 mins via auto/cab).\n` +
        `🚗 From Mumbai: ~2 hours via Mumbai-Pune Expressway.`,
      options: [BACK_TO_MENU]
    }
  };
}

/* ── Ambrose IG — special: covers all sub-villas ──────── */

function buildAmbroseIgTree() {
  const ambroseVillas = [
    { slug: "take-1", label: "🎬 Take-1", desc: "Film-Inspired Theme" },
    { slug: "alta", label: "🪵 Alta", desc: "Countryside Theme" },
    { slug: "santorini", label: "🏛️ Santorini", desc: "Mediterranean Theme" },
    { slug: "bamboosa", label: "🌴 Bamboosa", desc: "Bali-Inspired 2BHK" },
    { slug: "cypress", label: "🌲 Cypress", desc: "Machan/Treehouse Theme" }
  ];

  const prefix = "ambrose_ig";

  const tree = {
    [`${prefix}_main`]: {
      message:
        "👋 *Welcome to Ambrose — Themed Private Pool Villas!*\n\n" +
        "Experience our unique themed villas in Karjat, Maharashtra. Each villa features a private pool and all meals included.\n\n" +
        "🤖 _I'm an automated assistant. Choose an option below to explore!_",
      options: [
        { label: "📋 View Our Villas", value: `${prefix}_villas` },
        { label: "🌐 Visit Website", value: `${prefix}_website` },
        { label: "❓ FAQs & Live Chat", value: `${prefix}_faqs` },
        { label: "🤝 Collab", value: "collab" }
      ]
    },

    [`${prefix}_villas`]: {
      message: "🏡 *Our Themed Villas*\n\nSelect a villa to see details:",
      options: [
        ...ambroseVillas.map(v => ({
          label: v.label,
          value: `${prefix}_${v.slug}_details`,
          description: v.desc
        })),
        BACK_TO_MENU
      ]
    },

    [`${prefix}_website`]: {
      message:
        "🌐 *Ambrose Villas — Official Website*\n\n" +
        "Browse photos, check availability, and book your stay:\n\n" +
        "🔗 https://galaxiaresorts.com/staycation/ambrose" +
        PAYMENT_WARNING,
      options: [
        { label: "📋 View Our Villas", value: `${prefix}_villas` },
        BACK_TO_MENU
      ]
    },

    [`${prefix}_faqs`]: {
      message: "❓ *FAQs & Live Chat Support*\n\nChoose a topic or talk to our team:",
      options: [
        { label: "🍽️ Food Options", value: `${prefix}_faq_food` },
        { label: "⏰ Check-in/out", value: `${prefix}_faq_timings` },
        { label: "🐾 Pet Policy", value: `${prefix}_faq_pets` },
        { label: "🎵 Music Policy", value: `${prefix}_faq_music` },
        { label: "🍺 Alcohol Policy", value: `${prefix}_faq_alcohol` },
        { label: "💳 Booking & Payment", value: `${prefix}_faq_booking` },
        { label: "📍 Location", value: `${prefix}_faq_location` },
        { label: "👤 Talk to a Human", value: "human" },
        BACK_TO_MENU
      ]
    },

    [`${prefix}_faq_food`]: {
      message: "🍽️ *Food at Ambrose Villas*\n\nAll themed villas include *Breakfast, Lunch & Dinner* (Veg Only).\n\n• Driver Food: ₹1,000 extra for all meals.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_timings`]: {
      message: "⏰ *Check-in & Check-out — Ambrose Villas*\n\n• Check-in: 2:00 PM\n• Check-out: 10:00 AM",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_pets`]: {
      message: "🐾 *Pet Policy — Ambrose Villas*\n\n✅ Pets are allowed!\n💰 ₹600 extra per pet.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_music`]: {
      message: "🎵 *Music Policy*\n\n• Moderate volume allowed during the day.\n• *Loud music after 10 PM must be avoided* to respect other guests and neighbors.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_alcohol`]: {
      message: "🍺 *Alcohol Policy*\n\nAllowed inside private villas. Please maintain a peaceful environment.",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_booking`]: {
      message: "💳 *How to Book & Pay*\n\nAll bookings must be made through *galaxiaresorts.com*.\n\n⚠️ *Payments only via official website.*",
      options: [BACK_TO_MENU]
    },

    [`${prefix}_faq_location`]: {
      message:
        "📍 *How to Reach Ambrose Villas*\n\n" +
        "📌 Google Maps: https://maps.app.goo.gl/2NEib4Vz9raNqLY5A\n\n" +
        "🚂 Nearest Station: Karjat (30-40 mins via auto/cab).\n" +
        "🚗 From Mumbai: ~2 hours via Mumbai-Pune Expressway.",
      options: [BACK_TO_MENU]
    }
  };

  // Build detail + book nodes for each sub-villa
  for (const v of ambroseVillas) {
    const p = properties.find(prop => prop.slug === v.slug);
    if (!p) continue;

    tree[`${prefix}_${v.slug}_details`] = {
      message: buildPropertyDetailMsg(p),
      options: [
        { label: "🌐 Book on Website", value: `${prefix}_${v.slug}_book` },
        { label: "🔙 Other Villas", value: `${prefix}_villas` },
        BACK_TO_MENU
      ]
    };

    tree[`${prefix}_${v.slug}_book`] = {
      message:
        `📅 *Book ${p.name}*\n\n` +
        `Select your dates on our official booking portal:\n\n` +
        `🔗 https://galaxiaresorts.com/staycation/${p.slug}` +
        PAYMENT_WARNING,
      options: [
        { label: "🔙 Other Villas", value: `${prefix}_villas` },
        BACK_TO_MENU
      ]
    };
  }

  return tree;
}

/* ── Build all IG menu trees ──────────────────── */

const ambrose_ig_tree = buildAmbroseIgTree();

const amstelnest_ig_tree = buildSinglePropertyIgTree(
  "amstelnest_ig", "amstel-nest", "Amstel Nest",
  "https://galaxiaresorts.com/staycation/amstel-nest"
);

const laparaiso_ig_tree = buildSinglePropertyIgTree(
  "laparaiso_ig", "la-paraiso", "La Paraiso",
  "https://galaxiaresorts.com/staycation/la-paraiso"
);

const mountview_ig_tree = buildSinglePropertyIgTree(
  "mountview_ig", "mount-view", "Mount View",
  "https://galaxiaresorts.com/staycation/mount-view"
);

const heavenlyvilla_ig_tree = buildSinglePropertyIgTree(
  "heavenlyvilla_ig", "heavenly-villas", "Heavenly Villas",
  "https://galaxiaresorts.com/staycation/heavenly-villas"
);

const hillview_ig_tree = buildSinglePropertyIgTree(
  "hillview_ig", "hill-view", "Hill View",
  "https://galaxiaresorts.com/staycation/hill-view"
);

/* ── Shared nodes (collab, human) ─────────────── */
const sharedIgNodes = {
  collab: {
    message: "🤝 *Collaboration Inquiry*\n\nThank you for your interest in collaborating with us! Our team will contact you shortly.\n\nPlease stay tuned — we appreciate your patience!",
    options: [BACK_TO_MENU]
  },
  human: {
    message: "👤 *Talk to a Human*\n\nOur team will reply to this chat shortly.",
    options: [BACK_TO_MENU]
  }
};

/* ── Export all trees ─────────────────────────── */
const igMenuTrees = {
  ...ambrose_ig_tree,
  ...amstelnest_ig_tree,
  ...laparaiso_ig_tree,
  ...mountview_ig_tree,
  ...heavenlyvilla_ig_tree,
  ...hillview_ig_tree,
  ...sharedIgNodes
};

// Bot type prefixes for lookup
const IG_BOT_TYPES = [
  "ambrose_ig",
  "amstelnest_ig",
  "laparaiso_ig",
  "mountview_ig",
  "heavenlyvilla_ig",
  "hillview_ig"
];

module.exports = { igMenuTrees, IG_BOT_TYPES };
