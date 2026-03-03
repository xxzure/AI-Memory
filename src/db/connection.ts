import Database from 'better-sqlite3';
import { getConfig } from '../utils/config.js';
import { initializeSchema } from './schema.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let instance: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (instance) return instance;

  const path = dbPath ?? getConfig().dbPath;
  mkdirSync(dirname(path), { recursive: true });

  instance = new Database(path);
  initializeSchema(instance);
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
