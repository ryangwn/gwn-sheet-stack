/**
 * Axis-agnostic pointer pan primitive.
 *
 * Concentrates the parts of pointer handling that every drag gesture needs
 * regardless of axis: single-pointer guard, pointer capture, and EMA-smoothed
 * velocity. Sheet's `attachPan` builds on top of this by adding scroll
 * arbitration; PushScreen's edge-zone uses it directly.
 *
 * Velocity is smoothed with the same EMA (0.8 / 0.2) as the original sheet
 * recognizer so behavior carries over.
 */

export interface PanBaseOptions {
  axis: 'x' | 'y';
  onStart: (clientCoord: number) => void;
  onMove: (delta: number, velocity: number) => void;
  onEnd: (velocity: number) => void;
  /** Override touch-action set on the element. Default depends on axis. */
  touchAction?: string;
}

interface ActivePointer {
  id: number;
  start: number;
  last: number;
  lastT: number;
  velocity: number;
}

export function attachPanBase(el: HTMLElement, opts: PanBaseOptions): () => void {
  const { axis, onStart, onMove, onEnd, touchAction } = opts;
  const coordOf = (e: PointerEvent): number => (axis === 'x' ? e.clientX : e.clientY);

  let active: ActivePointer | null = null;

  const onPointerDown = (e: PointerEvent): void => {
    if (active) return; // single-pointer guard
    const c = coordOf(e);
    active = { id: e.pointerId, start: c, last: c, lastT: e.timeStamp, velocity: 0 };
    el.setPointerCapture(e.pointerId);
    onStart(c);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!active || e.pointerId !== active.id) return;
    const c = coordOf(e);
    const dt = e.timeStamp - active.lastT;
    const rawV = dt > 0 ? (c - active.last) / dt : 0;
    active.velocity = active.velocity * 0.8 + rawV * 0.2; // EMA — matches sheet recognizer
    active.last = c;
    active.lastT = e.timeStamp;
    onMove(c - active.start, active.velocity);
  };

  const finish = (deliverVelocity: boolean): void => {
    if (!active) return;
    const v = deliverVelocity ? active.velocity : 0;
    active = null;
    onEnd(v);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!active || e.pointerId !== active.id) return;
    finish(true);
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (!active || e.pointerId !== active.id) return;
    finish(false);
  };

  // touch-action: pan-x means "browser may handle horizontal native pan."
  // For an x-axis gesture we want pan-y (vertical scroll passes through, we
  // own horizontal). For y-axis gestures, vice versa. 'none' takes both.
  el.style.touchAction = touchAction ?? (axis === 'x' ? 'pan-y' : 'pan-x');
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
  };
}
