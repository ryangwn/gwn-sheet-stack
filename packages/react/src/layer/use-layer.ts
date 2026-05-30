import { useStack, useStackState } from '../stack/context';
import { useLayerId } from './layer-context';

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
  // For ephemeral layers we dispatch DISMISS locally (so the surface adapter
  // animates) AND pop the synthetic history entry that `push()` created via
  // `router.pushHistory()` — otherwise the entry leaks and every subsequent
  // `history.back()` has to walk past it (the "N clicks to close" bug).
  //
  // Spam guard: a layer already in `dismissing` ignores further close calls
  // so rapid clicks on the close button don't over-pop history.
  const close = () => {
    const current = store.getState().stack.find((l) => l.id === layerId);
    if (!current || current.phase === 'dismissing') return;
    if (current.flavor === 'route-bound') {
      if (typeof window === 'undefined') return;
      window.history.back();
      // Deep-link safety: `history.back()` is a no-op when the modal entry
      // is the bottom of the session (user landed directly on the URL). The
      // route component never unmounts, so `useLayerRoute` cleanup never
      // fires and the close button feels broken. If popstate hasn't acted
      // shortly, force-dismiss locally. popstate normally lands within a
      // few ms — 80ms leaves slack for slow main-threads without being
      // perceptible.
      setTimeout(() => {
        const stillThere = store.getState().stack.find((l) => l.id === layerId);
        if (stillThere && stillThere.phase !== 'dismissing') {
          store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
        }
      }, 80);
      return;
    }
    store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
    // Only pop history when a router is configured — that's the only path
    // through which `push()` creates a synthetic entry. Without a router
    // (Storybook, tests, headless), `history.back()` would walk the real
    // browser history and navigate the host page away.
    if (store.hasRouter && typeof window !== 'undefined') window.history.back();
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
