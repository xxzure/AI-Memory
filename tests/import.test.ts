import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getDb, closeDb } from '../src/db/connection.js';
import { listConversations, countConversations } from '../src/db/repositories/conversations.js';
import { getMessagesByConversation, searchMessages } from '../src/db/repositories/messages.js';
import { chatgptImporter } from '../src/importers/chatgpt.js';
import { genericImporter } from '../src/importers/generic.js';
import { insertConversation } from '../src/db/repositories/conversations.js';
import { insertMessagesBatch } from '../src/db/repositories/messages.js';
import { countTokens } from '../src/engine/tokenizer.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'ai-memory-test-'));
  const dbPath = join(tmpDir, 'test.db');
  getDb(dbPath);
});

afterEach(() => {
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('ChatGPT Importer', () => {
  it('parses a ChatGPT export', () => {
    const data = [{
      id: 'conv-1',
      title: 'Test Conversation',
      create_time: 1700000000,
      update_time: 1700001000,
      mapping: {
        'root': { id: 'root', children: ['msg-1'] },
        'msg-1': {
          id: 'msg-1',
          parent: 'root',
          children: ['msg-2'],
          message: {
            id: 'msg-1',
            author: { role: 'user' },
            content: { parts: ['Hello!'] },
            create_time: 1700000100,
          },
        },
        'msg-2': {
          id: 'msg-2',
          parent: 'msg-1',
          children: [],
          message: {
            id: 'msg-2',
            author: { role: 'assistant' },
            content: { parts: ['Hi there!'] },
            create_time: 1700000200,
          },
        },
      },
    }];

    const file = join(tmpDir, 'chatgpt.json');
    writeFileSync(file, JSON.stringify(data));

    const conversations = chatgptImporter.parse(file);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe('Test Conversation');
    expect(conversations[0].messages).toHaveLength(2);
    expect(conversations[0].messages[0].role).toBe('user');
    expect(conversations[0].messages[0].content).toBe('Hello!');
    expect(conversations[0].messages[1].role).toBe('assistant');
  });
});

describe('Generic Importer', () => {
  it('parses JSON with messages array', () => {
    const data = {
      title: 'Generic Chat',
      messages: [
        { role: 'user', content: 'What is TypeScript?' },
        { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' },
      ],
    };
    const file = join(tmpDir, 'chat.json');
    writeFileSync(file, JSON.stringify(data));

    const convos = genericImporter.parse(file);
    expect(convos).toHaveLength(1);
    expect(convos[0].messages).toHaveLength(2);
  });

  it('parses markdown format', () => {
    const md = `# Chat\n\n## User\nWhat is TypeScript?\n\n## Assistant\nTypeScript is a typed superset of JavaScript.`;
    const file = join(tmpDir, 'chat.md');
    writeFileSync(file, md);

    const convos = genericImporter.parse(file);
    expect(convos).toHaveLength(1);
    expect(convos[0].messages).toHaveLength(2);
  });
});

describe('Database Operations', () => {
  it('inserts and retrieves conversations', () => {
    const id = insertConversation({
      source: 'test',
      external_id: 'ext-1',
      title: 'Test Conv',
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    expect(countConversations()).toBe(1);
    const convos = listConversations();
    expect(convos[0].title).toBe('Test Conv');
    expect(convos[0].id).toBe(id);
  });

  it('inserts and searches messages', () => {
    const convId = insertConversation({
      source: 'test',
      title: 'TypeScript Chat',
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    insertMessagesBatch([
      { conversation_id: convId, role: 'user', content: 'Tell me about TypeScript generics', created_at: Date.now(), ordinal: 0 },
      { conversation_id: convId, role: 'assistant', content: 'Generics allow you to create reusable components', created_at: Date.now(), ordinal: 1 },
    ]);

    const messages = getMessagesByConversation(convId);
    expect(messages).toHaveLength(2);

    const results = searchMessages('generics');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('generics');
  });
});

describe('Tokenizer', () => {
  it('counts tokens', () => {
    const count = countTokens('Hello, world!');
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });
});
