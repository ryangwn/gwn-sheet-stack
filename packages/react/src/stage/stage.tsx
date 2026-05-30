import React from 'react';
import { createPortal } from 'react-dom';

import { inertForLayer, renderModeFor } from '@gwn-sheet-stack/core';

import { LayerContext } from '../layer/layer-context';
import { LayerHost } from '../layer/layer-host.tsx';
import { useStackState } from '../stack/context';
import { HiddenPolyfill } from './hidden-polyfill.tsx';
import { useTopLayer } from './use-top-layer';

interface StageProps {
  registry: Record<string, React.ComponentType<Record<string, unknown>>>;
  mountWindow?: number;
  container?: HTMLElement | null;
}

export function Stage({ registry, mountWindow = 3, container }: StageProps) {
  const state = useStackState();
  const { topPresentation, topDetentId, topLayerRef } = useTopLayer();

  return createPortal(
    <div data-sheetstack-host data-sheetstack-top-presentation={topPresentation}>
      {state.stack.map((layer, i) => {
        const indexFromTop = state.stack.length - 1 - i;
        const mode = renderModeFor(indexFromTop, topPresentation, mountWindow);

        if (mode === 'unmount') return null;

        const Component = registry[layer.kind];
        if (!Component) return null;

        const isInert = topLayerRef ? inertForLayer(indexFromTop, topLayerRef, topDetentId) : false;

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
    </div>,
    container ?? document.body,
  );
}
