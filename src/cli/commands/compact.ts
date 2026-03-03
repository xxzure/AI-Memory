import { compactAll } from '../../engine/compactor.js';
import { logger } from '../../utils/logger.js';

export async function runCompact() {
  logger.info('Starting compaction...');
  const count = await compactAll();
  logger.info(`Compacted ${count} conversations into memories.`);
}
