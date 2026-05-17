// Framework-agnostic RouterAdapter backed by the browser history API.
//
// Per ADR 0002: the URL no longer carries an `__ss=` query parameter. The
// stack lives in `history.state.ss` (below-top route-bound layers + any
// ephemeral tops). A consumer-supplied route table maps route-bound layer
// kinds to URL patterns; without it, the adapter still works for ephemerals
// and acts as a pure history-state store for route-bound layers.
import type { LayerFlavor, RouterAdapter, SerializedLayer } from '../index';

const STATE_KEY = '__ss';

interface SheetStackState {
  [STATE_KEY]?: SerializedLayer[];
  [key: string]: unknown;
}

export interface RouteEntry<K extends string = string, P = unknown> {
  /** URL pattern, e.g. `/articles/:id`. `:name` segments are captured. */
  pattern: string;
  kind: K;
  /** Extract layer props from a successful pattern match. */
  extract: (params: Record<string, string>) => P;
  /** Build a pathname from layer props. Must be the inverse of `extract`. */
  build: (props: P) => string;
}

export interface HistoryAdapterOptions {
  /**
   * Route table for route-bound layers. Each entry maps a URL pattern to a
   * layer kind. On write, the topmost route-bound layer's `build(props)`
   * sets the URL; on read, a matching pathname reconstructs the top layer
   * via `extract`. Without routes the adapter still round-trips ephemerals.
   */
  routes?: RouteEntry[];
}

interface CompiledRoute {
  entry: RouteEntry;
  regex: RegExp;
  keys: string[];
}

function compile(entry: RouteEntry): CompiledRoute {
  const keys: string[] = [];
  // Escape regex specials except `:` patterns.
  const escaped = entry.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexSrc = escaped.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { entry, regex: new RegExp(`^${regexSrc}\\/?$`), keys };
}

function matchTop(compiled: CompiledRoute[], pathname: string): SerializedLayer | null {
  for (const c of compiled) {
    const m = c.regex.exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    c.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1]!);
    });
    return {
      kind: c.entry.kind,
      props: c.entry.extract(params),
      flavor: 'route-bound' as LayerFlavor,
    };
  }
  return null;
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

export function historyAdapter(opts: HistoryAdapterOptions = {}): RouterAdapter {
  const compiled: CompiledRoute[] = (opts.routes ?? []).map(compile);

  return {
    read() {
      const slice = readSliceFromHistory();
      if (compiled.length === 0 || typeof window === 'undefined') return slice;
      // If the URL matches a route, append the synthesised top so the
      // caller sees the full desired stack.
      const matched = matchTop(compiled, window.location.pathname);
      return matched ? [...slice, matched] : slice;
    },
    write(stack) {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      // Drop any legacy `?__ss=` payload from prior versions.
      url.searchParams.delete(STATE_KEY);
      // If the top is route-bound and we know how to build its URL, do so.
      if (compiled.length > 0 && stack.length > 0) {
        const top = stack[stack.length - 1]!;
        if (top.flavor !== 'ephemeral') {
          const route = compiled.find((c) => c.entry.kind === top.kind);
          if (route) {
            const pathname = route.entry.build(top.props);
            url.pathname = pathname;
          }
        }
      }
      const next: SheetStackState = {
        ...(window.history.state as SheetStackState | null),
        [STATE_KEY]: stripTop(stack),
      };
      window.history.replaceState(next, '', url.toString());
    },
    onPopState(cb) {
      if (typeof window === 'undefined') return () => {};
      const handler = () => {
        const slice = readSliceFromHistory();
        if (compiled.length === 0) {
          cb(slice);
          return;
        }
        const matched = matchTop(compiled, window.location.pathname);
        cb(matched ? [...slice, matched] : slice);
      };
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    },
    pushHistory() {
      if (typeof window === 'undefined') return;
      window.history.pushState({ ...(window.history.state as object | null) }, '');
    },
  };
}
