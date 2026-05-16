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
import { useEffect } from 'react';

import { hashLayerId } from '@gwn-sheet-stack/core';
import type { StackStore } from '@gwn-sheet-stack/core';
import type { RouterAdapter, SerializedLayer } from '@gwn-sheet-stack/core';

export function useSheetStackRouter(store: StackStore, adapter: RouterAdapter): void {
  useEffect(() => {
    // Hydrate from URL on first client mount
    const initial: SerializedLayer[] = adapter.read();
    if (initial.length > 0) {
      store.hydrate(
        initial.map((l) => {
          const props = l.encoded ? JSON.parse(l.encoded) : undefined;
          return {
            id: hashLayerId(l.kind, props),
            kind: l.kind,
            phase: 'active' as const,
            props,
          };
        }),
      );
    }

    // Mirror stack mutations into the URL. Core only writes on DISMISSED, so
    // without this subscription the URL stays empty on push.
    return store.subscribe(() => {
      const serialized: SerializedLayer[] = store.getState().stack.map((l) => ({
        kind: l.kind,
        ...(l.props !== undefined && { encoded: JSON.stringify(l.props) }),
      }));
      adapter.write(serialized);
    });
  }, [store, adapter]);
}
