import { createContext, useContext } from 'react';

export const LayerContext = createContext<string | null>(null);

export function useLayerId(): string {
  const id = useContext(LayerContext);
  if (!id) throw new Error('Must be used inside a LayerHost');
  return id;
}
