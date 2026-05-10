export interface Detent {
  id: string;
  size: number;
  bias?: number;
}

export interface SnapLayer {
  dismissible: boolean;
  detents: Detent[];
  currentDetentId: string;
}

export interface GestureState {
  v: number; // velocity px/ms, positive = downward
  y: number; // current translate-Y offset from fully-expanded (0 = top of sheet at container top)
  containerHeight: number;
}

export interface SnapConfig {
  dismissVelocityThreshold: number;
  snapVelocityThreshold: number;
  decayCoef: number;
  /** Fast-flick: |v| above this bypasses adjacent/predict math and goes to extremes. Vaul: 2 px/ms. */
  fastFlickThreshold?: number;
  /**
   * Position-based dismiss: if drag distance from the smallest detent toward dismiss is
   * greater than this fraction of container height, force dismiss regardless of velocity.
   * Vaul's CLOSE_THRESHOLD = 0.25.
   */
  closeThreshold?: number;
}

/**
 * The single vocabulary every gesture-driven release decision speaks. Sheet
 * uses 'dismiss' and 'snap'; PushScreen uses 'dismiss' and 'rest'. The
 * `'__dismissed'` magic string is gone.
 */
export type GestureOutcome =
  | { kind: 'dismiss' }
  | { kind: 'snap'; detentId: string }
  | { kind: 'rest' };

function detentY(detent: Detent, containerHeight: number): number {
  return (1 - detent.size) * containerHeight;
}

function adjacentDetent(detents: Detent[], currentId: string, direction: number): string | null {
  const idx = detents.findIndex((d) => d.id === currentId);
  if (idx === -1) return null;
  const nextIdx = idx + (direction > 0 ? -1 : 1); // direction<0=up=expand=higher index
  if (nextIdx < 0 || nextIdx >= detents.length) return null;
  return detents[nextIdx]!.id;
}

function nearestDetentByPrediction(
  detents: Detent[],
  predictedY: number,
  containerHeight: number,
): string {
  let best = detents[0]!;
  let bestDist = Infinity;
  for (const d of detents) {
    const dy = detentY(d, containerHeight);
    // apply bias: lower bias = easier to expand (snap to smaller y = larger detent)
    const dist = Math.abs(predictedY - dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best.id;
}

export function chooseSnapTarget(
  layer: SnapLayer,
  gesture: GestureState,
  config: SnapConfig,
): GestureOutcome {
  const { v, y, containerHeight } = gesture;
  const { detents } = layer;
  const halfwayY = containerHeight / 2;
  const fastFlick = config.fastFlickThreshold ?? 2;
  const closeThreshold = config.closeThreshold ?? 0.25;

  // Rule -1: position-based dismiss — if dragged past the smallest detent by closeThreshold
  // of container height, force dismiss regardless of velocity. Catches slow careful drags.
  const smallestDetent = detents[0];
  if (layer.dismissible && smallestDetent) {
    const smallestY = (1 - smallestDetent.size) * containerHeight;
    if (y - smallestY >= closeThreshold * containerHeight) {
      return { kind: 'dismiss' };
    }
  }

  // Rule 0: fast flick (|v| > fastFlickThreshold) — go to extremes, bypass closest-point math.
  if (Math.abs(v) > fastFlick) {
    if (v > 0) {
      // downward → dismiss if allowed, else snap to smallest detent
      if (layer.dismissible) return { kind: 'dismiss' };
      return { kind: 'snap', detentId: detents[0]!.id };
    }
    // upward → snap to largest detent
    return { kind: 'snap', detentId: detents[detents.length - 1]!.id };
  }

  // Rule 1: dismiss flick
  if (layer.dismissible && v > config.dismissVelocityThreshold && y > halfwayY) {
    return { kind: 'dismiss' };
  }

  // Rule 2: velocity flick to adjacent detent
  if (Math.abs(v) > config.snapVelocityThreshold) {
    const adj = adjacentDetent(detents, layer.currentDetentId, v);
    return { kind: 'snap', detentId: adj ?? layer.currentDetentId };
  }

  // Rule 3: predicted position
  const predicted = y + v * config.decayCoef;
  return { kind: 'snap', detentId: nearestDetentByPrediction(detents, predicted, containerHeight) };
}

export interface PushGestureInput {
  /** Signed drag distance in pixels (positive = away from rest, toward dismiss). */
  distance: number;
  /** Signed velocity in px/ms at release. */
  velocity: number;
  /** Width of the gesture's containing axis. For an x-axis push, this is viewport width. */
  axisLength: number;
  /** Fraction of axisLength that triggers dismiss on its own. Default 0.4. */
  distanceFraction?: number;
  /** Velocity in px/ms above which a flick dismisses regardless of distance. Default 0.5. */
  velocityThreshold?: number;
}

/**
 * Release decision for a no-detent dismiss gesture (PushScreen edge-swipe).
 * Returns 'dismiss' on a sufficient distance OR a sufficient flick; otherwise
 * 'rest' (snap back to where we started).
 */
export function decidePushGesture(input: PushGestureInput): GestureOutcome {
  const distanceFraction = input.distanceFraction ?? 0.4;
  const velocityThreshold = input.velocityThreshold ?? 0.5;

  if (input.distance > input.axisLength * distanceFraction) return { kind: 'dismiss' };
  if (input.velocity > velocityThreshold) return { kind: 'dismiss' };
  return { kind: 'rest' };
}

export function rubberBand(value: number, min: number, max: number, c?: number): number {
  const range = max - min;
  const coeff = c ?? range;

  if (value < min) {
    const over = min - value;
    return min - (over * coeff) / (coeff + over);
  }
  if (value > max) {
    const over = value - max;
    return max + (over * coeff) / (coeff + over);
  }
  return value;
}
