/* eslint-disable react/display-name */
import React from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, mock, test } from 'bun:test';
import { createStackStore } from 'gwn-sheet-stack-core';

import { LayerHost, StackProvider, useLifecycle } from '../index';

function makeWrapper(store: ReturnType<typeof createStackStore>, layerId: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <StackProvider value={store}>
      <LayerHost layerId={layerId}>{children}</LayerHost>
    </StackProvider>
  );
}

/** Advance a layer through mounting → presenting → active. */
function activateLayer(store: ReturnType<typeof createStackStore>, layerId: string) {
  // LayerHost fires MOUNTED (mounting → presenting) inside renderHook.
  // We just need to fire PRESENTED (presenting → active).
  act(() => {
    store.dispatch(layerId, { type: 'PRESENTED' });
  });
}

describe('useLifecycle', () => {
  test('onLoad fires when layer enters presenting (mounting → presenting)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    const onLoad = mock(() => {});

    renderHook(() => useLifecycle({ onLoad }), { wrapper: makeWrapper(store, id) });
    // LayerHost fires MOUNTED in useLayoutEffect → mounting → presenting
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  test('onLoad does NOT fire again on background → active (FOREGROUND)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    const onLoad = mock(() => {});

    renderHook(() => useLifecycle({ onLoad }), { wrapper: makeWrapper(store, aId) });
    expect(onLoad).toHaveBeenCalledTimes(1);
    activateLayer(store, aId); // presenting → active

    act(() => {
      store.push({ kind: 'b' });
    }); // 'a' → background
    act(() => {
      store.dispatch(aId, { type: 'FOREGROUND' });
    }); // back to active
    expect(onLoad).toHaveBeenCalledTimes(1); // still 1
  });

  test('onLoad fires again after REVIVE cycle', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    const onLoad = mock(() => {});

    renderHook(() => useLifecycle({ onLoad }), { wrapper: makeWrapper(store, aId) });
    expect(onLoad).toHaveBeenCalledTimes(1);
    activateLayer(store, aId); // → active

    // move 'a' to evicted
    act(() => {
      store.push({ kind: 'b' });
      const bId = store.getState().stack[1]!.id;
      store.dispatch(bId, { type: 'MOUNTED' });
      store.dispatch(bId, { type: 'PRESENTED' });
      store.push({ kind: 'c' });
    });
    act(() => {
      store.reportMemoryWarning();
    }); // evicts 'a'
    expect(store.getState().stack[0]!.phase).toBe('evicted');

    // revive 'a' — simulates LayerHost remounting after Stage brings it back in window
    act(() => {
      store.dispatch(aId, { type: 'REVIVE' });
    }); // evicted → mounting
    act(() => {
      store.dispatch(aId, { type: 'MOUNTED' });
    }); // mounting → presenting

    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  test('onWillAppear fires on mounting → presenting', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    const onWillAppear = mock(() => {});

    renderHook(() => useLifecycle({ onWillAppear }), { wrapper: makeWrapper(store, id) });
    expect(onWillAppear).toHaveBeenCalledTimes(1);
  });

  test('onDidAppear fires on presenting → active', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    const onDidAppear = mock(() => {});

    renderHook(() => useLifecycle({ onDidAppear }), { wrapper: makeWrapper(store, id) });
    act(() => {
      store.dispatch(id, { type: 'PRESENTED' });
    });
    expect(onDidAppear).toHaveBeenCalledTimes(1);
  });

  test('onWillDisappear fires on active → dismissing', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    const onWillDisappear = mock(() => {});

    renderHook(() => useLifecycle({ onWillDisappear }), { wrapper: makeWrapper(store, id) });
    act(() => {
      store.dispatch(id, { type: 'DISMISS', source: 'user' });
    });
    expect(onWillDisappear).toHaveBeenCalledTimes(1);
  });

  test('onDidDisappear fires when layer is removed from stack (DISMISSED)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    const onDidDisappear = mock(() => {});

    renderHook(() => useLifecycle({ onDidDisappear }), { wrapper: makeWrapper(store, id) });
    act(() => {
      store.dispatch(id, { type: 'DISMISS', source: 'user' });
    });
    act(() => {
      store.dispatch(id, { type: 'DISMISSED' });
    });
    expect(onDidDisappear).toHaveBeenCalledTimes(1);
  });

  test('onMemoryWarning fires on background → evicted', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    // Pre-activate so 'a' is active when renderHook mounts (LayerHost MOUNTED is a no-op)
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    const onMemoryWarning = mock(() => {});

    renderHook(() => useLifecycle({ onMemoryWarning }), { wrapper: makeWrapper(store, aId) });
    // 'a' is already active — no need for activateLayer

    act(() => {
      store.push({ kind: 'b' });
      const bId = store.getState().stack[1]!.id;
      store.dispatch(bId, { type: 'MOUNTED' });
      store.dispatch(bId, { type: 'PRESENTED' });
      store.push({ kind: 'c' });
    });
    act(() => {
      store.reportMemoryWarning();
    });
    expect(onMemoryWarning).toHaveBeenCalledTimes(1);
  });

  test('no duplicate onLoad under StrictMode (FSM idempotency handles double-mount)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    const onLoad = mock(() => {});

    renderHook(() => useLifecycle({ onLoad }), { wrapper: makeWrapper(store, id) });
    // LayerHost fires MOUNTED once (FSM idempotency), so presenting entered once
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
