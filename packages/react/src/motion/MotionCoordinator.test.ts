/**
 * @jest-environment jsdom
 */
import { describe, expect, test } from 'bun:test';

import { MotionCoordinator, type MotionEvent } from './MotionCoordinator';

function makeEl(presentation = 'modal'): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset.sheetstackPresentation = presentation;
  return el;
}

describe('MotionCoordinator', () => {
  test('writeLayer applies modal values to surface + backdrop', () => {
    const host = document.createElement('div');
    const surface = makeEl('modal');
    const backdrop = document.createElement('div');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface, backdrop });

    c.writeLayer('L1', {
      kind: 'modal',
      scale: 0.95,
      opacity: 0.7,
      backdropOpacity: 0.5,
      underlayProgress: 0.7,
    });

    expect(surface.style.opacity).toBe('0.7');
    expect(surface.style.transform).toContain('scale(0.95)');
    expect(backdrop.style.opacity).toBe('0.5');
  });

  test('writeLayer applies panel translate + backdrop', () => {
    const host = document.createElement('div');
    const surface = makeEl('panel');
    const backdrop = document.createElement('div');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface, backdrop });

    c.writeLayer('L1', {
      kind: 'panel',
      translatePct: -50,
      backdropOpacity: 0.3,
      underlayProgress: 0.3,
    });

    expect(surface.style.transform).toContain('translate3d(-50%, 0, 0)');
    expect(backdrop.style.opacity).toBe('0.3');
  });

  test('every kind writes --ss-underlay-progress to host', () => {
    const host = document.createElement('div');
    const surface = makeEl('modal');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface });

    c.writeLayer('L1', {
      kind: 'modal',
      scale: 1,
      opacity: 1,
      backdropOpacity: 1,
      underlayProgress: 0.6,
    });

    expect(host.style.getPropertyValue('--ss-underlay-progress')).toBe('0.6');
  });

  test('push additionally writes --ss-push-progress', () => {
    const host = document.createElement('div');
    const surface = makeEl('push');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface });

    c.writeLayer('L1', { kind: 'push', translatePct: 30, underlayProgress: 0.7 });

    expect(surface.style.transform).toContain('translate3d(30%, 0, 0)');
    expect(host.style.getPropertyValue('--ss-push-progress')).toBe('0.7');
    expect(host.style.getPropertyValue('--ss-underlay-progress')).toBe('0.7');
  });

  test('non-push kinds force --ss-push-progress to 0 (no stale parallax)', () => {
    const host = document.createElement('div');
    const surface = makeEl('modal');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface });

    // Pre-set stale value as if a push had presented earlier.
    c.setHost({ '--ss-push-progress': 1 });
    expect(host.style.getPropertyValue('--ss-push-progress')).toBe('1');

    c.writeLayer('L1', {
      kind: 'modal',
      scale: 1,
      opacity: 1,
      backdropOpacity: 1,
      underlayProgress: 0.5,
    });

    expect(host.style.getPropertyValue('--ss-push-progress')).toBe('0');
  });

  test('setHost writes CSS vars + numbers convert to strings', () => {
    const host = document.createElement('div');
    const c = new MotionCoordinator(host);

    c.setHost({ '--ss-stack-depth': 2, '--ss-foo': 'bar' });

    expect(host.style.getPropertyValue('--ss-stack-depth')).toBe('2');
    expect(host.style.getPropertyValue('--ss-foo')).toBe('bar');
  });

  test('subscribe receives every layer + host write', () => {
    const host = document.createElement('div');
    const surface = makeEl('modal');
    const c = new MotionCoordinator(host);
    c.registerLayer('L1', { surface });
    const events: MotionEvent[] = [];
    c.subscribe((e) => events.push(e));

    // writeLayer fires: layer event + host event (--ss-underlay-progress).
    c.writeLayer('L1', {
      kind: 'modal',
      scale: 1,
      opacity: 1,
      backdropOpacity: 1,
      underlayProgress: 1,
    });
    c.setHost({ '--ss-stack-depth': 1 });

    expect(events).toHaveLength(3);
    expect(events[0]!.scope).toBe('host'); // setHost from writeLayer (underlay-progress)
    expect(events[1]!.scope).toBe('layer');
    expect(events[2]!.scope).toBe('host');
  });

  test('writeLayer for unknown layerId is a no-op', () => {
    const host = document.createElement('div');
    const c = new MotionCoordinator(host);

    expect(() =>
      c.writeLayer('nonexistent', {
        kind: 'modal',
        scale: 1,
        opacity: 1,
        backdropOpacity: 1,
        underlayProgress: 1,
      }),
    ).not.toThrow();
  });

  test('unregister stops subsequent writes from reaching the element', () => {
    const host = document.createElement('div');
    const surface = makeEl('modal');
    const c = new MotionCoordinator(host);
    const unregister = c.registerLayer('L1', { surface });

    unregister();
    c.writeLayer('L1', {
      kind: 'modal',
      scale: 0.5,
      opacity: 0.5,
      backdropOpacity: 0.5,
      underlayProgress: 0.5,
    });

    expect(surface.style.opacity).toBe('');
  });
});
