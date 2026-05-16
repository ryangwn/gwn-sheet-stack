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

  // ADR 0002: `close()` routes user intent through browser history rather
  // than dispatching to the store directly. For route-bound layers, history
  // is authoritative — `history.back()` unmounts the Next route component,
  // whose `useLayerRoute` cleanup pops the layer.
  //
  // Ephemeral layers still dispatch DISMISS directly until issue #5 lands
  // their synthetic history entries.
  //
  // Spam guard: a layer already in `dismissing` ignores further close calls
  // so rapid clicks on the close button don't over-pop history.
  const close = () => {
    const current = store.getState().stack.find((l) => l.id === layerId);
    if (!current || current.phase === 'dismissing') return;
    if (current.flavor === 'route-bound') {
      if (typeof window !== 'undefined') window.history.back();
      return;
    }
    store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  };

  return {
    id: layerId,
    props: layer?.props,
    snapshot: layer?.snapshot,
    detentId: layer?.detentId,
    isTopmost,
    isVisible,
    close,
    snapTo: (detentId: string) => store.snap(layerId, detentId),
  };
}
