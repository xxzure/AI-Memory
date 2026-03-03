import { generatePortrait, getLatestPortrait } from '../../portrait/analyzer.js';
import { logger } from '../../utils/logger.js';
import type { PortraitProfile } from '../../portrait/types.js';

export async function runPortrait(opts: { refresh?: boolean }) {
  if (!opts.refresh) {
    const existing = getLatestPortrait();
    if (existing) {
      printPortrait(existing.profile);
      logger.info(`\nGenerated: ${new Date(existing.generated_at).toLocaleString()}`);
      logger.info('Use --refresh to regenerate.');
      return;
    }
  }

  logger.info('Generating portrait from your conversation memories...');
  const { profile } = await generatePortrait();
  printPortrait(profile);
}

function printPortrait(profile: PortraitProfile) {
  console.log('\n=== Your AI-Generated Portrait ===\n');
  console.log(profile.summary);

  console.log('\n--- Interests ---');
  profile.interests.forEach(i => console.log(`  - ${i}`));

  console.log('\n--- Communication Style ---');
  console.log(`  ${profile.communication_style}`);

  if (profile.technical_strengths.length) {
    console.log('\n--- Technical Strengths ---');
    profile.technical_strengths.forEach(s => console.log(`  - ${s}`));
  }

  console.log('\n--- Patterns ---');
  profile.patterns.forEach(p => console.log(`  - ${p}`));

  console.log('\n--- Goals ---');
  profile.goals.forEach(g => console.log(`  - ${g}`));

  console.log('\n--- Advice (当局者迷，旁观者清) ---');
  profile.advice.forEach(a => console.log(`  - ${a}`));
  console.log();
}
