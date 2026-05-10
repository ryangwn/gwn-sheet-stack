import { describe, expect, mock, test } from 'bun:test';

import { createStackStore } from '../index';

function setup() {
  const store = createStackStore({ mountWindow: 3 });
  store.push({ kind: 'a' });
  const id = store.getState().stack[0]!.id;
  store.dispatch(id, { type: 'MOUNTED' });
  store.dispatch(id, { type: 'PRESENTED' });
  return { store, id };
}

describe('registerSnapshotProvider', () => {
  test('returns an unsubscribe function', () => {
    const { store, id } = setup();
    const capture = mock(() => ({ value: 1 }));
    const restore = mock((_: unknown) => {});
    const unsub = store.registerSnapshotProvider(id, 'test', {
      capture,
      restore,
      triggers: ['background'],
    });
    expect(typeof unsub).toBe('function');
    unsub();
  });

  test('capture called on active → background for providers with "background" trigger', () => {
    const { store, id } = setup();
    const capture = mock(() => ({ scroll: 42 }));
    const restore = mock((_: unknown) => {});
    store.registerSnapshotProvider(id, 'ui', { capture, restore, triggers: ['background'] });

    store.push({ kind: 'b' }); // moves 'a' to background
    expect(capture).toHaveBeenCalledTimes(1);
    expect(store.getState().stack[0]!.snapshot).toEqual({ ui: { scroll: 42 } });
  });

  test('capture NOT called on active → background for "evicted"-only providers', () => {
    const { store, id } = setup();
    const capture = mock(() => ({ draft: 'x' }));
    const restore = mock((_: unknown) => {});
    store.registerSnapshotProvider(id, 'form', { capture, restore, triggers: ['evicted'] });

    store.push({ kind: 'b' });
    expect(capture).not.toHaveBeenCalled();
    expect(store.getState().stack[0]!.snapshot).toBeUndefined();
  });

  test('capture called for ALL providers on background → evicted', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });

    const captureScroll = mock(() => ({ y: 10 }));
    const captureDraft = mock(() => ({ text: 'hello' }));
    const restore = mock((_: unknown) => {});
    store.registerSnapshotProvider(aId, 'scroll', {
      capture: captureScroll,
      restore,
      triggers: ['background'],
    });
    store.registerSnapshotProvider(aId, 'draft', {
      capture: captureDraft,
      restore,
      triggers: ['evicted'],
    });

    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' }); // pushes 'a' out of window of 2

    store.reportMemoryWarning(); // evicts 'a'
    expect(store.getState().stack[0]!.phase).toBe('evicted');

    // both providers captured on eviction
    expect(captureScroll).toHaveBeenCalledTimes(2); // once on BACKGROUND, once on EVICT
    expect(captureDraft).toHaveBeenCalledTimes(1); // once on EVICT
    expect(store.getState().stack[0]!.snapshot).toEqual({
      scroll: { y: 10 },
      draft: { text: 'hello' },
    });
  });

  test('unsubscribe prevents future captures', () => {
    const { store, id } = setup();
    const capture = mock(() => ({ v: 1 }));
    const restore = mock((_: unknown) => {});
    const unsub = store.registerSnapshotProvider(id, 'x', {
      capture,
      restore,
      triggers: ['background'],
    });
    unsub();

    store.push({ kind: 'b' });
    expect(capture).not.toHaveBeenCalled();
  });

  test('restore called with saved snapshot on MOUNTED after REVIVE', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });

    const captured = { y: 99 };
    const capture = mock(() => captured);
    const restore = mock((_: unknown) => {});
    store.registerSnapshotProvider(aId, 'scroll', {
      capture,
      restore,
      triggers: ['background', 'evicted'],
    });

    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' });
    store.reportMemoryWarning(); // evicts 'a'

    // revive 'a'
    store.dispatch(aId, { type: 'REVIVE' });
    // MOUNTED fires (from LayerHost useLayoutEffect in React, but we simulate here)
    store.dispatch(aId, { type: 'MOUNTED' });

    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledWith(captured);
  });

  test('snapshot cleared when layer reaches active', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });

    const capture = mock(() => ({ y: 5 }));
    const restore = mock((_: unknown) => {});
    store.registerSnapshotProvider(aId, 'scroll', {
      capture,
      restore,
      triggers: ['background', 'evicted'],
    });

    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' });
    store.reportMemoryWarning(); // evicts 'a'

    store.dispatch(aId, { type: 'REVIVE' });
    store.dispatch(aId, { type: 'MOUNTED' }); // → presenting (snapshot restored)
    expect(store.getState().stack[0]!.snapshot).toBeDefined();

    store.dispatch(aId, { type: 'PRESENTED' }); // → active (snapshot cleared)
    expect(store.getState().stack[0]!.snapshot).toBeUndefined();
  });

  test('snapshot is available on layer after capture (useLayer can read it)', () => {
    const { store, id } = setup();
    store.registerSnapshotProvider(id, 'form', {
      capture: () => ({ draft: 'hello' }),
      restore: () => {},
      triggers: ['background'],
    });
    store.push({ kind: 'b' });
    expect(store.getState().stack[0]!.snapshot).toEqual({ form: { draft: 'hello' } });
  });
});
