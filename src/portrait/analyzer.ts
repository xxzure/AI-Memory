import { getAllMemories } from '../db/repositories/memories.js';
import { getDb } from '../db/connection.js';
import { llmGenerate } from '../utils/llm.js';
import { countTokens } from '../engine/tokenizer.js';
import { logger } from '../utils/logger.js';
import { v4 as uuid } from 'uuid';
import type { PortraitProfile } from './types.js';

const MAX_MEMORY_SAMPLE = 50;

export async function generatePortrait(): Promise<{ id: string; profile: PortraitProfile }> {
  const memories = getAllMemories();

  if (memories.length === 0) {
    throw new Error('No memories found. Run `ai-memory compact` first to create memories from conversations.');
  }

  // Sample if too many
  const sampled = memories.length > MAX_MEMORY_SAMPLE
    ? memories.sort(() => Math.random() - 0.5).slice(0, MAX_MEMORY_SAMPLE)
    : memories;

  const memorySummaries = sampled.map((m, i) => {
    const topics = JSON.parse(m.topics || '[]').join(', ');
    return `[${i + 1}] Topics: ${topics}\n    ${m.summary}`;
  }).join('\n\n');

  const prompt = `Based on these ${sampled.length} conversation summaries from a person's AI chat history, create a psychological and intellectual portrait of this person. The perspective is 当局者迷，旁观者清 — as an outside observer, you can see patterns the person might miss.

${memorySummaries}

Return valid JSON with these fields:
- "interests": array of their main interests/passions (5-10 items)
- "communication_style": string describing how they communicate
- "technical_strengths": array of their technical strengths
- "patterns": array of recurring behavioral/thinking patterns you notice (3-7)
- "goals": array of apparent goals or aspirations (3-5)
- "advice": array of constructive advice based on patterns observed (3-5)
- "summary": a 2-3 paragraph narrative portrait

Respond ONLY with valid JSON, no markdown fences.`;

  const { content } = await llmGenerate(prompt);
  const profile = parseProfile(content);

  // Store in DB
  const id = uuid();
  const db = getDb();
  db.prepare(`
    INSERT INTO portraits (id, generated_at, profile, token_count)
    VALUES (?, ?, ?, ?)
  `).run(id, Date.now(), JSON.stringify(profile), countTokens(JSON.stringify(profile)));

  logger.info('Portrait generated and saved');
  return { id, profile };
}

export function getLatestPortrait(): { id: string; generated_at: number; profile: PortraitProfile; token_count: number | null } | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM portraits ORDER BY generated_at DESC LIMIT 1').get() as {
    id: string; generated_at: number; profile: string; token_count: number | null;
  } | undefined;

  if (!row) return undefined;
  return { ...row, profile: JSON.parse(row.profile) };
}

function parseProfile(raw: string): PortraitProfile {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      interests: parsed.interests || [],
      communication_style: parsed.communication_style || '',
      technical_strengths: parsed.technical_strengths || [],
      patterns: parsed.patterns || [],
      goals: parsed.goals || [],
      advice: parsed.advice || [],
      summary: parsed.summary || raw,
    };
  } catch {
    return {
      interests: [],
      communication_style: '',
      technical_strengths: [],
      patterns: [],
      goals: [],
      advice: [],
      summary: raw.trim(),
    };
  }
}
