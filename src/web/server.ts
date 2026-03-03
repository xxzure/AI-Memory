import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { api } from './routes/api.js';

export function createServer(): Hono {
  const app = new Hono();

  // API routes
  app.route('/api', api);

  // Static files
  app.use('/*', serveStatic({ root: './src/web/public' }));

  return app;
}
