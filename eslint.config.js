import js from '@eslint/js';
import typescript from 'typescript-eslint';

export default [
  {
    // .claude/worktrees mirrors vitest.config.ts's exclude: a stray git worktree checked
    // out under here (from the harness's worktree tool) is a separate checkout with its
    // own tsconfig — without this, ESLint's typescript-eslint parser treats its files as
    // part of this project and throws "tsconfigRootDir ambiguity" parse errors.
    ignores: [
      '.next',
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.env.local',
      '.env*.local',
      'supabase/migrations',
      '.claude/worktrees',
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
