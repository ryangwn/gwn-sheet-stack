import { describe, expect, mock, test } from 'bun:test';

import type { StackStore } from '../store/types';
import { LayerAnimation } from './LayerAnimation';
import type { AnimationSink, AnimationValues } from './types';

type StoreMock = Pick<StackStore, 'dispatch' | 'getState'>;

function makeFakeScheduler() {
  const pending = new Map<number, (t: number) => void>();
  let time = 0;
  let nextId = 1;
  const schedule = (cb: (t: number) => void): number => {
    const id = nextId++;
    pending.set(id, cb);
    return id;
  };
  const cancel = (id: number): void => {
    pending.delete(id);
  };
  const tick = (deltaMs: number): void => {
    time += deltaMs;
    const cbs = [...pending.values()];
    pending.clear();
    for (const cb of cbs) cb(time);
  };
  const tickUntilEmpty = (deltaMs: number, maxIter = 500): void => {
    for (let i = 0; i < maxIter && pending.size > 0; i++) tick(deltaMs);
  };
  return { schedule, cancel, tick, tickUntilEmpty };
}

function makeRecordingSink(): AnimationSink & { writes: AnimationValues[] } {
  const writes: AnimationValues[] = [];
  return {
    writes,
    write(values) {
      writes.push(values);
    },
  };
}

describe('LayerAnimation', () => {
  test('present dispatches PRESENTED on settle', () => {
    const dispatch = mock();
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const sink = makeRecordingSink();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      sink,
      schedule,
      cancel,
    );

    a.run({ kind: 'modal', direction: 'in', spring: { duration: 0.3, bounce: 0 } });
    tickUntilEmpty(16);

    expect(dispatch).toHaveBeenCalledWith('L1', { type: 'PRESENTED' });
  });

  test('dismiss dispatches DISMISSED on settle', () => {
    const dispatch = mock();
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'dismissing' }] }),
      } as unknown as StoreMock,
      'L1',
      makeRecordingSink(),
      schedule,
      cancel,
    );

    a.run({ kind: 'modal', direction: 'out', spring: { duration: 0.3, bounce: 0 } });
    tickUntilEmpty(16);

    expect(dispatch).toHaveBeenCalledWith('L1', { type: 'DISMISSED' });
  });

  test('run({ dispatch: false }) does not dispatch FSM event', () => {
    const dispatch = mock();
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      makeRecordingSink(),
      schedule,
      cancel,
    );

    a.run(
      { kind: 'push', direction: 'in', spring: { duration: 0.3, bounce: 0 } },
      { dispatch: false },
    );
    tickUntilEmpty(16);

    expect(dispatch).not.toHaveBeenCalled();
  });

  test('position reflects most recent published values', () => {
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const a = new LayerAnimation(
      {
        dispatch: () => {},
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      makeRecordingSink(),
      schedule,
      cancel,
    );

    expect(a.position).toBeNull();
    a.run({ kind: 'push', direction: 'in', spring: { duration: 0.3, bounce: 0 } });
    tickUntilEmpty(16);

    expect(a.position).toEqual({ kind: 'push', translatePct: 0, underlayProgress: 1 });
  });

  test('mid-flight dismiss starts from current position (no flicker)', () => {
    const dispatch = mock();
    const { schedule, cancel, tick } = makeFakeScheduler();
    const sink = makeRecordingSink();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      sink,
      schedule,
      cancel,
    );

    // Start enter; tick partway so we're at, say, ~50%.
    a.run({ kind: 'push', direction: 'in', spring: { duration: 0.5, bounce: 0 } });
    for (let i = 0; i < 8; i++) tick(16);

    const midProgress = (a.position as { kind: 'push'; underlayProgress: number }).underlayProgress;
    expect(midProgress).toBeGreaterThan(0);
    expect(midProgress).toBeLessThan(1);

    // Dismiss now. The first tick of the new spring should not snap back to 0
    // — it should continue from the live position.
    sink.writes.length = 0;
    a.run({ kind: 'push', direction: 'out', spring: { duration: 0.3, bounce: 0 } });
    tick(0); // first frame of new spring

    const firstAfter = sink.writes[0] as { kind: 'push'; underlayProgress: number };
    expect(firstAfter.underlayProgress).toBeCloseTo(midProgress, 1);
  });

  test('setLive updates position without dispatching', () => {
    const dispatch = mock();
    const sink = makeRecordingSink();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      sink,
      () => 1,
      () => {},
    );

    a.setLive({ kind: 'push', translatePct: 30, underlayProgress: 0.7 });

    expect(a.position).toEqual({ kind: 'push', translatePct: 30, underlayProgress: 0.7 });
    expect(sink.writes).toHaveLength(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('cancel stops the driver and prevents dispatch', () => {
    const dispatch = mock();
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const a = new LayerAnimation(
      {
        dispatch,
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      makeRecordingSink(),
      schedule,
      cancel,
    );

    a.run({ kind: 'modal', direction: 'in', spring: { duration: 0.3, bounce: 0 } });
    a.cancel();
    tickUntilEmpty(16);

    expect(dispatch).not.toHaveBeenCalled();
  });

  test('panel projects translatePct using sign for left side', () => {
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const sink = makeRecordingSink();
    const a = new LayerAnimation(
      {
        dispatch: () => {},
        getState: () => ({ stack: [{ id: 'L1', kind: 'k', phase: 'presenting' }] }),
      } as unknown as StoreMock,
      'L1',
      sink,
      schedule,
      cancel,
    );

    a.run({ kind: 'panel', direction: 'in', sign: -1, spring: { duration: 0.3, bounce: 0 } });
    tickUntilEmpty(16);

    // At rest: translatePct = sign * (1 - 1) * 100 = 0
    expect((a.position as { kind: 'panel'; translatePct: number }).translatePct).toBeCloseTo(0, 1);
    // First frame should be near -100 (offscreen left).
    const first = sink.writes[0] as { kind: 'panel'; translatePct: number };
    expect(first.translatePct).toBeLessThan(-50);
  });
});
