import { EventBus as EventBusImpl } from '../event/eventBus';
import { type LayerEvent, transitions } from './fsm';
import { hashLayerId } from './layerId';
import { LRUMountWindow } from './lru';
import { SnapshotStore } from './snapshotStore';
import type {
  Layer,
  PushRequest,
  RouterAdapter,
  SerializedLayer,
  SnapshotProvider,
  StackStore,
  StackStoreConfig,
  State,
} from './types';

interface InternalLayer extends Layer {
  resolve?: (value: unknown) => void;
  pendingResult?: unknown;
  hydrated?: boolean;
}

class StackStoreImpl extends SnapshotStore implements StackStore {
  readonly events = new EventBusImpl();
  readonly hasRouter: boolean;

  private readonly dev: boolean;
  private readonly maxDepth: number;
  private readonly router: RouterAdapter | undefined;
  private readonly lru: LRUMountWindow;
  private readonly snapshotProviders = new Map<string, Map<string, SnapshotProvider>>();

  private state: { stack: readonly InternalLayer[] } = { stack: [] };
  private nonce = 0;
  private lastIdSeq: readonly string[] = [];
  private popstateInFlight = false;
  private hydratedFromRouter = false;

  constructor(config: StackStoreConfig) {
    super();
    // `process` is undefined in non-bundled ESM (browser direct, Deno). Guard
    // so `createStackStore({mountWindow:3})` doesn't ReferenceError on the
    // first call. Consumers can still force-set `dev` via config.
    this.dev =
      config.dev ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');
    this.maxDepth = config.maxDepth ?? Infinity;
    this.router = config.router;
    this.lru = new LRUMountWindow(config.mountWindow);
    this.hasRouter = this.router !== undefined;

    // Under ADR 0002 the store's popstate handler is responsible only for
    // ephemeral layers. Route-bound tops are managed by the route component
    // they live in — `useLayerRoute` cleanup runs when Next unmounts the
    // intercepted modal, splicing the layer from the stack. Doing the same
    // dismiss here would race with that cleanup.
    this.router?.onPopState((incoming) => {
      this.popstateInFlight = true;
      try {
        const target = incoming.length;
        while (this.state.stack.length > target) {
          const top = this.state.stack[this.state.stack.length - 1];
          if (!top) break;
          if (top.flavor === 'route-bound') break;
          // Already dismissing means a local DISMISS is in flight (e.g. user
          // close button calling history.back() to consume its own synthetic
          // entry). Re-dispatching DISMISS would throw in dev (no transition
          // from 'dismissing') and the in-flight DISMISSED will splice anyway.
          if (top.phase === 'dismissing') break;
          this.dispatch(top.id, { type: 'DISMISS', source: 'router', skipAnimation: true });
        }
      } finally {
        this.popstateInFlight = false;
        this.lastIdSeq = this.state.stack.map((l) => l.id);
      }
    });
  }

  private replaceLayer(idx: number, updates: Partial<InternalLayer>): void {
    const stack = [...this.state.stack];
    stack[idx] = { ...this.state.stack[idx]!, ...updates };
    this.state = { stack };
  }

  private captureSnapshot(layerId: string, trigger: 'background' | 'evicted'): void {
    const providers = this.snapshotProviders.get(layerId);
    if (!providers) return;
    const idx = this.state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const existing = this.state.stack[idx]!.snapshot;
    const captured: Record<string, unknown> = existing ? { ...existing } : {};
    let anyCaptured = false;
    for (const [key, provider] of providers) {
      if (trigger === 'evicted' || provider.triggers.includes('background')) {
        captured[key] = provider.capture();
        anyCaptured = true;
      }
    }
    if (anyCaptured || existing) this.replaceLayer(idx, { snapshot: captured });
  }

  private restoreSnapshot(layerId: string): void {
    const providers = this.snapshotProviders.get(layerId);
    if (!providers) return;
    const idx = this.state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const snap = this.state.stack[idx]!.snapshot;
    if (!snap) return;
    for (const [key, provider] of providers) {
      if (key in snap) provider.restore(snap[key]);
    }
  }

