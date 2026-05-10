import { describe, expect, mock, test } from 'bun:test';

import { SpringDriver } from '../index';

// Synchronous fake scheduler: callbacks fire when tick() is called
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
  const tickUntilEmpty = (deltaMs: number, maxIter = 200): void => {
    for (let i = 0; i < maxIter && pending.size > 0; i++) tick(deltaMs);
  };

  return { schedule, cancel, tick, tickUntilEmpty };
}

describe('SpringDriver', () => {
  test('calls onTick with initial "from" value on first frame', () => {
    const { schedule, cancel, tick } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);
    const ticks: number[] = [];

    driver.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0,
      (v) => ticks.push(v),
      () => {},
    );
    tick(0); // first frame at t=0
    expect(ticks[0]).toBeCloseTo(0, 0);
  });

  test('calls onComplete when spring settles at "to"', () => {
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);
    const onComplete = mock(() => {});

    driver.start({ duration: 0.5, bounce: 0 }, 0, 100, 0, () => {}, onComplete);
    tickUntilEmpty(16.67);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(driver.value).toBeCloseTo(100, 0);
  });

  test('value approaches "to" monotonically for critically-damped spring', () => {
    const { schedule, cancel, tick } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);
    const values: number[] = [];

    driver.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0,
      (v) => values.push(v),
      () => {},
    );
    for (let i = 0; i < 30; i++) tick(16.67);

    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]! - 0.01);
    }
  });

  test('stop() cancels the animation', () => {
    const { schedule, cancel, tick } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);
    const onComplete = mock(() => {});

    driver.start({ duration: 0.5, bounce: 0 }, 0, 100, 0, () => {}, onComplete);
    tick(16.67);
    driver.stop();
    // Further ticks should not fire onComplete
    for (let i = 0; i < 50; i++) tick(16.67);

    expect(onComplete).not.toHaveBeenCalled();
  });

  test('isRunning is true while animating, false after complete', () => {
    const { schedule, cancel, tickUntilEmpty } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);

    driver.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0,
      () => {},
      () => {},
    );
    expect(driver.isRunning).toBe(true);
    tickUntilEmpty(16.67);
    expect(driver.isRunning).toBe(false);
  });

  test('velocity is available for handoff when spring is interrupted', () => {
    const { schedule, cancel, tick } = makeFakeScheduler();
    const driver = new SpringDriver(schedule, cancel);

    driver.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0,
      () => {},
      () => {},
    );
    tick(50); // partway through
    driver.stop();

    // Velocity should be positive (moving toward 100) during undershoot
    expect(driver.velocity).toBeGreaterThan(0);
  });

  test('start() with initial velocity (v0) reaches target faster', () => {
    const { schedule, cancel, tick: tick1 } = makeFakeScheduler();
    const { schedule: s2, cancel: c2, tick: tick2 } = makeFakeScheduler();

    const withV0 = new SpringDriver(schedule, cancel);
    const withoutV0 = new SpringDriver(s2, c2);

    const valuesWithV0: number[] = [];
    const valuesWithout: number[] = [];

    withV0.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0.2,
      (v) => valuesWithV0.push(v),
      () => {},
    );
    withoutV0.start(
      { duration: 0.5, bounce: 0 },
      0,
      100,
      0,
      (v) => valuesWithout.push(v),
      () => {},
    );

    for (let i = 0; i < 10; i++) {
      tick1(16.67);
      tick2(16.67);
    }

    const lastWithV0 = valuesWithV0.at(-1) ?? 0;
    const lastWithout = valuesWithout.at(-1) ?? 0;
    expect(lastWithV0).toBeGreaterThan(lastWithout);
  });
});
