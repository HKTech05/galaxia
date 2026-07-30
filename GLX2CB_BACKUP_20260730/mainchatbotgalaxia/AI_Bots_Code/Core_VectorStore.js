const axios = require("axios");
const configManager = require("./ConfigManager");
const crypto = require("crypto");
const { pool } = require("../db"); // Existing database pool

// Helper to generate UUIDs from string keys for Qdrant/OpenSearch
function getUUID(str) {
  return crypto.createHash("md5").update(str).digest("hex")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

class VectorStore {
  async init(dimension) {
    throw new Error("init() must be implemented");
  }
  async search(vector, limit, allowedCategories) {
    throw new Error("search() must be implemented");
  }
  async insert(id, vector, payload) {
    throw new Error("insert() must be implemented");
  }
  async deleteByFilePath(filePath) {
    throw new Error("deleteByFilePath() must be implemented");
  }
  async clear() {
    throw new Error("clear() must be implemented");
  }
}

class QdrantVectorStore extends VectorStore {
  constructor() {
    super();
    this.collectionName = "galaxia_knowledge";
  }

  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const apiKey = configManager.get("QDRANT_API_KEY");
    if (apiKey) {
      headers["api-key"] = apiKey;
    }
    return headers;
  }

  async init(dimension) {
    const url = configManager.get("QDRANT_URL");
    const endpoint = `${url}/collections/${this.collectionName}`;
    try {
      // Check if collection exists
      await axios.get(endpoint, { headers: this.getHeaders() });
      console.log(`[QdrantVectorStore] Collection '${this.collectionName}' already exists.`);
    } catch (err) {
      console.log(`[QdrantVectorStore] Collection '${this.collectionName}' not found. Creating it...`);
      try {
        await axios.put(
          endpoint,
          {
            vectors: {
              size: dimension,
              distance: "Cosine"
            }
          },
          { headers: this.getHeaders() }
        );
        console.log(`[QdrantVectorStore] Collection '${this.collectionName}' created successfully.`);
      } catch (createErr) {
        console.error("[QdrantVectorStore] Failed to create Qdrant collection:", createErr.response?.data || createErr.message);
        throw createErr;
      }
    }
  }

  async insert(id, vector, payload) {
    const url = configManager.get("QDRANT_URL");
    const uuid = getUUID(id);
    try {
      await axios.put(
        `${url}/collections/${this.collectionName}/points`,
        {
          points: [
            {
              id: uuid,
              vector: vector,
              payload: payload
            }
          ]
        },
        { headers: this.getHeaders() }
      );
    } catch (err) {
      console.error("[QdrantVectorStore] Insert error:", err.response?.data || err.message);
      throw err;
    }
  }

  async search(vector, limit, allowedCategories) {
    const url = configManager.get("QDRANT_URL");
    const payload = {
      vector: vector,
      limit: limit,
      with_payload: true
    };

    // Apply metadata filters for bot safety (allowed categories)
    if (allowedCategories && allowedCategories.length > 0) {
      const matchFilters = allowedCategories.map(cat => ({
        key: "category",
        match: { value: cat }
      }));
      payload.filter = {
        should: matchFilters
      };
    }

    try {
      const res = await axios.post(
        `${url}/collections/${this.collectionName}/points/search`,
        payload,
        { headers: this.getHeaders() }
      );
      
      return res.data.result.map(p => ({
        id: p.id,
        score: p.score,
        content: p.payload?.content || "",
        filePath: p.payload?.filePath || "",
        category: p.payload?.category || "",
        topic: p.payload?.topic || ""
      }));
    } catch (err) {
      console.error("[QdrantVectorStore] Search error:", err.response?.data || err.message);
      throw err;
    }
  }

  async deleteByFilePath(filePath) {
    const url = configManager.get("QDRANT_URL");
    try {
      await axios.post(
        `${url}/collections/${this.collectionName}/points/delete`,
        {
          filter: {
            must: [
              { key: "filePath", match: { value: filePath } }
            ]
          }
        },
        { headers: this.getHeaders() }
      );
    } catch (err) {
      console.error("[QdrantVectorStore] Delete by filepath error:", err.response?.data || err.message);
    }
  }

  async clear() {
    const url = configManager.get("QDRANT_URL");
    try {
      await axios.delete(`${url}/collections/${this.collectionName}`, { headers: this.getHeaders() });
      console.log(`[QdrantVectorStore] Collection '${this.collectionName}' deleted for resetting.`);
    } catch (err) {
      console.warn("[QdrantVectorStore] Clear failed (collection may not exist):", err.message);
    }
  }
}

