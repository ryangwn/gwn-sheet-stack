import { describe, expect, test } from 'bun:test';

import { MotionValue, springAt, springParams } from '../index';

describe('springParams', () => {
  test('critically-damped spring (bounce=0) has damping = 2*sqrt(k*m)', () => {
    const { mass: m, stiffness: k, damping: c } = springParams({ duration: 0.5, bounce: 0 });
    expect(m).toBe(1);
    // critically damped: zeta = 1 → c = 2*sqrt(k*m)
    expect(c).toBeCloseTo(2 * Math.sqrt(k * m), 5);
  });

  test('positive bounce yields under-damped spring (zeta < 1)', () => {
    const { mass: m, stiffness: k, damping: c } = springParams({ duration: 0.5, bounce: 0.3 });
    const zeta = c / (2 * Math.sqrt(k * m));
    expect(zeta).toBeLessThan(1);
  });

  test('negative bounce yields over-damped spring (zeta > 1)', () => {
    const { mass: m, stiffness: k, damping: c } = springParams({ duration: 0.5, bounce: -0.3 });
    const zeta = c / (2 * Math.sqrt(k * m));
    expect(zeta).toBeGreaterThan(1);
  });
});

describe('springAt', () => {
  const ios = { duration: 0.5, bounce: 0.0 }; // critically damped

  test('starts at "from" at t=0', () => {
    expect(springAt(ios, 0, 0, 100)).toBeCloseTo(0, 3);
    expect(springAt(ios, 0, 50, 200)).toBeCloseTo(50, 3);
  });

  test('settles to "to" at large t', () => {
    expect(springAt(ios, 10, 0, 100)).toBeCloseTo(100, 1);
    expect(springAt(ios, 10, -50, 200)).toBeCloseTo(200, 1);
  });

  test('moves monotonically toward "to" for critically-damped spring', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5].map((t) => springAt(ios, t, 0, 100));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  test('underdamped spring (bounce=0.3) overshoots target', () => {
    const bouncy = { duration: 0.5, bounce: 0.3 };
    const peak = Math.max(
      ...[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((t) => springAt(bouncy, t, 0, 100)),
    );
    expect(peak).toBeGreaterThan(100);
  });

  test('respects initial velocity v0', () => {
    // With v0 > 0 (moving toward target), reaches target faster
    const faster = springAt(ios, 0.2, 0, 100, 200);
    const normal = springAt(ios, 0.2, 0, 100, 0);
    expect(faster).toBeGreaterThan(normal);
  });
});

describe('MotionValue', () => {
  test('get() returns the initial value', () => {
    const mv = new MotionValue(42);
    expect(mv.get()).toBe(42);
  });

  test('set() updates the value', () => {
    const mv = new MotionValue(0);
    mv.set(99);
    expect(mv.get()).toBe(99);
  });

  test('subscribers are notified on set()', () => {
    const mv = new MotionValue(0);
    const calls: number[] = [];
    mv.subscribe((v) => calls.push(v));
    mv.set(1);
    mv.set(2);
    expect(calls).toEqual([1, 2]);
  });

  test('setting the same value does not notify', () => {
    const mv = new MotionValue(5);
    let count = 0;
    mv.subscribe(() => count++);
    mv.set(5);
    expect(count).toBe(0);
  });

  test('unsubscribe stops future notifications', () => {
    const mv = new MotionValue(0);
    let count = 0;
    const unsub = mv.subscribe(() => count++);
    mv.set(1);
    unsub();
    mv.set(2);
    expect(count).toBe(1);
  });
});
