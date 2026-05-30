export class LRUMountWindow {
  private order = new Map<string, undefined>();
  private mounted = new Map<string, undefined>();

  constructor(public readonly windowSize: number) {}

  touch(id: string): void {
    if (this.order.has(id)) this.order.delete(id);
    this.order.set(id, undefined);

    if (this.mounted.has(id)) {
      this.mounted.delete(id);
      this.mounted.set(id, undefined);
      return;
    }
    this.mounted.set(id, undefined);
    if (this.mounted.size > this.windowSize) {
      const oldest = this.mounted.keys().next().value;
      if (oldest !== undefined) this.mounted.delete(oldest);
    }
  }

  isMounted(id: string): boolean {
    return this.mounted.has(id);
  }

  computeOverflow(): string[] {
    const overflowCount = this.order.size - this.windowSize;
    if (overflowCount <= 0) return [];
    const result: string[] = [];
    for (const key of this.order.keys()) {
      if (result.length >= overflowCount) break;
      result.push(key);
    }
    return result;
  }

  forget(id: string): void {
    this.order.delete(id);
    this.mounted.delete(id);
  }
}
