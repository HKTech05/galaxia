const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../../data/ai_config.json");

const DEFAULT_CONFIG = {
  AI_PROVIDER: "deepseek",
  API_KEY: "sk-a4a9ba85a78c472d9e13bd64257820e3",
  BASE_URL: "https://api.deepseek.com/v1",
  MODEL_NAME: "deepseek-v4-flash",
  
  EMBEDDING_PROVIDER: "local", // local, openai, gemini
  EMBEDDING_API_KEY: "",
  EMBEDDING_BASE_URL: "",
  EMBEDDING_MODEL_NAME: "all-MiniLM-L6-v2",
  
  VECTOR_PROVIDER: "qdrant", // qdrant, pgvector, opensearch
  QDRANT_URL: "http://localhost:6333",
  QDRANT_API_KEY: "",
  OPENSEARCH_URL: "http://localhost:9200",
  OPENSEARCH_USER: "",
  OPENSEARCH_PASSWORD: "",
  PG_VECTOR_TABLE: "knowledge_vectors",
  
  BACKEND_API_URL: "http://localhost:4000",
  SYSTEM_PROMPT_ADDITION: "",
  CACHE_ENABLED: true,
  BOGUS_FILTER_ENABLED: true
};

class ConfigManager {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  load() {
    try {
      const dir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (fs.existsSync(CONFIG_PATH)) {
        const fileContent = fs.readFileSync(CONFIG_PATH, "utf8");
        const parsed = JSON.parse(fileContent);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      } else {
        // Hydrate from environment variables if present
        this.hydrateFromEnv();
        this.save();
      }
    } catch (err) {
      console.error("[ConfigManager] Error loading config, using defaults:", err.message);
      this.hydrateFromEnv();
    }
  }

  hydrateFromEnv() {
    if (process.env.AI_PROVIDER) this.config.AI_PROVIDER = process.env.AI_PROVIDER;
    if (process.env.AI_API_KEY) this.config.API_KEY = process.env.AI_API_KEY;
    if (process.env.AI_BASE_URL) this.config.BASE_URL = process.env.AI_BASE_URL;
    if (process.env.AI_MODEL_NAME) this.config.MODEL_NAME = process.env.AI_MODEL_NAME;
    
    if (process.env.EMBEDDING_PROVIDER) this.config.EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER;
    if (process.env.EMBEDDING_API_KEY) this.config.EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY;
    if (process.env.EMBEDDING_BASE_URL) this.config.EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL;
    if (process.env.EMBEDDING_MODEL_NAME) this.config.EMBEDDING_MODEL_NAME = process.env.EMBEDDING_MODEL_NAME;
    
    if (process.env.VECTOR_PROVIDER) this.config.VECTOR_PROVIDER = process.env.VECTOR_PROVIDER;
    if (process.env.QDRANT_URL) this.config.QDRANT_URL = process.env.QDRANT_URL;
    if (process.env.QDRANT_API_KEY) this.config.QDRANT_API_KEY = process.env.QDRANT_API_KEY;
    if (process.env.OPENSEARCH_URL) this.config.OPENSEARCH_URL = process.env.OPENSEARCH_URL;
    if (process.env.OPENSEARCH_USER) this.config.OPENSEARCH_USER = process.env.OPENSEARCH_USER;
    if (process.env.OPENSEARCH_PASSWORD) this.config.OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD;
    
    if (process.env.BACKEND_API_URL) this.config.BACKEND_API_URL = process.env.BACKEND_API_URL;
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }

  update(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.save();
    return this.config;
  }

  save() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), "utf8");
      console.log("[ConfigManager] Configuration saved successfully.");
    } catch (err) {
      console.error("[ConfigManager] Error saving config:", err.message);
    }
  }
}

// Singleton instance
module.exports = new ConfigManager();
