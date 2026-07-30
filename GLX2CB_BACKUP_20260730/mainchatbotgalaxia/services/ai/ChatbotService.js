const fs = require("fs");
const path = require("path");
const configManager = require("./ConfigManager");
const aiProviderService = require("./AIProviderService");
const conversationService = require("./ConversationService");
const knowledgeService = require("./KnowledgeService");
const dynamicDataService = require("./DynamicDataService");
const promptBuilder = require("./PromptBuilder");

const CACHE_FILE = path.resolve(__dirname, "../../data/faq_cache.json");

class ChatbotService {
  constructor() {
    this.cache = {};
    this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        this.cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      } else {
        this.cache = {};
      }
    } catch (err) {
      console.error("[ChatbotService] Error loading cache:", err.message);
      this.cache = {};
    }
  }

  saveCache() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2), "utf8");
    } catch (err) {
      // Ignore read-only filesystem errors on cloud serverless (Vercel)
    }
  }

  clearCache() {
    this.cache = {};
    this.saveCache();
    console.log("[ChatbotService] In-memory and disk cache cleared.");
  }

  getCacheKey(botType, text) {
    return `${botType.toLowerCase()}:${text.toLowerCase().trim()}`;
  }

  /**
   * Check if a query is a coding request or general bogus question.
   * Pure JS pre-filtering for speed and cost savings.
   */
  isBogusQuery(text) {
    const textLower = text.toLowerCase().trim();
    
    // Regular greeting, booking questions, numbers, and dates are not bogus
    if (["hi", "hello", "hey", "start", "menu", "help"].includes(textLower)) {
      return false;
    }

    // Standalone numbers or dates (e.g. "23", "23rd", "2", "4", "23 july") are NOT bogus
    if (/^\d{1,2}(st|nd|rd|th)?$/i.test(textLower) || /^\d{1,2}\s+[a-z]+$/i.test(textLower)) {
      return false;
    }

    // Coding keywords check
    const codingKeywords = [
      "javascript", "python", "html", "css", "write a function", "write a class",
      "coding", "programming", "sql query", "array", "binary tree", "bug", "compile",
      "sorting algorithm", "recursion", "c++", "c#", "java code"
    ];
    for (const kw of codingKeywords) {
      if (textLower.includes(kw)) return true;
    }

    // General knowledge off-topic check
    const offTopicKeywords = [
      "who is the president", "capital of", "weather in", "distance from earth",
      "how to cook", "solve equation", "world cup winner", "tell me a joke about",
      "write an essay", "translate this"
    ];
    for (const kw of offTopicKeywords) {
      if (textLower.includes(kw)) return true;
    }

    return false;
  }

  async extractIntent(text, summary = "") {
    const textLower = text.toLowerCase().trim();
    
    // Fast exit for simple greetings or non-date messages (0ms latency optimization)
    const isSimpleMsg = ["hi", "hii", "hello", "hey", "namaste", "start", "menu", "human", "collab", "price", "pricing", "rates"].includes(textLower);
    const containsDateNumber = /\b(\d{1,2}(st|nd|rd|th)?|today|aaj|ajj|tomorrow|kal|kall|monday|tuesday|wednesday|thursday|friday|saturday|sunday|july|august|september|slot|slots|booking|available|free|khali)\b/i.test(textLower);

    if (isSimpleMsg || (!containsDateNumber && textLower.length < 20)) {
      return null;
    }

    const calendarTable = promptBuilder.getCalendarTable();
    const systemPrompt = `You are a structured intent extractor for a vacation/screening resort booking platform.
Analyze the user message (and the recent context summary if provided) and determine if the user is asking about booking availability, dates, or calendar schedule.

${calendarTable}

- IMPORTANT: Hinglish slang/typos like "vol", "bol", "bta", "btao", "batana", "vol re", "bol re" mean "TELL ME / EXPLAIN / PROVIDE DETAILS" (e.g. "amstel ka vol re" means "tell me about Amstel Nest prices/details!"). DO NOT set checkInDate to TODAY unless the user explicitly wrote "today", "aaj", or "ajj"!
- IMPORTANT: In Hinglish, "free hai kya", "khali hai kya", "available hai kya" means AVAILABILITY/VACANCY QUERY for dates. It does NOT mean zero cost / complimentary!
- "friday pe free hai kya alta" -> Querying if Alta (Ambrose Villa) is available/vacant on the coming Friday.
- "uske baad wala friday" -> Querying availability for the Friday of the following week.
- If the user enters a standalone number like "25" or "25th" after being asked for a date, parse checkInDate as 2026-07-25 (using 2026-07 as current month).
- "Agle month" or "next month" means August 2026.
- Translate days like "this Friday", "next Friday", "this weekend", "tomorrow" into accurate YYYY-MM-DD check-in and check-out dates.

- If the user provides a name (e.g. "Raj Shah", "Raj Shah 96531 76436") or a phone number (e.g. "96531 76436", "+919653176436"), extract them into "customerName" and "customerPhone" respectively.

Allowed Property Slugs: "amstel-nest", "ambrose", "la-paraiso", "heavenly-villa", "hill-view", "mount-view".
Sub-properties: "take-1", "alta", "santorini", "cypress", "bamboosa", "standard-cottage", "family-cottage".
Allowed Screen Slugs: "park-n-watch", "cine-love", "sandy-screen", "baywatch".

Output ONLY a raw valid JSON object (no markdown, no backticks, no other text) with the following structure:
{
  "isStaycationQuery": boolean,
  "isDiariesQuery": boolean,
  "propertySlug": string or null,
  "subPropertySlug": string or null,
  "checkInDate": "YYYY-MM-DD" or null,
  "checkOutDate": "YYYY-MM-DD" or null,
  "ddScreenSlug": string or null,
  "ddBookingDate": "YYYY-MM-DD" or null,
  "ddStartHour": number or null,
  "ddDuration": number or null,
  "customerName": string or null,
  "customerPhone": string or null
}`;

    try {
      const messages = [
        { role: "system", content: systemPrompt + (summary ? `\n\nRecent context:\n${summary}` : "") },
        { role: "user", content: text }
      ];
      const aiResult = await aiProviderService.generateCompletion(messages);
      let cleanText = aiResult.text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      return JSON.parse(cleanText);
    } catch (err) {
      console.warn("[ChatbotService] Intent extraction failed:", err.message);
      return null;
    }
  }

  async processMessage(sessionId, text, customerPhone, phoneNumberId, botType, platform = "whatsapp") {
    const startTime = Date.now();
    const cleanSessionId = conversationService.getIsolatedSessionId(sessionId, botType);
    const textTrimmed = text.trim();

    // Check Collaboration / Partnership / Promotion Intent (Across All Bots)
    const collabRegex = /\b(collab|collaborate|collaboration|promotions?|advertising|advertisement|ads?|partnership|sponsor|sponsorship|influencer|tie\s*up|brand\s*collab|pr\s*package)\b/i;
    if (collabRegex.test(textTrimmed)) {
      const collabMsg = "Thank you for your interest in collaborating with us! Our team will contact you shortly.\n\nPlease stay tuned — we appreciate your patience!";
      await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
      const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, collabMsg);
      // Auto-switch to human mode so staff can follow up
      const db = require("../db");
      await db.setHumanMode(cleanSessionId, true);
      return {
        reply: collabMsg,
        latency: Date.now() - startTime,
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
        retrievedChunksCount: 0,
        cached: false,
        messageId: savedMsg.id
      };
    }

    // Check Human Escalation Mode Intent (Across All Bots)
    const humanRegex = /\b(human|human\s*mode|staff|admin|agent|support\s*person|talk\s*to\s*(a\s*)?(human|staff|admin|person)|speak\s*to\s*(a\s*)?(human|staff|admin|person)|connect\s*(me\s*)?to\s*(human|staff|admin|person)|call\s*me\s*back)\b/i;
    if (humanRegex.test(textTrimmed)) {
      const humanMsg = "This conversation has now been shifted to Human mode. A support staff will contact you via message or call as soon as they are available.";
      await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
      const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, humanMsg);
      // Auto-switch to human mode in DB
      const db = require("../db");
      await db.setHumanMode(cleanSessionId, true);
      return {
        reply: humanMsg,
        latency: Date.now() - startTime,
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
        retrievedChunksCount: 0,
        cached: false,
        messageId: savedMsg.id
      };
    }

    // Bot Scoping & Refusal Rules
    const cleanType = botType.toLowerCase();
    const textLower = textTrimmed.toLowerCase();

    // Check Verbal Phone Call Request for Digital Diaries ONLY (+91 98922 94042)
    if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
      // Check if outside office hours (8 PM to 10 AM IST)
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hourIST = nowIST.getHours();
      const isOutsideOfficeHours = hourIST >= 20 || hourIST < 10;
      const officeHoursNote = isOutsideOfficeHours ? "\n\nPlease note: Our office hours are 10:00 AM to 8:00 PM. Calls will not be answered after 8 PM until next day morning." : "";

      const unansweredCallRegex = /\b(nai\s*utha|nahi\s*utha|not\s*picking|nobody\s*answering|no\s*answer|call\s*nahi|phone\s*nahi|not\s*answering|call\s*not\s*received|busy|call\s*unanswered)\b/i;
      if (unansweredCallRegex.test(textTrimmed)) {
        const callbackMsg = "Sorry for the inconvenience. Our team will get back to you with a call back shortly as soon as possible." + officeHoursNote;
        await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
        const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, callbackMsg);
        return {
          reply: callbackMsg,
          latency: Date.now() - startTime,
          tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: 0,
          retrievedChunksCount: 0,
          cached: false,
          messageId: savedMsg.id
        };
      }

      const callRegex = /\b(call|phone|calling|contact\s*number|phone\s*number|call\s*number|call\s*kare|call\s*karu|call\s*par|talk\s*on\s*call|speak\s*on\s*call)\b/i;
      if (callRegex.test(textTrimmed)) {
        const callMsg = "For verbal inquiries regarding Digital Diaries Wadala, you can call us directly on: +91 98922 94042." + officeHoursNote;
        await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
        const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, callMsg);
        return {
          reply: callMsg,
          latency: Date.now() - startTime,
          tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: 0,
          retrievedChunksCount: 0,
          cached: false,
          messageId: savedMsg.id
        };
      }
    }
    
    // Strict Regex Scoping with Word Boundaries
    const staycationRegex = /\b(stay|vacation|staycations?|resorts?|hotels?|cottages?|villas?|karjat|amstel|ambrose|paraiso|la\s*paraiso|heavenly|mount\s*view|hill\s*view|santorini|alta|take-?1|bamboosa|cypress)\b/i;
    const diariesRegex = /\b(sandy|cine\s*love|park\s*n\s*watch|baywatch|wadala|movie\s*time|celebration|screen|screens|digital\s*diaries)\b/i;

    if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
      if (staycationRegex.test(textTrimmed) && !diariesRegex.test(textTrimmed)) {
        const refusalMsg = "I am the Digital Diaries Assistant and only handle Wadala movie screening bookings. For staycation/resort bookings, please visit our staycation contact page for all details and contact numbers: https://www.galaxiaresorts.com/staycation/contact";
        await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
        const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, refusalMsg);
        return {
          reply: refusalMsg,
          latency: Date.now() - startTime,
          tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: 0,
          retrievedChunksCount: 0,
          cached: false,
          messageId: savedMsg.id
        };
      }
    } else if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "staycation" || cleanType === "bot2" || cleanType === "bot3") {
      if (diariesRegex.test(textTrimmed) && !staycationRegex.test(textTrimmed)) {
        const refusalMsg = "I am the Staycation Assistant and only handle Karjat staycation villa bookings. For Wadala movie screening bookings, please contact our Digital Diaries department.";
        await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
        const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, refusalMsg);
        return {
          reply: refusalMsg,
          latency: Date.now() - startTime,
          tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cost: 0,
          retrievedChunksCount: 0,
          cached: false,
          messageId: savedMsg.id
        };
      }
    }

    // 1. Exact Match Cache Check (Bypass for date/availability queries)
    const dateIndicators = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "month", "date", "calendar", "check", "avail", "free", "from", "to", "tomorrow", "today", "weekend", "stay", "night", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const isDateQuery = dateIndicators.some(ind => textLower.includes(ind));

    const cacheKey = this.getCacheKey(botType, textTrimmed);
    if (!isDateQuery && configManager.get("CACHE_ENABLED") && this.cache[cacheKey]) {
      console.log(`[ChatbotService] Cache hit for query: "${textTrimmed}"`);
      const cachedReply = this.cache[cacheKey];
      
      // Save messages in DB
      await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
      const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, cachedReply);

      return {
        reply: cachedReply,
        latency: Date.now() - startTime,
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
        retrievedChunksCount: 0,
        cached: true,
        messageId: savedMsg.id
      };
    }

    // 2. Anti-Bogus Filter
    if (configManager.get("BOGUS_FILTER_ENABLED") && this.isBogusQuery(textTrimmed)) {
      let refusalMsg = "";
      if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
        refusalMsg = "I am the Digital Diaries Assistant for Wadala movie screening bookings. How can I help you with your booking today?";
      } else if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "bot2") {
        refusalMsg = "I am the Staycation Assistant for Amstel Nest and Karjat villa bookings. How can I help you with your booking today?";
      } else {
        refusalMsg = "I am the Staycation Assistant for Karjat staycation villa bookings. How can I help you with your booking today?";
      }
      
      await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
      const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, refusalMsg);

      return {
        reply: refusalMsg,
        latency: Date.now() - startTime,
        tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
        retrievedChunksCount: 0,
        cached: false,
        messageId: savedMsg.id
      };
    }

    // 3. Resolve bot configuration & RAG allowed categories
    // Bot 1: Diaries. Bot 2: Amstel/Staycation. Bot 3: Staycation.
    let allowedCategories = [];
    if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
      allowedCategories = ["Digital Diaries", "General"];
    } else if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "bot2") {
      allowedCategories = [
        "Staycation/Amstel Nest",
        "Staycation/Hill View",
        "Staycation/Mount View",
        "Staycation/Heavenly Villa",
        "Staycation/La Paraiso",
        "Staycation/Ambrose",
        "Staycation/General",
        "General"
      ];
    } else {
      allowedCategories = [
        "Staycation/Amstel Nest",
        "Staycation/Hill View",
        "Staycation/Mount View",
        "Staycation/Heavenly Villa",
        "Staycation/La Paraiso",
        "Staycation/Ambrose",
        "Staycation/General",
        "General"
      ];
    }

    // Fetch recent conversation history for prompt context & RAG enrichment
    const historyObj = await conversationService.getMessagesForPrompt(cleanSessionId);
    const historySummary = historyObj.summary || (historyObj.history || []).slice(-4).map(h => `${h.role}: ${h.content}`).join("\n");

    // 4. Perform Semantic RAG Search
    let ragQuery = textTrimmed;
    if (textTrimmed.length <= 6 && historySummary) {
      ragQuery = `${textTrimmed} ${historySummary}`;
    }
    const searchRes = await knowledgeService.searchContext(ragQuery, 4, allowedCategories);
    let ragContext = searchRes.context;

    // Prioritize Amstel Nest inside Bot 2 (boosting score)
    if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "bot2") {
      // Sort matches to ensure Amstel Nest chunks are presented first in context
      const matches = [...searchRes.matches];
      matches.sort((a, b) => {
        const aIsAmstel = a.filePath.includes("Amstel Nest");
        const bIsAmstel = b.filePath.includes("Amstel Nest");
        if (aIsAmstel && !bIsAmstel) return -1;
        if (!aIsAmstel && bIsAmstel) return 1;
        return 0;
      });
      ragContext = matches.map(match => `[Source: ${match.filePath} - ${match.topic}]\n${match.content}`).join("\n\n");
    }

    // Always load and prepend Bot Operational Rules from vault if available
    try {
      const vaultRoot = knowledgeService.vaultPath;
      const rulesSubPath = (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1")
        ? "Digital Diaries/Bot Operational Rules.md"
        : "Staycation/General/Bot Operational Rules.md";
      const rulesPath = path.resolve(vaultRoot, rulesSubPath);
      if (fs.existsSync(rulesPath)) {
        const rulesContent = fs.readFileSync(rulesPath, "utf8");
        ragContext = `[Source: Bot Operational Rules]\n${rulesContent}\n\n${ragContext}`;
      }
    } catch (rulesErr) {
      console.warn("[ChatbotService] Failed to load Bot Operational Rules:", rulesErr.message);
    }

    // 5. Query Dynamic Context (Availability, Coupons, Bookings)
    let dynamicContext = "";
    
    // Check if user is asking about booking reference
    const refRegex = /\b(GLX-[A-Z0-9-]+)\b/i;
    const matchRef = textTrimmed.match(refRegex);
    if (matchRef) {
      const bookingRef = matchRef[1];
      console.log(`[ChatbotService] Querying booking ref: ${bookingRef}`);
      const booking = await dynamicDataService.getBookingStatus(bookingRef);
      if (booking) {
        dynamicContext += `### LIVE BOOKING STATUS DETECTED:\n${JSON.stringify(booking, null, 2)}\n\n`;
      } else {
        dynamicContext += `### LIVE BOOKING STATUS DETECTED:\nBooking reference "${bookingRef}" was NOT found in the database. Please inform the user.\n\n`;
      }
    }

    // Check if user is validating a coupon code
    const couponRegex = /\b(COUPON|DISCOUNT|CODE|OFFER)\b\s+(\w+)\b/i;
    const matchCoupon = textTrimmed.match(couponRegex);
    if (matchCoupon) {
      const code = matchCoupon[2];
      const couponRes = await dynamicDataService.validateCoupon(code);
      dynamicContext += `### LIVE COUPON VALIDATION DETECTED:\n${JSON.stringify(couponRes, null, 2)}\n\n`;
    }

    // Perform Date Intent Extraction & Calendar Check
    const textLowerCheck = textTrimmed.toLowerCase();
    if (isDateQuery || dateIndicators.some(ind => textLowerCheck.includes(ind))) {
      let summary = "";
      try {
        const histObj = await conversationService.getMessagesForPrompt(cleanSessionId);
        const hist = histObj ? histObj.history : [];
        if (hist && hist.length > 0) {
          summary = hist.slice(-4).map(h => `${h.role}: ${h.content}`).join("\n");
        }
      } catch (histErr) {
        console.warn("[ChatbotService] Failed to load history for intent context:", histErr.message);
      }

      console.log(`[ChatbotService] Extracting date intent from query: "${textTrimmed}"`);
      const intent = await this.extractIntent(textTrimmed, summary);
      if (intent) {
        console.log(`[ChatbotService] Extracted intent:`, JSON.stringify(intent));

        // Update entity state dynamically
        const stateUpdates = {};
        if (intent.propertySlug) {
          const propMap = {
            "amstel-nest": "Amstel Nest",
            "ambrose": "Ambrose Villas",
            "la-paraiso": "La Paraiso",
            "heavenly-villa": "Heavenly Villa",
            "hill-view": "Hill View",
            "mount-view": "Mount View"
          };
          stateUpdates.activeProperty = propMap[intent.propertySlug] || intent.propertySlug;
        }
        if (intent.subPropertySlug) stateUpdates.subProperty = intent.subPropertySlug;
        if (intent.checkInDate || intent.ddBookingDate) stateUpdates.checkInDate = intent.checkInDate || intent.ddBookingDate;
        if (intent.checkOutDate) stateUpdates.checkOutDate = intent.checkOutDate;
        if (intent.customerName) stateUpdates.customerName = intent.customerName;
        if (intent.customerPhone) stateUpdates.customerPhone = intent.customerPhone;
        if (intent.customerName || intent.customerPhone) {
          stateUpdates.funnelStage = "CONTACT_PROVIDED";
        }
        
        await conversationService.updateSessionState(cleanSessionId, stateUpdates);

        // Fetch refreshed session entity state
        const updatedState = await conversationService.getSessionState(cleanSessionId);

        // Helper to convert property display name to slug
        const toSlug = (str) => {
          if (!str) return null;
          const s = str.toLowerCase();
          if (s.includes("amstel")) return "amstel-nest";
          if (s.includes("ambrose")) return "ambrose";
          if (s.includes("paraiso")) return "la-paraiso";
          if (s.includes("heavenly")) return "heavenly-villa";
          if (s.includes("hill")) return "hill-view";
          if (s.includes("mount")) return "mount-view";
          return s.replace(/\s+/g, "-");
        };

        // Determine effective property & sub-property from intent, user query, or entity state
        let effectivePropSlug = intent.propertySlug || toSlug(updatedState.activeProperty);
        let effectiveSubPropSlug = intent.subPropertySlug || updatedState.subProperty || null;

        // Keyword overrides from user query text
        if (textLowerCheck.includes("santorini")) { effectivePropSlug = "ambrose"; effectiveSubPropSlug = "santorini"; }
        else if (textLowerCheck.includes("alta")) { effectivePropSlug = "ambrose"; effectiveSubPropSlug = "alta"; }
        else if (textLowerCheck.includes("take-1") || textLowerCheck.includes("take 1") || textLowerCheck.includes("bollywood")) { effectivePropSlug = "ambrose"; effectiveSubPropSlug = "take-1"; }
        else if (textLowerCheck.includes("bamboosa")) { effectivePropSlug = "ambrose"; effectiveSubPropSlug = "bamboosa"; }
        else if (textLowerCheck.includes("cypress") || textLowerCheck.includes("machan")) { effectivePropSlug = "ambrose"; effectiveSubPropSlug = "cypress"; }
        else if (textLowerCheck.includes("family cottage") || textLowerCheck.includes("family")) { effectivePropSlug = "amstel-nest"; effectiveSubPropSlug = "family-cottage"; }
        else if (textLowerCheck.includes("standard cottage") || textLowerCheck.includes("standard")) { effectivePropSlug = "amstel-nest"; effectiveSubPropSlug = "standard-cottage"; }
        else if (textLowerCheck.includes("la paraiso") || textLowerCheck.includes("paraiso")) { effectivePropSlug = "la-paraiso"; }
        else if (textLowerCheck.includes("heavenly")) { effectivePropSlug = "heavenly-villa"; }
        else if (textLowerCheck.includes("mount view")) { effectivePropSlug = "mount-view"; }
        else if (textLowerCheck.includes("hill view")) { effectivePropSlug = "hill-view"; }

        // Default property if botType is amstel_nest
        if (!effectivePropSlug && (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "bot2")) {
          effectivePropSlug = "amstel-nest";
        }

        const effectiveCheckIn = intent.checkInDate || updatedState.checkInDate;
        let effectiveCheckOut = intent.checkOutDate || updatedState.checkOutDate;

        if (effectiveCheckIn && (!effectiveCheckOut || effectiveCheckOut === effectiveCheckIn)) {
          const inObj = new Date(effectiveCheckIn);
          inObj.setDate(inObj.getDate() + 1);
          effectiveCheckOut = inObj.toISOString().split("T")[0];
        }

        // Perform Staycation Availability check if checkIn date and property are identified
        if (effectivePropSlug && effectiveCheckIn) {
          console.log(`[ChatbotService] Performing Staycation availability check: ${effectivePropSlug} (${effectiveSubPropSlug || 'all'}) for ${effectiveCheckIn} to ${effectiveCheckOut}`);
          const avail = await dynamicDataService.checkStaycationAvailability(
            effectivePropSlug,
            effectiveCheckIn,
            effectiveCheckOut,
            effectiveSubPropSlug
          );
          dynamicContext += `### REAL-TIME LIVE DATABASE CALENDAR AVAILABILITY (AUTHORITATIVE):\n${JSON.stringify(avail, null, 2)}\n*CRITICAL INSTRUCTION FOR AI*: You MUST use the above live database availability result to tell the user whether the property/villa is AVAILABLE or BOOKED/SOLD OUT for ${effectiveCheckIn}. If a single-unit property (Santorini, Take-1, Alta, Cypress, Bamboosa, La Paraiso, Heavenly Villa, Mount View, Hill View, Family Cottage, or DD screens) is booked, state simply that it is **SOLD OUT / BOOKED** for that date. NEVER output phrases like "Koi unit available nahi hai", "No units available", or mention unit counts for single-unit properties! Unit counts are ONLY applicable to Amstel Nest Standard Cottage (14 units).\n\n`;
        }

        // Determine Digital Diaries screen slug
        let effectiveScreenSlug = intent.ddScreenSlug;
        if (textLowerCheck.includes("sandy")) effectiveScreenSlug = "sandy-screen";
        else if (textLowerCheck.includes("cine love") || textLowerCheck.includes("cinelove")) effectiveScreenSlug = "cine-love";
        else if (textLowerCheck.includes("park n watch") || textLowerCheck.includes("park")) effectiveScreenSlug = "park-n-watch";
        else if (textLowerCheck.includes("baywatch")) effectiveScreenSlug = "baywatch";

        const effectiveDDDate = intent.ddBookingDate || intent.checkInDate || updatedState.checkInDate;
        const isDDBot = cleanType === "digital_diaries" || cleanType === "celebration" || intent.isDiariesQuery;

        if (effectiveDDDate && (effectiveScreenSlug || isDDBot)) {
          if (effectiveScreenSlug) {
            console.log(`[ChatbotService] Performing Digital Diaries availability check: ${effectiveScreenSlug} on ${effectiveDDDate} (hour: ${intent.ddStartHour})`);
            const avail = await dynamicDataService.checkDigitalDiariesAvailability(
              effectiveScreenSlug,
              effectiveDDDate,
              intent.ddStartHour,
              intent.ddDuration || 2
            );
            dynamicContext += `### REAL-TIME LIVE DATABASE CALENDAR AVAILABILITY (DIGITAL DIARIES SCREEN):\n${JSON.stringify(avail, null, 2)}\n*CRITICAL INSTRUCTION FOR AI*: You MUST use the above live database availability check to answer screen slot availability. Never state a slot is available if isAvailable is false!\n\n`;
          } else {
            console.log(`[ChatbotService] Performing Digital Diaries availability check for ALL screens on ${effectiveDDDate}`);
            const screens = ["sandy-screen", "cine-love", "park-n-watch", "baywatch"];
            const allAvail = [];
            for (const scr of screens) {
              const res = await dynamicDataService.checkDigitalDiariesAvailability(scr, effectiveDDDate, intent.ddStartHour, intent.ddDuration || 2);
              allAvail.push(res);
            }
            dynamicContext += `### REAL-TIME LIVE DATABASE CALENDAR AVAILABILITY (ALL DIGITAL DIARIES SCREENS FOR ${effectiveDDDate}):\n${JSON.stringify(allAvail, null, 2)}\n*CRITICAL INSTRUCTION FOR AI*: Use the above live database availability check to answer slot availability for today/date. List exact available slots for the screens!\n\n`;
          }
        }
      }

    } else {
      // Intent extraction returned null — still try DD availability from saved entity state
      const updatedState = await conversationService.getSessionState(cleanSessionId);
      const isDDBot = cleanType === "digital_diaries" || cleanType === "celebration";
      const savedDDDate = updatedState.checkInDate;

      if (savedDDDate && isDDBot) {
        // Try to extract hour from the raw message (e.g. "6pm", "3pm")
        const hourMatch = textTrimmed.match(/(\d{1,2})\s*(?:pm|am)/i);
        let ddHour = null;
        if (hourMatch) {
          ddHour = parseInt(hourMatch[1]);
          if (textTrimmed.toLowerCase().includes('pm') && ddHour < 12) ddHour += 12;
          if (textTrimmed.toLowerCase().includes('am') && ddHour === 12) ddHour = 0;
        }

        console.log(`[ChatbotService] Intent null — fallback DD availability check from saved state: date=${savedDDDate}, hour=${ddHour}`);
        const screens = ["sandy-screen", "cine-love", "park-n-watch", "baywatch"];
        const allAvail = [];
        for (const scr of screens) {
          const res = await dynamicDataService.checkDigitalDiariesAvailability(scr, savedDDDate, ddHour, 2);
          allAvail.push(res);
        }
        dynamicContext += `### REAL-TIME LIVE DATABASE CALENDAR AVAILABILITY (ALL DIGITAL DIARIES SCREENS FOR ${savedDDDate}${ddHour ? ` at ${ddHour}:00` : ''}):\n${JSON.stringify(allAvail, null, 2)}\n*CRITICAL INSTRUCTION FOR AI*: Use the above live database availability check to answer slot availability. List exact available slots for the screens!\n\n`;
      }
    }

    // Fetch active general offers to inject if user asks for discounts/offers
    if (textTrimmed.toLowerCase().includes("offer") || textTrimmed.toLowerCase().includes("coupon") || textTrimmed.toLowerCase().includes("discount")) {
      const offers = await dynamicDataService.getActiveOffers();
      dynamicContext += `### LIVE ACTIVE PROMOTIONS:\n${JSON.stringify(offers, null, 2)}\n\n`;
    }

    // 6. Fetch conversation history with summarization
    const { history, summary } = await conversationService.getMessagesForPrompt(cleanSessionId);

    // 7. Build LLM prompt with Active Entity State
    const entityState = await conversationService.getSessionState(cleanSessionId);
    const finalMessages = promptBuilder.buildMessages(botType, summary, history, textTrimmed, ragContext, dynamicContext, entityState);

    // 8. Generate response via LLM
    const aiResult = await aiProviderService.generateCompletion(finalMessages);

    // 9. Save Messages in Database
    await conversationService.saveUserMessage(sessionId, textTrimmed, customerPhone, phoneNumberId, botType, platform);
    const savedMsg = await conversationService.saveAssistantMessage(cleanSessionId, aiResult.text);

    // 9b. Write last request debug telemetry
    try {
      const debugData = {
        timestamp: new Date().toISOString(),
        userMessage: textTrimmed,
        botType,
        retrievedKnowledge: ragContext,
        dynamicContext: dynamicContext,
        finalPrompt: finalMessages,
        reply: aiResult.text,
        latency: aiResult.latency,
        tokenUsage: aiResult.usage,
        cost: aiResult.cost,
        cached: false
      };
      fs.writeFileSync(path.resolve(__dirname, "../../data/last_request_debug.json"), JSON.stringify(debugData, null, 2), "utf8");
    } catch (debugErr) {
      console.warn("[ChatbotService] Failed to save debug logs:", debugErr.message);
    }

    // 10. Cache Response if it was a high-scoring semantic question (and NOT a date query)
    if (!isDateQuery && configManager.get("CACHE_ENABLED") && textTrimmed.length > 5 && textTrimmed.length < 50) {
      this.cache[cacheKey] = aiResult.text;
      this.saveCache();
    }

    return {
      reply: aiResult.text,
      latency: aiResult.latency,
      tokenUsage: aiResult.usage,
      cost: aiResult.cost,
      retrievedChunksCount: searchRes.matches.length,
      cached: false,
      messageId: savedMsg.id
    };
  }
}

module.exports = new ChatbotService();
