import { ai, isGeminiConfigured } from '../services/gemini.js';

export class EmbeddingService {
  /**
   * Generate vector embedding for a single text using gemini-embedding-2-preview
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(64).fill(0);
    }

    if (isGeminiConfigured()) {
      try {
        const response: any = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text.slice(0, 3000), // clip to safe input window
        });

        if (response.embedding && response.embedding.values) {
          return response.embedding.values;
        }
        if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
          return response.embeddings[0].values;
        }
      } catch (err: any) {
        console.warn('Gemini embedding API call fallback triggered:', err.message);
      }
    }

    // High quality deterministic pseudo-semantic term frequency hash vector
    return this.fallbackHashEmbedding(text);
  }

  /**
   * Batch generate embeddings for document chunks with concurrency pacing
   */
  static async generateBatchEmbeddings(texts: string[], onProgress?: (pct: number) => void): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = 5;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((txt) => this.generateEmbedding(txt));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        const pct = Math.min(Math.round(((i + batch.length) / texts.length) * 100), 98);
        onProgress(pct);
      }

      // Small pacing delay between batches
      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return results;
  }

  /**
   * Deterministic semantic hash vector fallback
   */
  static fallbackHashEmbedding(text: string, dimensions = 128): number[] {
    const vec = new Array(dimensions).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      let hash = 0;
      for (let c = 0; c < w.length; c++) {
        hash = (hash << 5) - hash + w.charCodeAt(c);
        hash |= 0;
      }
      const index = Math.abs(hash) % dimensions;
      vec[index] += 1;
    }

    // Normalize vector
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return vec.map((v) => v / norm);
    }
    return vec;
  }

  /**
   * Cosine similarity between two vector embeddings
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
