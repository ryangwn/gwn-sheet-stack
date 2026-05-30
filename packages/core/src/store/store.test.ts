import { describe, expect, mock, test } from 'bun:test';

import { LRUMountWindow, createStackStore, hashLayerId, renderModeFor } from '../index';

describe('renderModeFor', () => {
  test('topmost layer (indexFromTop=0) is always visible', () => {
    expect(renderModeFor(0, 'sheet', 3)).toBe('visible');
    expect(renderModeFor(0, 'push', 3)).toBe('visible');
    expect(renderModeFor(0, 'panel', 3)).toBe('visible');
  });

  test('layer outside mount window is unmounted', () => {
    expect(renderModeFor(3, 'sheet', 3)).toBe('unmount');
    expect(renderModeFor(5, 'push', 3)).toBe('unmount');
  });

  test('immediate underlay behind a push is visible (parallax/dim continuity)', () => {
    expect(renderModeFor(1, 'push', 3)).toBe('visible');
  });

  test('depth-1 behind a sheet or modal is visible', () => {
    expect(renderModeFor(1, 'sheet', 3)).toBe('visible');
    expect(renderModeFor(1, 'modal', 3)).toBe('visible');
  });

  test('behind a panel is always visible (panel slides over)', () => {
    expect(renderModeFor(1, 'panel', 3)).toBe('visible');
    expect(renderModeFor(2, 'panel', 3)).toBe('visible');
  });
});

describe('LRUMountWindow', () => {
  test('touch makes an id mounted within the window', () => {
    const lru = new LRUMountWindow(3);
    lru.touch('a');
    expect(lru.isMounted('a')).toBe(true);
  });

  test('isMounted returns false for ids beyond the window size', () => {
    const lru = new LRUMountWindow(2);
    lru.touch('a');
    lru.touch('b');
    lru.touch('c');
    expect(lru.isMounted('c')).toBe(true);
    expect(lru.isMounted('b')).toBe(true);
    expect(lru.isMounted('a')).toBe(false);
  });

  test('computeOverflow returns ids outside the window', () => {
    const lru = new LRUMountWindow(2);
    lru.touch('a');
    lru.touch('b');
    lru.touch('c');
    expect(lru.computeOverflow()).toEqual(['a']);
  });

  test('forget removes an id from tracking', () => {
    const lru = new LRUMountWindow(3);
    lru.touch('a');
    lru.forget('a');
    expect(lru.isMounted('a')).toBe(false);
    expect(lru.computeOverflow()).toEqual([]);
  });
});

