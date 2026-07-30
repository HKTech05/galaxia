const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const configManager = require("./ConfigManager");
const embeddingService = require("./EmbeddingService");
const { VectorStoreFactory } = require("./VectorStore");

const INDEX_FILE = path.resolve(__dirname, "../../data/file_indices.json");

class KnowledgeService {
  constructor() {
    this.indexData = {};
    this.loadIndex();
  }

  get vaultPath() {
    const candidates = [
      path.resolve(__dirname, "../../GALAXIA1"),
      path.resolve(__dirname, "../../../GALAXIA1"),
      path.resolve(__dirname, "../../../../GALAXIA1"),
      path.resolve(process.cwd(), "GALAXIA1"),
      path.resolve(process.cwd(), "../GALAXIA1")
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.resolve(__dirname, "../../GALAXIA1");
  }

  loadIndex() {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        this.indexData = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
      } else {
        this.indexData = {};
      }
    } catch (err) {
      console.error("[KnowledgeService] Error loading file index:", err.message);
      this.indexData = {};
    }
  }

  saveIndex() {
    try {
      const dir = path.dirname(INDEX_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(INDEX_FILE, JSON.stringify(this.indexData, null, 2), "utf8");
    } catch (err) {
      console.error("[KnowledgeService] Error saving file index:", err.message);
    }
  }

  getMD5(content) {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Recursively scans directory for markdown files.
   */
  scanFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (item !== ".obsidian") {
          this.scanFiles(fullPath, fileList);
        }
      } else if (item.endsWith(".md")) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  /**
   * Chunks Markdown content intelligently.
   * Splits on sections (headers) or groups of paragraphs to maintain context.
   */
  chunkText(text, maxChars = 800, overlap = 100) {
    const chunks = [];
    const lines = text.split("\n");
    let currentChunk = "";

    for (const line of lines) {
      // Split on major headers as boundary markers
      if (line.startsWith("#") && currentChunk.trim().length > 100) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      currentChunk += line + "\n";

      if (currentChunk.length >= maxChars) {
        chunks.push(currentChunk.trim());
        // Keep overlap by taking the last part of current chunk
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5)); // Estimate 5 chars per word
        currentChunk = overlapWords.join(" ") + "\n";
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Re-indexes Obsidian Vault incrementally.
   */
  async reindexVault() {
    console.log("[KnowledgeService] Re-indexing Obsidian Vault...");
    const files = this.scanFiles(VAULT_PATH);
    const vectorStore = VectorStoreFactory.getStore();
    const dimension = embeddingService.getDimension();

    // Initialize Vector DB structures
    await vectorStore.init(dimension);

    const activePaths = new Set();

    let addedOrUpdatedCount = 0;

    for (const file of files) {
      const relativePath = path.relative(VAULT_PATH, file).replace(/\\/g, "/");
      activePaths.add(relativePath);

      const content = fs.readFileSync(file, "utf8");
      const hash = this.getMD5(content);
      const mtime = fs.statSync(file).mtimeMs;

      const record = this.indexData[relativePath];

      if (!record || record.hash !== hash || record.lastModified !== mtime) {
        console.log(`[KnowledgeService] Indexing changed or new file: ${relativePath}`);
        addedOrUpdatedCount++;

        // Clear existing points for this file first
        await vectorStore.deleteByFilePath(relativePath);

        // Determine category and topic from path
        // e.g. "Staycation/Amstel Nest/Pricing.md" -> Category: "Staycation/Amstel Nest", Topic: "Pricing"
        // e.g. "Digital Diaries/Pricing.md" -> Category: "Digital Diaries", Topic: "Pricing"
        const pathParts = relativePath.split("/");
        let category = "General";
        let topic = "General";
        
        if (pathParts.length > 1) {
          category = pathParts.slice(0, -1).join("/");
          topic = pathParts[pathParts.length - 1].replace(".md", "");
        } else {
          topic = pathParts[0].replace(".md", "");
        }

        const chunks = this.chunkText(content);
        for (let i = 0; i < chunks.length; i++) {
          const chunkId = `${relativePath}_chunk_${i}`;
          const chunkText = chunks[i];
          
          // Generate vector
          const vector = await embeddingService.getEmbedding(chunkText);

          // Insert into Vector DB
          await vectorStore.insert(chunkId, vector, {
            content: chunkText,
            filePath: relativePath,
            category: category,
            topic: topic
          });
        }

        // Save index metadata
        this.indexData[relativePath] = {
          hash: hash,
          lastModified: mtime
        };
        this.saveIndex();
      }
    }

    // Clean up deleted files from vector store
    let deletedCount = 0;
    for (const relativePath in this.indexData) {
      if (!activePaths.has(relativePath)) {
        console.log(`[KnowledgeService] Deleting removed file from index: ${relativePath}`);
        deletedCount++;
        await vectorStore.deleteByFilePath(relativePath);
        delete this.indexData[relativePath];
      }
    }

    if (deletedCount > 0) {
      this.saveIndex();
    }

    console.log(`[KnowledgeService] Re-index complete. Files indexed/updated: ${addedOrUpdatedCount}, Files deleted: ${deletedCount}`);
    return {
      indexedFiles: addedOrUpdatedCount,
      deletedFiles: deletedCount,
      totalFiles: files.length
    };
  }

  /**
   * Search knowledge base for query context.
   */
  async searchContext(query, limit = 4, allowedCategories = []) {
    const vectorStore = VectorStoreFactory.getStore();
    let matches = [];

    try {
      // Generate query vector
      const vector = await embeddingService.getEmbedding(query);
      // Search similarity
      matches = await vectorStore.search(vector, limit, allowedCategories);
    } catch (vectorStoreErr) {
      console.warn("[KnowledgeService] Vector store query failed, falling back to local file keyword search:", vectorStoreErr.message);
      matches = this.localKeywordSearch(query, limit, allowedCategories);
    }

    // Format context blocks
    let context = "";
    for (const match of matches) {
      context += `[Source: ${match.filePath} - ${match.topic}]\n${match.content}\n\n`;
    }

    return {
      context: context.trim(),
      matches: matches
    };
  }

  /**
   * Hybrid BM25 Semantic Search Engine with Domain Term Boosting
   */
  localKeywordSearch(query, limit = 4, allowedCategories = []) {
    const files = this.scanFiles(this.vaultPath);
    const matches = [];
    
    // Clean and split query terms
    const cleanQuery = query.toLowerCase().replace(/[?.!,;:]/g, " ");
    const queryTerms = cleanQuery.split(/\s+/).filter(t => t.length > 1);

    // Expand synonyms for pets
    const petSynonyms = ["dog", "doggy", "dogs", "cat", "cats", "puppy", "animal", "animals", "pet", "pets", "billi", "kutta", "kutte"];
    if (queryTerms.some(t => petSynonyms.includes(t))) {
      if (!queryTerms.includes("pet")) queryTerms.push("pet");
    }

    // Expand synonyms for pricing
    const priceSynonyms = ["price", "prices", "pricing", "rate", "rates", "cost", "costs", "tariff", "tariffs", "package", "packages"];
    if (queryTerms.some(t => priceSynonyms.includes(t))) {
      if (!queryTerms.includes("pricing")) queryTerms.push("pricing");
    }

    const propertyTerms = ["amstel", "ambrose", "paraiso", "heavenly", "hill", "mount", "take-1", "alta", "santorini", "diaries", "wadala"];
    const amenityTerms = ["pool", "gazebo", "induction", "bathtub", "tv", "ac", "wifi", "parking", "kitchen", "utensils"];
    const policyTerms = ["pet", "non-veg", "veg", "deposit", "cancellation", "timing", "check-in", "checkout", "food", "meal", "breakfast", "lunch", "dinner"];

    const avgdl = 150;
    const k1 = 1.2;
    const b = 0.75;

    for (const file of files) {
      const relativePath = path.relative(this.vaultPath, file).replace(/\\/g, "/");
      const pathParts = relativePath.split("/");
      let category = "General";
      let topic = "General";
      
      if (pathParts.length > 1) {
        category = pathParts.slice(0, -1).join("/");
        topic = pathParts[pathParts.length - 1].replace(".md", "");
      } else {
        topic = pathParts[0].replace(".md", "");
      }

      // Check category filter
      if (allowedCategories.length > 0) {
        const isAllowed = allowedCategories.some(cat => {
          return category.toLowerCase().startsWith(cat.toLowerCase()) || 
                 cat.toLowerCase().startsWith(category.toLowerCase());
        });
        if (!isAllowed) continue;
      }

      try {
        const content = fs.readFileSync(file, "utf8");
        const chunks = this.chunkText(content);

        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          const chunkTextLower = chunkText.toLowerCase();
          const words = chunkTextLower.split(/\s+/);
          const docLen = words.length || 1;

          let score = 0;

          // BM25 Term Frequency calculation
          for (const term of queryTerms) {
            let tf = 0;
            for (const w of words) {
              if (w.includes(term)) tf++;
            }
            if (tf > 0) {
              const bm25Score = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgdl)));
              score += bm25Score * 4.0;
            }
          }

          // Exact Topic / Filename match boost
          if (query.toLowerCase().includes(topic.toLowerCase())) {
            score += 20.0;
          }

          // Property entity matching boost
          for (const prop of propertyTerms) {
            if (query.toLowerCase().includes(prop) && (relativePath.toLowerCase().includes(prop) || chunkTextLower.includes(prop))) {
              score += 15.0;
            }
          }

          // Amenity & Policy domain boosts
          for (const am of amenityTerms) {
            if (query.toLowerCase().includes(am) && chunkTextLower.includes(am)) {
              score += 8.0;
            }
          }
          for (const pol of policyTerms) {
            if (query.toLowerCase().includes(pol) && (relativePath.toLowerCase().includes(pol) || chunkTextLower.includes(pol))) {
              score += 12.0;
            }
          }

          if (score > 0) {
            matches.push({
              content: chunkText,
              filePath: relativePath,
              category: category,
              topic: topic,
              score: score
            });
          }
        }
      } catch (readErr) {
        console.warn(`[KnowledgeService] Failed to read ${file}:`, readErr.message);
      }
    }

    // Sort by BM25 + Boost score descending
    matches.sort((a, b) => b.score - a.score);

    // Fallback if no matches found
    if (matches.length === 0) {
      for (const file of files) {
        const relativePath = path.relative(this.vaultPath, file).replace(/\\/g, "/");
        if (relativePath.toLowerCase().includes("pricing")) {
          const pathParts = relativePath.split("/");
          const category = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "General";
          if (allowedCategories.length === 0 || allowedCategories.some(cat => category.toLowerCase().startsWith(cat.toLowerCase()))) {
            try {
              const content = fs.readFileSync(file, "utf8");
              matches.push({
                content: content,
                filePath: relativePath,
                category: category,
                topic: "Pricing",
                score: 1.0
              });
              break;
            } catch (e) {}
          }
        }
      }
    }

    return matches.slice(0, limit);
  }
}

module.exports = new KnowledgeService();
