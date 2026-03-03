import { getDb } from '../connection.js';
import { v4 as uuid } from 'uuid';

export interface Memory {
  id: string;
  conversation_id: string | null;
  summary: string;
  topics: string;
  key_points: string;
  token_count: number | null;
  created_at: number;
  source: string;
}

export interface CreateMemory {
  conversation_id?: string;
  summary: string;
  topics: string[];
  key_points: string[];
  token_count?: number;
  source: string;
  tags?: string[];
}

export function insertMemory(m: CreateMemory): string {
  const db = getDb();
  const id = uuid();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO memories (id, conversation_id, summary, topics, key_points, token_count, created_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      m.conversation_id ?? null,
      m.summary,
      JSON.stringify(m.topics),
      JSON.stringify(m.key_points),
      m.token_count ?? null,
      Date.now(),
      m.source,
    );

    if (m.tags?.length) {
      const tagStmt = db.prepare('INSERT INTO tags (memory_id, tag) VALUES (?, ?)');
      for (const tag of m.tags) {
        tagStmt.run(id, tag);
      }
    }
  });
  tx();
  return id;
}

export function listMemories(opts?: { limit?: number; offset?: number }): Memory[] {
  const db = getDb();
  let sql = 'SELECT * FROM memories ORDER BY created_at DESC';
  const params: unknown[] = [];
  if (opts?.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts?.offset) {
    sql += ' OFFSET ?';
    params.push(opts.offset);
  }
  return db.prepare(sql).all(...params) as Memory[];
}

export function getMemoryByConversationId(conversationId: string): Memory | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM memories WHERE conversation_id = ?').get(conversationId) as Memory | undefined;
}

export function getUncompactedConversationIds(): string[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id FROM conversations c
    LEFT JOIN memories m ON m.conversation_id = c.id
    WHERE m.id IS NULL
    ORDER BY c.created_at ASC
  `).all() as { id: string }[];
  return rows.map(r => r.id);
}

export function searchMemories(query: string, limit = 20): Memory[] {
  const db = getDb();
  const like = `%${query}%`;
  return db.prepare(`
    SELECT * FROM memories
    WHERE summary LIKE ? OR topics LIKE ? OR key_points LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(like, like, like, limit) as Memory[];
}

export function countMemories(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number };
  return row.count;
}

export function getAllMemories(): Memory[] {
  const db = getDb();
  return db.prepare('SELECT * FROM memories ORDER BY created_at DESC').all() as Memory[];
}
