'use client';

import { useCallback, useEffect } from 'react';

import { useLayer, useLayerPhase, useStack } from '@gwn-sheet-stack/react';

const TIMEOUT_DURATION_IN_SECONDS = 0.2;

export function useRadixDialog() {
  const layer = useLayer();
  const store = useStack();
  const phase = useLayerPhase(layer.id);

  const open = phase !== 'mounting' && phase !== 'dismissing' && phase !== 'evicted';

  useEffect(() => {
    if (phase === 'presenting') store.dispatch(layer.id, { type: 'PRESENTED' });
  }, [phase, store, layer.id]);

  useEffect(() => {
    if (phase !== 'dismissing') return;
    const id = setTimeout(
      () => store.dispatch(layer.id, { type: 'DISMISSED' }),
      TIMEOUT_DURATION_IN_SECONDS * 1000,
    );
    return () => clearTimeout(id);
  }, [phase, store, layer.id]);

  const onOpenChange = useCallback(
    (o: boolean) => {
      if (o === false && phase !== 'dismissing') layer.close();
    },
    [layer, phase],
  );

  return { open, onOpenChange };
}
