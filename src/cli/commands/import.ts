import { existsSync } from 'fs';
import { chatgptImporter } from '../../importers/chatgpt.js';
import { claudeImporter } from '../../importers/claude.js';
import { geminiImporter } from '../../importers/gemini.js';
import { ollamaImporter } from '../../importers/ollama.js';
import { genericImporter } from '../../importers/generic.js';
import { insertConversation, findConversationByExternalId } from '../../db/repositories/conversations.js';
import { insertMessagesBatch } from '../../db/repositories/messages.js';
import { countTokens } from '../../engine/tokenizer.js';
import { logger } from '../../utils/logger.js';
import type { Importer } from '../../importers/types.js';

const importers: Record<string, Importer> = {
  chatgpt: chatgptImporter,
  claude: claudeImporter,
  gemini: geminiImporter,
  ollama: ollamaImporter,
  generic: genericImporter,
};

export async function runImport(source: string, filePath: string) {
  if (!existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const importer = importers[source];
  if (!importer) {
    logger.error(`Unknown source: ${source}. Valid sources: ${Object.keys(importers).join(', ')}`);
    process.exit(1);
  }

  logger.info(`Importing from ${source}: ${filePath}`);

  const conversations = importer.parse(filePath);
  logger.info(`Found ${conversations.length} conversations`);

  let imported = 0;
  let skipped = 0;

  for (const conv of conversations) {
    // Dedup check
    const existing = findConversationByExternalId(source, conv.external_id);
    if (existing) {
      skipped++;
      continue;
    }

    const convId = insertConversation({
      source,
      external_id: conv.external_id,
      title: conv.title,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      metadata: conv.metadata,
    });

    const messages = conv.messages.map((m, i) => ({
      conversation_id: convId,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
      token_count: countTokens(m.content),
      ordinal: i,
    }));

    insertMessagesBatch(messages);
    imported++;
  }

  logger.info(`Done: ${imported} imported, ${skipped} skipped (duplicates)`);
}
