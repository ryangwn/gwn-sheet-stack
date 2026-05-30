import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { historyAdapter } from './history-adapter';

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

  test('ephemeral top is kept in state.ss (URL does not imply it)', () => {
    const adapter = historyAdapter();
    adapter.write([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'confirm-delete', flavor: 'ephemeral' },
    ]);
    expect((window.history.state as { [KEY]?: unknown })[KEY]).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'confirm-delete', flavor: 'ephemeral' },
    ]);
  });

  test('route-bound top is stripped (URL implies it)', () => {
    const adapter = historyAdapter();
    adapter.write([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'article', props: { id: 'a2' }, flavor: 'route-bound' },
    ]);
    expect((window.history.state as { [KEY]?: unknown })[KEY]).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
    ]);
  });

  test('ephemeral push leaves the URL unchanged', () => {
    const adapter = historyAdapter();
    const before = window.location.href;
    adapter.write([{ kind: 'confirm-delete', flavor: 'ephemeral' }]);
    expect(window.location.href).toBe(before);
  });
});

describe('historyAdapter — route table', () => {
  beforeEach(resetLocation);
  afterEach(resetLocation);

  const articleRoute = {
    pattern: '/articles/:id',
    kind: 'article' as const,
    extract: (params: Record<string, string>) => ({ id: params.id }),
    build: (props: unknown) => `/articles/${(props as { id: string }).id}`,
  };

  test('write sets URL via build() for the top route-bound layer', () => {
    const adapter = historyAdapter({ routes: [articleRoute] });
    adapter.write([{ kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' }]);
    expect(window.location.pathname).toBe('/articles/a1');
  });

  test('read reconstructs the top layer from a matching pathname', () => {
    window.history.replaceState(null, '', '/articles/a1');
    const adapter = historyAdapter({ routes: [articleRoute] });
    expect(adapter.read()).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
    ]);
  });

  test('read returns just state.ss when pathname does not match any route', () => {
    window.history.replaceState(null, '', '/');
    const adapter = historyAdapter({ routes: [articleRoute] });
    expect(adapter.read()).toEqual([]);
  });

  test('round-trip: write then read produces an equivalent stack', () => {
    const adapter = historyAdapter({ routes: [articleRoute] });
    adapter.write([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'article', props: { id: 'a2' }, flavor: 'route-bound' },
    ]);
    expect(adapter.read()).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'article', props: { id: 'a2' }, flavor: 'route-bound' },
    ]);
  });

  test('pattern matches with a trailing slash', () => {
    window.history.replaceState(null, '', '/articles/a1/');
    const adapter = historyAdapter({ routes: [articleRoute] });
    expect(adapter.read()).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
    ]);
  });

  test('ephemeral top does not overwrite a route-bound URL', () => {
    const adapter = historyAdapter({ routes: [articleRoute] });
    // First write establishes the route-bound URL.
    adapter.write([{ kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' }]);
    expect(window.location.pathname).toBe('/articles/a1');
    // Second write pushes an ephemeral on top — URL must stay put because the
    // top is no longer URL-shaped.
    adapter.write([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'confirm-delete', flavor: 'ephemeral' },
    ]);
    expect(window.location.pathname).toBe('/articles/a1');
    expect((window.history.state as { __ss?: unknown }).__ss).toEqual([
      { kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' },
      { kind: 'confirm-delete', flavor: 'ephemeral' },
    ]);
  });

  test('write never sets __ss query param even with routes configured', () => {
    const adapter = historyAdapter({ routes: [articleRoute] });
    adapter.write([{ kind: 'article', props: { id: 'a1' }, flavor: 'route-bound' }]);
    expect(new URL(window.location.href).searchParams.get(KEY)).toBeNull();
  });
});
