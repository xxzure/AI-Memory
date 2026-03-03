import { readFileSync } from 'fs';
import type { Importer, ImportedConversation, ImportedMessage } from './types.js';

// Ollama chat history or Open WebUI export format
interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface OllamaConversation {
  id?: string;
  title?: string;
  model?: string;
  created_at?: number | string;
  updated_at?: number | string;
  messages: OllamaMessage[];
}

export const ollamaImporter: Importer = {
  source: 'ollama',

  parse(filePath: string): ImportedConversation[] {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const conversations: OllamaConversation[] = Array.isArray(raw) ? raw : [raw];

    return conversations.map((conv, idx) => {
      const messages: ImportedMessage[] = (conv.messages || [])
        .filter((m: OllamaMessage) => m.content?.trim())
        .map((m: OllamaMessage, i: number): ImportedMessage => ({
          role: m.role,
          content: m.content.trim(),
          created_at: m.timestamp || Date.now() - (conv.messages.length - i) * 1000,
        }));

      const parseTime = (v: number | string | undefined): number => {
        if (!v) return Date.now();
        return typeof v === 'number' ? v : new Date(v).getTime();
      };

      return {
        external_id: conv.id || `ollama-${idx}`,
        title: conv.title || (conv.model ? `Chat with ${conv.model}` : 'Untitled'),
        created_at: parseTime(conv.created_at),
        updated_at: parseTime(conv.updated_at),
        messages,
        metadata: conv.model ? { model: conv.model } : undefined,
      };
    }).filter(c => c.messages.length > 0);
  },
};
