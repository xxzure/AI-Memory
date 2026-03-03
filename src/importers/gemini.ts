import { readFileSync } from 'fs';
import type { Importer, ImportedConversation, ImportedMessage } from './types.js';

// Gemini via Google Takeout: each conversation is a separate JSON file
// This importer accepts a single JSON or an array
interface GeminiMessage {
  role: string; // 'user' | 'model'
  parts: { text?: string }[];
  createTime?: string;
}

interface GeminiConversation {
  id?: string;
  title?: string;
  createTime?: string;
  updateTime?: string;
  messages?: GeminiMessage[];
  // Alternative structure from Takeout
  history?: GeminiMessage[];
}

export const geminiImporter: Importer = {
  source: 'gemini',

  parse(filePath: string): ImportedConversation[] {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const conversations: GeminiConversation[] = Array.isArray(raw) ? raw : [raw];

    return conversations.map((conv, idx) => {
      const rawMessages = conv.messages || conv.history || [];
      const messages: ImportedMessage[] = rawMessages
        .filter((m: GeminiMessage) => {
          const text = m.parts?.map(p => p.text).filter(Boolean).join('\n');
          return text?.trim();
        })
        .map((m: GeminiMessage, i: number): ImportedMessage => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.parts.map(p => p.text).filter(Boolean).join('\n').trim(),
          created_at: m.createTime ? new Date(m.createTime).getTime() : Date.now() - (rawMessages.length - i) * 1000,
        }));

      const createdAt = conv.createTime ? new Date(conv.createTime).getTime() : messages[0]?.created_at || Date.now();
      const updatedAt = conv.updateTime ? new Date(conv.updateTime).getTime() : messages[messages.length - 1]?.created_at || createdAt;

      return {
        external_id: conv.id || `gemini-${idx}`,
        title: conv.title || 'Untitled',
        created_at: createdAt,
        updated_at: updatedAt,
        messages,
      };
    }).filter(c => c.messages.length > 0);
  },
};