  // ADR 0002 / issue #5: emit the full stack, including the ephemeral top
  // when present. The adapter's `stripTop` trims the route-bound top (which
  // is implied by the URL) but keeps ephemerals (which are not). Flavor is
  // carried so the popstate reconciler and hydration filter know each
  // entry's lifetime semantic.
  private serializeForRouter(): SerializedLayer[] {
    return this.state.stack.map((l) => ({
      kind: l.kind,
      ...(l.props !== undefined && { props: l.props }),
      flavor: l.flavor ?? 'ephemeral',
    }));
  }

  // Shape-diff write cadence (ADR 0002): the router only sees stack shape
  // changes, not FSM phase transitions. `syncRouter` is a no-op when the id
  // sequence is unchanged from the last write — opening a layer fires
  // `mounting → presenting → active` but only one router.write.
  private syncRouter(): void {
    if (!this.router) return;
    if (this.popstateInFlight) return;
    const ids = this.state.stack.map((l) => l.id);
    if (ids.length === this.lastIdSeq.length && ids.every((id, i) => id === this.lastIdSeq[i])) {
      return;
    }
    this.lastIdSeq = ids;
    this.router.write(this.serializeForRouter());
  }

  private syncedNotify(): void {
    this.emit();
    this.syncRouter();
  }

  getState = (): State => this.state as State;

  push = <R = unknown>(req: PushRequest): Promise<R> => {
    // Lazy below-top hydration (ADR 0002 gate): only restore stale
    // `history.state.__ss` route-bound entries when an intercepted modal
    // confirms it owns the URL by pushing a route-bound layer. On a direct
    // visit / refresh that lands on the full-page fallback, no
    // `useLayerRoute` fires, so the stack stays empty and no orphan sheet
    // appears over the page.
    if (
      !this.hydratedFromRouter &&
      this.router &&
      this.state.stack.length === 0 &&
      req.flavor === 'route-bound'
    ) {
      this.hydratedFromRouter = true;
      const initial = this.router.read();
      const restorable = initial.filter((l) => (l.flavor ?? 'route-bound') === 'route-bound');
      if (restorable.length > 0) {
        this.state = {
          stack: restorable.map(
            (l) =>
              ({
                id: hashLayerId(l.kind, l.props),
                kind: l.kind,
                phase: 'active',
                props: l.props,
                flavor: 'route-bound',
                hydrated: true,
              }) as InternalLayer,
          ),
        };
        this.lastIdSeq = this.state.stack.map((l) => l.id);
        this.emit();
      }
    }
    const dedup = req.dedup !== false;
    // Content-addressed dedup (ADR 0002): if the same (kind, props) is
    // already in the stack, bring it to the top instead of duplicating.
    // popTo() is a no-op when the target is already top, so this is the
    // natural idempotency check for route re-mounts.
    //
    // Opt-out via `dedup: false` for reading flows where revisiting the
    // same content is forward navigation. The layer gets a unique id
    // suffix so the store can still address it unambiguously.
    const baseId = hashLayerId(req.kind, req.props);
    const id = dedup ? baseId : `${baseId}#${++this.nonce}`;
    if (dedup) {
      const existingIdx = this.state.stack.findIndex((l) => l.id === id);
      if (existingIdx !== -1) {
        this.popTo(id);
        return Promise.resolve(undefined as R);
      }
    }
    if (this.state.stack.length >= this.maxDepth) {
      if (this.dev) {
        console.warn(`[sheet-stack] maxDepth (${this.maxDepth}) exceeded — push ignored.`);
      }
      return Promise.resolve(undefined as R);
    }
    let resolve!: (value: unknown) => void;
    const promise = new Promise<R>((res) => {
      resolve = res as (value: unknown) => void;
    });
    const prevTop = this.state.stack[this.state.stack.length - 1];
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
    this.lru.touch(layer.id);
    if (req.reset) {
      const toEvict = [...this.state.stack];
      this.state = { stack: [...this.state.stack, layer] };
      for (let i = toEvict.length - 1; i >= 0; i--) {
        this.dispatch(toEvict[i]!.id, {
          type: 'DISMISS',
          source: 'reset',
          skipAnimation: true,
        });
      }
      this.syncedNotify();
    } else if (req.replace && prevTop) {
      this.state = { stack: [...this.state.stack, layer] };
      this.dispatch(prevTop.id, { type: 'DISMISS', source: 'replaced', skipAnimation: true });
      this.syncedNotify();
    } else {
      this.state = { stack: [...this.state.stack, layer] };
      // Only ephemerals create a synthetic history entry. Route-bound
      // layers come from `useLayerRoute` running inside a route file that
      // Next already navigated to via <Link>; pushing another entry would
      // duplicate the URL and break `layer.close() → history.back()`
      // (especially under StrictMode's mount→cleanup→remount cycle in
      // dev). See ADR 0002.
      if (layer.flavor !== 'route-bound') {
        this.router?.pushHistory();
      }
      this.syncedNotify();
      // Background prev top whether it was active OR still presenting —
      // both phases accept BACKGROUND now.
      if (prevTop && (prevTop.phase === 'active' || prevTop.phase === 'presenting')) {
        this.dispatch(prevTop.id, { type: 'BACKGROUND' });
      }
      // auto-evict overflow after push
      for (const overflowId of this.lru.computeOverflow()) {
        const l = this.state.stack.find((x) => x.id === overflowId);
        if (l && (l.phase === 'background' || l.phase === 'active')) {
          this.dispatch(overflowId, { type: 'EVICT' });
        }
      }
    }
    return promise;
  };

