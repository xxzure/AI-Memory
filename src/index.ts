import { createCli } from './cli/index.js';
import { getDb } from './db/connection.js';

// Initialize DB on startup
getDb();

const program = createCli();
program.parse();
