import { defineConfig } from 'vitest/config';

// Excludes .claude/** in addition to vitest's defaults (node_modules, dist, etc.)
// so that stray git worktrees checked out under .claude/worktrees/ don't get
// their test suites picked up and double-counted alongside this repo's own.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
});
