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

interface RegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>;
  presentation?: PresentationDef;
  url?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encode(props: any): string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decode(s: string): any;
  };
}

type Registry = Record<string, RegistryEntry>;

export function defineRegistry<R extends Registry>(registry: R): R {
  return registry;
}
