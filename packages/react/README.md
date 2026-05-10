# @gwn-sheet-stack/react

React 18+ bindings for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack).

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react
```

`@gwn-sheet-stack/core` is a peer dependency — install it alongside.

## Quick start

```tsx
import { Modal, Panel, PushScreen, Sheet, StackProvider, Stage } from '@gwn-sheet-stack/react';
import '@gwn-sheet-stack/react/styles.css';

const registry = {
  cart: CartSheet,
  confirmRemove: ConfirmModal,
} as const;

export function App() {
  return (
    <StackProvider registry={registry}>
      <YourAppContent />
      <Stage />
    </StackProvider>
  );
}

function CartSheet() {
  return <Sheet detents={[0.5, 1]}>{/* sheet content */}</Sheet>;
}
```

One `<Stage />` per app. Mount it inside `<StackProvider>` so it can reach the store.

## Components

- **`<StackProvider>`** — provides the `StackStore` via context. Accepts `registry`, `routerAdapter`, `mountWindow` config.
- **`<Stage>`** — single host. Mounts every Layer, owns `[data-sheetstack-host]`. One per app.
- **`<LayerHost>`** — internal-ish wrapper for one Layer; usually rendered by `<Stage>`.
- **`<Sheet>` / `<Modal>` / `<Panel>` / `<PushScreen>`** — the four presentation kinds.

## Hooks

- **`useStack()`** — the `StackStore`.
- **`useStackState()`** — reactive state.
- **`useLayer()` / `useLayerId()`** — current Layer inside a presentation component.
- **`useLayerPhase(id)`** — current FSM phase.
- **`useLayerAnimation()`** — wires surface (+ optional backdrop) refs into the `MotionCoordinator` and returns a `LayerAnimation`. Call `animation.run(descriptor)` on phase change.
- **`useLifecycle({ onWillAppear, onDidAppear, onWillDisappear, onDidDisappear, … })`** — Layer lifecycle callbacks.
- **`useSheetGesture()`** — Sheet drag wiring.
- **`useKeyboardAvoidance()`**, **`usePreventScroll()`**, **`usePositionFixed()`**, **`useScaleBackground()`** — body/viewport helpers.
- **`useStackEvent()`** — subscribe to stack events.

## Styles

```ts
// or
import '@gwn-sheet-stack/react/styles';
import '@gwn-sheet-stack/react/styles.css';
```

The CSS is the only side-effecting export — `sideEffects` is set to `["**/*.css"]` so the rest of the package tree-shakes.

## Router adapters

Pair with a `gwn-sheet-stack-adapters-router-*` package to serialize the stack to the URL. Pass the adapter to `<StackProvider routerAdapter={…} />`.

## License

MIT
