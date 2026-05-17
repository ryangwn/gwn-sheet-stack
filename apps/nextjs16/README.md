# @gwn-sheet-stack/example-nextjs16

Runnable Next.js 16 (App Router) reference for sheet-stack with browser history as the source of truth.

The article feed projects the stack onto history: route-bound layers come from intercepting + parallel routes, ephemeral layers get synthetic history entries, and a vaul drawer adapter handles presentation.

For the full integration guide, see [`@gwn-sheet-stack/adapters-router-next`](../../packages/adapters-router-next/README.md).

## Run

```bash
# from the repo root
bun install
bun run example:nextjs16
```

Open http://localhost:3000.

## What it shows

- **Route-bound layers** — clicking an article navigates to `/articles/[id]` and Next renders the intercepted modal page over the feed. The intercepted page calls `useLayerRoute('article-detail', { articleId })` and renders nothing itself; the vaul drawer is rendered by `Stage` (in the root provider).
- **Content-addressed dedup** — `(kind, props)` hashes to the layer id. Re-mounting the same intercepted route is idempotent. Opt out with `dedup: false` for reading flows.
- **Reading flow / forward navigation** — "Keep reading" cards in the article detail call `push({ kind: 'article-detail', props, dedup: false })` and update the URL via `history.replaceState` (not Next's router), so the parent intercepted route stays mounted and the underlay doesn't tear down.
- **Animated close on history back** — `layer.close()` calls `history.back()` for route-bound layers. The route unmounts, `useLayerRoute` cleanup dispatches an animated DISMISS (deferred by one task to survive StrictMode), and the surface adapter (`useVaulLayer`) drives the exit transition.
- **Refresh-survival** — below-top slice persists in `history.state.__ss`. Hydration is lazy: the first route-bound push triggers it, so direct visits to the full-page fallback don't leave an orphan sheet over the page.

## File map

| File                                                     | Role                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [app/layout.tsx](app/layout.tsx)                         | Root layout. Renders both `{children}` and the `{modal}` parallel slot.                    |
| [app/page.tsx](app/page.tsx)                             | Feed (`ArticleListScreen`). Each card is a `<Link href="/articles/[id]">`.                 |
| [app/articles/[id]/page.tsx](app/articles/[id]/page.tsx) | Full-page fallback for direct visits / refresh. Server-rendered.                           |
| `app/@modal/(.)articles/[id]/page.tsx`                   | Intercepted modal route. `useLayerRoute('article-detail', { articleId })`. Renders null.   |
| `app/@modal/default.tsx`                                 | Parallel-slot default. Returns `null` so cross-section nav unmounts cleanly.               |
| [app/providers.tsx](app/providers.tsx)                   | Creates the store with `nextAppRouterAdapter()` and mounts `Stage` with the kind registry. |
| [app/article-feed/](app/article-feed/)                   | Layer components + registry. `ArticleDetailLayer` is the vaul drawer renderer.             |
| [app/hooks/useVaulLayer.ts](app/hooks/useVaulLayer.ts)   | Surface adapter — maps the FSM phase to vaul's controlled `open` and times the splice.     |

## How a close animates

1. User clicks ✕ → `layer.close()` sees `flavor === 'route-bound'` → `window.history.back()`.
2. popstate fires. Store's handler short-circuits on route-bound (doesn't splice).
3. Next router unmounts the intercepted page.
4. `useLayerRoute` cleanup schedules `DISMISS` via `setTimeout(0)` (StrictMode-safe).
5. The timer fires → phase becomes `'dismissing'` → `useVaulLayer` flips `open` to `false`. Vaul plays its exit transition.
6. After 500ms (`useVaulLayer`'s timer), `DISMISSED` fires → the store splices the layer.

## UX to try

1. Click an article → URL changes to `/articles/[id]`, drawer slides up.
2. Click a "Keep reading" card → stack deepens (non-dedup), URL updates via `replaceState`.
3. Close ✕ or browser Back → drawer animates closed.
4. Refresh while the drawer is open → drawer reopens to the same article.
5. Open `/articles/[id]` in a fresh tab → full-page fallback renders (no orphan drawer).
