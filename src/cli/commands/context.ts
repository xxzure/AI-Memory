import { buildContext } from '../../engine/context-builder.js';
import { logger } from '../../utils/logger.js';

export async function runContext(topic: string, opts: { tokens?: string }) {
  const maxTokens = parseInt(opts.tokens || '4000', 10);

  logger.info(`Building context for "${topic}" (max ${maxTokens} tokens)...`);

  const bundle = await buildContext(topic, maxTokens);

  console.log(bundle.content);
  console.log();
  logger.info(`Token count: ${bundle.tokenCount} / ${maxTokens}`);
  logger.info(`Sources: ${bundle.sources.length} memories used`);
}
