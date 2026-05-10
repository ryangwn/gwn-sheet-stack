import { useStack, useStackState } from '../stack/context';
import { useLayerId } from './LayerContext';

export function useLayer() {
  const layerId = useLayerId();
  const store = useStack();
  const state = useStackState();
  const layer = state.stack.find((l) => l.id === layerId);
  const isTopmost = state.stack[state.stack.length - 1]?.id === layerId;
  const isVisible =
    layer?.phase === 'active' ||
    layer?.phase === 'presenting' ||
    layer?.phase === 'dragging' ||
    layer?.phase === 'snapping';

  return {
    id: layerId,
    props: layer?.props,
    snapshot: layer?.snapshot,
    detentId: layer?.detentId,
    isTopmost,
    isVisible,
    close: () => store.dispatch(layerId, { type: 'DISMISS', source: 'user' }),
    snapTo: (detentId: string) => store.snap(layerId, detentId),
  };
}
