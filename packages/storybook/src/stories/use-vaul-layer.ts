import { useCallback, useEffect } from 'react';

import { useLayer, useLayerPhase, useStack } from '@gwn-sheet-stack/react';

// Matches vaul's internal TRANSITIONS.DURATION (0.5s). Keep in sync if vaul updates.
const TIMEOUT_DURATION_IN_SECONDS = 0.5;

/**
 * Bridge a Vaul `Drawer.Root` to the sheet-stack FSM. Returns props ready to
 * spread on `<Drawer.Root>`. Vaul owns the open spring, so we skip the
 * `presenting` phase entirely and promote the layer to `active` as soon as
 * vaul is asked to open. Close still settles through a timeout so the FSM
 * waits for vaul's exit animation before unmounting.
 */
export function useVaulLayer() {
  const layer = useLayer();
  const store = useStack();
  const phase = useLayerPhase(layer.id);

  const open = phase !== 'mounting' && phase !== 'dismissing' && phase !== 'evicted';

  useEffect(() => {
    if (phase === 'presenting') store.dispatch(layer.id, { type: 'PRESENTED' });
  }, [phase, store, layer.id]);

  // Programmatic dismiss (parent dismissAll/pop) flips phase to 'dismissing'
  // without firing vaul's onOpenChange. Settle the FSM ourselves once vaul's
  // exit animation has had time to play.
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
