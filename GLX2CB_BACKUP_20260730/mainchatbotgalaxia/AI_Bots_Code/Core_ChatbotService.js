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
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are a structured intent extractor for a vacation/screening resort booking platform.
Analyze the user message (and the recent context summary if provided) and determine if the user is asking about booking availability, dates, or calendar schedule.

Current Date Today: ${today} (Calendar Year is 2026).
- IMPORTANT: Hinglish slang/typos like "vol", "bol", "bta", "btao", "batana", "vol re", "bol re" mean "TELL ME / EXPLAIN / PROVIDE DETAILS" (e.g. "amstel ka vol re" means "tell me about Amstel Nest prices/details!"). DO NOT set checkInDate to TODAY (${today}) unless the user explicitly wrote "today" or "aaj"!
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

    // Bot Scoping & Refusal Rules
    const cleanType = botType.toLowerCase();
    const textLower = textTrimmed.toLowerCase();
    
    if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
      const stayKeywords = ["stay", "resort", "hotel", "cottage", "villa", "karjat", "amstel", "ambrose", "paraiso", "heavenly", "mount view", "hill view"];
      for (const kw of stayKeywords) {
        if (textLower.includes(kw)) {
          const refusalMsg = "I am the Digital Diaries Assistant and only handle Wadala movie screening bookings. For staycation bookings, please contact our staycation department.";
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
    } else if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "staycation" || cleanType === "bot2" || cleanType === "bot3") {
      const diariesKeywords = ["wadala", "private theater", "private screening", "movie time", "celebration package", "sandy screen", "cine love", "park n watch", "baywatch"];
      for (const kw of diariesKeywords) {
        if (textLower.includes(kw)) {
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
    }

    // 1. Exact Match Cache Check
    const cacheKey = this.getCacheKey(botType, textTrimmed);
    if (configManager.get("CACHE_ENABLED") && this.cache[cacheKey]) {
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
    const dateIndicators = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "month", "date", "calendar", "check", "avail", "from", "to", "tomorrow", "today", "weekend", "stay", "night", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const textLowerCheck = textTrimmed.toLowerCase();
    if (dateIndicators.some(ind => textLowerCheck.includes(ind))) {
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
        if (intent.checkInDate) stateUpdates.checkInDate = intent.checkInDate;
        if (intent.checkOutDate) stateUpdates.checkOutDate = intent.checkOutDate;
        if (intent.customerName) stateUpdates.customerName = intent.customerName;
        if (intent.customerPhone) stateUpdates.customerPhone = intent.customerPhone;
        if (intent.customerName || intent.customerPhone) {
          stateUpdates.funnelStage = "CONTACT_PROVIDED";
        }
        
        await conversationService.updateSessionState(cleanSessionId, stateUpdates);

        if (intent.isStaycationQuery && intent.propertySlug && intent.checkInDate && intent.checkOutDate) {
          const avail = await dynamicDataService.checkStaycationAvailability(
            intent.propertySlug,
            intent.checkInDate,
            intent.checkOutDate,
            intent.subPropertySlug
          );
          dynamicContext += `### LIVE CALENDAR AVAILABILITY (STAYCATION):\n${JSON.stringify(avail, null, 2)}\n\n`;
        } else if (intent.isDiariesQuery && intent.ddScreenSlug && intent.ddBookingDate && intent.ddStartHour) {
          const avail = await dynamicDataService.checkDigitalDiariesAvailability(
            intent.ddScreenSlug,
            intent.ddBookingDate,
            intent.ddStartHour,
            intent.ddDuration || 2
          );
          dynamicContext += `### LIVE CALENDAR AVAILABILITY (DIGITAL DIARIES SCREEN):\n${JSON.stringify(avail, null, 2)}\n\n`;
        }
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

    // 10. Cache Response if it was a high-scoring semantic question
    if (configManager.get("CACHE_ENABLED") && textTrimmed.length > 5 && textTrimmed.length < 50) {
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