describe('createStackStore', () => {
  test('starts with an empty stack', () => {
    const store = createStackStore({ mountWindow: 3 });
    expect(store.getState().stack).toEqual([]);
  });

  test('push adds a layer in phase "mounting"', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const { stack } = store.getState();
    expect(stack).toHaveLength(1);
    expect(stack[0]!.phase).toBe('mounting');
    expect(stack[0]!.kind).toBe('demo');
  });

  test('subscribe fires after push', () => {
    const store = createStackStore({ mountWindow: 3 });
    let calls = 0;
    store.subscribe(() => calls++);
    store.push({ kind: 'demo' });
    expect(calls).toBe(1);
  });

  test('dispatch MOUNTED moves mounting → presenting', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    expect(store.getState().stack[0]!.phase).toBe('presenting');
  });

  test('invalid transition throws in dev', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    // mounting has no PRESENTED edge
    expect(() => store.dispatch(id, { type: 'PRESENTED' })).toThrow();
  });

  test('push({replace}) dismisses prev top and fires its resolver', async () => {
    const store = createStackStore({ mountWindow: 3 });
    const aPromise = store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b', replace: true });
    // skipAnimation: true means DISMISSED fires synchronously — no adapter wait.
    await expect(aPromise).resolves.toBeUndefined();
    const stack = store.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]!.kind).toBe('b');
  });

  test('DISMISSED splices the layer from the stack', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.dispatch(bId, { type: 'DISMISS', source: 'programmatic' });
    expect(store.getState().stack).toHaveLength(2);
    store.dispatch(bId, { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(1);
    expect(store.getState().stack[0]!.kind).toBe('a');
  });

  test('await push resolves with pop result after DISMISSED', async () => {
    const store = createStackStore({ mountWindow: 3 });
    const promise = store.push<{ choice: string }>({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.pop({ choice: 'ok' });
    // Adapter normally fires DISMISSED after dismiss animation completes.
    store.dispatch(id, { type: 'DISMISSED' });
    await expect(promise).resolves.toEqual({ choice: 'ok' });
  });

  test('duplicate MOUNTED is a no-op (StrictMode safety)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    expect(() => store.dispatch(id, { type: 'MOUNTED' })).not.toThrow();
    expect(store.getState().stack[0]!.phase).toBe('presenting');
  });

  test('invalid transition is a no-op in prod (dev: false)', () => {
    const store = createStackStore({ mountWindow: 3, dev: false });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    expect(() => store.dispatch(id, { type: 'PRESENTED' })).not.toThrow();
    expect(store.getState().stack[0]!.phase).toBe('mounting');
  });

  test('dispatch FOREGROUND moves background → active', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    expect(store.getState().stack[0]!.phase).toBe('background');
    store.dispatch(aId, { type: 'FOREGROUND' });
    expect(store.getState().stack[0]!.phase).toBe('active');
  });

  test('push sends BACKGROUND to previous active top', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    expect(store.getState().stack[0]!.phase).toBe('background');
  });

  test('dispatch PRESENTED moves presenting → active', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'demo' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    expect(store.getState().stack[0]!.phase).toBe('active');
  });

  test('popTo animates the topmost and sync-dismisses middle layers with source:popped-past', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' });
    const cId = store.getState().stack[2]!.id;
    store.dispatch(cId, { type: 'MOUNTED' });
    store.dispatch(cId, { type: 'PRESENTED' });
    store.popTo(aId);
    // b (middle) spliced immediately via skipAnimation
    // c (topmost) in dismissing phase waiting for animation
    const stack = store.getState().stack;
    expect(stack).toHaveLength(2); // a + c (b already spliced)
    expect(stack[1]!.phase).toBe('dismissing'); // c animating out
    store.dispatch(cId, { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(1);
    expect(store.getState().stack[0]!.kind).toBe('a');
  });

  test('popToRoot pops everything above the first layer', async () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.popToRoot();
    const stack = store.getState().stack;
    expect(stack[0]!.kind).toBe('a');
    expect(stack[stack.length - 1]!.phase).toBe('dismissing'); // top is animating out
  });

  test('dismissAll dismisses every layer in reverse order', async () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.dismissAll();
    // Both should be in dismissing phase (no skipAnimation, so not yet spliced)
    const stack = store.getState().stack;
    expect(stack.every((l) => l.phase === 'dismissing')).toBe(true);
  });

  test('hydrate replaces the stack and notifies subscribers', () => {
    const store = createStackStore({ mountWindow: 3 });
    let calls = 0;
    store.subscribe(() => calls++);
    // Content-addressed (ADR 0002): hydrate re-derives ids from (kind, props);
    // caller-supplied ids are ignored to keep the invariant uniform with push.
    const layers: import('../index').Layer[] = [
      { id: 'ignored-h1', kind: 'settings', phase: 'active' },
      { id: 'ignored-h2', kind: 'profile', phase: 'background' },
    ];
    store.hydrate(layers);
    expect(store.getState().stack).toHaveLength(2);
    expect(store.getState().stack[0]!.id).toBe(hashLayerId('settings', undefined));
    expect(store.getState().stack[1]!.id).toBe(hashLayerId('profile', undefined));
    expect(calls).toBe(1);
  });

  test('push stores props on the layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'profile', props: { userId: '42' } });
    expect(store.getState().stack[0]!.props).toEqual({ userId: '42' });
  });

  test('serialize includes props in the output', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'profile', props: { userId: '42' } });
    const id = store.getState().stack[0]!.id;
    expect(store.serialize()[0]).toEqual({
      id,
      kind: 'profile',
      phase: 'mounting',
      props: { userId: '42' },
    });
  });

  test('serialize returns plain layer objects without internal fields', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'settings' });
    const id = store.getState().stack[0]!.id;
    const serialized = store.serialize();
    expect(serialized).toHaveLength(1);
    expect(serialized[0]).toEqual({ id, kind: 'settings', phase: 'mounting' });
    expect('resolve' in serialized[0]!).toBe(false);
  });

  test('serialize returns empty array for an empty stack', () => {
    const store = createStackStore({ mountWindow: 3 });
    expect(store.serialize()).toEqual([]);
  });

  test('hydrate resets the stack when given an empty array', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    store.hydrate([]);
    expect(store.getState().stack).toHaveLength(0);
  });

  test('dispatch DISMISS moves mounting → dismissing (race: unmount before MOUNTED)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    expect(store.getState().stack[0]!.phase).toBe('mounting');
    store.dispatch(id, { type: 'DISMISS', source: 'programmatic' });
    expect(store.getState().stack[0]!.phase).toBe('dismissing');
  });

  test('dispatch DISMISS moves background → dismissing', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' }); // a → background
    store.dispatch(aId, { type: 'DISMISS', source: 'programmatic' });
    expect(store.getState().stack[0]!.phase).toBe('dismissing');
  });

  test('dispatch DISMISS moves dragging → dismissing', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'DRAG_START' });
    store.dispatch(id, { type: 'DISMISS', source: 'user' });
    expect(store.getState().stack[0]!.phase).toBe('dismissing');
  });

  test('dispatch DISMISS moves snapping → dismissing', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'SNAP', detentId: 'large', animated: true });
    store.dispatch(id, { type: 'DISMISS', source: 'user' });
    expect(store.getState().stack[0]!.phase).toBe('dismissing');
  });

  test('dispatch DISMISS moves evicted → dismissing', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' }); // a → background
    store.dispatch(aId, { type: 'EVICT' }); // a → evicted
    store.dispatch(aId, { type: 'DISMISS', source: 'programmatic' });
    expect(store.getState().stack[0]!.phase).toBe('dismissing');
  });

  test('popTo sync-dismisses evicted middle layers (§A.3)', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' });
    const cId = store.getState().stack[2]!.id;
    store.dispatch(cId, { type: 'MOUNTED' });
    store.dispatch(cId, { type: 'PRESENTED' });
    // evict 'a' (outside window of 2)
    store.dispatch(aId, { type: 'EVICT' });
    expect(store.getState().stack[0]!.phase).toBe('evicted');
    store.popTo(aId);
    // b (evicted/middle) → spliced immediately
    // c (topmost) → dismissing (animated)
    const stack = store.getState().stack;
    expect(stack).toHaveLength(2); // a + c
    expect(stack[1]!.phase).toBe('dismissing');
    store.dispatch(cId, { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(1);
    expect(store.getState().stack[0]!.id).toBe(aId);
  });

  test('snap sends SNAP event to the target layer', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.snap(id, 'large');
    expect(store.getState().stack[0]!.phase).toBe('snapping');
  });

  test('reportMemoryWarning evicts background layers beyond the mount window', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c' });
    const cId = store.getState().stack[2]!.id;
    store.dispatch(cId, { type: 'MOUNTED' });
    store.dispatch(cId, { type: 'PRESENTED' });
    // 'a' is beyond window of 2 (b and c are in window)
    store.reportMemoryWarning();
    expect(store.getState().stack[0]!.phase).toBe('evicted');
    expect(store.getState().stack[1]!.phase).toBe('background');
  });

  test('dispatch EVICT moves background → evicted', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' }); // moves a to background
    store.dispatch(aId, { type: 'EVICT' });
    expect(store.getState().stack[0]!.phase).toBe('evicted');
  });

  test('dispatch REVIVE moves evicted → mounting', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    store.dispatch(aId, { type: 'EVICT' });
    store.dispatch(aId, { type: 'REVIVE' });
    expect(store.getState().stack[0]!.phase).toBe('mounting');
  });

  test('dispatch DRAG_START moves active → dragging', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'DRAG_START' });
    expect(store.getState().stack[0]!.phase).toBe('dragging');
  });

  test('dispatch DRAG_START moves presenting → dragging', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'DRAG_START' });
    expect(store.getState().stack[0]!.phase).toBe('dragging');
  });

  test('dispatch DRAG_END moves dragging → snapping', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'DRAG_START' });
    store.dispatch(id, { type: 'DRAG_END', targetDetentId: 'large' });
    expect(store.getState().stack[0]!.phase).toBe('snapping');
  });

  test('dispatch SNAP moves active → snapping', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'SNAP', detentId: 'large', animated: true });
    expect(store.getState().stack[0]!.phase).toBe('snapping');
  });

  test('dispatch SNAPPED moves snapping → active', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'SNAP', detentId: 'large', animated: true });
    store.dispatch(id, { type: 'SNAPPED' });
    expect(store.getState().stack[0]!.phase).toBe('active');
  });

  test('dispatch DRAG_START from snapping → dragging (catch a settling sheet)', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, { type: 'SNAP', detentId: 'large', animated: true });
    store.dispatch(id, { type: 'DRAG_START' });
    expect(store.getState().stack[0]!.phase).toBe('dragging');
  });

  test('push({reset}) dismisses all existing layers and resolves their promises', async () => {
    const store = createStackStore({ mountWindow: 3 });
    const aPromise = store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    store.dispatch(bId, { type: 'MOUNTED' });
    store.dispatch(bId, { type: 'PRESENTED' });
    store.push({ kind: 'c', reset: true });
    const stack = store.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]!.kind).toBe('c');
    await expect(aPromise).resolves.toBeUndefined();
  });

  test('push({replace}) dispatches DISMISS source:replaced to prev top (not bypassing FSM)', async () => {
    const store = createStackStore({ mountWindow: 3 });
    const aPromise = store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    store.dispatch(aId, { type: 'MOUNTED' });
    store.dispatch(aId, { type: 'PRESENTED' });
    let dismissingPhaseObserved = false;
    const unsub = store.subscribe(() => {
      const a = store.getState().stack.find((l) => l.id === aId);
      if (a?.phase === 'dismissing') dismissingPhaseObserved = true;
    });
    store.push({ kind: 'b', replace: true });
    unsub();
    expect(dismissingPhaseObserved).toBe(true);
    await expect(aPromise).resolves.toBeUndefined();
  });

  test('dispatch DISMISS with skipAnimation:true splices layer and resolves promise immediately', async () => {
    const store = createStackStore({ mountWindow: 3 });
    const promise = store.push<string>({ kind: 'a' });
    const id = store.getState().stack[0]!.id;
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
    store.dispatch(id, {
      type: 'DISMISS',
      source: 'replaced',
      skipAnimation: true,
      result: 'done',
    });
    expect(store.getState().stack).toHaveLength(0);
    await expect(promise).resolves.toBe('done');
  });
});

