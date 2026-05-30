import type { SheetRegistry } from '@gwn-sheet-stack/core';

import { getLayerContext, getStackContext } from './context';

type RegistryKind = keyof SheetRegistry;
type AnyKind = [RegistryKind] extends [never] ? string : RegistryKind;

export function getLayer<K extends AnyKind = AnyKind>() {
  const store = getStackContext();
  const layerId = getLayerContext();

  // Returns a reactive object — consumers should access via $derived or in reactive context
  function getState() {
    const state = store.getState();
    const layer = state.stack.find((l) => l.id === layerId);
    const isTopmost = state.stack[state.stack.length - 1]?.id === layerId;
    const isVisible =
      layer?.phase === 'active' ||
      layer?.phase === 'presenting' ||
      layer?.phase === 'dragging' ||
      layer?.phase === 'snapping';

    return {
      id: layerId,
      props: layer?.props as K extends RegistryKind ? SheetRegistry[K] : unknown,
      snapshot: layer?.snapshot,
      detentId: layer?.detentId,
      isTopmost,
      isVisible,
      close: () => store.dispatch(layerId, { type: 'DISMISS', source: 'user' }),
      snapTo: (detentId: string) => store.snap(layerId, detentId),
    };
  }

  return getState();
}
