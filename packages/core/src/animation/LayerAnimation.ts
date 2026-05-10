import { SpringDriver } from '../spring/springDriver';
import type { StackStore } from '../store/types';
import type { AnimationDescriptor, AnimationSink, AnimationValues } from './types';

type Schedule = (cb: (t: number) => void) => number;
type Cancel = (id: number) => void;

/**
 * Owns the lifecycle for a single Layer's enter/exit animations.
 *
 * Concentrates three concerns that previously lived in three separate
 * presentation components (Modal, Panel, PushScreen):
 *  1. SpringDriver lifecycle — cancel-prior + start-new on every phase change.
 *  2. Per-kind tick math — translates spring progress (0 → 1) into the
 *     concrete AnimationValues bag for each presentation kind.
 *  3. FSM dispatch on settle — emits PRESENTED / DISMISSED so callers never
 *     touch the FSM event vocabulary themselves.
 *
 * Live-position handoff (`position`) means a dismiss that fires mid-drag
 * picks up from the screen's current spot instead of snapping back to 0
 * before sliding out.
 */
export class LayerAnimation {
  private driver: SpringDriver;
  private current: AnimationValues | null = null;

  constructor(
    private store: Pick<StackStore, 'dispatch' | 'getState'>,
    private layerId: string,
    private sink: AnimationSink,
    schedule: Schedule = (cb) => requestAnimationFrame(cb),
    cancel: Cancel = (id) => cancelAnimationFrame(id),
  ) {
    this.driver = new SpringDriver(schedule, cancel);
  }

  /** Most recent published values, or null before the first tick. */
  get position(): AnimationValues | null {
    return this.current;
  }

  /**
   * Run a present or dismiss. Cancels any in-flight animation first; reads
   * `position` for the from-state if the spring is mid-flight (otherwise uses
   * the descriptor's natural start).
   *
   * `dispatch: false` skips the FSM dispatch on settle — used for gesture
   * snap-back, where the Layer is already in 'active' and there's no
   * meaningful FSM event to send.
   */
  run(descriptor: AnimationDescriptor, opts?: { dispatch?: boolean }): void {
    this.driver.stop();

    const dispatch = opts?.dispatch ?? true;
    const { from, to } = endpointsFor(descriptor, this.current);
    const reduced = prefersReducedMotion();
    const spring = reduced ? { duration: 0.01, bounce: 0 } : descriptor.spring;

    // Spring in 0–100 units (not 0–1) so the SpringDriver's absolute settle
    // threshold (0.05) corresponds to 0.05% of progress instead of 5%.
    // Without this scaling the settle snap on `from=0, to=1` was a visible
    // ~5% jump (≈50px on a 1000px viewport) at the end of the animation.
    const SCALE = 100;
    this.driver.start(
      spring,
      from * SCALE,
      to * SCALE,
      0,
      (v) => {
        const values = projectValues(descriptor, v / SCALE);
        this.current = values;
        this.sink.write(values);
      },
      () => {
        const values = projectValues(descriptor, to);
        this.current = values;
        this.sink.write(values);
        if (dispatch) this.dispatchOnSettle(descriptor.direction);
      },
    );
  }

  /**
   * Update the live position WITHOUT running a spring. Used by gestures
   * (sheet drag, push edge-swipe) that drive transforms manually but want a
   * subsequent run() to hand off cleanly.
   */
  setLive(values: AnimationValues): void {
    this.driver.stop();
    this.current = values;
    this.sink.write(values);
  }

  cancel(): void {
    this.driver.stop();
  }

  private dispatchOnSettle(direction: 'in' | 'out'): void {
    // Guard against stale dispatches: if the layer was backgrounded /
    // re-presented mid-flight, the FSM may no longer accept this event.
    // Skip silently rather than letting dev mode throw.
    const layer = this.store.getState().stack.find((l) => l.id === this.layerId);
    if (!layer) return;
    if (direction === 'in') {
      if (layer.phase !== 'presenting') return;
      this.store.dispatch(this.layerId, { type: 'PRESENTED' });
    } else {
      if (layer.phase !== 'dismissing') return;
      this.store.dispatch(this.layerId, { type: 'DISMISSED' });
    }
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * Map a descriptor + the live `position` to spring endpoints. The progress
 * value runs 0 → 1 on enter and 1 → 0 on exit; projectValues() translates
 * that to the per-kind values bag.
 *
 * If `current` exists (mid-flight), use its progress as the from-value so the
 * animation handoff is seamless.
 */
function endpointsFor(
  descriptor: AnimationDescriptor,
  current: AnimationValues | null,
): { from: number; to: number } {
  const naturalFrom = descriptor.direction === 'in' ? 0 : 1;
  const to = descriptor.direction === 'in' ? 1 : 0;

  if (!current || current.kind !== descriptor.kind) {
    return { from: naturalFrom, to };
  }

  const livePct = currentProgress(current);
  return { from: livePct, to };
}

/** Reverse-project the values bag back to a 0..1 progress for handoff. */
function currentProgress(values: AnimationValues): number {
  // underlayProgress mirrors the spring's 0→1 across every kind, so it's the
  // single source of truth for handoff.
  return values.underlayProgress;
}

function projectValues(descriptor: AnimationDescriptor, p: number): AnimationValues {
  switch (descriptor.kind) {
    case 'modal':
      if (descriptor.direction === 'in') {
        return {
          kind: 'modal',
          scale: 0.92 + 0.08 * p,
          opacity: p,
          backdropOpacity: p,
          underlayProgress: p,
        };
      }
      return {
        kind: 'modal',
        scale: 0.96 + 0.04 * p,
        opacity: p,
        backdropOpacity: p,
        underlayProgress: p,
      };
    case 'panel': {
      const translatePct = descriptor.sign * (1 - p) * 100;
      return { kind: 'panel', translatePct, backdropOpacity: p, underlayProgress: p };
    }
    case 'push': {
      const translatePct = (1 - p) * 100;
      return { kind: 'push', translatePct, underlayProgress: p };
    }
  }
}
