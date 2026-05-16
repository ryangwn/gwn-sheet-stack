# @gwn-sheet-stack/react

## 0.1.1

### Patch Changes

- `Stage` accepts an optional `container` prop to portal layers into a custom element (defaults to `document.body`). Enables embedding the stack inside framed previews so sheets and dialogs are clipped to that container.

- Extract `useTopLayer` hook from `Stage` for top-layer/presentation derivation.

- Updated dependencies:
  - @gwn-sheet-stack/core@0.1.0

## 0.1.0

### Minor Changes

- Headless pivot: drop `Sheet`, `Modal`, `Panel`, `PushScreen` primitives and bundled styles in favor of headless `Stack` + `Stage` + `LayerHost`. Adapters (vaul, radix, etc.) bring their own UI.
- Drop `motion/`, `gesture/`, `scroll/`, `keyboard/` modules. `Stage` no longer wires a `MotionCoordinator`. Public type surface shrinks ~68% (6.07KB → 1.97KB).
- `LayerHost` applies `position: fixed; inset: 0` so adapters have a full-bleed positioning context.
- Drop `sideEffects` and `styles` export from package.json.

## 0.0.4

### Patch Changes

- Refactor: rename to scoped `@gwn-sheet-stack/*` packages
- Chore: remove eslint-disable directives, fix hook deps and type any
- Updated dependencies:
  - @gwn-sheet-stack/core@0.0.4
