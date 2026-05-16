import { useEffect } from 'react';

import { hashLayerId } from '@gwn-sheet-stack/core';

import { useStack } from '../stack/context';

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
 * - Cleanup splices the Layer from the stack via a skip-animation dismiss.
 *   Animated exit belongs to the surface adapter and runs while the route is
 *   navigating away — by the time React unmounts the route component, the
 *   Layer has already animated out elsewhere.
 *
 * Props must be JSON-serialisable (functions, Dates, class instances throw
 * at push time).
 */
export function useLayerRoute<P = unknown>(kind: string, props?: P): void {
  const store = useStack();
  const id = hashLayerId(kind, props);
  useEffect(() => {
    const existing = store.getState().stack.find((l) => l.id === id);
    if (!existing) {
      store.push({ kind, props, flavor: 'route-bound' });
    }
    return () => {
      const target = store.getState().stack.find((l) => l.id === id);
      if (!target) return;
      if (target.phase === 'dismissing' || target.phase === 'evicted') return;
      store.dispatch(id, { type: 'DISMISS', source: 'programmatic', skipAnimation: true });
    };
    // `id` captures (kind, props); deeper deps would cause spurious re-runs on
    // unstable prop references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id]);
}
