import React from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { LayerHost, StackProvider } from '../index';

afterEach(cleanup);

describe('built-in scroll-position provider', () => {
  test('captures scrollTop of data-sheetstack-scroll-id elements on background', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });

    act(() => {
      render(
        <StackProvider value={store}>
          <LayerHost layerId={aId}>
            <div data-sheetstack-scroll-id="main" style={{ overflowY: 'scroll', height: 100 }}>
              content
            </div>
          </LayerHost>
        </StackProvider>,
      );
    });

    // Manually set scrollTop (happy-dom supports this)
    const scrollEl = document.querySelector<HTMLElement>('[data-sheetstack-scroll-id="main"]')!;
    Object.defineProperty(scrollEl, 'scrollTop', { value: 150, writable: true });

    act(() => {
      store.push({ kind: 'b' });
    }); // 'a' → background, triggers capture

    expect(store.getState().stack[0]!.snapshot).toMatchObject({
      __scroll__: { main: 150 },
    });
  });

  test('snapshot is captured on background and cleared on active', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });

    act(() => {
      render(
        <StackProvider value={store}>
          <LayerHost layerId={aId}>
            <div data-sheetstack-scroll-id="list" />
          </LayerHost>
        </StackProvider>,
      );
    });

    act(() => {
      store.push({ kind: 'b' });
    }); // capture
    expect(store.getState().stack[0]!.snapshot).toBeDefined();

    // When 'a' returns to active (FOREGROUND + PRESENTED simulated)
    act(() => {
      store.dispatch(aId, { type: 'FOREGROUND' });
    }); // → active
    expect(store.getState().stack[0]!.snapshot).toBeUndefined();
  });
});
