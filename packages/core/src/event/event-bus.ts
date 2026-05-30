type Handler<T = unknown> = (payload: T) => void;

interface SubscribeOptions {
  sticky?: boolean;
}

interface PublishOptions {
  sticky: boolean;
}

export class EventBus {
  private subs = new Map<string, Set<Handler>>();
  private sticky = new Map<string, unknown>();

  emit<T>(name: string, payload: T): void {
    const handlers = this.subs.get(name);
    if (handlers) {
      for (const h of handlers) h(payload);
    }
  }

  publish<T>(name: string, payload: T, opts: PublishOptions): void {
    if (opts.sticky) this.sticky.set(name, payload);
    this.emit(name, payload);
  }

  subscribe<T>(name: string, handler: Handler<T>, opts: SubscribeOptions = {}): () => void {
    if (!this.subs.has(name)) this.subs.set(name, new Set());
    this.subs.get(name)!.add(handler as Handler);

    if (opts.sticky && this.sticky.has(name)) {
      handler(this.sticky.get(name) as T);
    }

    return () => {
      this.subs.get(name)?.delete(handler as Handler);
    };
  }

  clear(name: string): void {
    this.sticky.delete(name);
  }

  clearAll(): void {
    this.sticky.clear();
  }
}
