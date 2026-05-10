import React from 'react';

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';
import { createStackStore } from 'gwn-sheet-stack-core';

import { LayerHost, Sheet, StackProvider } from '../index';

afterEach(cleanup);

const detents = [
  { id: 'small', size: 0.4 as number },
  { id: 'large', size: 0.92 as number },
];

function makeSheetWrapper(store: ReturnType<typeof createStackStore>, layerId: string) {
  return (
    <StackProvider value={store}>
      <LayerHost layerId={layerId}>
        <Sheet.Container detents={detents} initialDetent="large">
          <Sheet.Handle />
          <Sheet.Content>content</Sheet.Content>
        </Sheet.Container>
      </LayerHost>
    </StackProvider>
  );
}

describe('Sheet compound components', () => {
  test('Sheet.Container renders with data-sheetstack-presentation="sheet"', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]');
    expect(el).not.toBeNull();
  });

  test('Sheet.Container sets data-sheetstack-side="bottom" by default', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-side="bottom"]');
    expect(el).not.toBeNull();
  });

  test('regression: --ss-translate-pct is correct on first render (no flick from top)', () => {
    // Bug: pre-fix the sheet rendered at translateY(0) on first paint because the
    // measured container height was 0 in a ref. Visible "flick from top → bottom"
    // when state-driven re-renders later corrected the position. Percent-based vars
    // are independent of measurement, so they must be correct on the very first render.
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container
              detents={[{ id: 'small', size: 0.4 }]}
              initialDetent="small"
              side="bottom"
            >
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    // bottom side, size 0.4 → (1 - 0.4) * 100% = 60% (positive: travels down).
    expect(el.style.getPropertyValue('--ss-translate-pct')).toBe('60%');
  });

  test('data-sheetstack-phase reflects the FSM phase', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.getAttribute('data-sheetstack-phase')).toBe('active');

    act(() => {
      store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
    });
    expect(el.getAttribute('data-sheetstack-phase')).toBe('dismissing');
  });

  test('--ss-translate-pct snaps off-screen during dismissing phase (animate out)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    // Active at 'large' (size 0.92): 8% off-screen ish
    expect(el.style.getPropertyValue('--ss-translate-pct')).not.toBe('100%');

    act(() => {
      store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
    });
    // bottom side → off-screen is 100%
    expect(el.style.getPropertyValue('--ss-translate-pct')).toBe('100%');
  });

  test('watchdog dispatches DISMISSED if transitionend never fires', async () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    act(() => {
      render(makeSheetWrapper(store, layerId));
    });
    act(() => {
      store.dispatch(layerId, { type: 'MOUNTED' });
    });
    // Force into 'presenting' → 'active' → 'dismissing' without firing transitionend.
    act(() => {
      store.dispatch(layerId, { type: 'PRESENTED' });
    });
    act(() => {
      store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
    });
    expect(store.getState().stack[0]?.phase).toBe('dismissing');

    // jsdom never fires transitionend. The watchdog should fall back to
    // dispatching DISMISSED after the transition window + margin (default 450ms + 100ms).
    await new Promise((r) => setTimeout(r, 700));

    // Layer removed from stack (DISMISSED splices it).
    expect(store.getState().stack).toHaveLength(0);
  });

  test('--ss-translate-pct is negative for top-side sheets (travels up)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={[{ id: 'd', size: 0.4 }]} initialDetent="d" side="top">
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.style.getPropertyValue('--ss-translate-pct')).toBe('-60%');
  });

  test('Sheet.Container sets --ss-active-detent CSS var to initial detent', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.style.getPropertyValue('--ss-active-detent')).toBe('large');
  });

  test('Sheet.Handle renders a handle element', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    expect(container.querySelector('[data-sheetstack-handle]')).not.toBeNull();
  });

  test('Sheet.Content renders children', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    expect(container.querySelector('[data-sheetstack-content]')?.textContent).toBe('content');
  });

  test('snap updates --ss-active-detent to new detent id', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    act(() => {
      store.snap(layerId, 'small', { animated: false });
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.style.getPropertyValue('--ss-active-detent')).toBe('small');
  });

  test('closeThreshold prop is accepted and does not break rendering', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large" closeThreshold={0.4}>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    expect(container.querySelector('[data-sheetstack-presentation="sheet"]')).not.toBeNull();
  });

  test('regression: SNAPPED is NOT auto-dispatched when entering snapping from dragging (gesture spring owns it)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    act(() => {
      render(makeSheetWrapper(store, layerId));
    });

    // Simulate gesture: active → dragging → snapping. The container must NOT auto-fire
    // SNAPPED here, since useSheetGesture's spring will when it lands.
    act(() => {
      store.dispatch(layerId, { type: 'DRAG_START' });
    });
    act(() => {
      store.dispatch(layerId, { type: 'DRAG_END', targetDetentId: 'small' });
    });

    expect(store.getState().stack[0]!.phase).toBe('snapping');
  });

  test('snap with animated:false transitions to active (SNAPPED) synchronously', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    act(() => {
      render(makeSheetWrapper(store, layerId));
    });

    act(() => {
      store.snap(layerId, 'small', { animated: false });
    });

    expect(store.getState().stack[0]!.phase).toBe('active');
  });

  test('Sheet.Backdrop renders a backdrop element', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Backdrop />
            <Sheet.Container detents={detents} initialDetent="large">
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    expect(container.querySelector('[data-sheetstack-backdrop]')).not.toBeNull();
  });

  test('--ss-progress is 1.0 at the largest detent and updates on snap', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(parseFloat(el.style.getPropertyValue('--ss-progress'))).toBeCloseTo(1.0, 1);

    act(() => {
      store.snap(layerId, 'small', { animated: false });
    });
    expect(parseFloat(el.style.getPropertyValue('--ss-progress'))).toBeCloseTo(0.4 / 0.92, 1);
  });
});

