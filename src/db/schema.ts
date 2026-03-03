import type Database from 'better-sqlite3';

const SCHEMA_VERSION = 1;

const DDL = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  token_count INTEGER,
  ordinal INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  topics TEXT NOT NULL,
  key_points TEXT NOT NULL,
  token_count INTEGER,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  vector BLOB NOT NULL,
  model TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (memory_id, tag)
);

CREATE TABLE IF NOT EXISTS portraits (
  id TEXT PRIMARY KEY,
  generated_at INTEGER NOT NULL,
  profile TEXT NOT NULL,
  token_count INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_memories_conversation ON memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_ref ON embeddings(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);
`;

export function initializeSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const version = db.pragma('user_version', { simple: true }) as number;

  if (version < SCHEMA_VERSION) {
    db.exec(DDL);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
}
