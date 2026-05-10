import { describe, expect, test } from 'bun:test';

import { resolvePresentation } from '../index';

describe('resolvePresentation', () => {
  test('sheet below breakpoint stays sheet', () => {
    const result = resolvePresentation({ kind: 'sheet' }, 375, 768);
    expect(result.kind).toBe('sheet');
  });

  test('sheet at or above breakpoint resolves to modal', () => {
    const result = resolvePresentation({ kind: 'sheet' }, 768, 768);
    expect(result.kind).toBe('modal');
  });

  test('resolved modal has size md and dismissible true', () => {
    const result = resolvePresentation({ kind: 'sheet' }, 1024, 768);
    expect(result).toMatchObject({ kind: 'modal', size: 'md', dismissible: true });
  });

  test('forceSheet bypasses adaptation', () => {
    const result = resolvePresentation({ kind: 'sheet', forceSheet: true }, 1024, 768);
    expect(result.kind).toBe('sheet');
  });

  test('panel passes through unchanged', () => {
    const req = { kind: 'panel' as const, side: 'left' as const, width: 320 };
    const result = resolvePresentation(req, 1024, 768);
    expect(result).toEqual(req);
  });

  test('push passes through unchanged', () => {
    const req = { kind: 'push' as const };
    const result = resolvePresentation(req, 1024, 768);
    expect(result).toEqual(req);
  });

  test('modal passes through unchanged', () => {
    const req = { kind: 'modal' as const, size: 'sm' as const };
    const result = resolvePresentation(req, 375, 768);
    expect(result).toEqual(req);
  });

  test('default breakpoint is 768', () => {
    // vw=768, no breakpoint arg → resolves to modal
    const result = resolvePresentation({ kind: 'sheet' }, 768);
    expect(result.kind).toBe('modal');
  });
});
