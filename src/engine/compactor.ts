import { getMessagesByConversation } from '../db/repositories/messages.js';
import { getConversation } from '../db/repositories/conversations.js';
import { insertMemory, getUncompactedConversationIds } from '../db/repositories/memories.js';
import { countTokens } from './tokenizer.js';
import { llmGenerate } from '../utils/llm.js';
import { logger } from '../utils/logger.js';
import { embedAndStore } from './embedder.js';

const CHUNK_TOKEN_LIMIT = 2000;

interface CompactionResult {
  summary: string;
  topics: string[];
  key_points: string[];
}

export async function compactAll(): Promise<number> {
  const ids = getUncompactedConversationIds();
  logger.info(`Found ${ids.length} uncompacted conversations`);

  let compacted = 0;
  for (const convId of ids) {
    try {
      await compactConversation(convId);
      compacted++;
      logger.info(`  Compacted ${compacted}/${ids.length}`);
    } catch (err) {
      logger.error(`  Failed to compact ${convId}: ${err}`);
    }
  }
  return compacted;
}

export async function compactConversation(conversationId: string): Promise<string> {
  const conv = getConversation(conversationId);
  if (!conv) throw new Error(`Conversation ${conversationId} not found`);

  const messages = getMessagesByConversation(conversationId);
  if (messages.length === 0) throw new Error('No messages in conversation');

  const fullText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  const totalTokens = countTokens(fullText);

  let result: CompactionResult;

  if (totalTokens < CHUNK_TOKEN_LIMIT) {
    result = await summarize(fullText, conv.title || 'Untitled');
  } else {
    result = await summarizeChunked(messages, conv.title || 'Untitled');
  }

  const memoryId = insertMemory({
    conversation_id: conversationId,
    summary: result.summary,
    topics: result.topics,
    key_points: result.key_points,
    token_count: countTokens(result.summary),
    source: conv.source,
    tags: result.topics,
  });

  // Generate and store embedding
  try {
    await embedAndStore('memory', memoryId, result.summary);
  } catch (err) {
    logger.warn(`  Could not generate embedding (Ollama may not be running): ${err}`);
  }

  return memoryId;
}

async function summarize(text: string, title: string): Promise<CompactionResult> {
  const prompt = `Summarize this conversation titled "${title}". Return valid JSON with exactly these fields:
- "summary": a concise paragraph summarizing the conversation
- "topics": an array of 2-5 topic strings
- "key_points": an array of 3-7 key takeaways

Conversation:
${text}

Respond ONLY with valid JSON, no markdown fences.`;

  const { content } = await llmGenerate(prompt);
  return parseCompactionResponse(content);
}

async function summarizeChunked(
  messages: { role: string; content: string }[],
  title: string,
): Promise<CompactionResult> {
  // Split messages into chunks of ~CHUNK_TOKEN_LIMIT tokens
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;

  for (const m of messages) {
    const line = `${m.role}: ${m.content}\n\n`;
    const lineTokens = countTokens(line);

    if (currentTokens + lineTokens > CHUNK_TOKEN_LIMIT && current) {
      chunks.push(current);
      current = '';
      currentTokens = 0;
    }
    current += line;
    currentTokens += lineTokens;
  }
  if (current) chunks.push(current);

  // Summarize each chunk
  const chunkSummaries: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Summarize this part (${i + 1}/${chunks.length}) of the conversation "${title}" in 2-3 sentences:\n\n${chunks[i]}`;
    const { content } = await llmGenerate(prompt);
    chunkSummaries.push(content.trim());
  }

  // Combine chunk summaries into final result
  const combined = chunkSummaries.join('\n\n');
  return summarize(combined, title);
}

function parseCompactionResponse(raw: string): CompactionResult {
  try {
    // Try to extract JSON from possible markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || raw,
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    };
  } catch {
    // Fallback: use raw text as summary
    return {
      summary: raw.trim(),
      topics: [],
      key_points: [],
    };
  }
}
