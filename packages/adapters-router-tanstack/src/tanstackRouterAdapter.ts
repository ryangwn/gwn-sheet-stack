import type { RouterAdapter, SerializedLayer } from '@gwn-sheet-stack/core';

const KEY = '__ss';

// NOTE (ADR 0002 follow-up): the canonical history-based adapters now store
// the below-top slice in `history.state.ss`, not the URL. TanStack Router
// doesn't expose history.state writes directly, so this adapter still
// round-trips through a search param for now. A route-table redesign is
// scheduled in issue #6.

function encode(stack: SerializedLayer[]): string {
  return JSON.stringify(stack);
}

function decode(raw: unknown): SerializedLayer[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SerializedLayer[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as SerializedLayer[];
  return [];
}

export interface TanstackAdapterOptions {
  /** Search param key. Default: '__ss' */
  key?: string;
}

/**
 * RouterAdapter for TanStack Router.
 *
 * Setup — add the search param schema to your root route:
 * ```ts
 * import { z } from 'zod';
 * import { createRootRoute } from '@tanstack/react-router';
 *
 * export const Route = createRootRoute({
 *   validateSearch: z.object({
 *     __ss: z.string().optional(),
 *   }),
 * });
 * ```
 *
 * Usage:
 * ```ts
 * import { createStackStore } from '@gwn-sheet-stack/core';
 * import { tanstackRouterAdapter } from '@gwn-sheet-stack/adapters-router-tanstack';
 * import { router } from './router';
 *
 * export const stackStore = createStackStore({
 *   mountWindow: 3,
 *   router: tanstackRouterAdapter(router),
 * });
 * ```
 *
 * Route masking: wrap push URLs with `router.buildLocation({ mask: ... })`
 * at the call site to keep shareable URLs clean.
 */
export function tanstackRouterAdapter(
  tanstackRouter: {
    navigate: (opts: {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
      replace?: boolean;
    }) => void;
    history: { push: (path: string) => void };
    parseLocation: () => { search: Record<string, unknown> };
    subscribe: (event: string, cb: () => void) => () => void;
  },
  opts: TanstackAdapterOptions = {},
): RouterAdapter {
  const key = opts.key ?? KEY;

  return {
    read() {
      const search = tanstackRouter.parseLocation().search;
      return decode(search[key]);
    },

    write(stack) {
      tanstackRouter.navigate({
        search: (prev) => {
          if (stack.length === 0) {
            const next = { ...prev };
            delete next[key];
            return next;
          }
          return { ...prev, [key]: encode(stack) };
        },
        replace: true,
      });
    },

    onPopState(cb) {
      // TanStack Router fires 'onBeforeLoad' / 'onLoad' — subscribe to history changes
      const unsub = tanstackRouter.subscribe('onLoad', () => {
        const search = tanstackRouter.parseLocation().search;
        cb(decode(search[key]));
      });
      return unsub;
    },

    pushHistory() {
      // TanStack Router manages history; pushing a new entry happens via navigate
      // without replace — this is a no-op here since navigate({replace:false}) is default
    },
  };
}
