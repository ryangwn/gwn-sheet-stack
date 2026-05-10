import { useLayoutEffect, useRef } from 'react';

import type { LayerPhase } from 'gwn-sheet-stack-core';

import { useStackState } from '../stack/context';
import { useLayerId } from './LayerContext';

export interface LifecycleCallbacks {
  onLoad?: () => void;
  onWillAppear?: () => void;
  onDidAppear?: () => void;
  onWillDisappear?: () => void;
  onDidDisappear?: () => void;
  onMemoryWarning?: () => void;
  onSnapshot?: () => unknown;
}

export function useLifecycle(callbacks: LifecycleCallbacks): void {
  const layerId = useLayerId();
  const state = useStackState();
  const layer = state.stack.find((l) => l.id === layerId);
  const currentPhase: LayerPhase | null = layer?.phase ?? null;

  const prevPhaseRef = useRef<LayerPhase | null>(null);
  const callbacksRef = useRef(callbacks);

  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  useLayoutEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase;
    if (currentPhase === prev) return;

    const cb = callbacksRef.current;

    if (currentPhase === 'presenting' && prev === 'mounting') {
      cb.onLoad?.();
      cb.onWillAppear?.();
    } else if (currentPhase === 'active' && (prev === 'presenting' || prev === 'background')) {
      if (prev === 'background') cb.onWillAppear?.();
      cb.onDidAppear?.();
    } else if (currentPhase === 'background') {
      cb.onWillDisappear?.();
      cb.onDidDisappear?.();
    } else if (currentPhase === 'dismissing') {
      cb.onWillDisappear?.();
    } else if (currentPhase === 'evicted') {
      cb.onMemoryWarning?.();
    } else if (currentPhase === null && prev === 'dismissing') {
      cb.onDidDisappear?.();
    }
  });
}
