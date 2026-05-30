import { describe, expect, mock, test } from 'bun:test';

import { EventBus } from '../index';

describe('EventBus', () => {
  test('emit() notifies subscribers', () => {
    const bus = new EventBus();
    const cb = mock(() => {});
    bus.subscribe('ping', cb);
    bus.emit('ping', 42);
    expect(cb).toHaveBeenCalledWith(42);
  });

  test('emit() does not notify other event subscribers', () => {
    const bus = new EventBus();
    const cb = mock(() => {});
    bus.subscribe('other', cb);
    bus.emit('ping', 1);
    expect(cb).not.toHaveBeenCalled();
  });

  test('unsubscribe stops future notifications', () => {
    const bus = new EventBus();
    const cb = mock(() => {});
    const unsub = bus.subscribe('ping', cb);
    unsub();
    bus.emit('ping', 1);
    expect(cb).not.toHaveBeenCalled();
  });

  test('publish() with sticky:true retains last value', () => {
    const bus = new EventBus();
    bus.publish('x', 1, { sticky: true });
    bus.publish('x', 2, { sticky: true });
    const cb = mock(() => {});
    bus.subscribe('x', cb, { sticky: true });
    // replays last value immediately on subscribe
    expect(cb).toHaveBeenCalledWith(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('sticky subscribe does NOT replay when no sticky value stored', () => {
    const bus = new EventBus();
    const cb = mock(() => {});
    bus.subscribe('x', cb, { sticky: true });
    expect(cb).not.toHaveBeenCalled();
  });

  test('non-sticky subscribe does NOT replay sticky value', () => {
    const bus = new EventBus();
    bus.publish('x', 99, { sticky: true });
    const cb = mock(() => {});
    bus.subscribe('x', cb); // no sticky option
    expect(cb).not.toHaveBeenCalled();
  });

  test('clear() removes sticky slot', () => {
    const bus = new EventBus();
    bus.publish('x', 1, { sticky: true });
    bus.clear('x');
    const cb = mock(() => {});
    bus.subscribe('x', cb, { sticky: true });
    expect(cb).not.toHaveBeenCalled();
  });

  test('clearAll() removes all sticky slots', () => {
    const bus = new EventBus();
    bus.publish('a', 1, { sticky: true });
    bus.publish('b', 2, { sticky: true });
    bus.clearAll();
    const cbA = mock(() => {});
    const cbB = mock(() => {});
    bus.subscribe('a', cbA, { sticky: true });
    bus.subscribe('b', cbB, { sticky: true });
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).not.toHaveBeenCalled();
  });

  test('publish() also notifies existing subscribers immediately', () => {
    const bus = new EventBus();
    const cb = mock(() => {});
    bus.subscribe('x', cb);
    bus.publish('x', 7, { sticky: true });
    expect(cb).toHaveBeenCalledWith(7);
  });

  test('one sticky slot per name — overwrites previous', () => {
    const bus = new EventBus();
    bus.publish('x', 'first', { sticky: true });
    bus.publish('x', 'second', { sticky: true });
    const values: unknown[] = [];
    bus.subscribe('x', (v) => values.push(v), { sticky: true });
    expect(values).toEqual(['second']);
  });
});
