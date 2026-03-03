import { searchMessages } from '../../db/repositories/messages.js';
import { searchMemories } from '../../db/repositories/memories.js';
import { logger } from '../../utils/logger.js';

export async function runSearch(query: string, opts: { memories?: boolean; limit?: string }) {
  const limit = parseInt(opts.limit || '20', 10);

  if (opts.memories) {
    const results = searchMemories(query, limit);
    if (results.length === 0) {
      logger.info('No memories found matching your query.');
      return;
    }

    logger.info(`Found ${results.length} memories:\n`);
    for (const mem of results) {
      const topics = JSON.parse(mem.topics || '[]').join(', ');
      const date = new Date(mem.created_at).toLocaleDateString();
      console.log(`[${date}] Topics: ${topics}`);
      console.log(`  ${mem.summary.slice(0, 200)}`);
      console.log();
    }
  } else {
    const results = searchMessages(query, limit);
    if (results.length === 0) {
      logger.info('No messages found matching your query.');
      return;
    }

    logger.info(`Found ${results.length} messages:\n`);
    for (const msg of results) {
      const date = new Date(msg.created_at).toLocaleDateString();
      const title = msg.conversation_title || 'Untitled';
      const preview = msg.content.slice(0, 150).replace(/\n/g, ' ');
      console.log(`[${date}] ${title} (${msg.role})`);
      console.log(`  ${preview}${msg.content.length > 150 ? '...' : ''}`);
      console.log();
    }
  }
}
