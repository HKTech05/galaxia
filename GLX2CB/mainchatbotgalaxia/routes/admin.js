const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const configManager = require("../services/ai/ConfigManager");
const knowledgeService = require("../services/ai/KnowledgeService");
const chatbotService = require("../services/ai/ChatbotService");
const conversationService = require("../services/ai/ConversationService");
const db = require("../services/db");

const DEBUG_FILE = path.resolve(__dirname, "../../data/last_request_debug.json");
const CACHE_FILE = path.resolve(__dirname, "../../data/faq_cache.json");
const SUMMARIES_FILE = path.resolve(__dirname, "../../data/session_summaries.json");

/**
 * GET /api/admin/ai/config
 * Retrieve current configuration.
 */
router.get("/config", (req, res) => {
  try {
    const config = configManager.getAll();
    // Hide keys in responses for safety, replace with asterisks if set
    const sanitize = (val) => val ? `${val.substring(0, 4)}...${val.slice(-4)}` : "";
    
    res.json({
      ...config,
      API_KEY: sanitize(config.API_KEY),
      EMBEDDING_API_KEY: sanitize(config.EMBEDDING_API_KEY),
      QDRANT_API_KEY: sanitize(config.QDRANT_API_KEY)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve configuration" });
  }
});

/**
 * POST /api/admin/ai/config
 * Update configuration.
 */
router.post("/config", (req, res) => {
  try {
    const newConfig = req.body;
    
    // Support partial updates, handle obscured keys
    const current = configManager.getAll();
    const updated = {};
    
    for (const key in current) {
      if (newConfig[key] !== undefined) {
        // If they sent censored value like "sk-a...20e3", do not update it
        if (typeof newConfig[key] === "string" && newConfig[key].includes("...")) {
          continue; 
        }
        updated[key] = newConfig[key];
      }
    }

    const saved = configManager.update(updated);
    res.json({ success: true, config: saved });
  } catch (err) {
    res.status(500).json({ error: `Failed to update configuration: ${err.message}` });
  }
});

/**
 * POST /api/admin/ai/reindex
 * Manually trigger incremental Obsidian reindexing.
 */
router.post("/reindex", async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === "true";
    const stats = await knowledgeService.reindexVault(force);
    res.json({ success: true, force, stats });
  } catch (err) {
    res.status(500).json({ error: `Reindexing failed: ${err.message}` });
  }
});

/**
 * GET /api/admin/ai/debug
 * View retrieved knowledge, prompt, tokens, latency, cost of the last request.
 */
router.get("/debug", (req, res) => {
  try {
    if (fs.existsSync(DEBUG_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEBUG_FILE, "utf8"));
      res.json(data);
    } else {
      res.json({ message: "No requests logged yet." });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to read debug logs" });
  }
});

/**
 * GET /api/admin/ai/cache
 * View all currently cached exact-match FAQs.
 */
router.get("/cache", (req, res) => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      res.json(cache);
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to read cache" });
  }
});

/**
 * POST /api/admin/ai/cache/clear
 * Clear the FAQ exact matches cache.
 */
router.post("/cache/clear", (req, res) => {
  try {
    chatbotService.clearCache();
    res.json({ success: true, message: "Cache cleared successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cache: " + err.message });
  }
});

/**
 * POST /api/admin/ai/conversations/clear
 * Clear conversation history for a bot type (e.g. "diaries", "staycation", or "all").
 * Clears: DB chat_messages, DB chat_sessions state, file summaries, in-memory caches.
 * Query params: ?type=diaries|staycation|all (default: all)
 */
router.post("/conversations/clear", async (req, res) => {
  try {
    const type = req.body?.type || req.query?.type || "all";
    let sessionFilter;
    if (type === "diaries" || type === "dd") {
      sessionFilter = "%_diaries";
    } else if (type === "staycation") {
      sessionFilter = "%_staycation";
    } else {
      sessionFilter = "%"; // all
    }

    // 1. Clear DB messages
    const msgResult = await db.pool.query(
      `DELETE FROM chat_messages WHERE session_id LIKE $1`,
      [sessionFilter]
    );

    // 2. Reset DB session states
    const sessResult = await db.pool.query(
      `UPDATE chat_sessions SET state = '{}'::jsonb WHERE session_id LIKE $1`,
      [sessionFilter]
    );

    // 3. Clear file-based summaries
    try {
      if (fs.existsSync(SUMMARIES_FILE)) {
        if (type === "all") {
          fs.writeFileSync(SUMMARIES_FILE, "{}", "utf8");
        } else {
          const summaries = JSON.parse(fs.readFileSync(SUMMARIES_FILE, "utf8"));
          const suffix = type === "diaries" || type === "dd" ? "_diaries" : "_staycation";
          for (const key of Object.keys(summaries)) {
            if (key.endsWith(suffix)) delete summaries[key];
          }
          fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(summaries, null, 2), "utf8");
        }
      }
    } catch (e) { /* ignore file errors */ }

    // 4. Clear in-memory caches
    if (conversationService.summaries) conversationService.summaries = {};
    if (conversationService.memHistory) conversationService.memHistory = {};
    if (conversationService.sessionStates) conversationService.sessionStates = {};

    res.json({
      success: true,
      type,
      messagesDeleted: msgResult.rowCount,
      sessionsReset: sessResult.rowCount
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to clear conversations: ${err.message}` });
  }
});

module.exports = router;
