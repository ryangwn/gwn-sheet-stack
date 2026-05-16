import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { historyAdapter } from './historyAdapter';

const KEY = '__ss';

function resetLocation() {
  // happy-dom: reset URL + history.state between tests.
  window.history.replaceState(null, '', '/');
}

describe('historyAdapter — new schema (ADR 0002)', () => {
  beforeEach(resetLocation);
  afterEach(resetLocation);

  test('write stores below-top slice in history.state.ss', () => {
    const adapter = historyAdapter();
    adapter.write([
      { kind: 'article', props: { id: 'a1' } },
      { kind: 'article', props: { id: 'a2' } },
    ]);
    expect((window.history.state as { [KEY]?: unknown })[KEY]).toEqual([
      { kind: 'article', props: { id: 'a1' } },
    ]);
  });

  test('write never adds __ss to the URL search', () => {
    const adapter = historyAdapter();
    adapter.write([{ kind: 'a', props: { x: 1 } }]);
    expect(window.location.search).not.toContain(KEY);
  });

  test('write produces a URL with no __ss search param', () => {
    const adapter = historyAdapter();
    adapter.write([{ kind: 'a' }]);
    // Even after a write that previously would have set ?__ss=…, the URL
    // never carries the param under the new schema.
    expect(new URL(window.location.href).searchParams.get(KEY)).toBeNull();
  });

  test('read returns the below-top slice from history.state.ss', () => {
    const adapter = historyAdapter();
    adapter.write([
      { kind: 'article', props: { id: 'a1' } },
      { kind: 'article', props: { id: 'a2' } },
    ]);
    expect(adapter.read()).toEqual([{ kind: 'article', props: { id: 'a1' } }]);
  });

  test('read tolerates a fresh URL with no state', () => {
    const adapter = historyAdapter();
    expect(adapter.read()).toEqual([]);
  });

  test('write preserves other keys on history.state', () => {
    window.history.replaceState({ otherApp: { x: 1 } }, '', '/');
    const adapter = historyAdapter();
    adapter.write([{ kind: 'a' }]);
    const s = window.history.state as Record<string, unknown>;
    expect(s.otherApp).toEqual({ x: 1 });
    expect(s[KEY]).toEqual([]);
  });

  test('write with empty stack produces an empty below-top slice', () => {
    const adapter = historyAdapter();
    adapter.write([]);
    expect((window.history.state as { [KEY]?: unknown })[KEY]).toEqual([]);
  });
});
