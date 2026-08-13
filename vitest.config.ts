import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Excludes .claude/** in addition to vitest's defaults (node_modules, dist, etc.)
// so that stray git worktrees checked out under .claude/worktrees/ don't get
// their test suites picked up and double-counted alongside this repo's own.
export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" path so tests can import the same way app code
    // does — lib modules weren't previously exercised with a value (non-type) `@/`
    // import under vitest, so this alias was never wired up.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    exclude: ['**/node_modules/**', '**/.claude/**'],
    environment: 'jsdom',
  },
});
