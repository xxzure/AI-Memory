import { getDb } from '../connection.js';
import { v4 as uuid } from 'uuid';

export interface Conversation {
  id: string;
  source: string;
  external_id: string | null;
  title: string | null;
  created_at: number;
  updated_at: number;
  metadata: string | null;
}

export interface CreateConversation {
  source: string;
  external_id?: string;
  title?: string;
  created_at: number;
  updated_at: number;
  metadata?: Record<string, unknown>;
}

export function insertConversation(c: CreateConversation): string {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO conversations (id, source, external_id, title, created_at, updated_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    c.source,
    c.external_id ?? null,
    c.title ?? null,
    c.created_at,
    c.updated_at,
    c.metadata ? JSON.stringify(c.metadata) : null,
  );
  return id;
}

export function findConversationByExternalId(source: string, externalId: string): Conversation | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM conversations WHERE source = ? AND external_id = ?
  `).get(source, externalId) as Conversation | undefined;
}

export function listConversations(opts?: { source?: string; limit?: number; offset?: number }): Conversation[] {
  const db = getDb();
  let sql = 'SELECT * FROM conversations';
  const params: unknown[] = [];

  if (opts?.source) {
    sql += ' WHERE source = ?';
    params.push(opts.source);
  }

  sql += ' ORDER BY updated_at DESC';

  if (opts?.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts?.offset) {
    sql += ' OFFSET ?';
    params.push(opts.offset);
  }

  return db.prepare(sql).all(...params) as Conversation[];
}

export function countConversations(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
  return row.count;
}

export function getConversation(id: string): Conversation | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
}
