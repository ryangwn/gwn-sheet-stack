import { createContext, useContext } from 'react';

export interface DetentSpec {
  id: string;
  size: number; // 0..1 fraction of container height
}

export interface SheetState {
  detents: DetentSpec[];
  currentDetentId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  titleId: string;
  descriptionId: string;
  dismissible: boolean;
}

export interface SheetActions {
  setDetent: (id: string) => void;
  registerTitle: () => () => void;
  registerDescription: () => () => void;
  requestDismiss: () => void;
}

export const SheetStateContext = createContext<SheetState | null>(null);
export const SheetActionsContext = createContext<SheetActions | null>(null);

export function useSheetState(): SheetState {
  const ctx = useContext(SheetStateContext);
  if (!ctx) throw new Error('Must be used inside Sheet.Container');
  return ctx;
}

export function useSheetActions(): SheetActions {
  const ctx = useContext(SheetActionsContext);
  if (!ctx) throw new Error('Must be used inside Sheet.Container');
  return ctx;
}
