import { createContext, useContext, useSyncExternalStore } from 'react';

import type { StackStore, State } from 'gwn-sheet-stack-core';

const StackContext = createContext<StackStore | null>(null);

export const StackProvider = StackContext.Provider;

export function useStack(): StackStore {
  const store = useContext(StackContext);
  if (!store) throw new Error('useStack must be used inside <StackProvider>');
  return store;
}

export function useStackState(): State {
  const store = useStack();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
