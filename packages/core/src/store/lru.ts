export class LRUMountWindow {
  private order = new Map<string, undefined>();

  constructor(public readonly windowSize: number) {}

  touch(id: string): void {
    this.order.delete(id);
    this.order.set(id, undefined);
  }

  isMounted(id: string): boolean {
    if (!this.order.has(id)) return false;
    const threshold = this.order.size - this.windowSize;
    let i = 0;
    for (const key of this.order.keys()) {
      if (key === id) return i >= threshold;
      i++;
    }
    return false;
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
  }
}
