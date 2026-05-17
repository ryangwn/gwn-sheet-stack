# @gwn-sheet-stack/adapters-router-next

Next.js App Router adapter for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack).

Projects the layer stack onto browser history under Next's intercepting + parallel routes (ADR 0002). The URL is authoritative; the stack is its in-memory shadow. Back/forward, refresh, and direct visits all do the obvious thing.

- **Runnable reference:** [`apps/nextjs16`](../../apps/nextjs16) — article feed with vaul drawer, intercepted modal route, refresh-survival, and forward-navigation reading flow.

---

## Contents

1. [Install](#install)
2. [Concepts](#concepts)
3. [Project structure](#project-structure)
4. [Setup, step by step](#setup-step-by-step)
5. [Defining a layer](#defining-a-layer)
6. [Opening sheets](#opening-sheets)
7. [Closing sheets](#closing-sheets)
8. [Refresh-survival](#refresh-survival)
9. [Pitfalls](#pitfalls)
10. [API](#api)

---

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react @gwn-sheet-stack/adapters-router-next
```

Peer deps: `next >=14`, `react >=18`.

You also need a surface adapter (vaul, Radix Dialog, your own). See [`docs/integration.md`](../../docs/integration.md) for how to wire one.

---

## Concepts

### Two layer flavors

| Flavor          | Lifetime owner                        | URL effect                                       | Pushed via                         |
| --------------- | ------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| **route-bound** | The route component that declared it  | URL changes; Next's intercepted route renders it | `useLayerRoute(kind, props)`       |
| **ephemeral**   | The store + a synthetic history entry | URL unchanged; back-button still closes it       | `useStack().push({ kind, props })` |

Use **route-bound** for anything you'd want to deep-link to (article detail, photo viewer, edit dialog with a stable URL). Use **ephemeral** for transient things (confirmation prompts, drag-to-dismiss panels, toasts-as-sheets).

### Content-addressed ids

`hashLayerId(kind, props)` derives a stable id from JSON-serialized `(kind, props)`. Two pushes with the same content map to the same id — re-mounting the intercepted route under StrictMode/HMR doesn't duplicate the layer.

Opt out with `dedup: false` when revisiting content means going **forward** (reading flow — see [Forward navigation](#3-forward-navigation-non-dedup)).

### History encoding

- The **top** layer's identity is implied by the URL (Next routing).
- The **below-top slice** is serialized into `window.history.state.__ss` (in-tab refresh survives; cross-tab doesn't).
- Ephemeral layers create a synthetic history entry via `pushState` so `history.back()` closes them.

---

## Project structure

Minimum App Router layout:

```
app/
  layout.tsx                    # renders {children} + {modal}
  providers.tsx                 # creates store, mounts Stage
  page.tsx                      # feed / list (links into intercepted routes)
  @modal/
    default.tsx                 # MUST export null
    (.)articles/[id]/
      page.tsx                  # intercepted: calls useLayerRoute
  articles/[id]/
    page.tsx                    # full-page fallback (direct visit / refresh)
```

The parallel slot (`@modal`) is what lets Next render the intercepted route **over** the existing page instead of replacing it.

---

## Setup, step by step

### 1. Root layout — render both slots

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          {modal}
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Providers — create the store, mount the Stage

```tsx
// app/providers.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

import { nextAppRouterAdapter, useSheetStackRouter } from '@gwn-sheet-stack/adapters-router-next';
import { createStackStore } from '@gwn-sheet-stack/core';
import { StackProvider, Stage } from '@gwn-sheet-stack/react';

import { layerRegistry } from './layers';

export function Providers({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => nextAppRouterAdapter(), []);
  const store = useMemo(
    () => createStackStore({ mountWindow: 10, maxDepth: 10, router: adapter }),
    [adapter],
  );
  useSheetStackRouter(store, adapter); // currently a no-op; kept for future adapter-side wiring.

  // `Stage` portals into document.body, which doesn't exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <StackProvider value={store}>
      {children}
      {mounted ? <Stage registry={layerRegistry} mountWindow={10} /> : null}
    </StackProvider>
  );
}
```

### 3. Intercepted modal route — declare the layer

The intercepted page **renders `null`**. Its only job is to own the route-bound layer's lifecycle. The actual surface (vaul drawer, Radix dialog) is rendered by `Stage` via the registry, so it doesn't tear down mid-animation when the route unmounts.

```tsx
// app/@modal/(.)articles/[id]/page.tsx
'use client';

import { use } from 'react';

import { useLayerRoute } from '@gwn-sheet-stack/react';

export default function InterceptedArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useLayerRoute('article-detail', { articleId: id });
  return null;
}
```

### 4. Parallel-slot default — required

```tsx
// app/@modal/default.tsx
export default function Default() {
  return null;
}
```

Without this, navigating to a route that has no intercepted match in `@modal` keeps the previous modal mounted (Next's parallel-slot caching).

### 5. Full-page fallback — for direct visits and refresh

```tsx
// app/articles/[id]/page.tsx
import { ArticleFullPage } from '@/article-feed/ArticleFullPage';

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleFullPage id={id} />;
}
```

When a user opens `/articles/a1` directly (no feed in history), Next renders this page. The store does **not** hydrate orphan sheets from `history.state.__ss` here — hydration is lazy and only fires when an intercepted route actually mounts (i.e., when there's something to render the sheet over).

---

## Defining a layer

A layer is `kind → React component`. Register it once:

```tsx
// app/layers.ts
import { ArticleDetailLayer } from './article-feed/ArticleDetailLayer';

export const layerRegistry = {
  'article-detail': ArticleDetailLayer,
};
```

The component reads its props via `useLayer()` and bridges to its surface library:

```tsx
// ArticleDetailLayer.tsx
'use client';

import { useLayer } from '@gwn-sheet-stack/react';
import { Drawer } from 'vaul';

import { useVaulLayer } from '../hooks/useVaulLayer';

export function ArticleDetailLayer() {
  const layer = useLayer();
  const vaul = useVaulLayer(); // surface adapter — see docs/integration.md
  const { articleId } = layer.props as { articleId: string };

  return (
    <Drawer.Root {...vaul}>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          {/* … */}
          <button onClick={() => layer.close()}>Close</button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

---

## Opening sheets

### 1. From a link (route-bound)

Just use Next's `<Link>`:

```tsx
<Link href={`/articles/${id}`}>{title}</Link>
```

The intercepted route mounts → `useLayerRoute` push → layer rendered by `Stage`.

### 2. From code (ephemeral)

```tsx
const { push } = useStack();
push({ kind: 'confirm-delete', props: { itemId } });
```

No URL change, but a synthetic history entry is created so back-button closes it.

### 3. Forward navigation (non-dedup)

In reading-flow UIs ("Keep reading", related photos), revisiting the same content means **forward**. Push with `dedup: false` and sync the URL via `replaceState` so the parent intercepted route doesn't tear down:

```tsx
function RelatedLink({ id }: { id: string }) {
  const { push } = useStack();
  return (
    <button
      onClick={() => {
        push({ kind: 'article-detail', props: { articleId: id }, dedup: false });
        queueMicrotask(() => {
          window.history.replaceState(window.history.state, '', `/articles/${id}`);
        });
      }}
    >
      …
    </button>
  );
}
```

Why not `<Link>` here? `<Link>` re-runs the route subtree — the parent layer unmounts and you lose the underlay during the transition. `replaceState` keeps Next's tree mounted; only the URL bar updates.

---

## Closing sheets

```tsx
const layer = useLayer();
<button onClick={() => layer.close()}>Close</button>;
```

`close()` routes through `history.back()` so the URL stays authoritative. Here's the full path for a route-bound close:

1. `layer.close()` → `window.history.back()`.
2. popstate fires. Store handler short-circuits on `route-bound` (doesn't splice).
3. Next router unmounts the intercepted page.
4. `useLayerRoute` cleanup schedules `DISMISS` via `setTimeout(0)` — StrictMode-safe (a synchronous remount cancels it).
5. Timer fires → phase enters `'dismissing'` → surface adapter flips `open` to `false`. The library plays its exit animation.
6. After the animation, the surface adapter dispatches `DISMISSED` → the store splices the layer.

You don't write any of this — `useLayerRoute` + your surface adapter take care of it. Browser **Back** flows through the same path; both close gestures animate the same way.

---

## Refresh-survival

`router.write(stack)` runs after every shape change and calls `history.replaceState(...)` to keep `state.__ss` in sync with the below-top slice. Tab refresh preserves `history.state`, so the slice survives.

The top layer **is not** in `state.__ss` — it's encoded in the URL. On refresh:

- **Refresh while the intercepted modal is open** (e.g. URL `/articles/a1` with `state.__ss = []`): Next mounts the intercepted page → `useLayerRoute` pushes → layer appears immediately. If there's a below-top slice, the store hydrates it lazily on that first push.
- **Direct visit to `/articles/a1`** (no in-tab history): Next renders the full-page fallback (`app/articles/[id]/page.tsx`). No `useLayerRoute` fires, so the store stays empty and no orphan drawer hangs over the page.

This split is the whole reason hydration is lazy: it gates restoration on confirmation that an intercepted route actually owns the current URL.

---

## Pitfalls

- **Forgot `app/@modal/default.tsx`** → previous modal sticks around when navigating away. Must export `null`.
- **Used `<Link>` inside an open sheet** → unmounts the parent's intercepted route. Use the forward-navigation pattern (`push({ dedup: false })` + `replaceState`) instead.
- **Surface adapter splices synchronously on close** → no animation. Your adapter must wait `~exit-duration-ms` between phase `'dismissing'` and dispatching `DISMISSED`. See `useVaulLayer` in the example app.
- **Props aren't JSON-serialisable** (functions, Dates, class instances) → `hashLayerId` throws on push. Stick to plain JSON.
- **Calling `store.push` during render** instead of inside `useEffect` or an event handler → effect ordering breaks and you can desync with Next's router.

---

## API

### `nextAppRouterAdapter(): RouterAdapter`

Factory producing the adapter. Implements:

- `read()` — reads the below-top slice from `history.state.__ss`.
- `write(stack)` — `replaceState`s the slice (route-bound top stripped).
- `onPopState(cb)` — subscribes to `window` popstate.
- `pushHistory()` — `pushState`s a synthetic entry for ephemeral layers.

### `useSheetStackRouter(store, adapter): void`

Currently a no-op (hydration moved into the store). Kept in the contract so future adapter-side wiring — popstate listeners scoped to a React lifecycle, etc. — can hook in without breaking call sites.

---

## License

MIT
