import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.changeset/**',
      '**/.storybook/**',
      '**/.svelte-kit/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: true },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // SheetRegistry is the canonical declaration-merging seed; the empty
    // interface is required so consumers can extend it via module augmentation.
    files: ['packages/core/src/store/types.ts'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  },
  {
    files: ['packages/react/**/*.{ts,tsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooksPlugin },
    settings: { react: { version: '18.0.0' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    // Sheet.tsx uses an intentional two-paint entrance animation: the first
    // paint must render the sheet off-screen, then a layout effect flips an
    // `entered` flag so the second paint targets the active detent — the CSS
    // transition animates between the two. There is no React-blessed pattern
    // for this without setting state inside an effect.
    files: ['packages/react/src/sheet/Sheet.tsx'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'react/display-name': 'off',
    },
  },
];