describe('maxDepth (#13)', () => {
  test('push() no-ops when stack.length >= maxDepth', () => {
    const store = createStackStore({ mountWindow: 5, maxDepth: 2 });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' });
    store.push({ kind: 'c' }); // exceeds maxDepth=2
    expect(store.getState().stack).toHaveLength(2);
  });

  test('push() emits dev warning when maxDepth exceeded', () => {
    const warn = mock(() => {});
    const origWarn = console.warn;
    console.warn = warn;
    const store = createStackStore({ mountWindow: 5, maxDepth: 1, dev: true });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' }); // exceeds
    console.warn = origWarn;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('push() allows up to exactly maxDepth layers', () => {
    const store = createStackStore({ mountWindow: 5, maxDepth: 3 });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' });
    store.push({ kind: 'c' });
    expect(store.getState().stack).toHaveLength(3);
  });

  test('DISMISSED auto-promotes new top from background → active', () => {
    const store = createStackStore({ mountWindow: 10, maxDepth: 10 });
    store.push({ kind: 'a' });
    store.push({ kind: 'b' });
    store.push({ kind: 'c' });
    // Walk all layers through their lifecycles.
    for (const l of store.getState().stack) {
      store.dispatch(l.id, { type: 'MOUNTED' });
      store.dispatch(l.id, { type: 'PRESENTED' });
    }
    // Manually background the older layers (push() doesn't currently dispatch
    // BACKGROUND for the previous top — that's a separate gap; here we
    // simulate the steady state).
    const stack = store.getState().stack;
    store.dispatch(stack[0]!.id, { type: 'BACKGROUND' });
    store.dispatch(stack[1]!.id, { type: 'BACKGROUND' });
    expect(store.getState().stack[2]!.phase).toBe('active');
    expect(store.getState().stack[1]!.phase).toBe('background');

    // Pop top: c dismisses, b should auto-foreground.
    store.dispatch(stack[2]!.id, { type: 'DISMISS', source: 'programmatic' });
    store.dispatch(stack[2]!.id, { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(2);
    expect(store.getState().stack[1]!.phase).toBe('active');

    // Pop again: b dismisses, a should auto-foreground.
    store.dispatch(stack[1]!.id, { type: 'DISMISS', source: 'programmatic' });
    store.dispatch(stack[1]!.id, { type: 'DISMISSED' });
    expect(store.getState().stack).toHaveLength(1);
    expect(store.getState().stack[0]!.phase).toBe('active');
  });
});

describe('LRU eviction pipeline (#12)', () => {
  function activate(store: ReturnType<typeof createStackStore>, id: string) {
    store.dispatch(id, { type: 'MOUNTED' });
    store.dispatch(id, { type: 'PRESENTED' });
  }

  test('push() auto-evicts layers outside mount window', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    // pushing c → a falls outside window of 2 (b, c in window) → auto-EVICT
    store.push({ kind: 'c' });
    expect(store.getState().stack[0]!.phase).toBe('evicted');
  });

  test('push() does not evict layers still inside window', () => {
    const store = createStackStore({ mountWindow: 3 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    store.push({ kind: 'c' });
    // window=3, all 3 layers fit → none evicted
    expect(store.getState().stack[0]!.phase).not.toBe('evicted');
  });

  test('reportMemoryWarning("warning") evicts down to top 2', () => {
    const store = createStackStore({ mountWindow: 5 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    store.push({ kind: 'c' });
    const cId = store.getState().stack[2]!.id;
    activate(store, cId);

    store.reportMemoryWarning('warning');

    // only top 2 (b, c) survive; a evicted
    expect(store.getState().stack[0]!.phase).toBe('evicted');
    expect(store.getState().stack[1]!.phase).toBe('background');
    expect(store.getState().stack[2]!.phase).toBe('active');
  });

  test('reportMemoryWarning("critical") evicts down to top 1', () => {
    const store = createStackStore({ mountWindow: 5 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    store.push({ kind: 'c' });
    const cId = store.getState().stack[2]!.id;
    activate(store, cId);

    store.reportMemoryWarning('critical');

    expect(store.getState().stack[0]!.phase).toBe('evicted');
    expect(store.getState().stack[1]!.phase).toBe('evicted');
    expect(store.getState().stack[2]!.phase).toBe('active');
  });

  test('REVIVE → MOUNTED restores snapshot on layer', () => {
    const store = createStackStore({ mountWindow: 2 });
    store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    // register provider
    store.registerSnapshotProvider(aId, 'scroll', {
      capture: () => 42,
      restore: () => {},
      triggers: ['evicted'],
    });
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    // push c → a overflows → EVICT
    store.push({ kind: 'c' });
    expect(store.getState().stack[0]!.phase).toBe('evicted');
    expect(store.getState().stack[0]!.snapshot).toMatchObject({ scroll: 42 });

    // revive a
    store.dispatch(aId, { type: 'REVIVE' });
    expect(store.getState().stack[0]!.phase).toBe('mounting');
    store.dispatch(aId, { type: 'MOUNTED' });
    // after MOUNTED from REVIVE, snapshot cleared when active
    store.dispatch(aId, { type: 'PRESENTED' });
    expect(store.getState().stack[0]!.snapshot).toBeUndefined();
  });

  test('promise from push() still resolves when evicted layer later dismissed', async () => {
    const store = createStackStore({ mountWindow: 2 });
    const aPromise = store.push({ kind: 'a' });
    const aId = store.getState().stack[0]!.id;
    activate(store, aId);
    store.push({ kind: 'b' });
    const bId = store.getState().stack[1]!.id;
    activate(store, bId);
    // push c → a evicted
    store.push({ kind: 'c' });
    expect(store.getState().stack[0]!.phase).toBe('evicted');

    // dismiss evicted a
    store.dispatch(aId, { type: 'DISMISS', source: 'popped-past', skipAnimation: true });
    await expect(aPromise).resolves.toBeUndefined();
  });
});
