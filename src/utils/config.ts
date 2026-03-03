import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Config {
  dbPath: string;
  llm: {
    provider: 'ollama' | 'openai' | 'anthropic';
    model: string;
    baseUrl: string;
    apiKey?: string;
  };
  embeddings: {
    provider: 'ollama' | 'huggingface';
    model: string;
    baseUrl: string;
  };
  web: {
    port: number;
  };
}

const CONFIG_DIR = join(homedir(), '.ai-memory');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_DB_PATH = join(CONFIG_DIR, 'memory.db');

const DEFAULT_CONFIG: Config = {
  dbPath: DEFAULT_DB_PATH,
  llm: {
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
  },
  embeddings: {
    provider: 'huggingface',
    model: 'Xenova/all-MiniLM-L6-v2',
    baseUrl: 'http://localhost:11434',
  },
  web: {
    port: 3377,
  },
};

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached) return cached;

  mkdirSync(CONFIG_DIR, { recursive: true });

  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    cached = { ...DEFAULT_CONFIG };
    return cached;
  }

  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Partial<Config>;
  cached = {
    ...DEFAULT_CONFIG,
    ...raw,
    llm: { ...DEFAULT_CONFIG.llm, ...raw.llm },
    embeddings: { ...DEFAULT_CONFIG.embeddings, ...raw.embeddings },
    web: { ...DEFAULT_CONFIG.web, ...raw.web },
  };
  return cached;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