  pop = (popResult?: unknown): void => {
    const top = this.state.stack[this.state.stack.length - 1];
    if (!top) return;
    // Only act on a settled top. Blocks rapid double-fires that would dismiss
    // the freshly-promoted underlay before it visually arrives.
    if (top.phase !== 'active') return;
    this.dispatch(top.id, { type: 'DISMISS', source: 'programmatic', result: popResult });
  };

  popTo = (layerId: string): void => {
    const idx = this.state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    for (let i = this.state.stack.length - 1; i > idx; i--) {
      const isTop = i === this.state.stack.length - 1;
      this.dispatch(this.state.stack[i]!.id, {
        type: 'DISMISS',
        source: isTop ? 'programmatic' : 'popped-past',
        skipAnimation: !isTop,
      });
    }
  };

  popToRoot = (): void => {
    const root = this.state.stack[0];
    if (root) this.popTo(root.id);
  };

  dismissAll = (): void => {
    for (let i = this.state.stack.length - 1; i >= 0; i--) {
      this.dispatch(this.state.stack[i]!.id, { type: 'DISMISS', source: 'programmatic' });
    }
  };

  snap = (layerId: string, detentId: string, opts: { animated?: boolean } = {}): void => {
    this.dispatch(layerId, { type: 'SNAP', detentId, animated: opts.animated ?? true });
  };

  reportMemoryWarning = (level: 'warning' | 'critical' = 'warning'): void => {
    const keep = level === 'critical' ? 1 : 2;
    const stack = this.state.stack;
    const toEvict = stack
      .slice(0, Math.max(0, stack.length - keep))
      .filter((l) => l.phase === 'background' || l.phase === 'active')
      .map((l) => l.id);
    for (const id of toEvict) {
      this.dispatch(id, { type: 'EVICT' });
    }
  };

  hydrate = (layers: Layer[]): void => {
    // Content-addressing is the invariant (ADR 0002): the caller-supplied id
    // is ignored — we re-derive from (kind, props) so hydrate cannot smuggle
    // in a layer whose id disagrees with a subsequent push of the same
    // (kind, props).
    //
    // Phase is clamped to 'active' regardless of input. Accepting 'evicted'
    // or 'dismissing' would deadlock the FSM (no MOUNTED transition from
    // those phases) and leak a stuck record in the stack. Snapshot is
    // dropped for the same reason; restore happens on the next MOUNTED.
    this.state = {
      stack: layers.map((l) => {
        // Drop snapshot from input — restore happens on next MOUNTED, not on
        // hydrate. `exactOptionalPropertyTypes` rejects `snapshot: undefined`,
        // so destructure-and-omit rather than overwrite.
        const { snapshot: _drop, ...rest } = l;
        void _drop;
        return {
          ...rest,
          id: hashLayerId(l.kind, l.props),
          phase: 'active',
          hydrated: true,
        } as InternalLayer;
      }),
    };
    this.lastIdSeq = this.state.stack.map((l) => l.id);
    this.emit();
  };

