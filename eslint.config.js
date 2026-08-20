import js from '@eslint/js';
import typescript from 'typescript-eslint';

export default [
  {
    // Both worktree roots mirror vitest.config.ts's exclude: a stray git worktree checked
    // out under either (from the harness's worktree tool, or `git worktree add` by hand) is
    // a separate checkout with its own tsconfig — without this, ESLint's typescript-eslint
    // parser treats its files as part of this project and throws "tsconfigRootDir
    // ambiguity" parse errors. Both paths are already gitignored; linting them is never
    // meaningful, and a stray worktree left behind after a merge would otherwise fail the
    // pre-commit hook for unrelated work.
    //
    // supabase/.temp holds bundled edge-runtime output from `supabase start` — generated,
    // minified, and not ours to lint.
    ignores: [
      '.next',
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.env.local',
      '.env*.local',
      'supabase/migrations',
      'supabase/.temp',
      '.claude/worktrees',
      '.worktrees',
      // Bundler-vendored Ruby gems (fastlane, for App Store screenshot framing) ship
      // their own bundled JS assets (rdoc templates, etc.) — not ours to lint, and
      // gitignored regardless.
      'ios/vendor',
    ],
  },
  js.configs.recommended,
  ...typescript.configs.strict,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Disable Prettier-controlled formatting
      quotes: 'off',
      semi: 'off',
      'comma-dangle': 'off',
      indent: 'off',

      // TypeScript rules (relax strict)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',

      // General
      'no-debugger': 'warn',
      eqeqeq: ['error', 'always'],

      // Every z-index in the app must come from the zIndex scale in
      // components/ui/tokens.ts (see its header comment) -- a value picked in
      // isolation, without checking what else needs to sit above/below it, is how the
      // field's overflow menu once ended up tied with the player dots it's supposed to
      // float over. Add a new tier to that object instead of a bare number here.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='zIndex'] Literal",
          message:
            'Hardcoded z-index. Add or use a tier from the zIndex scale in components/ui/tokens.ts instead.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\bz-(0|10|20|30|40|50)\\b/]",
          message:
            'Hardcoded Tailwind z-index utility. Use the zIndex scale in components/ui/tokens.ts via an inline style instead.',
        },
      ],
    },
  },
  // Service worker globals
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
  },
];
