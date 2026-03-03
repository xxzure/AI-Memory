import { defineConfig } from 'tsup';
import { cpSync } from 'fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    cpSync('src/web/public', 'dist/web/public', { recursive: true });
    console.log('Copied public assets to dist/web/public');
  },
});