  serialize = (): Layer[] => {
    return this.state.stack.map(({ id, kind, phase, props }) => ({
      id,
      kind,
      phase,
      ...(props !== undefined && { props }),
    }));
  };

  dispatch = (layerId: string, event: LayerEvent): void => {
    const idx = this.state.stack.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const layer = this.state.stack[idx]!;
    // Idempotency: MOUNTED from an already-transitioned phase is a no-op (StrictMode).
    if (event.type === 'MOUNTED' && layer.phase !== 'mounting') return;
    // Idempotency: EVICT to already-evicted layer is a no-op.
    if (event.type === 'EVICT' && layer.phase === 'evicted') return;

    // DISMISSED: splice from stack, fire resolver. No phase destination.
    if (event.type === 'DISMISSED') {
      if (layer.phase !== 'dismissing') {
        if (this.dev) {
          throw new Error(
            `Invalid transition: DISMISSED from phase ${layer.phase} (layer ${layerId})`,
          );
        }
        return;
      }
      const dismissSource = (layer as InternalLayer & { pendingSource?: string }).pendingSource;
      const stack = this.state.stack.filter((_, i) => i !== idx);
      this.state = { stack };
      this.lru.forget(layerId);
      this.snapshotProviders.delete(layerId);
      layer.resolve?.(layer.pendingResult);
      // Router-driven dismiss: history is already authoritative, don't echo
      // a write back. Refresh the id-sequence snapshot so the next genuine
      // shape change is detected.
      if (dismissSource === 'router') {
        this.lastIdSeq = this.state.stack.map((l) => l.id);
        this.emit();
      } else {
        this.syncedNotify();
      }
      if (this.state.stack.length === 0) this.events.clearAll();
      // Promote the exposed underlay back to 'active' so it accepts input
      // again. Covers both the normal background → active path and the
      // edge case where rapid pushes left an older layer mid-presenting.
      const newTop = this.state.stack[this.state.stack.length - 1];
      if (newTop) {
        if (newTop.phase === 'background') {
          this.dispatch(newTop.id, { type: 'FOREGROUND' });
        } else if (newTop.phase === 'presenting') {
          // Force-complete the deferred present so it lands in 'active'.
          this.dispatch(newTop.id, { type: 'PRESENTED' });
        }
      }
      return;
    }

    const next = transitions[layer.phase][event.type];
    if (!next) {
      if (this.dev) {
        throw new Error(
          `Invalid transition: ${event.type} from phase ${layer.phase} (layer ${layerId})`,
        );
      }
      return;
    }

    // Snapshot: capture before background/evict transitions
    if (layer.phase === 'active' && next === 'background') {
      this.captureSnapshot(layerId, 'background');
    } else if (layer.phase === 'background' && next === 'evicted') {
      this.captureSnapshot(layerId, 'evicted');
    }

    // Snapshot: restore on MOUNTED after REVIVE (snapshot exists → was evicted)
    if (event.type === 'MOUNTED' && layer.snapshot) {
      this.restoreSnapshot(layerId);
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
    this.replaceLayer(idx, updates);
    this.emit();

    if (event.type === 'DISMISS' && event.skipAnimation) {
      const dismissedIdx = this.state.stack.findIndex((l) => l.id === layerId);
      const dismissed = this.state.stack[dismissedIdx]! as InternalLayer;
      this.state = { stack: this.state.stack.filter((_, i) => i !== dismissedIdx) };
      this.emit();
      this.lru.forget(layerId);
      this.snapshotProviders.delete(layerId);
      dismissed.resolve?.(dismissed.pendingResult);
    }
  };

  registerSnapshotProvider = (
    layerId: string,
    key: string,
    provider: SnapshotProvider,
  ): (() => void) => {
    if (!this.snapshotProviders.has(layerId)) {
      this.snapshotProviders.set(layerId, new Map());
    }
    this.snapshotProviders.get(layerId)!.set(key, provider);
    return () => {
      this.snapshotProviders.get(layerId)?.delete(key);
    };
  };
}

export function createStackStore(config: StackStoreConfig): StackStore {
  return new StackStoreImpl(config);
}
