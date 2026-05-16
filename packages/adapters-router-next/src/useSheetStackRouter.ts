'use client';

// Syncs Next.js App Router navigation with the stack store.
// Call once in your root Providers component.
//
// Usage:
//   'use client';
//   import { useSheetStackRouter } from '@gwn-sheet-stack/adapters-router-next';
//   import { nextAppRouterAdapter } from '@gwn-sheet-stack/adapters-router-next';
//
//   const adapter = nextAppRouterAdapter();
//   const stackStore = createStackStore({ mountWindow: 3, router: adapter });
//
//   export function Providers({ children }) {
//     useSheetStackRouter(stackStore, adapter);
//     return <StackProvider value={stackStore}>{children}</StackProvider>;
//   }
import { useState } from 'react';

import { hashLayerId } from '@gwn-sheet-stack/core';
import type { StackStore } from '@gwn-sheet-stack/core';
import type { RouterAdapter, SerializedLayer } from '@gwn-sheet-stack/core';

export function useSheetStackRouter(store: StackStore, adapter: RouterAdapter): void {
  // Synchronous hydration (ADR 0002): run during the root provider's first
  // render — before child route components fire their `useLayerRoute`
  // effects. React's render→effect order guarantees children's effects
  // observe the hydrated below-top slice and only push the missing top.
  useState(() => {
    if (store.getState().stack.length > 0) return null;
    const initial: SerializedLayer[] = adapter.read();
    if (initial.length === 0) return null;
    // Ephemerals don't survive refresh (ADR 0002 / issue #5). Pre-0.2 data
    // had no flavor field; treat as route-bound for back-compat.
    const restorable = initial.filter((l) => (l.flavor ?? 'route-bound') === 'route-bound');
    if (restorable.length === 0) return null;
    store.hydrate(
      restorable.map((l) => ({
        id: hashLayerId(l.kind, l.props),
        kind: l.kind,
        phase: 'active' as const,
        props: l.props,
        flavor: 'route-bound' as const,
      })),
    );
    return null;
  });
}
