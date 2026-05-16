# sheet-stack — domain language

Use these terms exactly. If a concept here is missing, add it; don't invent synonyms.

## Core domain

- **Layer** — one overlay in the stack. Has a stable id, a `kind` (registry key), a `phase` (FSM state), and an optional `presentation` and `detentId`.
- **Stage** — the React/Svelte host component that mounts every Layer in the stack. One per app. Owns the `[data-sheetstack-host]` element. Portals into `document.body` by default; pass `container` to portal into a custom element (e.g. a framed mobile preview).
- **Stack** — the ordered list of Layers. Lives inside the **StackStore**.
- **StackStore** — vanilla-TS state container. Holds the stack, runs the FSM via `dispatch`, broadcasts changes via `subscribe`, owns mount-window + snapshot + router-adapter wiring.
- **Presentation kind** — discriminator that says _how_ a Layer renders: `'sheet' | 'modal' | 'panel' | 'push'`. The component the registry maps to is responsible for the per-kind UI.
- **Detent** — a snap point for sheets (e.g. `0.5`, `1.0`). Sheets only.
- **Mount window** — LRU bound on how many backgrounded Layers stay mounted. Excess Layers serialize to a **Snapshot** and re-hydrate on re-entry.
- **Snapshot** — opaque blob captured by registered **SnapshotProviders** when a Layer is backgrounded or evicted.
- **FSM phase** — `'mounting' | 'presenting' | 'active' | 'background' | 'dragging' | 'snapping' | 'dismissing' | 'evicted'`. Transitions live in `core/store/fsm.ts`.
- **RouterAdapter** — pluggable interface (`read | write | onPopState | pushHistory`) so the stack can be projected onto browser history. Concrete adapters live in `packages/adapters-router-*`. A reference `historyAdapter` ships in `core/router/historyAdapter.ts`. See ADR 0002 — history is the source of truth; the adapter syncs the stack to it, not vice-versa.
- **Layer flavor** — every Layer is either **route-bound** (declared via `useLayerRoute` inside a route file; participates in the URL and browser history) or **ephemeral** (pushed via `stack.push()`; no URL change, gets a synthetic history frame so browser-Back still closes it). Default for `useLayerRoute` is route-bound; default for raw `stack.push()` is ephemeral.
- **Layer id** — content-addressed: `hash(kind, stableStringify(props))`. The same `(kind, props)` cannot appear twice in the stack at once. Snapshot keys and idempotency checks both use this id.
- **`history.state.ss`** — the session back-stack, holding the slice **below the top Layer** as `[{kind, props}]`. Survives refresh in the tab; not preserved on share/copy-link. The top Layer is implicit from the URL (route-bound) or unreachable across refresh (ephemeral).

## Headless positioning (since 0.1.0, 2026-05-16)

The library ships **no surface components and no animation engine**. `Modal`, `Panel`, `PushScreen`, `Sheet`, `MotionCoordinator`, `LayerAnimation`, the spring/gesture math, and the scroll/keyboard helpers were all removed in 0.1.0. Consumers build **adapters** — thin wrappers around any third-party UI library (vaul, Radix Dialog, plain divs) — that integrate with the stack via the React/Svelte primitives.

- **Adapter** — a registry component (mapped by `kind` in `Stage`'s `registry`) that wraps a surface and routes its lifecycle through the FSM. The shape is uniform whether the surface animates itself or not:
  - Derive `open` (or equivalent) from `useLayerPhase`.
  - Dispatch `PRESENTED` as soon as `phase === 'presenting'` (the FSM does not gate enter — the library does).
  - Dispatch `DISMISSED` from a `setTimeout` that matches the surface library's exit duration (vaul ≈ 500ms, Radix dialog ≈ 200ms).
  - Route user-initiated close intents through `layer.close()`.
- Reference adapters live in `packages/storybook/src/stories/` (`useVaulLayer.ts`, `useRadixDialog.ts`, `Stack.stories.tsx`).
- See `docs/integration.md` and `docs/adr/0001-headless-core.md` for rationale.

## Hooks (React)

- **useLayerRoute** — call inside a Next route file (typically the intercepted `@modal/(.)…/page.tsx`) to declare "this route IS a route-bound Layer of `kind` with these `props`." Pushes idempotently on mount, pops on unmount. The canonical entry point for route-bound Layers.
- **useLayerId** — `string` from `LayerContext`. Required inside any Layer component.
- **useLayerPhase** — current FSM phase for a layerId. The bridge between the FSM and the surface library's `open` prop.
- **useLayer** — current Layer record (props, id, `close()`, `snapTo()`).
- **useStack** / **useStackState** — access the StackStore + reactive state.
- **useLifecycle** — iOS-style mount/will-appear/did-disappear/memory-warning/snapshot callbacks for the current Layer.
- **useStackEvent** — subscribe to events on the StackStore's `EventBus`.

## Conventions

- **Data attributes** — `[data-sheetstack-host]`, `[data-sheetstack-layer]`. These are styling hooks, not state — derive them from the FSM, never from inline JS state.
- **FSM dispatch from animations** — happens inside the adapter's own phase-watching effect. The rule: a Layer should never get stuck in `presenting` or `dismissing` because nothing dispatched the settle event. (User-driven `DISMISS` from clicks/escape is fine — that's intent, not animation timing.)
- **Animation is not the library's concern** — anything that moves on screen belongs to the surface library or to the adapter's own CSS/JS. The stack owns lifecycle and order; it does not own pixels.
- **History is the source of truth** — `layer.close()` calls `router.back()` / `history.back()`, never dispatches to the store. The store reacts to popstate and route unmount. One causation path: user intent → history → store → surface. See ADR 0002.
