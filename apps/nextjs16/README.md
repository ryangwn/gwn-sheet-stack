# @gwn-sheet-stack/example-nextjs16

Runnable Next.js 16 (App Router) reference for **ADR 0002 — history as source of truth**.

The article feed lives in a real Next environment with the stack projected onto browser history, route-bound layers wired through intercepting + parallel routes, and a vaul drawer adapter handling presentation.

## Run

```bash
# from the repo root
bun install
bun run example:nextjs16
```

Then open http://localhost:3000.

## What it shows

- Route-bound article layers — clicking a story in the feed navigates to
  `/articles/[id]` and Next renders the intercepted modal page over the feed.
  Refresh on that URL lands on the full-page fallback.
- `useLayerRoute(kind, props)` declared inside the intercepted page — the
  layer's lifetime is tied to the route component's lifecycle.
- `useSheetStackRouter(store, adapter)` hydrating from `history.state.ss`
  synchronously during the root render (no `useEffect` race with child
  `useLayerRoute` calls).
- `layer.close()` calling `history.back()` so the Next router stays
  authoritative; popstate flows back into the FSM via `useLayerRoute`'s
  cleanup.

## File map (ADR 0002, issue #7)

| File                                                                               | Role                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [app/layout.tsx](app/layout.tsx)                                                   | Root layout. Renders both `{children}` and the `{modal}` parallel slot.            |
| [app/page.tsx](app/page.tsx)                                                       | Feed (`ArticleListScreen`). Each article link is a `<Link href="/articles/[id]">`. |
| [app/articles/[id]/page.tsx](app/articles/[id]/page.tsx)                           | Full-page fallback for direct visits / refresh. Server-rendered.                   |
| `app/@modal/(.)articles/[id]/page.tsx`                                             | Intercepted modal route. `useLayerRoute('article-detail', { articleId })`.         |
| `app/@modal/default.tsx`                                                           | Parallel-slot default. Returns `null` so cross-section nav unmounts cleanly.       |
| [app/providers.tsx](app/providers.tsx)                                             | `nextAppRouterAdapter()` + `useSheetStackRouter`. Mounts the `Stage`.              |
| [app/article-feed/ArticleDetailLayer.tsx](app/article-feed/ArticleDetailLayer.tsx) | Vaul drawer renderer for the `article-detail` kind.                                |
| [app/hooks/useVaulLayer.ts](app/hooks/useVaulLayer.ts)                             | Surface adapter — bridges vaul's open-state to the stack FSM.                      |

## UX to try

1. Click an article in the feed → URL changes to `/articles/[id]`, modal slides up.
2. Click another article from the "Keep reading" list → stack deepens, URL updates.
3. Hit browser Back → top modal closes; URL reverts to the previous article.
4. Refresh while the modal is open → drawer reopens to the same article.
5. Copy the `/articles/[id]` URL to a fresh tab → the full-page fallback renders.
