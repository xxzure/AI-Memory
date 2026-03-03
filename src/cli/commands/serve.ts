import { getConfig } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

export async function runServe(opts: { port?: string }) {
  const port = parseInt(opts.port || String(getConfig().web.port), 10);

  // Dynamic import to avoid loading Hono if not needed
  const { createServer } = await import('../../web/server.js');
  const server = createServer();

  logger.info(`Starting web dashboard on http://localhost:${port}`);
  const { serve } = await import('@hono/node-server');
  serve({ fetch: server.fetch, port });
}
