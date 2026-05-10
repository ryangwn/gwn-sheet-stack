import { describe, expect, mock, test } from 'bun:test';

import { attachPanBase } from './attachPanBase';

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  // jsdom doesn't implement setPointerCapture; stub.
  (el as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
  return el;
}

function pe(
  type: string,
  init: { clientX?: number; clientY?: number; timeStamp?: number; pointerId?: number } = {},
): PointerEvent {
  // jsdom doesn't ship PointerEvent; fabricate a minimal stand-in that
  // forwards through dispatchEvent.
  return {
    type,
    pointerId: init.pointerId ?? 1,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    timeStamp: init.timeStamp ?? 0,
  } as unknown as PointerEvent;
}

function fire(el: HTMLElement, type: string, init?: Parameters<typeof pe>[1]): void {
  // Bypass DOM dispatch entirely — invoke the bound listener through a stub
  // event because jsdom can't construct PointerEvent.
  const ev = pe(type, init);
  // Use a stand-in addEventListener record? Simpler: attachPanBase listens
  // via addEventListener on the el. We can synthesize a CustomEvent and
  // overwrite its readonly fields via Object.defineProperty.
  const real = new Event(type, { bubbles: true });
  for (const [k, v] of Object.entries(ev)) {
    if (k === 'type') continue;
    Object.defineProperty(real, k, { value: v, writable: false, configurable: true });
  }
  el.dispatchEvent(real);
}

describe('attachPanBase', () => {
  test('emits onStart with initial coord on pointerdown (x axis)', () => {
    const el = makeEl();
    const onStart = mock();
    attachPanBase(el, { axis: 'x', onStart, onMove: () => {}, onEnd: () => {} });

    fire(el, 'pointerdown', { clientX: 12, timeStamp: 0 });

    expect(onStart).toHaveBeenCalledWith(12);
  });

  test('emits delta + EMA velocity on pointermove', () => {
    const el = makeEl();
    const moves: Array<[number, number]> = [];
    attachPanBase(el, {
      axis: 'x',
      onStart: () => {},
      onMove: (d, v) => moves.push([d, v]),
      onEnd: () => {},
    });

    fire(el, 'pointerdown', { clientX: 0, timeStamp: 0 });
    fire(el, 'pointermove', { clientX: 10, timeStamp: 16 });
    fire(el, 'pointermove', { clientX: 30, timeStamp: 32 });

    expect(moves).toHaveLength(2);
    expect(moves[0]![0]).toBe(10);
    expect(moves[1]![0]).toBe(30);
    // EMA: starts at 0, raw v at first move = 10/16; smoothed = 0*0.8 + (10/16)*0.2.
    expect(moves[0]![1]).toBeCloseTo((10 / 16) * 0.2, 4);
  });

  test('ignores secondary pointers (multi-touch guard)', () => {
    const el = makeEl();
    const onStart = mock();
    attachPanBase(el, { axis: 'y', onStart, onMove: () => {}, onEnd: () => {} });

    fire(el, 'pointerdown', { pointerId: 1, clientY: 0 });
    fire(el, 'pointerdown', { pointerId: 2, clientY: 100 });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  test('pointercancel delivers zero velocity', () => {
    const el = makeEl();
    const onEnd = mock();
    attachPanBase(el, { axis: 'x', onStart: () => {}, onMove: () => {}, onEnd });

    fire(el, 'pointerdown', { clientX: 0, timeStamp: 0 });
    fire(el, 'pointermove', { clientX: 50, timeStamp: 16 });
    fire(el, 'pointercancel', { clientX: 50, timeStamp: 32 });

    expect(onEnd).toHaveBeenCalledWith(0);
  });

  test('pointerup delivers EMA velocity', () => {
    const el = makeEl();
    const onEnd = mock();
    attachPanBase(el, { axis: 'x', onStart: () => {}, onMove: () => {}, onEnd });

    fire(el, 'pointerdown', { clientX: 0, timeStamp: 0 });
    fire(el, 'pointermove', { clientX: 10, timeStamp: 16 });
    fire(el, 'pointerup', { clientX: 10, timeStamp: 32 });

    expect(onEnd).toHaveBeenCalled();
    const v = onEnd.mock.calls[0]![0] as number;
    expect(v).toBeGreaterThan(0);
  });

  test('sets touch-action based on axis', () => {
    const elX = makeEl();
    attachPanBase(elX, { axis: 'x', onStart: () => {}, onMove: () => {}, onEnd: () => {} });
    expect(elX.style.touchAction).toBe('pan-y');

    const elY = makeEl();
    attachPanBase(elY, { axis: 'y', onStart: () => {}, onMove: () => {}, onEnd: () => {} });
    expect(elY.style.touchAction).toBe('pan-x');
  });

  test('teardown removes listeners', () => {
    const el = makeEl();
    const onStart = mock();
    const detach = attachPanBase(el, { axis: 'x', onStart, onMove: () => {}, onEnd: () => {} });

    detach();
    fire(el, 'pointerdown', { clientX: 5 });

    expect(onStart).not.toHaveBeenCalled();
  });
});
