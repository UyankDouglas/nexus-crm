// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/dist',
    '**/coverage',
    '**/node_modules',
    '**/*.tsbuildinfo',
    'apps/api/src/generated',
    'apps/api/.mail-outbox',
    'playwright-report',
    'test-results',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // API (NestJS) e pacote compartilhado: ambiente Node.
  {
    files: [
      'apps/api/**/*.ts',
      'packages/shared/**/*.ts',
      'e2e/**/*.ts',
      '**/*.config.{ts,mjs,js}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // A injeção de dependência do Nest usa os metadados de tipo emitidos pelo TypeScript:
    // classes injetadas e DTOs precisam de import de valor, não `import type`.
    files: ['apps/api/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    files: ['apps/api/**/*.spec.ts', 'apps/api/test/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: ['apps/api/prisma/seed.ts'],
    rules: { 'no-console': 'off' },
  },

  // Frontend (React + Vite).
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },
  {
    // Scripts estáticos servidos sem build (ex.: tema aplicado antes do React).
    files: ['apps/web/public/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    // Componentes gerados pelo shadcn/ui exportam variantes junto dos componentes.
    files: ['apps/web/src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  prettier,
);
