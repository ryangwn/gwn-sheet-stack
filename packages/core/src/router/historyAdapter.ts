import type { RouterAdapter, SerializedLayer } from '../index';

const KEY = '__ss';

function encode(stack: SerializedLayer[]): string {
  return JSON.stringify(stack);
}

function decode(s: string | null): SerializedLayer[] {
  if (!s) return [];
  try {
    return JSON.parse(s) as SerializedLayer[];
  } catch {
    return [];
  }
}

export function historyAdapter(): RouterAdapter {
  return {
    read() {
      return decode(new URLSearchParams(location.search).get(KEY));
    },
    write(stack) {
      const url = new URL(location.href);
      if (stack.length) {
        url.searchParams.set(KEY, encode(stack));
      } else {
        url.searchParams.delete(KEY);
      }
      history.replaceState({ ...history.state, ss: stack }, '', url);
    },
    onPopState(cb) {
      const handler = (e: PopStateEvent) => cb((e.state?.ss as SerializedLayer[]) ?? []);
      addEventListener('popstate', handler);
      return () => removeEventListener('popstate', handler);
    },
    pushHistory() {
      history.pushState({ ...history.state }, '');
    },
  };
}
