// Store
export { createStackStore } from './store/store';
export { LRUMountWindow } from './store/lru';
export { hashLayerId, stableStringify, validateSerializableProps } from './store/layer-id';
export type {
  SheetRegistry,
  SnapshotProvider,
  Layer,
  LayerFlavor,
  State,
  PushRequest,
  SerializedLayer,
  RouterAdapter,
  StackStoreConfig,
  StackStore,
} from './store/types';

// FSM
export { renderModeFor } from './store/fsm';
export type {
  LayerPhase,
  DismissSource,
  LayerEvent,
  PresentationKind,
  RenderMode,
} from './store/fsm';

// Presentation
export { inertForLayer } from './presentation/inert-for-layer';

// Events
export { EventBus } from './event/event-bus';

// Router
export { historyAdapter } from './router/history-adapter';
export type { HistoryAdapterOptions, RouteEntry } from './router/history-adapter';
