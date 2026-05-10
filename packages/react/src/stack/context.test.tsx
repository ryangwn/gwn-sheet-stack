import React from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, spyOn, test } from 'bun:test';

import { StackProvider, useStack, useStackState } from '../index';

describe('StackProvider / useStack', () => {
  test('useStack returns the store provided by StackProvider', () => {
    const store = createStackStore({ mountWindow: 3 });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StackProvider value={store}>{children}</StackProvider>
    );
    const { result } = renderHook(() => useStack(), { wrapper });
    expect(result.current).toBe(store);
  });

  test('useStack throws when used outside StackProvider', () => {
    const spy = spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useStack())).toThrow();
    spy.mockRestore();
  });

  test('useStackState re-renders when store state changes', () => {
    const store = createStackStore({ mountWindow: 3 });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StackProvider value={store}>{children}</StackProvider>
    );
    const { result } = renderHook(() => useStackState(), { wrapper });
    expect(result.current.stack).toHaveLength(0);
    act(() => {
      store.push({ kind: 'demo' });
    });
    expect(result.current.stack).toHaveLength(1);
    expect(result.current.stack[0]!.kind).toBe('demo');
  });
});
