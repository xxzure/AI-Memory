import { getDb } from '../connection.js';
import { v4 as uuid } from 'uuid';

export interface Embedding {
  id: string;
  ref_type: string;
  ref_id: string;
  vector: Buffer;
  model: string;
}

export function insertEmbedding(refType: string, refId: string, vector: Float32Array, model: string): string {
  const db = getDb();
  const id = uuid();
  const buf = Buffer.from(vector.buffer);
  db.prepare(`
    INSERT INTO embeddings (id, ref_type, ref_id, vector, model) VALUES (?, ?, ?, ?, ?)
  `).run(id, refType, refId, buf, model);
  return id;
}

export function getEmbeddingsByRefType(refType: string): Embedding[] {
  const db = getDb();
  return db.prepare('SELECT * FROM embeddings WHERE ref_type = ?').all(refType) as Embedding[];
}

export function getEmbeddingByRef(refType: string, refId: string): Embedding | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM embeddings WHERE ref_type = ? AND ref_id = ?').get(refType, refId) as Embedding | undefined;
}

export function bufferToFloat32(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}
