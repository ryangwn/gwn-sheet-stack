import type { Detent } from './snapDecision';

export interface BackdropFadeInput {
  detents: Detent[];
  currentDetentId: string;
  /** Index of the detent at which the backdrop reaches full opacity. Detents below fade out. */
  fadeFromIndex: number;
  /**
   * Optional drag progress (0..1 between adjacent detents) for live updates during a gesture.
   * When omitted the result is purely a function of currentDetentId.
   */
  dragProgress?: number;
  /**
   * Direction of the active drag relative to currentDetentId: -1 = toward smaller detent,
   * +1 = toward larger detent, 0 = none.
   */
  dragDirection?: -1 | 0 | 1;
}

/**
 * Granular backdrop opacity in [0, 1].
 *
 * - At any detent index >= fadeFromIndex: opacity 1.
 * - At detent index < fadeFromIndex: opacity scales linearly with index distance.
 * - During a drag (dragProgress + dragDirection given) crossing fadeFromIndex, opacity is
 *   interpolated continuously.
 */
export function computeBackdropOpacity({
  detents,
  currentDetentId,
  fadeFromIndex,
  dragProgress = 0,
  dragDirection = 0,
}: BackdropFadeInput): number {
  if (detents.length === 0) return 1;
  const idx = detents.findIndex((d) => d.id === currentDetentId);
  if (idx === -1) return 1;
  if (fadeFromIndex < 0 || fadeFromIndex >= detents.length) return 1;

  // Static base — fraction of the way from index 0 up to fadeFromIndex.
  const base = idx >= fadeFromIndex ? 1 : idx / fadeFromIndex;

  if (dragDirection === 0 || dragProgress === 0) return base;

  const targetIdx = clamp(idx + dragDirection, 0, detents.length - 1);
  const targetBase = targetIdx >= fadeFromIndex ? 1 : targetIdx / fadeFromIndex;
  const t = clamp(dragProgress, 0, 1);
  return base + (targetBase - base) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
