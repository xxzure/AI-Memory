import { getConfig } from './config.js';
import { logger } from './logger.js';

export interface LLMResponse {
  content: string;
  tokens?: number;
}

export async function llmGenerate(prompt: string, system?: string): Promise<LLMResponse> {
  const config = getConfig();
  const { provider, model, baseUrl, apiKey } = config.llm;

  switch (provider) {
    case 'ollama':
      return ollamaGenerate(baseUrl, model, prompt, system);
    case 'openai':
      return openaiGenerate(baseUrl, model, apiKey!, prompt, system);
    case 'anthropic':
      return anthropicGenerate(baseUrl, model, apiKey!, prompt, system);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

async function ollamaGenerate(baseUrl: string, model: string, prompt: string, system?: string): Promise<LLMResponse> {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }

  const data = await res.json() as { response: string; eval_count?: number };
  return { content: data.response, tokens: data.eval_count };
}

async function openaiGenerate(baseUrl: string, model: string, apiKey: string, prompt: string, system?: string): Promise<LLMResponse> {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const url = baseUrl.includes('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${text}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[]; usage?: { completion_tokens: number } };
  return { content: data.choices[0].message.content, tokens: data.usage?.completion_tokens };
}

async function anthropicGenerate(baseUrl: string, model: string, apiKey: string, prompt: string, system?: string): Promise<LLMResponse> {
  const url = baseUrl.includes('/v1') ? `${baseUrl}/messages` : `${baseUrl}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${text}`);
  }

  const data = await res.json() as { content: { text: string }[]; usage?: { output_tokens: number } };
  return { content: data.content[0].text, tokens: data.usage?.output_tokens };
}

export async function generateEmbedding(text: string): Promise<Float32Array> {
  const config = getConfig();
  const { model, baseUrl } = config.embeddings;

  const res = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding error (${res.status}): ${errText}`);
  }

  const data = await res.json() as { embeddings: number[][] };
  return new Float32Array(data.embeddings[0]);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
