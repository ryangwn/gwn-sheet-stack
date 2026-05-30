interface DetentRef {
  id: string;
  size: number;
}

interface SheetPresentation {
  kind: 'sheet';
  largestUndimmedDetentId?: string;
  detents: DetentRef[];
}

interface OtherPresentation {
  kind: 'modal' | 'panel' | 'push';
}

interface LayerRef {
  presentation: SheetPresentation | OtherPresentation;
}

function isAtOrBelow(detentId: string, boundaryId: string, detents: DetentRef[]): boolean {
  const index = detents.findIndex((d) => d.id === detentId);
  const boundaryIndex = detents.findIndex((d) => d.id === boundaryId);
  if (index === -1 || boundaryIndex === -1) return false;
  // lower index = smaller size = lower detent
  return index <= boundaryIndex;
}

export function inertForLayer(
  indexFromTop: number,
  topLayer: LayerRef,
  topDetentId: string | undefined,
): boolean {
  if (indexFromTop === 0) return false;

  if (
    topLayer.presentation.kind === 'sheet' &&
    topLayer.presentation.largestUndimmedDetentId &&
    topDetentId &&
    indexFromTop === 1
  ) {
    const { largestUndimmedDetentId, detents } = topLayer.presentation;
    if (isAtOrBelow(topDetentId, largestUndimmedDetentId, detents)) {
      return false;
    }
  }

  return true;
}
