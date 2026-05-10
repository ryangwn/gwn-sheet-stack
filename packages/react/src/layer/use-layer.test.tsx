import React from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, spyOn, test } from 'bun:test';

import { LayerHost, StackProvider, useLayer } from '../index';

function makeWrapper(store: ReturnType<typeof createStackStore>, layerId: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <StackProvider value={store}>
      <LayerHost layerId={layerId}>{children}</LayerHost>
    </StackProvider>
  );
}

describe('useLayer', () => {
  test('returns the layer id', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    expect(result.current.id).toBe(layerId);
  });

  test('returns the layer props', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo', props: { userId: '42' } });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    expect(result.current.props).toEqual({ userId: '42' });
  });

  test('isTopmost is true when the layer is at the top of the stack', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    expect(result.current.isTopmost).toBe(true);
  });

  test('isTopmost is false when another layer is on top', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    act(() => {
      store.push({ kind: 'b' });
    });
    expect(result.current.isTopmost).toBe(false);
  });

  test('close dispatches DISMISS to the layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    act(() => {
      result.current.close();
    });
    expect(store.getState().stack.find((l) => l.id === layerId)!.phase).toBe('dismissing');
  });

  test('snapTo calls store.snap on the layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });
    const { result } = renderHook(() => useLayer(), {
      wrapper: makeWrapper(store, layerId),
    });
    act(() => {
      result.current.snapTo('large');
    });
    expect(store.getState().stack.find((l) => l.id === layerId)!.phase).toBe('snapping');
  });

  test('throws when used outside a LayerHost', () => {
    const store = createStackStore({ mountWindow: 3 });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StackProvider value={store}>{children}</StackProvider>
    );
    const spy = spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLayer(), { wrapper })).toThrow();
    spy.mockRestore();
  });

  test('isVisible is true for presenting, active, dragging, snapping phases', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), { wrapper: makeWrapper(store, layerId) });

    // LayerHost fires MOUNTED → presenting immediately on mount
    expect(result.current.isVisible).toBe(true); // presenting

    act(() => {
      store.dispatch(layerId, { type: 'PRESENTED' });
    });
    expect(result.current.isVisible).toBe(true); // active

    act(() => {
      store.dispatch(layerId, { type: 'DRAG_START' });
    });
    expect(result.current.isVisible).toBe(true); // dragging

    act(() => {
      store.dispatch(layerId, { type: 'DRAG_END', targetDetentId: 'large' });
    });
    expect(result.current.isVisible).toBe(true); // snapping
  });

  test('isVisible is false for background phase', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });
    const { result } = renderHook(() => useLayer(), { wrapper: makeWrapper(store, layerId) });
    act(() => {
      store.push({ kind: 'b' });
    }); // moves a → background
    expect(result.current.isVisible).toBe(false);
  });

  test('detentId reflects current snap target', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });
    const { result } = renderHook(() => useLayer(), { wrapper: makeWrapper(store, layerId) });
    expect(result.current.detentId).toBeUndefined();
    act(() => {
      store.dispatch(layerId, { type: 'SNAP', detentId: 'large', animated: false });
    });
    expect(result.current.detentId).toBe('large');
  });

  test('snapshot is undefined when no snapshot exists', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    const { result } = renderHook(() => useLayer(), { wrapper: makeWrapper(store, layerId) });
    expect(result.current.snapshot).toBeUndefined();
  });

  test('snapshot returns layer snapshot when it exists', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const layerId = store.getState().stack[0]!.id;
    store.dispatch(layerId, { type: 'MOUNTED' });
    store.dispatch(layerId, { type: 'PRESENTED' });
    store.registerSnapshotProvider(layerId, 'form', {
      capture: () => ({ draft: 'hello' }),
      restore: () => {},
      triggers: ['background'],
    });
    const { result } = renderHook(() => useLayer(), { wrapper: makeWrapper(store, layerId) });
    act(() => {
      store.push({ kind: 'b' });
    }); // → background, captures snapshot
    expect(result.current.snapshot).toMatchObject({ form: { draft: 'hello' } });
  });
});
