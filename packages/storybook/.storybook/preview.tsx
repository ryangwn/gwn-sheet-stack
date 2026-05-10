import type { Preview } from '@storybook/react';
import 'gwn-sheet-stack-react/styles';

import './preview.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
    },
  },
};

export default preview;
