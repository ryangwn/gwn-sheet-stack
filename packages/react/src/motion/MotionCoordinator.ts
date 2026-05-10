import type { AnimationValues } from 'gwn-sheet-stack-core';

interface LayerEls {
  surface: HTMLElement;
  backdrop?: HTMLElement | null;
}

/**
 * The single writer for animated inline styles + --ss-* CSS custom properties.
 * Solves the previous fan-out where Sheet, useSheetGesture, PushScreen, and
 * Stage each reached into the DOM independently.
 *
 * One MotionCoordinator instance per Stage. Layer elements (surface + optional
 * backdrop) register themselves so the Coordinator can write to them by
 * layerId without each caller threading refs through.
 */
export class MotionCoordinator {
  private layerEls = new Map<string, LayerEls>();
  private subscribers = new Set<(e: MotionEvent) => void>();

  constructor(private host: HTMLElement) {}

  registerLayer(layerId: string, els: LayerEls): () => void {
    this.layerEls.set(layerId, els);
    return () => {
      if (this.layerEls.get(layerId) === els) this.layerEls.delete(layerId);
    };
  }

  /**
   * Project AnimationValues to the layer's inline styles + CSS vars. Each
   * presentation kind has its own write shape — defined once, here, instead
   * of in three component files.
   */
  writeLayer(layerId: string, values: AnimationValues): void {
    const els = this.layerEls.get(layerId);
    if (!els) return;
    applyValues(els, values);
    // Every kind contributes underlay progress so the layer below can dim
    // in lockstep — Apple-style depth. --ss-push-progress is push-only so the
    // CSS parallax rule fires only for push (other kinds shouldn't translate
    // the underlay -30%; they should just dim it).
    // Always write --ss-push-progress so it tracks the *current* top layer:
    // push contributes its progress; other kinds force it to 0 (otherwise the
    // value goes stale after a push presents and a modal stacks over it,
    // leaving the underlay translated -30% permanently).
    this.setHost({
      '--ss-underlay-progress': values.underlayProgress,
      '--ss-push-progress': values.kind === 'push' ? values.underlayProgress : 0,
    });
    this.notify({ scope: 'layer', layerId, values });
  }

  setHost(vars: Record<string, string | number>): void {
    for (const [k, v] of Object.entries(vars)) {
      this.host.style.setProperty(k, typeof v === 'number' ? String(v) : v);
    }
    this.notify({ scope: 'host', vars });
  }

  /** Test + devtools hook. */
  subscribe(fn: (e: MotionEvent) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify(e: MotionEvent): void {
    this.subscribers.forEach((s) => s(e));
  }
}

export type MotionEvent =
  | { scope: 'layer'; layerId: string; values: AnimationValues }
  | { scope: 'host'; vars: Record<string, string | number> };

function applyValues(els: LayerEls, values: AnimationValues): void {
  const { surface, backdrop } = els;
  switch (values.kind) {
    case 'modal':
      surface.style.opacity = String(values.opacity);
      surface.style.transform = `translate(-50%, -50%) scale(${values.scale})`;
      if (backdrop) backdrop.style.opacity = String(values.backdropOpacity);
      break;
    case 'panel':
      surface.style.transform = `translate3d(${values.translatePct}%, 0, 0)`;
      if (backdrop) backdrop.style.opacity = String(values.backdropOpacity);
      break;
    case 'push':
      surface.style.transform = `translate3d(${values.translatePct}%, 0, 0)`;
      break;
  }
}
