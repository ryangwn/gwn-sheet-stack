import { EventBus as EventBusImpl } from '../event/eventBus';
import { type LayerEvent, transitions } from './fsm';
import { hashLayerId } from './layerId';
import { LRUMountWindow } from './lru';
import type { Layer, SnapshotProvider, StackStore, StackStoreConfig } from './types';

interface InternalLayer extends Layer {
  resolve?: (value: unknown) => void;
  pendingResult?: unknown;
  hydrated?: boolean;
}

export function createStackStore(config: StackStoreConfig): StackStore {
  const dev = config.dev ?? process.env.NODE_ENV !== 'production';
  const maxDepth = config.maxDepth ?? Infinity;
  const router = config.router;
  const events = new EventBusImpl();
  const lru = new LRUMountWindow(config.mountWindow);
  let state: { stack: readonly InternalLayer[] } = { stack: [] };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const snapshotProviders = new Map<string, Map<string, SnapshotProvider>>();

  const replaceLayer = (idx: number, updates: Partial<InternalLayer>) => {
    const stack = [...state.stack];
    stack[idx] = { ...state.stack[idx]!, ...updates };
    state = { stack };
  };

  const captureSnapshot = (layerId: string, trigger: 'background' | 'evicted') => {
    const providers = snapshotProviders.get(layerId);
    if (!providers) return;
    const idx = state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const existing = state.stack[idx]!.snapshot;
    const captured: Record<string, unknown> = existing ? { ...existing } : {};
    let anyCaptured = false;
    for (const [key, provider] of providers) {
      if (trigger === 'evicted' || provider.triggers.includes('background')) {
        captured[key] = provider.capture();
        anyCaptured = true;
      }
    }
    if (anyCaptured || existing) replaceLayer(idx, { snapshot: captured });
  };

  const restoreSnapshot = (layerId: string) => {
    const providers = snapshotProviders.get(layerId);
    if (!providers) return;
    const idx = state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const snap = state.stack[idx]!.snapshot;
    if (!snap) return;
    for (const [key, provider] of providers) {
      if (key in snap) provider.restore(snap[key]);
    }
  };

  // ADR 0002 / issue #5: emit the full stack, including the ephemeral top
  // when present. The adapter's `stripTop` trims the route-bound top (which
  // is implied by the URL) but keeps ephemerals (which are not). Flavor is
  // carried so the popstate reconciler and hydration filter know each
  // entry's lifetime semantic.
  const serializeForRouter = () =>
    state.stack.map((l) => ({
      kind: l.kind,
      ...(l.props !== undefined && { props: l.props }),
      flavor: l.flavor ?? 'ephemeral',
    }));

  // Shape-diff write cadence (ADR 0002): the router only sees stack shape
  // changes, not FSM phase transitions. `syncRouter` is a no-op when the id
  // sequence is unchanged from the last write — opening a layer fires
  // `mounting → presenting → active` but only one router.write.
  let lastIdSeq: readonly string[] = [];
  let popstateInFlight = false;
  const syncRouter = () => {
    if (!router) return;
    if (popstateInFlight) return;
    const ids = state.stack.map((l) => l.id);
    if (ids.length === lastIdSeq.length && ids.every((id, i) => id === lastIdSeq[i])) {
      return;
    }
    lastIdSeq = ids;
    router.write(serializeForRouter());
  };
  const syncedNotify = () => {
    notify();
    syncRouter();
  };

  const result: StackStore = {
    getState: () => state as ReturnType<StackStore['getState']>,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    push<R = unknown>(req: Parameters<StackStore['push']>[0]): Promise<R> {
      const id = hashLayerId(req.kind, req.props);
      // Content-addressed dedup (ADR 0002): if the same (kind, props) is
      // already in the stack, bring it to the top instead of duplicating.
      // popTo() is a no-op when the target is already top, so this is the
      // natural idempotency check for route re-mounts.
      const existingIdx = state.stack.findIndex((l) => l.id === id);
      if (existingIdx !== -1) {
        result.popTo(id);
        return Promise.resolve(undefined as R);
      }
      if (state.stack.length >= maxDepth) {
        if (dev) console.warn(`[sheet-stack] maxDepth (${maxDepth}) exceeded — push ignored.`);
        return Promise.resolve(undefined as R);
      }
      let resolve!: (value: unknown) => void;
      const promise = new Promise<R>((res) => {
        resolve = res as (value: unknown) => void;
      });
      const prevTop = state.stack[state.stack.length - 1];
      const layer: InternalLayer = {
        id,
        kind: req.kind,
        props: req.props,
        phase: 'mounting',
        flavor: req.flavor ?? 'ephemeral',
        resolve,
        ...(req.presentation !== undefined && { presentation: req.presentation }),
        ...(req.detentId !== undefined && { detentId: req.detentId }),
      };
      lru.touch(layer.id);
      if (req.reset) {
        const toEvict = [...state.stack];
        state = { stack: [...state.stack, layer] };
        for (let i = toEvict.length - 1; i >= 0; i--) {
          result.dispatch(toEvict[i]!.id, {
            type: 'DISMISS',
            source: 'reset',
            skipAnimation: true,
          });
        }
        syncedNotify();
      } else if (req.replace && prevTop) {
        state = { stack: [...state.stack, layer] };
        result.dispatch(prevTop.id, { type: 'DISMISS', source: 'replaced', skipAnimation: true });
        syncedNotify();
      } else {
        state = { stack: [...state.stack, layer] };
        // Only ephemerals create a synthetic history entry. Route-bound
        // layers come from `useLayerRoute` running inside a route file that
        // Next already navigated to via <Link>; pushing another entry would
        // duplicate the URL and break `layer.close() → history.back()`
        // (especially under StrictMode's mount→cleanup→remount cycle in
        // dev). See ADR 0002.
        if (layer.flavor !== 'route-bound') {
          router?.pushHistory();
        }
        syncedNotify();
        // Background prev top whether it was active OR still presenting —
        // both phases accept BACKGROUND now.
        if (prevTop && (prevTop.phase === 'active' || prevTop.phase === 'presenting')) {
          result.dispatch(prevTop.id, { type: 'BACKGROUND' });
        }
        // auto-evict overflow after push
        for (const id of lru.computeOverflow()) {
          const l = state.stack.find((x) => x.id === id);
          if (l && (l.phase === 'background' || l.phase === 'active')) {
            result.dispatch(id, { type: 'EVICT' });
          }
        }
      }
      return promise;
    },
    pop(popResult) {
      const top = state.stack[state.stack.length - 1];
      if (!top) return;
      // Only act on a settled top. Blocks rapid double-fires that would dismiss
      // the freshly-promoted underlay before it visually arrives.
      if (top.phase !== 'active') return;
      result.dispatch(top.id, { type: 'DISMISS', source: 'programmatic', result: popResult });
    },
    popTo(layerId) {
      const idx = state.stack.findIndex((l) => l.id === layerId);
      if (idx === -1) return;
      for (let i = state.stack.length - 1; i > idx; i--) {
        const isTop = i === state.stack.length - 1;
        result.dispatch(state.stack[i]!.id, {
          type: 'DISMISS',
          source: isTop ? 'programmatic' : 'popped-past',
          skipAnimation: !isTop,
        });
      }
    },
    popToRoot() {
      const root = state.stack[0];
      if (root) result.popTo(root.id);
    },
    dismissAll() {
      for (let i = state.stack.length - 1; i >= 0; i--) {
        result.dispatch(state.stack[i]!.id, { type: 'DISMISS', source: 'programmatic' });
      }
    },
    snap(layerId, detentId, opts = {}) {
      result.dispatch(layerId, { type: 'SNAP', detentId, animated: opts.animated ?? true });
    },
    reportMemoryWarning(level: 'warning' | 'critical' = 'warning') {
      const keep = level === 'critical' ? 1 : 2;
      const stack = state.stack;
      const toEvict = stack
        .slice(0, Math.max(0, stack.length - keep))
        .filter((l) => l.phase === 'background' || l.phase === 'active')
        .map((l) => l.id);
      for (const id of toEvict) {
        result.dispatch(id, { type: 'EVICT' });
      }
    },
    hydrate(layers) {
      state = { stack: layers.map((l) => ({ ...l, hydrated: true }) as InternalLayer) };
      // Hydration comes from the router; bypass syncRouter to avoid echoing
      // back. Seed lastIdSeq so the next genuine shape change is detected.
      lastIdSeq = state.stack.map((l) => l.id);
      notify();
    },
    serialize() {
      return state.stack.map(({ id, kind, phase, props }) => ({
        id,
        kind,
        phase,
        ...(props !== undefined && { props }),
      }));
    },
    dispatch(layerId, event: LayerEvent) {
      const idx = state.stack.findIndex((l) => l.id === layerId);
      if (idx === -1) return;
      const layer = state.stack[idx]!;
      // Idempotency: MOUNTED from an already-transitioned phase is a no-op (StrictMode).
      if (event.type === 'MOUNTED' && layer.phase !== 'mounting') return;
      // Idempotency: EVICT to already-evicted layer is a no-op.
      if (event.type === 'EVICT' && layer.phase === 'evicted') return;

      // DISMISSED: splice from stack, fire resolver. No phase destination.
      if (event.type === 'DISMISSED') {
        if (layer.phase !== 'dismissing') {
          if (dev) {
            throw new Error(
              `Invalid transition: DISMISSED from phase ${layer.phase} (layer ${layerId})`,
            );
          }
          return;
        }
        const dismissSource = (layer as InternalLayer & { pendingSource?: string }).pendingSource;
        const stack = state.stack.filter((_, i) => i !== idx);
        state = { stack };
        lru.forget(layerId);
        snapshotProviders.delete(layerId);
        layer.resolve?.(layer.pendingResult);
        // Router-driven dismiss: history is already authoritative, don't echo
        // a write back. Refresh the id-sequence snapshot so the next genuine
        // shape change is detected.
        if (dismissSource === 'router') {
          lastIdSeq = state.stack.map((l) => l.id);
          notify();
        } else {
          syncedNotify();
        }
        if (state.stack.length === 0) events.clearAll();
        // Promote the exposed underlay back to 'active' so it accepts input
        // again. Covers both the normal background → active path and the
        // edge case where rapid pushes left an older layer mid-presenting.
        const newTop = state.stack[state.stack.length - 1];
        if (newTop) {
          if (newTop.phase === 'background') {
            result.dispatch(newTop.id, { type: 'FOREGROUND' });
          } else if (newTop.phase === 'presenting') {
            // Force-complete the deferred present so it lands in 'active'.
            result.dispatch(newTop.id, { type: 'PRESENTED' });
          }
        }
        return;
      }

      const next = transitions[layer.phase][event.type];
      if (!next) {
        if (dev) {
          throw new Error(
            `Invalid transition: ${event.type} from phase ${layer.phase} (layer ${layerId})`,
          );
        }
        return;
      }

      // Snapshot: capture before background/evict transitions
      if (layer.phase === 'active' && next === 'background') {
        captureSnapshot(layerId, 'background');
      } else if (layer.phase === 'background' && next === 'evicted') {
        captureSnapshot(layerId, 'evicted');
      }

      // Snapshot: restore on MOUNTED after REVIVE (snapshot exists → was evicted)
      if (event.type === 'MOUNTED' && layer.snapshot) {
        restoreSnapshot(layerId);
      }

      const updates: Partial<InternalLayer> = { phase: next };
      if (event.type === 'DISMISS') {
        updates.pendingResult = event.result;

        (updates as unknown as Record<string, unknown>).pendingSource = event.source;
      }
      if (event.type === 'SNAP') {
        updates.detentId = event.detentId;
      }
      // Snapshot: clear when layer becomes active (consumed)
      if (next === 'active') {
        (updates as unknown as Record<string, unknown>).snapshot = undefined;
      }
      replaceLayer(idx, updates);
      notify();

      if (event.type === 'DISMISS' && event.skipAnimation) {
        const dismissedIdx = state.stack.findIndex((l) => l.id === layerId);
        const dismissed = state.stack[dismissedIdx]! as InternalLayer;
        state = { stack: state.stack.filter((_, i) => i !== dismissedIdx) };
        notify();
        lru.forget(layerId);
        snapshotProviders.delete(layerId);
        dismissed.resolve?.(dismissed.pendingResult);
      }
    },
    registerSnapshotProvider(layerId, key, provider) {
      if (!snapshotProviders.has(layerId)) {
        snapshotProviders.set(layerId, new Map());
      }
      snapshotProviders.get(layerId)!.set(key, provider);
      return () => {
        snapshotProviders.get(layerId)?.delete(key);
      };
    },
    events,
  };

  // wire onPopState after store is constructed (needs self-reference for dispatch)
  // Under ADR 0002 the store's popstate handler is responsible only for
  // ephemeral layers. Route-bound tops are managed by the route component
  // they live in — `useLayerRoute` cleanup runs when Next unmounts the
  // intercepted modal, splicing the layer from the stack. Doing the same
  // dismiss here would race with that cleanup.
  router?.onPopState((incoming) => {
    popstateInFlight = true;
    try {
      const target = incoming.length;
      while (state.stack.length > target) {
        const top = state.stack[state.stack.length - 1];
        if (!top) break;
        if (top.flavor === 'route-bound') break;
        result.dispatch(top.id, { type: 'DISMISS', source: 'router', skipAnimation: true });
      }
    } finally {
      popstateInFlight = false;
      lastIdSeq = state.stack.map((l) => l.id);
    }
  });

  return result;
}
