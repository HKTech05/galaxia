const axios = require("axios");
const configManager = require("./ConfigManager");

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.initializingLocal = false;
  }

  async getEmbedding(text) {
    const provider = configManager.get("EMBEDDING_PROVIDER").toLowerCase();
    const apiKey = configManager.get("EMBEDDING_API_KEY") || configManager.get("API_KEY");
    const baseURL = configManager.get("EMBEDDING_BASE_URL") || configManager.get("BASE_URL");
    const model = configManager.get("EMBEDDING_MODEL_NAME");

    try {
      if (provider === "openai") {
        return await this.getOpenAIEmbedding(text, apiKey, baseURL, model || "text-embedding-3-small");
      } else if (provider === "gemini") {
        return await this.getGeminiEmbedding(text, apiKey, baseURL, model || "text-embedding-004");
      } else {
        // Fallback to local / JS vectorizer
        return await this.getLocalEmbedding(text);
      }
    } catch (err) {
      console.warn(`[EmbeddingService] Provider ${provider} failed, falling back to local JS vectorizer:`, err.message);
      return this.generateMockEmbedding(text, 384);
    }
  }

  async getOpenAIEmbedding(text, apiKey, baseURL, model) {
    const defaultUrl = baseURL || "https://api.openai.com/v1";
    const response = await axios.post(
      `${defaultUrl}/embeddings`,
      {
        input: text,
        model: model
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data.data[0].embedding;
  }

  async getGeminiEmbedding(text, apiKey, baseURL, model) {
    const defaultUrl = baseURL || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${defaultUrl}/models/${model}:embedContent?key=${apiKey}`;
    const response = await axios.post(url, {
      content: {
        parts: [{ text }]
      }
    });
    return response.data.embedding.values;
  }

  async getLocalEmbedding(text) {
    try {
      if (!this.extractor && !this.initializingLocal) {
        this.initializingLocal = true;
        console.log("[EmbeddingService] Initializing @xenova/transformers pipeline for feature-extraction...");
        const { pipeline } = require("@xenova/transformers");
        this.extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        this.initializingLocal = false;
        console.log("[EmbeddingService] Local ONNX model loaded successfully.");
      }
      
      if (this.extractor) {
        const output = await this.extractor(text, { pooling: "mean", normalize: true });
        return Array.from(output.data);
      }
    } catch (err) {
      this.initializingLocal = false;
      // If package is not installed or error occurs, fallback to pure JS vectorizer
      console.warn("[EmbeddingService] Local ONNX extractor failed, using pure JS vectorizer fallback:", err.message);
    }
    return this.generateMockEmbedding(text, 384);
  }

  /**
   * Generates a deterministic normalized word-frequency hash vector purely in JS.
   * Useful as a zero-dependency fallback. Produces vectors of length `dim`.
   */
  generateMockEmbedding(text, dim = 384) {
    const vector = new Array(dim).fill(0);
    const cleanedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const words = cleanedText.split(/\s+/).filter(w => w.length > 1);

    if (words.length === 0) {
      // Return a basic non-zero vector
      vector[0] = 1;
      return vector;
    }

    // Hash words into dimensions using FNV-1a style hashes
    for (const word of words) {
      let hash = 2166136261;
      for (let i = 0; i < word.length; i++) {
        hash ^= word.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const index = Math.abs(hash) % dim;
      vector[index] += 1;
    }

    // Normalize the vector
    let sumOfSquares = 0;
    for (let i = 0; i < dim; i++) {
      sumOfSquares += vector[i] * vector[i];
    }
    const magnitude = Math.sqrt(sumOfSquares) || 1;
    for (let i = 0; i < dim; i++) {
      vector[i] = vector[i] / magnitude;
    }

    return vector;
  }

  getDimension() {
    const provider = configManager.get("EMBEDDING_PROVIDER").toLowerCase();
    if (provider === "openai") return 1536;
    if (provider === "gemini") return 768;
    return 384; // Local MiniLM or Mock JS default
  }
}

module.exports = new EmbeddingService();
