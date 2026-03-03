import { readFileSync } from 'fs';
import type { Importer, ImportedConversation, ImportedMessage } from './types.js';

// Claude export format: JSON array of conversations
interface ClaudeMessage {
  sender: 'human' | 'assistant';
  text: string;
  created_at?: string;
}

interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeMessage[];
}

export const claudeImporter: Importer = {
  source: 'claude',

  parse(filePath: string): ImportedConversation[] {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const conversations: ClaudeConversation[] = Array.isArray(raw) ? raw : [raw];

    return conversations.map((conv) => {
      const messages: ImportedMessage[] = (conv.chat_messages || [])
        .filter((m: ClaudeMessage) => m.text?.trim())
        .map((m: ClaudeMessage, i: number): ImportedMessage => ({
          role: m.sender === 'human' ? 'user' : 'assistant',
          content: m.text.trim(),
          created_at: m.created_at ? new Date(m.created_at).getTime() : new Date(conv.created_at).getTime() + i * 1000,
        }));

      return {
        external_id: conv.uuid,
        title: conv.name || 'Untitled',
        created_at: new Date(conv.created_at).getTime(),
        updated_at: new Date(conv.updated_at).getTime(),
        messages,
      };
    }).filter(c => c.messages.length > 0);
  },
};
