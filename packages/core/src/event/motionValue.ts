export class MotionValue<T> {
  private value: T;
  private subscribers = new Set<(v: T) => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    if (this.value === next) return;
    this.value = next;
    this.subscribers.forEach((fn) => fn(next));
  }

  subscribe(fn: (v: T) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}
