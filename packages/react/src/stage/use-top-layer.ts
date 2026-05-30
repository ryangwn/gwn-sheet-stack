import { type PresentationKind } from '@gwn-sheet-stack/core';

import { useStackState } from '../stack/context';

interface SheetPresentationRef {
  kind: 'sheet';
  detents: [];
}

interface OtherPresentationRef {
  kind: 'modal' | 'panel' | 'push';
}

interface TopLayerRef {
  presentation: SheetPresentationRef | OtherPresentationRef;
}

interface UseTopLayerResult {
  topPresentation: PresentationKind;
  topDetentId: string | undefined;
  topLayerRef: TopLayerRef | null;
}

export function useTopLayer(): UseTopLayerResult {
  const state = useStackState();
  const topLayer = state.stack[state.stack.length - 1];
  const topPresentation: PresentationKind = topLayer?.presentation ?? 'sheet';
  const topDetentId = topLayer?.detentId;

  const topLayerRef: TopLayerRef | null = topLayer
    ? {
        presentation:
          topLayer.presentation === 'sheet' || topLayer.presentation === undefined
            ? { kind: 'sheet', detents: [] }
            : { kind: topLayer.presentation },
      }
    : null;

  return { topPresentation, topDetentId, topLayerRef };
}