class PgVectorStore extends VectorStore {
  constructor() {
    super();
    this.tableName = configManager.get("PG_VECTOR_TABLE") || "knowledge_vectors";
  }

  async init(dimension) {
    try {
      // Check pgvector extension & table
      await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id VARCHAR(100) PRIMARY KEY,
          vector VECTOR(${dimension}),
          content TEXT NOT NULL,
          file_path VARCHAR(512) NOT NULL,
          category VARCHAR(100) NOT NULL,
          topic VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_category ON ${this.tableName} (category)`);
      console.log(`[PgVectorStore] Database table '${this.tableName}' initialized.`);
    } catch (err) {
      console.error("[PgVectorStore] Init error:", err.message);
      throw err;
    }
  }

  async insert(id, vector, payload) {
    const query = `
      INSERT INTO ${this.tableName} (id, vector, content, file_path, category, topic)
      VALUES ($1, $2::vector, $3, $4, $5, $6)
      ON CONFLICT (id) 
      DO UPDATE SET vector = EXCLUDED.vector, content = EXCLUDED.content, file_path = EXCLUDED.file_path, category = EXCLUDED.category, topic = EXCLUDED.topic
    `;
    const vectorStr = `[${vector.join(",")}]`;
    await pool.query(query, [id, vectorStr, payload.content, payload.filePath, payload.category, payload.topic]);
  }

  async search(vector, limit, allowedCategories) {
    const vectorStr = `[${vector.join(",")}]`;
    let query = "";
    let params = [];

    if (allowedCategories && allowedCategories.length > 0) {
      query = `
        SELECT id, content, file_path as "filePath", category, topic, 1 - (vector <=> $1::vector) as score
        FROM ${this.tableName}
        WHERE category = ANY($2)
        ORDER BY vector <=> $1::vector
        LIMIT $3
      `;
      params = [vectorStr, allowedCategories, limit];
    } else {
      query = `
        SELECT id, content, file_path as "filePath", category, topic, 1 - (vector <=> $1::vector) as score
        FROM ${this.tableName}
        ORDER BY vector <=> $1::vector
        LIMIT $2
      `;
      params = [vectorStr, limit];
    }

    try {
      const res = await pool.query(query, params);
      return res.rows.map(r => ({
        ...r,
        score: parseFloat(r.score)
      }));
    } catch (err) {
      console.error("[PgVectorStore] Search query error:", err.message);
      throw err;
    }
  }

  async deleteByFilePath(filePath) {
    await pool.query(`DELETE FROM ${this.tableName} WHERE file_path = $1`, [filePath]);
  }

  async clear() {
    await pool.query(`TRUNCATE TABLE ${this.tableName}`);
  }
}

class OpenSearchVectorStore extends VectorStore {
  constructor() {
    super();
    this.indexName = "galaxia_knowledge";
  }

  getAuth() {
    const user = configManager.get("OPENSEARCH_USER");
    const pass = configManager.get("OPENSEARCH_PASSWORD");
    if (user && pass) {
      return { username: user, password: pass };
    }
    return null;
  }

  async init(dimension) {
    const url = configManager.get("OPENSEARCH_URL");
    const endpoint = `${url}/${this.indexName}`;
    const auth = this.getAuth();
    
    try {
      // Check if index exists
      await axios.get(endpoint, { auth });
      console.log(`[OpenSearchVectorStore] Index '${this.indexName}' already exists.`);
    } catch (err) {
      console.log(`[OpenSearchVectorStore] Index '${this.indexName}' not found. Creating it...`);
      try {
        await axios.put(
          endpoint,
          {
            settings: {
              index: {
                knn: true
              }
            },
            mappings: {
              properties: {
                vector: {
                  type: "knn_vector",
                  dimension: dimension,
                  method: {
                    name: "hnsw",
                    space_type: "cosinesimil",
                    engine: "nmslib"
                  }
                },
                content: { type: "text" },
                filePath: { type: "keyword" },
                category: { type: "keyword" },
                topic: { type: "keyword" }
              }
            }
          },
          { auth }
        );
        console.log(`[OpenSearchVectorStore] Index '${this.indexName}' created successfully.`);
      } catch (createErr) {
        console.error("[OpenSearchVectorStore] Failed to create OpenSearch index:", createErr.response?.data || createErr.message);
        throw createErr;
      }
    }
  }

  async insert(id, vector, payload) {
    const url = configManager.get("OPENSEARCH_URL");
    const docId = getUUID(id);
    const auth = this.getAuth();
    try {
      await axios.put(
        `${url}/${this.indexName}/_doc/${docId}`,
        {
          vector: vector,
          content: payload.content,
          filePath: payload.filePath,
          category: payload.category,
          topic: payload.topic
        },
        { auth }
      );
    } catch (err) {
      console.error("[OpenSearchVectorStore] Insert error:", err.response?.data || err.message);
      throw err;
    }
  }

  async search(vector, limit, allowedCategories) {
    const url = configManager.get("OPENSEARCH_URL");
    const auth = this.getAuth();
    
    const query = {
      size: limit,
      query: {
        knn: {
          vector: {
            vector: vector,
            k: limit
          }
        }
      }
    };

    // Apply metadata filters for bot safety (allowed categories)
    if (allowedCategories && allowedCategories.length > 0) {
      query.post_filter = {
        terms: {
          category: allowedCategories
        }
      };
    }

    try {
      const res = await axios.post(`${url}/${this.indexName}/_search`, query, { auth });
      return res.data.hits.hits.map(h => ({
        id: h._id,
        score: h._score,
        content: h._source?.content || "",
        filePath: h._source?.filePath || "",
        category: h._source?.category || "",
        topic: h._source?.topic || ""
      }));
    } catch (err) {
      console.error("[OpenSearchVectorStore] Search error:", err.response?.data || err.message);
      throw err;
    }
  }

  async deleteByFilePath(filePath) {
    const url = configManager.get("OPENSEARCH_URL");
    const auth = this.getAuth();
    try {
      await axios.post(
        `${url}/${this.indexName}/_delete_by_query`,
        {
          query: {
            term: {
              filePath: filePath
            }
          }
        },
        { auth }
      );
    } catch (err) {
      console.error("[OpenSearchVectorStore] Delete by filepath error:", err.response?.data || err.message);
    }
  }

  async clear() {
    const url = configManager.get("OPENSEARCH_URL");
    const auth = this.getAuth();
    try {
      await axios.delete(`${url}/${this.indexName}`, { auth });
      console.log(`[OpenSearchVectorStore] Index '${this.indexName}' deleted for resetting.`);
    } catch (err) {
      console.warn("[OpenSearchVectorStore] Clear failed (index may not exist):", err.message);
    }
  }
}

class VectorStoreFactory {
  static getStore() {
    const provider = configManager.get("VECTOR_PROVIDER").toLowerCase();
    if (provider === "qdrant") {
      return new QdrantVectorStore();
    } else if (provider === "pgvector") {
      return new PgVectorStore();
    } else if (provider === "opensearch") {
      return new OpenSearchVectorStore();
    } else {
      throw new Error(`Unsupported Vector Store Provider: ${provider}`);
    }
  }
}

module.exports = {
  VectorStoreFactory
};
