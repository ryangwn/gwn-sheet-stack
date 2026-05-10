import React from 'react';

import { act, render } from '@testing-library/react';
import { describe, expect, test } from 'bun:test';
import { createStackStore } from 'gwn-sheet-stack-core';

import { LayerHost, StackProvider } from '../index';

describe('LayerHost', () => {
  test('sends MOUNTED once after mount', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layer = store.getState().stack[0]!;
    expect(layer.phase).toBe('mounting');

    act(() => {
      render(
        <StackProvider value={store}>
          <LayerHost layerId={layer.id} />
        </StackProvider>,
      );
    });

    expect(store.getState().stack[0]!.phase).toBe('presenting');
  });

  test('MOUNTED is idempotent under StrictMode double-invoke', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layer = store.getState().stack[0]!;

    act(() => {
      render(
        <React.StrictMode>
          <StackProvider value={store}>
            <LayerHost layerId={layer.id} />
          </StackProvider>
        </React.StrictMode>,
      );
    });

    expect(store.getState().stack[0]!.phase).toBe('presenting');
  });
});
