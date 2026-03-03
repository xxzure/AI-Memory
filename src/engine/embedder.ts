import { generateEmbedding, cosineSimilarity } from '../utils/llm.js';
import { insertEmbedding, getEmbeddingsByRefType, bufferToFloat32 } from '../db/repositories/embeddings.js';
import { getConfig } from '../utils/config.js';

export async function embedAndStore(refType: string, refId: string, text: string): Promise<string> {
  const config = getConfig();
  const vector = await generateEmbedding(text);
  return insertEmbedding(refType, refId, vector, config.embeddings.model);
}

export interface SimilarityResult {
  refId: string;
  score: number;
}

export async function findSimilar(query: string, refType: string, topK = 10): Promise<SimilarityResult[]> {
  const queryVector = await generateEmbedding(query);
  const embeddings = getEmbeddingsByRefType(refType);

  const scored = embeddings.map(e => ({
    refId: e.ref_id,
    score: cosineSimilarity(queryVector, bufferToFloat32(e.vector)),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
