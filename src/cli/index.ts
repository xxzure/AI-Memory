import { Command } from 'commander';
import { runImport } from './commands/import.js';
import { runSearch } from './commands/search.js';
import { runCompact } from './commands/compact.js';
import { runContext } from './commands/context.js';
import { runPortrait } from './commands/portrait.js';
import { runServe } from './commands/serve.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('ai-memory')
    .description('Portable AI memory — unified conversation store across LLM platforms')
    .version('0.1.0');

  program
    .command('import')
    .description('Import conversations from an LLM platform')
    .argument('<source>', 'Source platform: chatgpt | claude | gemini | ollama | generic')
    .argument('<file>', 'Path to export file')
    .action(runImport);

  program
    .command('search')
    .description('Search conversations and memories')
    .argument('<query>', 'Search query')
    .option('-m, --memories', 'Search memories instead of messages')
    .option('-l, --limit <n>', 'Max results', '20')
    .action(runSearch);

  program
    .command('compact')
    .description('Summarize unprocessed conversations into memories')
    .action(runCompact);

  program
    .command('context')
    .description('Generate a token-budgeted context bundle')
    .argument('<topic>', 'Topic or query')
    .option('-t, --tokens <n>', 'Token budget', '4000')
    .action(runContext);

  program
    .command('portrait')
    .description('Generate a self-portrait from your conversation history')
    .option('-r, --refresh', 'Regenerate even if one exists')
    .action(runPortrait);

  program
    .command('serve')
    .description('Start the web dashboard')
    .option('-p, --port <n>', 'Port number')
    .action(runServe);

  return program;
}
