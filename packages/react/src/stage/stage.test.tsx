import React from 'react';

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';
import { createStackStore } from 'gwn-sheet-stack-core';

import { StackProvider, Stage } from '../index';

afterEach(cleanup);

const DemoComponent = ({ label = 'demo' }: { label?: string }) => (
  <div data-testid="layer-content">{label}</div>
);

const registry = { demo: DemoComponent };

describe('Stage', () => {
  test('renders nothing when stack is empty', () => {
    const store = createStackStore({ mountWindow: 3 });
    act(() => {
      render(
        <StackProvider value={store}>
          <Stage registry={registry} />
        </StackProvider>,
      );
    });
    expect(document.querySelectorAll('[data-testid="layer-content"]')).toHaveLength(0);
  });

  test('portals layer content into document.body after push', () => {
    const store = createStackStore({ mountWindow: 3 });
    act(() => {
      render(
        <StackProvider value={store}>
          <Stage registry={registry} />
        </StackProvider>,
      );
    });
    act(() => {
      store.push({ kind: 'demo' });
    });
    expect(document.body.querySelector('[data-testid="layer-content"]')).not.toBeNull();
  });

  test('renders multiple layers within mount window', () => {
    const store = createStackStore({ mountWindow: 3 });
    act(() => {
      render(
        <StackProvider value={store}>
          <Stage registry={registry} mountWindow={3} />
        </StackProvider>,
      );
    });
    act(() => {
      store.push({ kind: 'demo', props: { label: 'a' } });
    });
    act(() => {
      store.push({ kind: 'demo', props: { label: 'b' } });
    });
    expect(document.querySelectorAll('[data-testid="layer-content"]')).toHaveLength(2);
  });

  test('layers outside mount window are not rendered', () => {
    const store = createStackStore({ mountWindow: 2 });
    act(() => {
      render(
        <StackProvider value={store}>
          <Stage registry={registry} mountWindow={2} />
        </StackProvider>,
      );
    });
    act(() => {
      store.push({ kind: 'demo', props: { label: 'a' } });
      store.push({ kind: 'demo', props: { label: 'b' } });
      store.push({ kind: 'demo', props: { label: 'c' } });
    });
    // mountWindow=2: top 2 rendered, bottom 1 unmounted
    expect(document.querySelectorAll('[data-testid="layer-content"]')).toHaveLength(2);
  });

  test('background layer behind a sheet is visible in DOM (display not none)', () => {
    const store = createStackStore({ mountWindow: 3 });
    act(() => {
      render(
        <StackProvider value={store}>
          <Stage registry={registry} mountWindow={3} />
        </StackProvider>,
      );
    });
    act(() => {
      store.push({ kind: 'demo', props: { label: 'bg' } });
      store.push({ kind: 'demo', props: { label: 'top' } });
    });
    const layers = document.querySelectorAll('[data-testid="layer-content"]');
    expect(layers).toHaveLength(2);
    const bgLayer = Array.from(layers).find((el) => el.textContent === 'bg')!;
    // depth-1 behind a sheet presentation is visible (renderModeFor returns 'visible')
    const wrapper = bgLayer.closest('[data-sheetstack-hidden]') as HTMLElement | null;
    expect(wrapper).toBeNull(); // no hidden wrapper = visible
  });
});
