import { describe, expect, test } from 'bun:test';

import { computeBackdropOpacity } from '../index';

const detents = [
  { id: 'min', size: 0.15 as const },
  { id: 'mid', size: 0.5 as const },
  { id: 'max', size: 1.0 as const },
];

describe('computeBackdropOpacity', () => {
  test('opacity is 1 at fadeFromIndex', () => {
    expect(
      computeBackdropOpacity({ detents, currentDetentId: 'mid', fadeFromIndex: 1 }),
    ).toBeCloseTo(1, 3);
  });

  test('opacity is 1 above fadeFromIndex', () => {
    expect(
      computeBackdropOpacity({ detents, currentDetentId: 'max', fadeFromIndex: 1 }),
    ).toBeCloseTo(1, 3);
  });

  test('opacity scales linearly below fadeFromIndex', () => {
    // index 0, fadeFromIndex 2 → 0/2 = 0
    expect(
      computeBackdropOpacity({ detents, currentDetentId: 'min', fadeFromIndex: 2 }),
    ).toBeCloseTo(0, 3);
    // index 1, fadeFromIndex 2 → 1/2 = 0.5
    expect(
      computeBackdropOpacity({ detents, currentDetentId: 'mid', fadeFromIndex: 2 }),
    ).toBeCloseTo(0.5, 3);
  });

  test('drag interpolates between current and target detent opacities', () => {
    // currently at mid (idx 1, base 0.5), dragging up toward max (idx 2, base 1), 50% there
    const result = computeBackdropOpacity({
      detents,
      currentDetentId: 'mid',
      fadeFromIndex: 2,
      dragProgress: 0.5,
      dragDirection: 1,
    });
    expect(result).toBeCloseTo(0.75, 3);
  });

  test('returns 1 when currentDetentId not found', () => {
    expect(computeBackdropOpacity({ detents, currentDetentId: 'unknown', fadeFromIndex: 1 })).toBe(
      1,
    );
  });

  test('returns 1 when fadeFromIndex out of range', () => {
    expect(computeBackdropOpacity({ detents, currentDetentId: 'min', fadeFromIndex: 99 })).toBe(1);
  });
});
