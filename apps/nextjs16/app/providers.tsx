'use client';

import { useEffect, useMemo, useState } from 'react';

import { nextAppRouterAdapter, useSheetStackRouter } from '@gwn-sheet-stack/adapters-router-next';
import { createStackStore } from '@gwn-sheet-stack/core';
import { StackProvider, Stage } from '@gwn-sheet-stack/react';

import { articleFeedRegistry } from './article-feed';

export function Providers({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => nextAppRouterAdapter(), []);
  const store = useMemo(
    () => createStackStore({ mountWindow: 10, maxDepth: 10, router: adapter }),
    [adapter],
  );
  useSheetStackRouter(store, adapter);

  // Stage portals into document.body, which is undefined during SSR/prerender.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <StackProvider value={store}>
      {children}
      {mounted ? <Stage registry={articleFeedRegistry} mountWindow={10} /> : null}
    </StackProvider>
  );
}
