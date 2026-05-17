import { describe, expect, test } from 'bun:test';

import {
  createStackStore,
  hashLayerId,
  stableStringify,
  validateSerializableProps,
} from '../index';

describe('stableStringify', () => {
  test('produces same output regardless of key order', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  test('handles nested objects with sorted keys at every level', () => {
    const a = stableStringify({ outer: { y: 2, x: 1 }, top: 'k' });
    const b = stableStringify({ top: 'k', outer: { x: 1, y: 2 } });
    expect(a).toBe(b);
  });

  test('preserves array order', () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  test('null and undefined are distinct', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe('undefined');
  });
});

describe('hashLayerId', () => {
  test('same kind + same props (key order irrelevant) → same id', () => {
    expect(hashLayerId('article', { id: 'a1', q: 1 })).toBe(
      hashLayerId('article', { q: 1, id: 'a1' }),
    );
  });

  test('different props → different ids', () => {
    expect(hashLayerId('article', { id: 'a1' })).not.toBe(hashLayerId('article', { id: 'a2' }));
  });

  test('different kinds → different ids', () => {
    expect(hashLayerId('article', { id: 'a1' })).not.toBe(hashLayerId('post', { id: 'a1' }));
  });

  test('undefined props is allowed and stable', () => {
    expect(hashLayerId('a', undefined)).toBe(hashLayerId('a', undefined));
    expect(hashLayerId('a', undefined)).not.toBe(hashLayerId('a', null));
  });
});

describe('validateSerializableProps', () => {
  test('accepts primitives, plain objects, arrays', () => {
    expect(() => validateSerializableProps(undefined)).not.toThrow();
    expect(() => validateSerializableProps(null)).not.toThrow();
    expect(() => validateSerializableProps({ a: 1, b: 'two', c: [3, 4, null] })).not.toThrow();
  });

  test('rejects functions', () => {
    expect(() => validateSerializableProps({ cb: () => {} })).toThrow(/function/);
  });

  test('rejects Dates', () => {
    expect(() => validateSerializableProps({ when: new Date() })).toThrow(/Date/);
  });

  test('rejects class instances', () => {
    class Foo {}
    expect(() => validateSerializableProps({ x: new Foo() })).toThrow();
  });

  test('rejects BigInt and Symbol', () => {
    expect(() => validateSerializableProps({ n: 1n })).toThrow(/bigint/);
    expect(() => validateSerializableProps({ s: Symbol('x') })).toThrow(/symbol/);
  });

  test('error message includes the path of the bad field', () => {
    expect(() => validateSerializableProps({ outer: { inner: () => {} } })).toThrow(/outer\.inner/);
  });
});

describe('content-addressed Layer id in store', () => {
  test('push generates id = hashLayerId(kind, props)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'article', props: { id: 'a1' } });
    const layer = store.getState().stack[0]!;
    expect(layer.id).toBe(hashLayerId('article', { id: 'a1' }));
  });

  test('two pushes of (kind, props) with different key order produce the same id', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'article', props: { id: 'a1', q: 'x' } });
    const first = store.getState().stack[0]!.id;
    // dedup will move it to top (already top here); confirm id stable.
    store.push({ kind: 'article', props: { q: 'x', id: 'a1' } });
    const stack = store.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]!.id).toBe(first);
  });

  test('pushing a duplicate (kind, props) does not add a second layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'article', props: { id: 'a1' } });
    store.push({ kind: 'article', props: { id: 'a1' } });
    expect(store.getState().stack).toHaveLength(1);
  });

  test('pushing a duplicate that lives deeper in the stack brings it to top via popTo', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'article', props: { id: 'a1' } });
    const a1Id = store.getState().stack[0]!.id;
    store.dispatch(a1Id, { type: 'MOUNTED' });
    store.dispatch(a1Id, { type: 'PRESENTED' });
    store.push({ kind: 'article', props: { id: 'a2' } });
    const a2Id = store.getState().stack[1]!.id;
    store.dispatch(a2Id, { type: 'MOUNTED' });
    store.dispatch(a2Id, { type: 'PRESENTED' });
    expect(store.getState().stack).toHaveLength(2);

    // Re-push a1 — should pop a2 (animating) and leave a1 on top.
    store.push({ kind: 'article', props: { id: 'a1' } });
    const stack = store.getState().stack;
    expect(stack[stack.length - 1]!.phase).toBe('dismissing');
    expect(stack[stack.length - 1]!.id).toBe(a2Id);
  });

  test('push throws when props contain a function', () => {
    const store = createStackStore({ mountWindow: 3 });
    expect(() => store.push({ kind: 'a', props: { cb: () => {} } })).toThrow();
  });

  test('snapshot survives evict → revive round-trip via stable id', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'article', props: { id: 'a1' } });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    let captureCount = 0;
    let restored: unknown = null;
    store.registerSnapshotProvider(aId, 'scroll', {
      capture: () => {
        captureCount += 1;
        return 42;
      },
      restore: (v) => {
        restored = v;
      },
      triggers: ['evicted'],
    });

    store.push({ kind: 'article', props: { id: 'a2' } });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    // push 'c' → 'a' evicted (mountWindow 2)
    store.push({ kind: 'article', props: { id: 'a3' } });
    expect(store.getState().stack[0]!.phase).toBe('evicted');
    expect(captureCount).toBe(1);
    expect(store.getState().stack[0]!.snapshot).toMatchObject({ scroll: 42 });

    // The evicted layer id is the content-addressed hash and survives.
    expect(store.getState().stack[0]!.id).toBe(hashLayerId('article', { id: 'a1' }));

    // Revive: id matches, restore fires
    store.dispatch(aId, { type: 'REVIVE' });
    store.dispatch(aId, { type: 'MOUNTED' });
    expect(restored).toBe(42);
  });
});
