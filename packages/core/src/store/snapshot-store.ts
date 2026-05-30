/**
 * Snapshot-subscription primitive for `useSyncExternalStore(subscribe, getSnapshot)`:
 * unkeyed listeners, fired together on `emit()`. For named/topic events use
 * `EventBus` from `../event/eventBus`.
 */
export class SnapshotStore {
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  protected emit(): void {
    this.listeners.forEach((l) => l());
  }
}
