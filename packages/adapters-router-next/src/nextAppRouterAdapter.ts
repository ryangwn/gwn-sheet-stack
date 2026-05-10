'use client';

import type { RouterAdapter, SerializedLayer } from 'gwn-sheet-stack-core';

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

export interface NextAdapterOptions {
  /** URL search param key. Default: '__ss' */
  key?: string;
}

/**
 * RouterAdapter for Next.js App Router.
 *
 * Usage:
 * ```ts
 * // app/providers.tsx
 * 'use client';
 * import { createStackStore } from 'gwn-sheet-stack-core';
 * import { nextAppRouterAdapter } from 'gwn-sheet-stack-adapters-router-next';
 *
 * export const stackStore = createStackStore({
 *   mountWindow: 3,
 *   router: nextAppRouterAdapter(),
 * });
 * ```
 *
 * Filesystem convention for parallel + intercepting routes:
 *
 * app/
 *   @modal/
 *     (.)photo/[id]/
 *       page.tsx        ← intercepted modal route
 *     default.tsx       ← MUST export null to prevent stale modal in DOM
 *   layout.tsx          ← renders {children} + {modal} slot
 *   photo/[id]/
 *     page.tsx          ← full-page fallback (direct URL access / refresh)
 */
export function nextAppRouterAdapter(opts: NextAdapterOptions = {}): RouterAdapter {
  const key = opts.key ?? KEY;

  // next/navigation imports are deferred to avoid errors in non-Next envs
  // and because useRouter/useSearchParams must be called inside React components.
  // The adapter reads/writes the URL imperatively via window.location.

  return {
    read() {
      if (typeof window === 'undefined') return [];
      return decode(new URLSearchParams(window.location.search).get(key));
    },

    write(stack) {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      if (stack.length) {
        url.searchParams.set(key, encode(stack));
      } else {
        url.searchParams.delete(key);
      }
      // Use replaceState — Next.js router observes this via its own popstate listener
      window.history.replaceState(window.history.state, '', url.toString());
    },

    onPopState(cb) {
      if (typeof window === 'undefined') return () => {};
      const handler = (_: PopStateEvent) => {
        const params = new URLSearchParams(window.location.search);
        const stack = decode(params.get(key));
        cb(stack);
      };
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    },

    pushHistory() {
      if (typeof window === 'undefined') return;
      window.history.pushState(window.history.state, '');
    },
  };
}
