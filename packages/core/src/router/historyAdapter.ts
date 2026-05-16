// Framework-agnostic RouterAdapter backed by the browser history API.
//
// Per ADR 0002: the URL no longer carries an `__ss=` query parameter. The
// below-top slice of the stack lives in `history.state.ss` (survives refresh
// in-tab, dies on share/copy-link). A consumer's route table — wired in a
// future ticket — supplies the top layer's identity from the pathname.
import type { RouterAdapter, SerializedLayer } from '../index';

const STATE_KEY = '__ss';

interface SheetStackState {
  [STATE_KEY]?: SerializedLayer[];
  [key: string]: unknown;
}

function readSliceFromHistory(): SerializedLayer[] {
  if (typeof window === 'undefined') return [];
  const s = (window.history.state as SheetStackState | null)?.[STATE_KEY];
  return Array.isArray(s) ? (s as SerializedLayer[]) : [];
}

function stripTop(stack: SerializedLayer[]): SerializedLayer[] {
  if (stack.length === 0) return [];
  const top = stack[stack.length - 1]!;
  // Route-bound tops are implied by the URL; ephemeral tops are not, so they
  // need to stay in state.ss so back-traversal can pop them in LIFO order.
  return top.flavor === 'ephemeral' ? stack : stack.slice(0, -1);
}

export function historyAdapter(): RouterAdapter {
  return {
    read() {
      return readSliceFromHistory();
    },
    write(stack) {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      // Drop any legacy `?__ss=` payload from prior versions.
      url.searchParams.delete(STATE_KEY);
      const next: SheetStackState = {
        ...(window.history.state as SheetStackState | null),
        [STATE_KEY]: stripTop(stack),
      };
      window.history.replaceState(next, '', url.toString());
    },
    onPopState(cb) {
      if (typeof window === 'undefined') return () => {};
      const handler = () => cb(readSliceFromHistory());
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    },
    pushHistory() {
      if (typeof window === 'undefined') return;
      window.history.pushState({ ...(window.history.state as object | null) }, '');
    },
  };
}
