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
import type { RouterAdapter, StackStore } from '@gwn-sheet-stack/core';

export function useSheetStackRouter(_store: StackStore, _adapter: RouterAdapter): void {
  // No-op today (ADR 0002). Below-top hydration is performed lazily by the
  // store on the first route-bound push — which only happens when an
  // intercepted modal route actually mounts and calls `useLayerRoute`. This
  // gates orphan-sheet restoration on direct visits / refreshes that land
  // on the full-page fallback (no `useLayerRoute` → no hydration → no
  // sheet appearing over the page).
  //
  // Kept as a no-op hook so root providers can keep calling it; future
  // adapter-side wiring (e.g., popstate listeners scoped to a React
  // lifecycle) can hook in here.
}
