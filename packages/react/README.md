# @gwn-sheet-stack/react

Headless React 18+ bindings for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack). Ships the stack/layer FSM + motion coordinator — bring your own surface (vaul, Radix Dialog, plain divs, etc.).

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react
```

`@gwn-sheet-stack/core` is a peer dependency — install it alongside.

## Quick start

```tsx
import { useMemo } from 'react';
import { useEffect, useRef } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import {
  StackProvider,
  Stage,
  useLayer,
  useLayerAnimation,
  useLayerPhase,
  useStack,
} from '@gwn-sheet-stack/react';

// `duration` is in seconds (typical 0.2–0.5).
const ENTER = { kind: 'modal', direction: 'in', spring: { duration: 0.42, bounce: 0.18 } } as const;
const EXIT = { kind: 'modal', direction: 'out', spring: { duration: 0.22, bounce: 0 } } as const;

function ConfirmModal() {
  const layer = useLayer();
  const phase = useLayerPhase(layer.id);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const animation = useLayerAnimation({ surfaceRef, backdropRef });

  useEffect(() => {
    if (phase === 'presenting') animation.run(ENTER);
    else if (phase === 'dismissing') animation.run(EXIT);
  }, [phase, animation]);

  return (
    <>
      <div
        ref={backdropRef}
        onClick={layer.close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0 }}
      />
      <div ref={surfaceRef} role="dialog">
        {/* your content */}
      </div>
    </>
  );
}

const registry = { confirm: ConfirmModal };

export function App() {
  const store = useMemo(() => createStackStore({ mountWindow: 3 }), []);
  return (
    <StackProvider value={store}>
      <YourAppContent />
      <Stage registry={registry} />
    </StackProvider>
  );
}
```

One `<Stage />` per app. Push layers with `useStack().push({ kind: 'confirm' })`.

See [docs/integration.md](https://github.com/ryangwn/gwn-sheet-stack/blob/master/docs/integration.md) for the full adapter contract and reference adapters (PlainDiv, Radix Dialog, vaul).

## Components

- **`<StackProvider value={store}>`** — provides the `StackStore` via context.
- **`<Stage registry={...}>`** — single host. Mounts every Layer, owns `[data-sheetstack-host]`. One per app.
- **`<LayerHost>`** — wrapper for one Layer; rendered by `<Stage>`.

## Hooks

- **`useStack()`** — the `StackStore`.
- **`useStackState()`** — reactive state.
- **`useLayer()`** — current Layer record inside an adapter.
- **`useLayerPhase(id)`** — current FSM phase.
- **`useLayerAnimation({ surfaceRef, backdropRef? })`** — registers refs with the `MotionCoordinator` and returns a `LayerAnimation`. Call `animation.run(descriptor)` from a phase-watching effect when the library drives the spring. Skip it entirely when the third-party library (vaul, Radix) owns the animation — drive `open`/`onOpenChange` from `useLayerPhase` instead. See [docs/integration.md](https://github.com/ryangwn/gwn-sheet-stack/blob/master/docs/integration.md).
- **`useLifecycle({ onWillAppear, onDidAppear, ... })`** — Layer lifecycle callbacks.
- **`useStackEvent()`** — subscribe to stack events.
- **`useKeyboardAvoidance()`**, **`usePreventScroll()`**, **`usePositionFixed()`** — body/viewport helpers.

## Gesture

- **`attachPanBase`** — axis-agnostic pointer recognizer. Use for swipe-back, swipe-down, etc.

## Router adapters

Pair with a `gwn-sheet-stack-adapters-router-*` package to serialize the stack to the URL. Pass the adapter to your store via `createStackStore`.

## License

MIT
