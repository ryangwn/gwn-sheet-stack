'use client';

import type { RouterAdapter, SerializedLayer } from '@gwn-sheet-stack/core';

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

/**
 * RouterAdapter for Next.js App Router.
 *
 * Per ADR 0002 the adapter does not encode the stack in the URL. The top
 * Layer's identity is implied by the pathname (Next intercepting/parallel
 * routes), and the below-top slice lives in `history.state.ss` for in-session
 * back-traversal. Refresh-survival comes from the browser preserving
 * `history.state` within the tab.
 *
 * Filesystem convention for parallel + intercepting routes:
 *
 * app/
 *   @modal/
 *     (.)photo/[id]/
 *       page.tsx        ← intercepted modal route; calls useLayerRoute()
 *     default.tsx       ← MUST export null to prevent stale modal in DOM
 *   layout.tsx          ← renders {children} + {modal} slot
 *   photo/[id]/
 *     page.tsx          ← full-page fallback (direct URL access / refresh)
 */
export function nextAppRouterAdapter(): RouterAdapter {
  return {
    read() {
      return readSliceFromHistory();
    },

    write(stack) {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      // Drop any legacy `?__ss=` payload from earlier 0.1.x versions.
      url.searchParams.delete(STATE_KEY);
      const next: SheetStackState = {
        ...(window.history.state as SheetStackState | null),
        [STATE_KEY]: stripTop(stack),
      };
      // Use replaceState — Next.js router observes this via its own popstate
      // listener.
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