describe('Sheet a11y primitives', () => {
  test('aria-labelledby is NOT set when no Title is mounted', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.hasAttribute('aria-labelledby')).toBe(false);
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  test('aria-labelledby/describedby wire to Title/Description ids when mounted', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large">
              <Sheet.Title>My title</Sheet.Title>
              <Sheet.Description>My description</Sheet.Description>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const dialog = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    const title = container.querySelector('[data-sheetstack-title]') as HTMLElement;
    const desc = container.querySelector('[data-sheetstack-description]') as HTMLElement;

    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(desc.id);
    expect(title.id).toBeTruthy();
    expect(desc.id).toBeTruthy();
  });

  test('Escape key dispatches DISMISS when dismissible (default)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const dialog = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });

    expect(store.getState().stack[0]?.phase).toBe('dismissing');
  });

  test('Escape is a no-op when dismissible={false}', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large" dismissible={false}>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const dialog = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });

    expect(store.getState().stack[0]?.phase).toBe('active');
  });

  test('Sheet.Close button dismisses the layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large">
              <Sheet.Close>Close</Sheet.Close>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const close = container.querySelector('[data-sheetstack-close]') as HTMLButtonElement;
    act(() => {
      close.click();
    });

    expect(store.getState().stack[0]?.phase).toBe('dismissing');
  });

  test('fadeFromIndex sets --ss-backdrop-opacity statically', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    const threeDetents = [
      { id: 'small', size: 0.3 },
      { id: 'mid', size: 0.6 },
      { id: 'large', size: 0.95 },
    ];

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={threeDetents} initialDetent="small" fadeFromIndex={2}>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    // small = idx 0, fadeFromIndex 2 → 0/2 = 0
    expect(parseFloat(el.style.getPropertyValue('--ss-backdrop-opacity'))).toBeCloseTo(0, 3);

    act(() => {
      store.snap(layerId, 'mid', { animated: false });
    });
    // mid = idx 1, fadeFromIndex 2 → 1/2 = 0.5
    expect(parseFloat(el.style.getPropertyValue('--ss-backdrop-opacity'))).toBeCloseTo(0.5, 3);
  });

  test('--ss-nested-displacement is 0px on lone sheet', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(makeSheetWrapper(store, layerId)));
    });

    const el = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(el.style.getPropertyValue('--ss-nested-displacement')).toBe('0px');
  });

  test('shouldScaleBackground transforms [data-sheetstack-wrapper] when sheet is active', () => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-sheetstack-wrapper', '');
    document.body.appendChild(wrapper);

    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });

    act(() => {
      render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large" shouldScaleBackground>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      );
    });

    expect(wrapper.style.transform).toMatch(/scale\(/);
    expect(wrapper.style.borderRadius).toBe('8px');

    document.body.removeChild(wrapper);
  });

  test('data-sheetstack-dismissible reflects dismissible prop', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;

    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <StackProvider value={store}>
          <LayerHost layerId={layerId}>
            <Sheet.Container detents={detents} initialDetent="large" dismissible={false}>
              <Sheet.Content>content</Sheet.Content>
            </Sheet.Container>
          </LayerHost>
        </StackProvider>,
      ));
    });

    const dialog = container.querySelector('[data-sheetstack-presentation="sheet"]') as HTMLElement;
    expect(dialog.hasAttribute('data-sheetstack-dismissible')).toBe(false);
  });
});
