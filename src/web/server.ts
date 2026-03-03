import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { api } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In dev (tsx): __dirname = src/web/, public at src/web/public
// In prod (bundled): __dirname = dist/, public at dist/web/public
const publicDir = existsSync(join(__dirname, 'public'))
  ? join(__dirname, 'public')
  : join(__dirname, 'web', 'public');

export function createServer(): Hono {
  const app = new Hono();

  // API routes
  app.route('/api', api);

  // Static files
  app.use('/*', serveStatic({ root: publicDir }));

  return app;
}
