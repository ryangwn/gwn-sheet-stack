import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type PresentationKind, inertForLayer, renderModeFor } from '@gwn-sheet-stack/core';

import { LayerContext } from '../layer/LayerContext';
import { LayerHost } from '../layer/LayerHost.tsx';
import { MotionCoordinator } from '../motion/MotionCoordinator';
import { MotionCoordinatorProvider } from '../motion/context';
import { useStackState } from '../stack/context';
import { HiddenPolyfill } from './HiddenPolyfill.tsx';

interface StageProps {
  registry: Record<string, React.ComponentType<Record<string, unknown>>>;
  mountWindow?: number;
  container?: HTMLElement | null;
}

export function Stage({ registry, mountWindow = 3, container }: StageProps) {
  const state = useStackState();
  const topLayer = state.stack[state.stack.length - 1];
  const topPresentation: PresentationKind = topLayer?.presentation ?? 'sheet';
  const topDetentId = topLayer?.detentId;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [coordinator, setCoordinator] = useState<MotionCoordinator | null>(null);

  // Build the MotionCoordinator once the host element exists. Single writer
  // for every animated CSS var across the stack.
  useEffect(() => {
    if (!hostRef.current) return;
    setCoordinator(new MotionCoordinator(hostRef.current));
  }, []);

  // Host-level vars that depend on stack shape. --ss-underlay-progress and
  // --ss-push-progress are normally driven each frame by the active
  // LayerAnimation; reset on stack changes so a skipped/aborted animation
  // can't leave the underlay stranded at a stale value.
  useEffect(() => {
    if (!coordinator) return;
    coordinator.setHost({
      '--ss-stack-depth': state.stack.length - 1,
      // Reset to 0 — top layer's animation will immediately drive them up
      // again if it's running.
      '--ss-underlay-progress': 0,
      '--ss-push-progress': 0,
    });
  }, [coordinator, state.stack.length]);

  const topLayerRef = topLayer
    ? {
        presentation:
          topLayer.presentation === 'sheet'
            ? { kind: 'sheet' as const, detents: [] }
            : { kind: (topLayer.presentation ?? 'sheet') as 'modal' | 'panel' | 'push' },
      }
    : null;

  return createPortal(
    <div ref={hostRef} data-sheetstack-host data-sheetstack-top-presentation={topPresentation}>
      {coordinator && (
        <MotionCoordinatorProvider value={coordinator}>
          {state.stack.map((layer, i) => {
            const indexFromTop = state.stack.length - 1 - i;
            const mode = renderModeFor(indexFromTop, topPresentation, mountWindow);

            if (mode === 'unmount') return null;

            const Component = registry[layer.kind];
            if (!Component) return null;

            const isInert = topLayerRef
              ? inertForLayer(indexFromTop, topLayerRef, topDetentId)
              : false;

            return (
              <LayerContext.Provider key={layer.id} value={layer.id}>
                <HiddenPolyfill mode={mode}>
                  <LayerHost layerId={layer.id} inert={isInert}>
                    <Component {...(layer.props as Record<string, unknown>)} />
                  </LayerHost>
                </HiddenPolyfill>
              </LayerContext.Provider>
            );
          })}
        </MotionCoordinatorProvider>
      )}
    </div>,
    container ?? document.body,
  );
}
