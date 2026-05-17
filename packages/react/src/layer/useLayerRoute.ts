import { useEffect } from 'react';

import { hashLayerId } from '@gwn-sheet-stack/core';
import type { StackStore } from '@gwn-sheet-stack/core';

import { useStack } from '../stack/context';

// Pending DISMISS timers, scoped per store so two stores with colliding layer
// ids can't interfere. Cleanup schedules a dismiss via setTimeout(0); a
// synchronous remount (StrictMode, HMR) cancels it before it fires, so the
// route-bound layer survives the double-invoke without flickering to
// 'dismissing'.
const pendingDismiss = new WeakMap<StackStore, Map<string, ReturnType<typeof setTimeout>>>();

function getPending(store: StackStore): Map<string, ReturnType<typeof setTimeout>> {
  let map = pendingDismiss.get(store);
  if (!map) {
    map = new Map();
    pendingDismiss.set(store, map);
  }
  return map;
}

/**
 * Declare a route-bound Layer (ADR 0002).
 *
 * Call this inside a route file (typically the intercepted modal page in a
 * Next App Router setup, e.g. `app/@modal/(.)articles/[id]/page.tsx`) to say
 * "while this route is mounted, the stack must contain a Layer of `kind` with
 * these `props` at the top."
 *
 * Semantics:
 * - Push is idempotent (StrictMode and HMR safe): the content-addressed id
 *   matches when (kind, props) match, so re-running the effect is a no-op.
 * - Cleanup dispatches an animated DISMISS. The Layer (and its surface) lives
 *   in `Stage`'s portal, not in the route subtree, so it keeps rendering
 *   after the route component unmounts — the surface adapter drives the
 *   exit animation and fires DISMISSED when it's done, at which point the
 *   store splices the Layer.
 *
 * Props must be JSON-serialisable (functions, Dates, class instances throw
 * at push time).
 */
export function useLayerRoute<P = unknown>(kind: string, props?: P): void {
  const store = useStack();
  const id = hashLayerId(kind, props);
  useEffect(() => {
    const pending = getPending(store);
    // Cancel any in-flight dismiss from a cleanup we're now undoing
    // (StrictMode double-invoke, HMR re-render).
    const inflight = pending.get(id);
    if (inflight) {
      clearTimeout(inflight);
      pending.delete(id);
    }
    const existing = store.getState().stack.find((l) => l.id === id);
    if (!existing) {
      store.push({ kind, props, flavor: 'route-bound' });
    }
    return () => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const target = store.getState().stack.find((l) => l.id === id);
        if (!target) return;
        if (target.phase === 'dismissing' || target.phase === 'evicted') return;
        store.dispatch(id, { type: 'DISMISS', source: 'router' });
      }, 0);
      pending.set(id, timer);
    };
    // `id` captures (kind, props); deeper deps would cause spurious re-runs on
    // unstable prop references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id]);
}
