import { readFileSync } from 'fs';
import type { Importer, ImportedConversation, ImportedMessage } from './types.js';

// Generic importer: handles simple JSON or markdown conversation files
// JSON: { messages: [{ role, content }] } or [{ role, content }]
// Markdown: alternating ## User / ## Assistant sections

export const genericImporter: Importer = {
  source: 'generic',

  parse(filePath: string): ImportedConversation[] {
    const content = readFileSync(filePath, 'utf-8');
    const ext = filePath.toLowerCase();

    if (ext.endsWith('.json')) {
      return parseJSON(content, filePath);
    }
    return parseMarkdown(content, filePath);
  },
};

function parseJSON(content: string, filePath: string): ImportedConversation[] {
  const raw = JSON.parse(content);

  // Array of messages directly
  const messageArray = Array.isArray(raw) ? raw : raw.messages;
  if (Array.isArray(messageArray) && messageArray.length > 0 && messageArray[0].role) {
    const messages: ImportedMessage[] = messageArray
      .filter((m: { role?: string; content?: string }) => m.role && m.content?.trim())
      .map((m: { role: string; content: string }, i: number): ImportedMessage => ({
        role: m.role as ImportedMessage['role'],
        content: m.content.trim(),
        created_at: Date.now() - (messageArray.length - i) * 1000,
      }));

    return [{
      external_id: `generic-${Date.now()}`,
      title: raw.title || filePath.split('/').pop() || 'Imported',
      created_at: messages[0]?.created_at || Date.now(),
      updated_at: messages[messages.length - 1]?.created_at || Date.now(),
      messages,
    }];
  }

  return [];
}

function parseMarkdown(content: string, filePath: string): ImportedConversation[] {
  const messages: ImportedMessage[] = [];
  const sections = content.split(/^## (User|Assistant|System)/im);

  // sections[0] is preamble, then alternating [role, content, role, content, ...]
  for (let i = 1; i < sections.length - 1; i += 2) {
    const role = sections[i].trim().toLowerCase() as ImportedMessage['role'];
    const text = sections[i + 1].trim();
    if (text) {
      messages.push({
        role,
        content: text,
        created_at: Date.now() - (sections.length - i) * 1000,
      });
    }
  }

  if (messages.length === 0) return [];

  return [{
    external_id: `generic-${Date.now()}`,
    title: filePath.split('/').pop() || 'Imported',
    created_at: messages[0].created_at,
    updated_at: messages[messages.length - 1].created_at,
    messages,
  }];
}
