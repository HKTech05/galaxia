const fs = require("fs");
const path = require("path");
const db = require("../db");
const aiProviderService = require("./AIProviderService");

const SUMMARIES_FILE = path.resolve(__dirname, "../../data/session_summaries.json");

class ConversationService {
  constructor() {
    this.summaries = {};
    this.memHistory = {}; // In-memory fallback for offline DB / Vercel cloud
    this.sessionStates = {}; // Structured entity state memory per session
    this.loadSummaries();
  }

  async getSessionState(sessionId) {
    if (!this.sessionStates[sessionId]) {
      this.sessionStates[sessionId] = {
        activeProperty: null,
        subProperty: null,
        checkInDate: null,
        checkOutDate: null,
        guestCount: null,
        funnelStage: "INITIAL"
      };

      try {
        const res = await db.pool.query(
          `SELECT state FROM chat_sessions WHERE session_id = $1`,
          [sessionId]
        );
        if (res.rows.length > 0 && res.rows[0].state) {
          this.sessionStates[sessionId] = {
            ...this.sessionStates[sessionId],
            ...res.rows[0].state
          };
        }
      } catch (dbErr) {
        // Fallback to in-memory state
      }
    }
    return this.sessionStates[sessionId];
  }

  async updateSessionState(sessionId, updates) {
    const currentState = await this.getSessionState(sessionId);
    const cleanUpdates = {};
    for (const key of Object.keys(updates)) {
      if (updates[key] !== null && updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }
    const newState = {
      ...currentState,
      ...cleanUpdates
    };
    this.sessionStates[sessionId] = newState;

    try {
      await db.pool.query(
        `UPDATE chat_sessions SET state = $2::jsonb, updated_at = NOW() WHERE session_id = $1`,
        [sessionId, JSON.stringify(newState)]
      );
    } catch (dbErr) {
      // Silent catch for offline database
    }

    return newState;
  }

  loadSummaries() {
    try {
      if (fs.existsSync(SUMMARIES_FILE)) {
        this.summaries = JSON.parse(fs.readFileSync(SUMMARIES_FILE, "utf8"));
      } else {
        this.summaries = {};
      }
    } catch (err) {
      console.error("[ConversationService] Error loading summaries:", err.message);
      this.summaries = {};
    }
  }

  saveSummaries() {
    try {
      const dir = path.dirname(SUMMARIES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(this.summaries, null, 2), "utf8");
    } catch (err) {
      console.error("[ConversationService] Error saving summaries:", err.message);
    }
  }

  saveMemMessage(sessionId, role, message) {
    if (!this.memHistory[sessionId]) {
      this.memHistory[sessionId] = [];
    }
    this.memHistory[sessionId].push({ role, message, created_at: new Date() });
    if (this.memHistory[sessionId].length > 20) {
      this.memHistory[sessionId] = this.memHistory[sessionId].slice(-20);
    }
  }

  /**
   * Generates an isolated session ID for a specific bot type.
   * Bot 1: _diaries, Bot 2: _amstel, Bot 3: _staycation
   */
  getIsolatedSessionId(rawSessionId, botType) {
    if (rawSessionId.startsWith("wa_") || rawSessionId.startsWith("ig_")) {
      return rawSessionId;
    }
    if (rawSessionId.endsWith("_diaries") || rawSessionId.endsWith("_amstel") || rawSessionId.endsWith("_staycation")) {
      return rawSessionId;
    }
    const cleanType = botType.toLowerCase();
    if (cleanType === "digital_diaries" || cleanType === "diaries" || cleanType === "bot1") {
      return `${rawSessionId}_diaries`;
    } else if (cleanType === "amstel_nest" || cleanType === "amstel" || cleanType === "bot2") {
      return `${rawSessionId}_amstel`;
    } else {
      return `${rawSessionId}_staycation`; // staycation or other
    }
  }

  /**
   * Load history for a session and handle automatic summarization if it's too long.
   */
  async getMessagesForPrompt(sessionId, maxHistoryMessages = 8) {
    let messages = [];
    try {
      messages = await db.getChatMessages(sessionId);
    } catch (err) {
      messages = this.memHistory[sessionId] || [];
    }

    if (!messages || messages.length === 0) {
      messages = this.memHistory[sessionId] || [];
    }
    
    // If history is small, return all messages
    if (messages.length <= maxHistoryMessages) {
      return {
        history: messages.map(m => ({ role: m.role, content: m.message })),
        summary: this.summaries[sessionId] || ""
      };
    }

    // If history is large, summarize older history
    const messagesToSummarize = messages.slice(0, -3);
    const recentMessages = messages.slice(-3);

    const summaryText = await this.summarizeMessages(sessionId, messagesToSummarize);
    
    return {
      history: recentMessages.map(m => ({ role: m.role, content: m.message })),
      summary: summaryText
    };
  }

  /**
   * Calls AI to summarize a list of messages and saves the summary.
   */
  async summarizeMessages(sessionId, messagesList) {
    const formattedHistory = messagesList
      .map(m => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.message}`)
      .join("\n");

    const systemPrompt = "You are a professional assistant. Summarize the key booking requirements, questions, and dates mentioned in the conversation history below in one brief paragraph. Only list factual details that have been confirmed. Do not add any greeting, intro, or emojis.";
    
    try {
      const result = await aiProviderService.generateCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `History to summarize:\n${formattedHistory}` }
      ], 0.1);

      const summaryText = result.text.trim();
      this.summaries[sessionId] = summaryText;
      this.saveSummaries();

      return summaryText;
    } catch (err) {
      return this.summaries[sessionId] || "";
    }
  }

  async saveUserMessage(sessionId, text, customerPhone, phoneNumberId, botType, platform) {
    const cleanSessionId = this.getIsolatedSessionId(sessionId, botType);
    this.saveMemMessage(cleanSessionId, "user", text);

    try {
      await db.getOrCreateSession(cleanSessionId, customerPhone, phoneNumberId, botType, platform);
      return await db.saveMessage(cleanSessionId, "user", text, false);
    } catch (err) {
      return { id: Date.now() };
    }
  }

  async saveAssistantMessage(sessionId, text) {
    this.saveMemMessage(sessionId, "assistant", text);

    try {
      return await db.saveMessage(sessionId, "assistant", text, false);
    } catch (err) {
      return { id: Date.now() };
    }
  }

  async getSessionMetadata(sessionId) {
    try {
      return await db.getSession(sessionId);
    } catch (err) {
      console.warn("[ConversationService] DB getSessionMetadata failed:", err.message);
      return null;
    }
  }
}

module.exports = new ConversationService();
