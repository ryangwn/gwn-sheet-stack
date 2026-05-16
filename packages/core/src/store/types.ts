import type { EventBus } from '../event/eventBus';
import type { LayerEvent, LayerPhase, PresentationKind } from './fsm';

/** Extend this interface via module augmentation to type-check `push`. */
export interface SheetRegistry {}

type RegistryKind = keyof SheetRegistry;
type AnyKind = [RegistryKind] extends [never] ? string : RegistryKind;

export interface SnapshotProvider {
  capture(): unknown;
  restore(snapshot: unknown): void;
  triggers: Array<'background' | 'evicted'>;
}

/**
 * 'route-bound' Layers are declared via `useLayerRoute` inside a route file
 * and participate in browser history. `layer.close()` routes through
 * `history.back()` so the URL stays authoritative (ADR 0002).
 *
 * 'ephemeral' Layers (the default for raw `stack.push()`) do not change the
 * URL. `layer.close()` dispatches DISMISS directly until issue #5 lands
 * synthetic history entries, at which point ephemeral close also routes
 * through `history.back()`.
 */
export type LayerFlavor = 'route-bound' | 'ephemeral';

export interface Layer<K extends string = string, P = unknown> {
  id: string;
  kind: K;
  props?: P;
  phase: LayerPhase;
  presentation?: PresentationKind;
  snapshot?: Record<string, unknown>;
  detentId?: string;
  /** Defaults to 'ephemeral'. `useLayerRoute` sets this to 'route-bound'. */
  flavor?: LayerFlavor;
}

export interface State {
  stack: readonly Layer[];
}

export interface PushRequest<K extends AnyKind = AnyKind> {
  kind: K;
  props?: K extends RegistryKind ? SheetRegistry[K] : unknown;
  replace?: boolean;
  reset?: boolean;
  presentation?: PresentationKind;
  detentId?: string;
  /** Default 'ephemeral'. `useLayerRoute` passes 'route-bound'. */
  flavor?: LayerFlavor;
}

export interface SerializedLayer {
  kind: string;
  props?: unknown;
  /** Defaults to 'route-bound' on read for back-compat with pre-0.2 data. */
  flavor?: LayerFlavor;
}

export interface RouterAdapter {
  read(): SerializedLayer[];
  write(stack: SerializedLayer[]): void;
  onPopState(cb: (s: SerializedLayer[]) => void): () => void;
  pushHistory(): void;
}

export interface StackStoreConfig {
  mountWindow: number;
  /** When true, invalid transitions throw. Defaults to NODE_ENV !== 'production'. */
  dev?: boolean;
  /** Max stack depth. Exceeding no-ops the push and emits a dev warning. Default: Infinity. */
  maxDepth?: number;
  /** Router adapter for URL sync. */
  router?: RouterAdapter;
}

export interface StackStore {
  getState(): State;
  subscribe(listener: () => void): () => void;
  push<R = unknown>(req: PushRequest): Promise<R>;
  pop(result?: unknown): void;
  popTo(layerId: string): void;
  popToRoot(): void;
  dismissAll(): void;
  snap(layerId: string, detentId: string, opts?: { animated?: boolean }): void;
  reportMemoryWarning(level?: 'warning' | 'critical'): void;
  hydrate(layers: Layer[]): void;
  serialize(): Layer[];
  dispatch(layerId: string, event: LayerEvent): void;
  registerSnapshotProvider(layerId: string, key: string, provider: SnapshotProvider): () => void;
  events: EventBus;
}
