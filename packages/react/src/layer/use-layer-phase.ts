import type { LayerPhase } from '@gwn-sheet-stack/core';

import { useStackState } from '../stack/context';

/**
 * Read the current FSM phase for a given Layer. Replaces the
 * `state.stack.find(l => l.id === layerId)?.phase` boilerplate that every
 * presentation primitive used to do.
 */
export function useLayerPhase(layerId: string): LayerPhase | undefined {
  const state = useStackState();
  return state.stack.find((l) => l.id === layerId)?.phase;
}
