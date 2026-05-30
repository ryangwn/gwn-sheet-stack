import { describe, expect, test } from 'bun:test';

import { inertForLayer } from '../index';

const sheetDetents = [
  { id: 'collapsed', size: 0.3 },
  { id: 'half', size: 0.6 },
  { id: 'full', size: 1.0 },
];

const topSheet = {
  presentation: {
    kind: 'sheet' as const,
    largestUndimmedDetentId: 'half',
    detents: sheetDetents,
  },
};

const topSheetNoDim = {
  presentation: {
    kind: 'sheet' as const,
    detents: sheetDetents,
  },
};

const topModal = {
  presentation: { kind: 'modal' as const },
};

describe('inertForLayer', () => {
  test('indexFromTop=0 (topmost) is never inert', () => {
    expect(inertForLayer(0, topSheet, 'full')).toBe(false);
    expect(inertForLayer(0, topModal, undefined)).toBe(false);
  });

  test('depth-1 behind modal is inert', () => {
    expect(inertForLayer(1, topModal, undefined)).toBe(true);
  });

  test('depth-1 behind sheet with no largestUndimmedDetentId is inert', () => {
    expect(inertForLayer(1, topSheetNoDim, 'full')).toBe(true);
  });

  test('depth-1 behind sheet at-or-below largestUndimmedDetentId is NOT inert (Apple Maps pass-through)', () => {
    // topDetentId 'collapsed' is below 'half' → pass-through
    expect(inertForLayer(1, topSheet, 'collapsed')).toBe(false);
    // topDetentId 'half' is AT largestUndimmedDetentId → pass-through
    expect(inertForLayer(1, topSheet, 'half')).toBe(false);
  });

  test('depth-1 behind sheet ABOVE largestUndimmedDetentId is inert', () => {
    // 'full' > 'half' → backdrop dims → inert
    expect(inertForLayer(1, topSheet, 'full')).toBe(true);
  });

  test('depth-2+ is always inert regardless of detent', () => {
    expect(inertForLayer(2, topSheet, 'collapsed')).toBe(true);
    expect(inertForLayer(3, topSheet, 'collapsed')).toBe(true);
    expect(inertForLayer(2, topModal, undefined)).toBe(true);
  });
});
