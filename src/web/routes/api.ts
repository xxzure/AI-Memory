import { Hono } from 'hono';
import { listConversations, countConversations, getConversation } from '../../db/repositories/conversations.js';
import { getMessagesByConversation, searchMessages } from '../../db/repositories/messages.js';
import { listMemories, countMemories, searchMemories } from '../../db/repositories/memories.js';
import { getLatestPortrait } from '../../portrait/analyzer.js';

export const api = new Hono();

// Stats
api.get('/stats', (c) => {
  return c.json({
    conversations: countConversations(),
    memories: countMemories(),
  });
});

// Conversations
api.get('/conversations', (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const source = c.req.query('source');
  return c.json(listConversations({ source: source || undefined, limit, offset }));
});

api.get('/conversations/:id', (c) => {
  const conv = getConversation(c.req.param('id'));
  if (!conv) return c.json({ error: 'Not found' }, 404);
  const messages = getMessagesByConversation(conv.id);
  return c.json({ ...conv, messages });
});

// Memories
api.get('/memories', (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  return c.json(listMemories({ limit, offset }));
});

// Search
api.get('/search', (c) => {
  const q = c.req.query('q') || '';
  const type = c.req.query('type') || 'messages';
  const limit = parseInt(c.req.query('limit') || '20', 10);

  if (type === 'memories') {
    return c.json(searchMemories(q, limit));
  }
  return c.json(searchMessages(q, limit));
});

// Portrait
api.get('/portrait', (c) => {
  const portrait = getLatestPortrait();
  if (!portrait) return c.json({ error: 'No portrait generated yet' }, 404);
  return c.json(portrait);
});
