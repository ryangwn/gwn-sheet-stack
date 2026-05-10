import React, { useLayoutEffect, useRef } from 'react';

import { useStack } from '../stack/context';
import { LayerContext } from './LayerContext';

interface LayerHostProps {
  layerId: string;
  inert?: boolean;
  children?: React.ReactNode;
}

export function LayerHost({ layerId, inert = false, children }: LayerHostProps) {
  const store = useStack();
  const mounted = useRef(false);

  const focusReturnRef = useRef<WeakRef<Element> | null>(null);

  useLayoutEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    // Capture focus return target before mounting (the element that triggered push)
    if (document.activeElement && document.activeElement !== document.body) {
      focusReturnRef.current = new WeakRef(document.activeElement);
    }
    store.dispatch(layerId, { type: 'MOUNTED' });
  }, [layerId, store]);

  // Restore focus when layer is removed from DOM (DISMISSED)
  useLayoutEffect(() => {
    return () => {
      const target = focusReturnRef.current?.deref();
      if (target && document.contains(target)) {
        (target as HTMLElement).focus?.();
        return;
      }
      // Fallback: autofocus attr in new topmost layer
      const autofocusEl = document.querySelector<HTMLElement>('[data-sheetstack-autofocus]');
      if (autofocusEl) {
        autofocusEl.focus();
        return;
      }
      // Fallback: body
      document.body.focus();
    };
  }, []);

  useLayoutEffect(() => {
    const unsub = store.registerSnapshotProvider(layerId, '__scroll__', {
      triggers: ['background', 'evicted'],
      capture: () => {
        const positions: Record<string, number> = {};
        document
          .querySelectorAll<HTMLElement>(
            `[data-sheetstack-layer="${layerId}"] [data-sheetstack-scroll-id]`,
          )
          .forEach((el) => {
            positions[el.dataset.sheetstackScrollId!] = el.scrollTop;
          });
        return positions;
      },
      restore: (snapshot) => {
        const positions = snapshot as Record<string, number>;
        document
          .querySelectorAll<HTMLElement>(
            `[data-sheetstack-layer="${layerId}"] [data-sheetstack-scroll-id]`,
          )
          .forEach((el) => {
            const saved = positions[el.dataset.sheetstackScrollId!];
            if (saved != null) el.scrollTop = saved;
          });
      },
    });
    return unsub;
  }, [layerId, store]);

  return (
    <LayerContext.Provider value={layerId}>
      <div data-sheetstack-layer={layerId} {...(inert ? { inert: '' } : {})}>
        {children}
      </div>
    </LayerContext.Provider>
  );
}
