import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(config) {
    config.resolve ??= {};
    // Array form so ordering is explicit: more-specific subpaths must precede the
    // broader package-name prefix, otherwise `gwn-sheet-stack-react/styles` becomes
    // `<src/index.ts>/styles` (nonexistent file).
    const existing = config.resolve.alias;
    const existingArray = Array.isArray(existing)
      ? existing
      : existing
        ? Object.entries(existing).map(([find, replacement]) => ({
            find,
            replacement: replacement as string,
          }))
        : [];
    config.resolve.alias = [
      {
        find: 'gwn-sheet-stack-react/styles.css',
        replacement: path.resolve(__dirname, '../../react/src/styles.css'),
      },
      {
        find: 'gwn-sheet-stack-react/styles',
        replacement: path.resolve(__dirname, '../../react/src/styles.css'),
      },
      {
        find: 'gwn-sheet-stack-react',
        replacement: path.resolve(__dirname, '../../react/src/index.ts'),
      },
      {
        find: 'gwn-sheet-stack-core',
        replacement: path.resolve(__dirname, '../../core/src/index.ts'),
      },
      ...existingArray,
    ];
    return config;
  },
};

export default config;
