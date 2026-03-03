import { getDb } from '../connection.js';
import { v4 as uuid } from 'uuid';

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: number;
  token_count: number | null;
  ordinal: number;
}

export interface CreateMessage {
  conversation_id: string;
  role: string;
  content: string;
  created_at: number;
  token_count?: number;
  ordinal: number;
}

export function insertMessage(m: CreateMessage): string {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at, token_count, ordinal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, m.conversation_id, m.role, m.content, m.created_at, m.token_count ?? null, m.ordinal);
  return id;
}

export function insertMessagesBatch(messages: CreateMessage[]): string[] {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at, token_count, ordinal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const ids: string[] = [];

  const tx = db.transaction(() => {
    for (const m of messages) {
      const id = uuid();
      stmt.run(id, m.conversation_id, m.role, m.content, m.created_at, m.token_count ?? null, m.ordinal);
      ids.push(id);
    }
  });
  tx();
  return ids;
}

export function getMessagesByConversation(conversationId: string): Message[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY ordinal ASC
  `).all(conversationId) as Message[];
}

export function searchMessages(query: string, limit = 20): (Message & { conversation_title?: string })[] {
  const db = getDb();
  const like = `%${query}%`;
  return db.prepare(`
    SELECT m.*, c.title as conversation_title
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.content LIKE ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(like, limit) as (Message & { conversation_title?: string })[];
}

export function countMessagesByConversation(conversationId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId) as { count: number };
  return row.count;
}

export function getConversationTokenCount(conversationId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COALESCE(SUM(token_count), 0) as total FROM messages WHERE conversation_id = ?').get(conversationId) as { total: number };
  return row.total;
}
