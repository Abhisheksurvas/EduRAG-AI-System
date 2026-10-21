import { DBStore } from '../models/store.js';
import { EmbeddingService } from './embedding.js';
import { ISourceRef } from '../models/Message.js';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  filename: string;
  pageNumber: number;
  unit: string;
  chapter: string;
  text: string;
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  topScore: number;
  isRelevant: boolean;
  contextText: string;
  sources: ISourceRef[];
}

export class RAGRetriever {
  /**
   * Hybrid semantic & keyword similarity search across student chunks
   */
  static async retrieveRelevantChunks(
    studentId: string,
    query: string,
    options: {
      documentIds?: string[];
      topK?: number;
      minRelevanceThreshold?: number;
    } = {}
  ): Promise<RetrievalResult> {
    const topK = options.topK || 5;
    const threshold = options.minRelevanceThreshold !== undefined ? options.minRelevanceThreshold : 0.32;

    // Fetch chunks belonging to this student (filtered by documentIds if specified)
    let allChunks = await DBStore.findChunks(studentId, options.documentIds);

    // If specific documentIds returned no chunks, fallback to all chunks of this student
    if ((!allChunks || allChunks.length === 0) && options.documentIds && options.documentIds.length > 0) {
      allChunks = await DBStore.findChunks(studentId);
    }

    // If student has 0 chunks at all, seed sample documents so there is always material available
    if (!allChunks || allChunks.length === 0) {
      try {
        const { SampleDocsService } = await import('../services/sampleDocsService.js');
        await SampleDocsService.seedSampleDocumentsForStudent(studentId);
        allChunks = await DBStore.findChunks(studentId);
      } catch (err) {
        console.warn('Auto-seed fallback error:', err);
      }
    }

    if (!allChunks || allChunks.length === 0) {
      return {
        chunks: [],
        topScore: 0,
        isRelevant: false,
        contextText: '',
        sources: [],
      };
    }

    // 1. Compute query vector
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    // 2. Query keywords for hybrid boost with acronym expansion & multilingual support
    const rawWords = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    const expandedWords = new Set<string>(rawWords);
    const qLower = query.toLowerCase();

    if (rawWords.includes('ml') || qLower.includes('मशीन लर्निंग') || qLower.includes('இயந்திர கற்றல்') || qLower.includes('యంత్ర అభ్యాసం')) {
      expandedWords.add('machine');
      expandedWords.add('learning');
    }
    if (rawWords.includes('nlp') || qLower.includes('प्राकृतिक भाषा') || qLower.includes('नैसर्गिक भाषा')) {
      expandedWords.add('natural');
      expandedWords.add('language');
      expandedWords.add('processing');
    }
    if (rawWords.includes('ai') || qLower.includes('कृत्रिम बुद्धिमत्ता') || qLower.includes('செயற்கை நுண்ணறிவு')) {
      expandedWords.add('artificial');
      expandedWords.add('intelligence');
    }
    if (rawWords.includes('dl')) {
      expandedWords.add('deep');
      expandedWords.add('learning');
    }
    if (rawWords.includes('rsa')) {
      expandedWords.add('encryption');
      expandedWords.add('keys');
    }

    const queryWords = Array.from(expandedWords);
    const stopWords = new Set([
      'explain', 'what', 'is', 'are', 'the', 'and', 'for', 'in', 'of', 'to', 'a', 'an',
      'marks', 'exam', 'format', 'question', 'with', 'how', 'describe', 'briefly',
      'give', 'write', 'provide', 'sample', 'pattern', 'university', 'college',
      'spashta', 'kara', 'samjhaiye', 'gun', 'ank'
    ]);
    const contentWords = queryWords.filter((w) => !stopWords.has(w));
    const keywordsToMatch = contentWords.length > 0 ? contentWords : queryWords;

    const scoredChunks: RetrievedChunk[] = [];

    for (const chunk of allChunks) {
      // Vector similarity
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Keyword match score (term frequency & phrase hits)
      const chunkTextLower = chunk.text.toLowerCase();
      let keywordHits = 0;
      for (const word of keywordsToMatch) {
        if (chunkTextLower.includes(word)) {
          keywordHits++;
        }
      }

      // Dynamic key phrase bonus for any consecutive 2-word phrase in student query
      let phraseBonus = 0;
      for (let i = 0; i < rawWords.length - 1; i++) {
        const w1 = rawWords[i];
        const w2 = rawWords[i + 1];
        if (!stopWords.has(w1) && !stopWords.has(w2)) {
          if (chunkTextLower.includes(`${w1} ${w2}`)) {
            phraseBonus += 0.15;
          }
        }
      }
      phraseBonus = Math.min(0.3, phraseBonus);

      const keywordScore = keywordsToMatch.length > 0 ? (keywordHits / keywordsToMatch.length) : 0;

      // Hybrid combined score (vector 0.55 + keyword 0.35 + phrase bonus 0.1)
      const combinedScore = Math.min(1.0, vectorScore * 0.55 + keywordScore * 0.35 + phraseBonus);

      scoredChunks.push({
        chunkId: String(chunk._id),
        documentId: String(chunk.documentId),
        filename: chunk.filename,
        pageNumber: chunk.pageNumber || 1,
        unit: chunk.unit || '',
        chapter: chunk.chapter || '',
        text: chunk.text,
        score: combinedScore,
      });
    }

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, topK);
    const topScore = topChunks.length > 0 ? topChunks[0].score : 0;
    const isRelevant = topChunks.length > 0;

    // Construct grounded context string
    const contextText = topChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1}: ${c.filename} | Page ${c.pageNumber} | ${c.chapter || c.unit || 'Content'}]\n${c.text}`
      )
      .join('\n\n---\n\n');

    // Extract deduplicated real sources
    const sourcesMap = new Map<string, ISourceRef>();
    for (const c of topChunks) {
      const key = `${c.filename}_${c.pageNumber}`;
      if (!sourcesMap.has(key)) {
        sourcesMap.set(key, {
          documentId: c.documentId,
          filename: c.filename,
          pageNumber: c.pageNumber,
          unit: c.unit,
          chapter: c.chapter,
          snippet: c.text.slice(0, 150) + '...',
        });
      }
    }

    return {
      chunks: topChunks,
      topScore,
      isRelevant,
      contextText,
      sources: Array.from(sourcesMap.values()),
    };
  }
}
