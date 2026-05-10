import { getContext, setContext } from 'svelte';

import type { StackStore } from 'gwn-sheet-stack-core';

const STACK_KEY = Symbol('sheetstack');
const LAYER_KEY = Symbol('sheetstack-layer');

export function setStackContext(store: StackStore): void {
  setContext(STACK_KEY, store);
}

export function getStackContext(): StackStore {
  const store = getContext<StackStore>(STACK_KEY);
  if (!store) throw new Error('getStack() must be called inside <StackProvider>');
  return store;
}

export function setLayerContext(layerId: string): void {
  setContext(LAYER_KEY, layerId);
}

export function getLayerContext(): string {
  const id = getContext<string>(LAYER_KEY);
  if (!id) throw new Error('getLayer() must be called inside a LayerHost');
  return id;
}
