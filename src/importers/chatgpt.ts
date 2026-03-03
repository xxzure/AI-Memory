import { readFileSync } from 'fs';
import type { Importer, ImportedConversation, ImportedMessage } from './types.js';

interface ChatGPTMessage {
  id: string;
  author: { role: string };
  content: { parts?: string[]; content_type?: string };
  create_time: number | null;
}

interface ChatGPTNode {
  id: string;
  message?: ChatGPTMessage;
  parent?: string;
  children: string[];
}

interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTNode>;
}

export const chatgptImporter: Importer = {
  source: 'chatgpt',

  parse(filePath: string): ImportedConversation[] {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const conversations: ChatGPTConversation[] = Array.isArray(raw) ? raw : [raw];

    return conversations.map((conv) => {
      const messages = extractMessages(conv.mapping);

      return {
        external_id: conv.id,
        title: conv.title || 'Untitled',
        created_at: Math.floor((conv.create_time || 0) * 1000),
        updated_at: Math.floor((conv.update_time || 0) * 1000),
        messages,
      };
    }).filter(c => c.messages.length > 0);
  },
};

function extractMessages(mapping: Record<string, ChatGPTNode>): ImportedMessage[] {
  // Find root node (no parent or parent not in mapping)
  const rootId = Object.keys(mapping).find(id => {
    const node = mapping[id];
    return !node.parent || !mapping[node.parent];
  });

  if (!rootId) return [];

  // Walk the tree depth-first following the last child (main branch)
  const messages: ImportedMessage[] = [];
  const visited = new Set<string>();

  function walk(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) return;

    if (node.message) {
      const msg = node.message;
      const role = mapRole(msg.author?.role);
      const content = msg.content?.parts?.filter(p => typeof p === 'string').join('\n') || '';

      if (role && content.trim()) {
        messages.push({
          role,
          content: content.trim(),
          created_at: Math.floor((msg.create_time || 0) * 1000),
        });
      }
    }

    // Follow children (take last child for main conversation branch)
    if (node.children?.length) {
      const lastChild = node.children[node.children.length - 1];
      walk(lastChild);
    }
  }

  walk(rootId);
  return messages;
}

function mapRole(role: string | undefined): 'user' | 'assistant' | 'system' | null {
  switch (role) {
    case 'user': return 'user';
    case 'assistant': return 'assistant';
    case 'system': return 'system';
    default: return null;
  }
}
