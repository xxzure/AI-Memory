import { encoding_for_model } from 'tiktoken';

let enc: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder() {
  if (!enc) {
    enc = encoding_for_model('gpt-4');
  }
  return enc;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const encoder = getEncoder();
  const tokens = encoder.encode(text);
  if (tokens.length <= maxTokens) return text;
  const truncated = tokens.slice(0, maxTokens);
  return new TextDecoder().decode(encoder.decode(truncated));
}
