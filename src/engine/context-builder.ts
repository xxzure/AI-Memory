import { findSimilar } from './embedder.js';
import { listMemories, searchMemories, type Memory } from '../db/repositories/memories.js';
import { countTokens } from './tokenizer.js';
import { logger } from '../utils/logger.js';

export interface ContextBundle {
  content: string;
  tokenCount: number;
  sources: { memoryId: string; summary: string; score?: number }[];
}

export async function buildContext(query: string, maxTokens: number, useSemantic = true): Promise<ContextBundle> {
  let rankedMemories: { memory: Memory; score?: number }[] = [];

  if (useSemantic) {
    try {
      const similar = await findSimilar(query, 'memory', 50);
      const allMemories = listMemories();
      const memoryMap = new Map(allMemories.map(m => [m.id, m]));

      rankedMemories = similar
        .filter(s => memoryMap.has(s.refId))
        .map(s => ({ memory: memoryMap.get(s.refId)!, score: s.score }));
    } catch {
      logger.warn('Semantic search unavailable, falling back to keyword search');
      useSemantic = false;
    }
  }

  if (!useSemantic) {
    const results = searchMemories(query, 50);
    rankedMemories = results.map(m => ({ memory: m }));
  }

  // Greedily pack memories within token budget
  const headerTokens = countTokens(`# Context for: ${query}\n\n`);
  let budget = maxTokens - headerTokens;
  const packed: { memory: Memory; score?: number }[] = [];

  for (const item of rankedMemories) {
    const memTokens = item.memory.token_count || countTokens(item.memory.summary);
    const entryOverhead = 50; // headers, separators
    if (memTokens + entryOverhead <= budget) {
      packed.push(item);
      budget -= (memTokens + entryOverhead);
    }
    if (budget < 100) break;
  }

  // Format output
  const sections = packed.map((item, i) => {
    const topics = JSON.parse(item.memory.topics || '[]').join(', ');
    const keyPoints = JSON.parse(item.memory.key_points || '[]');
    const kpList = keyPoints.map((kp: string) => `  - ${kp}`).join('\n');

    return `## Memory ${i + 1}${item.score ? ` (relevance: ${(item.score * 100).toFixed(0)}%)` : ''}
**Topics**: ${topics}
**Summary**: ${item.memory.summary}
${kpList ? `**Key Points**:\n${kpList}` : ''}`;
  });

  const content = `# Context for: ${query}\n\n${sections.join('\n\n---\n\n')}`;
  const tokenCount = countTokens(content);

  return {
    content,
    tokenCount,
    sources: packed.map(item => ({
      memoryId: item.memory.id,
      summary: item.memory.summary.slice(0, 100),
      score: item.score,
    })),
  };
}
