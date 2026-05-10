// Per-event lifecycle functions (Svelte's onMount/onDestroy aesthetic, tree-shakable).
// Call at component top-level inside a LayerHost context.
//
// Phases map identically to React adapter's useLifecycle callbacks:
//   onLayerLoad:          mounting → presenting (fires again after REVIVE)
//   onLayerWillAppear:    mounting → presenting OR background → active
//   onLayerDidAppear:     presenting → active
//   onLayerWillDisappear: * → dismissing OR active → background
//   onLayerDidDisappear:  dismissing → DISMISSED OR active → background
//   onLayerMemoryWarning: * → evicted
import { getLayerContext, getStackContext } from './context';

type CleanupFn = (() => void) | void;

function usePhaseTransition(cb: (prev: string | null, next: string) => CleanupFn) {
  const store = getStackContext();
  const layerId = getLayerContext();
  let prevPhase: string | null = null;
  let cleanup: CleanupFn;

  // $effect.pre equivalent — use store subscription
  const unsub = store.subscribe(() => {
    const layer = store.getState().stack.find((l) => l.id === layerId);
    const phase = layer?.phase ?? null;
    if (phase !== prevPhase) {
      if (typeof cleanup === 'function') cleanup();
      cleanup = phase ? cb(prevPhase, phase) : undefined;
      prevPhase = phase;
    }
  });

  return unsub;
}

export function onLayerLoad(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (next === 'presenting' && (prev === 'mounting' || prev === null)) cb();
  });
}

export function onLayerWillAppear(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (
      (next === 'presenting' && (prev === 'mounting' || prev === null)) ||
      (next === 'active' && prev === 'background')
    )
      cb();
  });
}

export function onLayerDidAppear(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (next === 'active' && prev === 'presenting') cb();
  });
}

export function onLayerWillDisappear(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (next === 'dismissing' || (next === 'background' && prev === 'active')) cb();
  });
}

export function onLayerDidDisappear(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (next === 'background' && prev === 'active') cb();
    // null phase (DISMISSED) handled by unsub/cleanup
  });
}

export function onLayerMemoryWarning(cb: () => CleanupFn): void {
  usePhaseTransition((prev, next) => {
    if (next === 'evicted') cb();
  });
}

export function onLayerSnapshot(cb: () => Record<string, unknown>): void {
  const store = getStackContext();
  const layerId = getLayerContext();
  store.registerSnapshotProvider(layerId, '__svelte_snapshot__', {
    capture: cb,
    restore: () => {},
    triggers: ['background', 'evicted'],
  });
}

export function getLayerVisibility(): () => 'visible' | 'hidden' {
  const store = getStackContext();
  const layerId = getLayerContext();
  return () => {
    const layer = store.getState().stack.find((l) => l.id === layerId);
    const visible =
      layer?.phase === 'active' ||
      layer?.phase === 'presenting' ||
      layer?.phase === 'dragging' ||
      layer?.phase === 'snapping';
    return visible ? 'visible' : 'hidden';
  };
}
