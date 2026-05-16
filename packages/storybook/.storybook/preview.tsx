import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
    },
    options: {
      storySort: {
        order: ['Introduction', '*'],
      },
    },
  },
};

export default preview;
