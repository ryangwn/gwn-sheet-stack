import type { Component } from 'svelte';

interface DetentSpec {
  id: string;
  size: number;
  bias?: number;
}

type PresentationDef =
  | {
      kind: 'sheet';
      side?: 'bottom' | 'top';
      detents: DetentSpec[];
      initial: string;
      grabber?: boolean;
      largestUndimmedDetentId?: string;
      topEdgeScroll?: 'scroll' | 'expand';
      forceSheet?: boolean;
    }
  | { kind: 'modal'; size?: 'fit' | 'sm' | 'md' | 'lg'; dismissible?: boolean }
  | { kind: 'panel'; side: 'left' | 'right'; width: number | string; modal?: boolean }
  | { kind: 'push'; edgeSwipeBack?: boolean };

interface RegistryEntry<P extends Record<string, unknown> = Record<string, unknown>> {
  component: Component<P>;
  presentation?: PresentationDef;
  url?: {
    encode(props: P): string;
    decode(s: string): P;
  };
}

type Registry = Record<string, RegistryEntry>;

export function defineRegistry<R extends Registry>(registry: R): R {
  return registry;
}
