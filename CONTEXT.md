# sheet-stack — domain language

Use these terms exactly. If a concept here is missing, add it; don't invent synonyms.

## Core domain

- **Layer** — one overlay in the stack. Has a stable id, a `kind` (registry key), a `phase` (FSM state), and an optional `presentation` and `detentId`.
- **Stage** — the React/Svelte host component that mounts every Layer in the stack. One per app. Owns the `[data-sheetstack-host]` element.
- **Stack** — the ordered list of Layers. Lives inside the **StackStore**.
- **StackStore** — vanilla-TS state container. Holds the stack, runs the FSM via `dispatch`, broadcasts changes via `subscribe`, owns mount-window + snapshot + router-adapter wiring.
- **Presentation kind** — discriminator that says _how_ a Layer renders: `'sheet' | 'modal' | 'panel' | 'push'`. The component the registry maps to is responsible for the per-kind UI.
- **Detent** — a snap point for sheets (e.g. `0.5`, `1.0`). Sheets only.
- **Mount window** — LRU bound on how many backgrounded Layers stay mounted. Excess Layers serialize to a **Snapshot** and re-hydrate on re-entry.
- **Snapshot** — opaque blob captured by registered **SnapshotProviders** when a Layer is backgrounded or evicted.
- **FSM phase** — `'mounting' | 'presenting' | 'active' | 'background' | 'dragging' | 'snapping' | 'dismissing' | 'evicted'`. Transitions live in `core/store/fsm.ts`.
- **RouterAdapter** — pluggable interface (`read | write | onPopState | pushHistory`) so the stack can be serialized to URL. Concrete adapters live in `packages/adapters-router-*`.

## Animation seam (added 2026-05-04)

Concentrates spring lifecycle + per-kind tick math + FSM dispatch for the JS-driven primitives (Modal, Panel, PushScreen). Sheet stays on CSS transitions.

- **LayerAnimation** (`packages/core/src/animation/LayerAnimation.ts`) — owns one Layer's enter/exit. Methods: `run(descriptor, opts?)`, `setLive(values)`, `cancel()`, `position`. Dispatches `PRESENTED` / `DISMISSED` to the StackStore on settle (unless `dispatch: false`). Uses live `position` for flicker-free handoff when a dismiss fires mid-animation.
- **AnimationDescriptor** — closed enum `'modal' | 'panel' | 'push'` × `direction: 'in' | 'out'` plus a `SpringDescriptor`. Lives in `core/animation/types.ts`.
- **AnimationValues** — per-kind bag of values published every tick. The shape the **AnimationSink** receives.
- **AnimationSink** — anything that consumes `AnimationValues`. In production it's a thin wrapper over **MotionCoordinator**; in tests it's a recorder.
- **MotionCoordinator** (`packages/react/src/motion/MotionCoordinator.ts`) — single writer for animated inline styles + every `--ss-*` CSS custom property. One per Stage. Layers register `(surface, backdrop?)` refs; the Coordinator writes by `layerId`.
- **Motion event** — what `MotionCoordinator.subscribe` emits. Used by tests + future devtools.

## Gesture seam (added 2026-05-04)

Single vocabulary for "what should happen on pointer release" across Sheet drag and PushScreen edge-swipe. Modal/Panel are gesture-less today; the seam is ready if they grow drag-to-dismiss.

- **GestureOutcome** — discriminated union `{ kind: 'dismiss' } | { kind: 'snap', detentId } | { kind: 'rest' }`. Replaces the prior `'__dismissed'` magic string. Sheet emits `dismiss` or `snap`; PushScreen emits `dismiss` or `rest`.
- **chooseSnapTarget** (`core/gesture/snapDecision.ts`) — Sheet's release decision. Detent-aware. Returns `GestureOutcome`.
- **decidePushGesture** (same file) — PushScreen's release decision. No detents. Takes `{ distance, velocity, axisLength, distanceFraction?, velocityThreshold? }`.
- **attachPanBase** (`packages/react/src/gesture/attachPanBase.ts`) — axis-agnostic pointer recognizer. Single-pointer guard + EMA-smoothed velocity (0.8 / 0.2) + `setPointerCapture`. PushScreen edge-swipe consumes it directly.
- **attachPan** (`packages/react/src/sheet/attachPan.ts`) — Sheet-specific recognizer. Adds scroll arbitration on top of the pointer-capture pattern. Intentionally not built on `attachPanBase` because scroll arbitration must gate `onStart`; keeping them separate avoids a contorted dual-path implementation.
- **rubberBand** (same file as decisions) — math helper for elastic overscroll. Both Sheet (between-detent overshoot) and PushScreen (past-left-boundary) call it with different bounds.

## Hooks (React)

- **useLayerId** — `string` from `LayerContext`. Required inside any Layer component.
- **useLayerPhase** — current FSM phase for a layerId. Replaces the `state.stack.find(...)?.phase` boilerplate.
- **useLayerAnimation** — wires a Layer's surface (+ optional backdrop) refs into the **MotionCoordinator** and constructs a **LayerAnimation**. Components publish via `animation.run(descriptor)` on phase change.
- **useStack** / **useStackState** — access the StackStore + reactive state.

## Conventions

- **CSS variable names** — every animated var is `--ss-*`. Writers go through `MotionCoordinator.writeLayer` or `MotionCoordinator.setHost`. Components do not write `--ss-*` directly (Sheet is the current exception, pending migration).
- **Data attributes** — `[data-sheetstack-host]`, `[data-sheetstack-layer]`, `[data-sheetstack-presentation]`, `[data-sheetstack-backdrop]`, `[data-sheetstack-side]`, `[data-sheetstack-phase]`. These are styling hooks, not state — derive them from the FSM, never from inline JS state.
- **FSM dispatch from animations** — happens _only_ inside `LayerAnimation`. Components never call `store.dispatch({ type: 'PRESENTED' | 'DISMISSED' })` from animation completion callbacks. (User-driven `DISMISS` from clicks/escape is fine — that's intent, not animation timing.)
