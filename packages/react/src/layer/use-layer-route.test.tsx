import React from 'react';

import { createStackStore, hashLayerId } from '@gwn-sheet-stack/core';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'bun:test';

import { StackProvider, useLayerRoute } from '../index';

function RouteComponent({ kind, props }: { kind: string; props?: unknown }) {
  useLayerRoute(kind, props);
  return null;
}

function makeWrapper(store: ReturnType<typeof createStackStore>) {
  return ({ children }: { children: React.ReactNode }) => (
    <StackProvider value={store}>{children}</StackProvider>
  );
}

describe('useLayerRoute', () => {
  test('pushes the Layer on mount', () => {
    const store = createStackStore({ mountWindow: 3 });
    const Wrapper = makeWrapper(store);
    render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    const stack = store.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]!.kind).toBe('article');
    expect(stack[0]!.id).toBe(hashLayerId('article', { articleId: 'a1' }));
  });

  test('pops the Layer on unmount', () => {
    const store = createStackStore({ mountWindow: 3 });
    const Wrapper = makeWrapper(store);
    const { unmount } = render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    expect(store.getState().stack).toHaveLength(1);
    unmount();
    expect(store.getState().stack).toHaveLength(0);
  });

  test('re-mount of the same route component keeps the stack at length 1 (StrictMode safety)', () => {
    const store = createStackStore({ mountWindow: 3 });
    const Wrapper = makeWrapper(store);
    const { rerender } = render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    rerender(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    expect(store.getState().stack).toHaveLength(1);
  });

  test('idempotent push when the Layer is already in the stack', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'article', props: { articleId: 'a1' } });
    const beforeId = store.getState().stack[0]!.id;
    const Wrapper = makeWrapper(store);
    render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    const stack = store.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]!.id).toBe(beforeId);
  });

  test('pop on unmount is idempotent when the Layer was already dismissed', () => {
    const store = createStackStore({ mountWindow: 3 });
    const Wrapper = makeWrapper(store);
    const { unmount } = render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a1' }} />
      </Wrapper>,
    );
    const id = store.getState().stack[0]!.id;
    // Dismiss out-of-band via the FSM before unmount.
    store.dispatch(id, { type: 'DISMISS', source: 'programmatic', skipAnimation: true });
    expect(store.getState().stack).toHaveLength(0);
    // Unmount should not throw or re-create the layer.
    expect(() => unmount()).not.toThrow();
    expect(store.getState().stack).toHaveLength(0);
  });

  test('renders the top layer over a pre-hydrated below-top slice', () => {
    // Simulates the post-hydration state in a Next route file. State.ss was
    // hydrated synchronously; the route component then mounts and pushes the
    // top via useLayerRoute. Final stack id-sequence is [hash(a1), hash(a2)].
    const store = createStackStore({ mountWindow: 3 });
    store.hydrate([
      {
        id: hashLayerId('article', { articleId: 'a1' }),
        kind: 'article',
        phase: 'active',
        props: { articleId: 'a1' },
      },
    ]);
    const Wrapper = makeWrapper(store);
    render(
      <Wrapper>
        <RouteComponent kind="article" props={{ articleId: 'a2' }} />
      </Wrapper>,
    );
    const ids = store.getState().stack.map((l) => l.id);
    expect(ids).toEqual([
      hashLayerId('article', { articleId: 'a1' }),
      hashLayerId('article', { articleId: 'a2' }),
    ]);
  });
});
