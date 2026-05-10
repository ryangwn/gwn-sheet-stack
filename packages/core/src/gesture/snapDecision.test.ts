import { describe, expect, test } from 'bun:test';

import { chooseSnapTarget, decidePushGesture, rubberBand } from '../index';

const detents = [
  { id: 'collapsed', size: 0.3 as const },
  { id: 'half', size: 0.6 as const },
  { id: 'full', size: 1.0 as const },
];

const config = {
  dismissVelocityThreshold: 0.4,
  snapVelocityThreshold: 0.3,
  decayCoef: 200,
};

describe('chooseSnapTarget', () => {
  test('Rule 1: dismiss flick — downward velocity past threshold returns dismiss', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'half' },
      { v: 0.5, y: 200, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'dismiss' });
  });

  test('Rule 1: no dismiss when not dismissible', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'half' },
      { v: 0.5, y: 200, containerHeight: 300 },
      config,
    );
    expect(result.kind).not.toBe('dismiss');
  });

  test('Rule 1: no dismiss when y < halfway', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'half' },
      { v: 0.5, y: 100, containerHeight: 300 },
      config,
    );
    expect(result.kind).not.toBe('dismiss');
  });

  test('Rule 2: upward velocity flick snaps to next-larger detent', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'half' },
      { v: -0.5, y: 150, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'full' });
  });

  test('Rule 2: downward velocity flick snaps to next-smaller detent', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'half' },
      { v: 0.5, y: 150, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'collapsed' });
  });

  test('Rule 2: velocity flick at boundary stays at edge detent', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'full' },
      { v: -0.5, y: 50, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'full' });
  });

  test('Rule -1: closeThreshold dismisses on slow drag past 25% even with no velocity', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 300, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'dismiss' });
  });

  test('Rule -1: closeThreshold does NOT dismiss when not dismissible', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 300, containerHeight: 300 },
      config,
    );
    expect(result.kind).not.toBe('dismiss');
  });

  test('Rule -1: closeThreshold dismisses at exact boundary (>=)', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 285, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'dismiss' });
  });

  test('Rule -1: closeThreshold respects custom value', () => {
    const noDismiss = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 270, containerHeight: 300 },
      config,
    );
    expect(noDismiss.kind).not.toBe('dismiss');

    const yesDismiss = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 270, containerHeight: 300 },
      { ...config, closeThreshold: 0.15 },
    );
    expect(yesDismiss).toEqual({ kind: 'dismiss' });
  });

  test('Rule 0: fast flick down dismisses when dismissible regardless of position', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'half' },
      { v: 3, y: 50, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'dismiss' });
  });

  test('Rule 0: fast flick down snaps to smallest detent when not dismissible', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'half' },
      { v: 3, y: 50, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'collapsed' });
  });

  test('Rule 0: fast flick up snaps to largest detent', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'collapsed' },
      { v: -3, y: 250, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'full' });
  });

  test('Rule 0: custom fastFlickThreshold respected', () => {
    const result = chooseSnapTarget(
      { dismissible: true, detents, currentDetentId: 'half' },
      { v: 1.5, y: 50, containerHeight: 300 },
      { ...config, fastFlickThreshold: 1 },
    );
    expect(result).toEqual({ kind: 'dismiss' });
  });

  test('Rule 3: predicted position selects nearest detent', () => {
    const result = chooseSnapTarget(
      { dismissible: false, detents, currentDetentId: 'collapsed' },
      { v: 0, y: 135, containerHeight: 300 },
      config,
    );
    expect(result).toEqual({ kind: 'snap', detentId: 'half' });
  });
});

describe('decidePushGesture', () => {
  const axisLength = 1000;

  test('long drag past 40% dismisses regardless of velocity', () => {
    expect(decidePushGesture({ distance: 401, velocity: 0, axisLength })).toEqual({
      kind: 'dismiss',
    });
  });

  test('short drag with low velocity rests', () => {
    expect(decidePushGesture({ distance: 100, velocity: 0.1, axisLength })).toEqual({
      kind: 'rest',
    });
  });

  test('quick flick dismisses even at short distance', () => {
    expect(decidePushGesture({ distance: 50, velocity: 0.6, axisLength })).toEqual({
      kind: 'dismiss',
    });
  });

  test('custom velocityThreshold respected', () => {
    expect(
      decidePushGesture({ distance: 50, velocity: 0.3, axisLength, velocityThreshold: 0.2 }),
    ).toEqual({ kind: 'dismiss' });
    expect(
      decidePushGesture({ distance: 50, velocity: 0.3, axisLength, velocityThreshold: 1 }),
    ).toEqual({ kind: 'rest' });
  });

  test('custom distanceFraction respected', () => {
    expect(
      decidePushGesture({ distance: 200, velocity: 0, axisLength, distanceFraction: 0.15 }),
    ).toEqual({ kind: 'dismiss' });
  });
});

describe('rubberBand', () => {
  test('returns d unchanged within bounds', () => {
    expect(rubberBand(50, 0, 100)).toBeCloseTo(50, 3);
  });

  test('applies formula d*(c/(c+d)) past upper bound', () => {
    const overscroll = 20;
    const c = 100;
    const expected = (overscroll * c) / (c + overscroll);
    expect(rubberBand(120, 0, 100, c)).toBeCloseTo(100 + expected, 3);
  });

  test('applies formula below lower bound', () => {
    const overscroll = 20;
    const c = 100;
    const expected = (overscroll * c) / (c + overscroll);
    expect(rubberBand(-20, 0, 100, c)).toBeCloseTo(-expected, 3);
  });

  test('c defaults to range size', () => {
    const overscroll = 10;
    const range = 100;
    const expected = (overscroll * range) / (range + overscroll);
    expect(rubberBand(110, 0, 100)).toBeCloseTo(100 + expected, 3);
  });
});
