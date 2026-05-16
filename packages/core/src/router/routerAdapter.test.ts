import { describe, expect, mock, test } from 'bun:test';

import { createStackStore } from '../index';
import type { RouterAdapter, SerializedLayer } from '../index';

function makeMockAdapter(initial: SerializedLayer[] = []): RouterAdapter & {
  written: SerializedLayer[][];
  triggerPopState: (s: SerializedLayer[]) => void;
} {
  const written: SerializedLayer[][] = [];
  let popCb: ((s: SerializedLayer[]) => void) | null = null;

  return {
    written,
    triggerPopState(s) {
      popCb?.(s);
    },
    read: () => initial,
    write: (stack) => written.push(stack),
    onPopState: (cb) => {
      popCb = cb;
      return () => {
        popCb = null;
      };
    },
    pushHistory: mock(() => {}),
  };
}

describe('RouterAdapter wiring', () => {
  test('adapter.write() fires once on push (shape-diff cadence)', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    // Only the push changes shape — mounting → presenting → active doesn't.
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    expect(adapter.written).toHaveLength(1);
  });

  test('adapter.write() fires again on user DISMISS (shape changes)', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'DISMISS', source: 'user' });
    store.dispatch(id, { type: 'DISMISSED' });
    // 1 for push, 1 for dismiss splice.
    expect(adapter.written).toHaveLength(2);
  });

  test('adapter.write() does NOT echo back on router-driven dismiss', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    const initialWrites = adapter.written.length;
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'DISMISS', source: 'router' });
    store.dispatch(id, { type: 'DISMISSED' });
    // Router source means history is already authoritative; no echo write.
    expect(adapter.written.length).toBe(initialWrites);
  });

  test('replace push coalesces splice + add into a single write', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    const before = adapter.written.length;
    store.push({ kind: 'b', replace: true });
    expect(adapter.written.length - before).toBe(1);
  });

  test('write payload is the full stack as {kind, props}', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'article', props: { id: 'a1' } });
    store.push({ kind: 'article', props: { id: 'a2' } });
    const lastWrite = adapter.written[adapter.written.length - 1]!;
    expect(lastWrite).toEqual([
      { kind: 'article', props: { id: 'a1' } },
      { kind: 'article', props: { id: 'a2' } },
    ]);
  });

  test('adapter.pushHistory() called on push (new layer → new history entry)', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    expect((adapter.pushHistory as ReturnType<typeof mock>).mock.calls.length).toBe(1);
  });

  test('onPopState with shorter stack pops layers until aligned', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    expect(store.getState().stack).toHaveLength(2);

    // back button → 1-entry stack
    adapter.triggerPopState([{ kind: 'a' }]);

    // top layer should be dismissing (or already gone via skipAnimation)
    const stack = store.getState().stack;
    const b = stack.find((l) => l.id === bId);
    expect(b === undefined || b.phase === 'dismissing').toBe(true);
  });

  test('hydrate() marks layers with hydrated:true', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.hydrate([{ id: 'L1', kind: 'a', phase: 'active' }]);
    expect((store.getState().stack[0] as unknown as { hydrated?: boolean }).hydrated).toBe(true);
  });

  test('hydrated layers have no resolve (promise never settles)', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.hydrate([{ id: 'L1', kind: 'a', phase: 'active' }]);
    void store.getState().stack[0]!;
    // No resolve → dispatching DISMISSED should not throw and stack empties
    store.dispatch('L1', { type: 'DISMISS', source: 'router' });
    store.dispatch('L1', { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(0);
  });

  test('serialize() only includes serializable layer fields', () => {
    const adapter = makeMockAdapter();
    const store = createStackStore({ mountWindow: 3, router: adapter });
    store.push({ kind: 'demo', props: { x: 1 } });
    const serialized = store.serialize();
    expect(serialized[0]).toMatchObject({ kind: 'demo' });
    expect((serialized[0] as unknown as { resolve?: unknown }).resolve).toBeUndefined();
  });
});
