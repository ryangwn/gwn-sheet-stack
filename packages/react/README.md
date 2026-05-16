# @gwn-sheet-stack/react

Headless React 18+ bindings for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack). Ships the stack/layer FSM and portal lifecycle — bring your own surface (vaul, Radix Dialog, plain divs, etc.). Animation and gestures are the adapter's responsibility.

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react
```

`@gwn-sheet-stack/core` is a peer dependency — install it alongside.

## Quick start

A vaul-backed adapter — the third-party library owns the animation, the FSM owns the lifecycle.

```tsx
import { useEffect, useMemo, useState } from 'react';

import { createStackStore } from '@gwn-sheet-stack/core';
import { StackProvider, Stage, useLayer, useLayerPhase, useStack } from '@gwn-sheet-stack/react';
import { Drawer } from 'vaul';

function useVaulLayer() {
  const layer = useLayer();
  const phase = useLayerPhase(layer.id);
  const store = useStack();

  // Vaul drives its own enter/exit animation. Settle the FSM the moment
  // each phase begins; for `dismissing`, wait the library's exit duration.
  useEffect(() => {
    if (phase === 'presenting') store.dispatch(layer.id, { type: 'PRESENTED' });
    if (phase === 'dismissing') {
      const t = setTimeout(() => store.dispatch(layer.id, { type: 'DISMISSED' }), 500);
      return () => clearTimeout(t);
    }
  }, [phase, store, layer.id]);

  const open = phase !== 'mounting' && phase !== 'dismissing' && phase !== 'evicted';
  return {
    open,
    onOpenChange: (o: boolean) => {
      if (!o && phase !== 'dismissing') layer.close();
    },
  };
}

function ConfirmSheet() {
  const vaul = useVaulLayer();
  return (
    <Drawer.Root {...vaul}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        <Drawer.Content>{/* your content */}</Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const registry = { confirm: ConfirmSheet };

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
- **`<Stage registry={...} container={...?}>`** — single host. Mounts every Layer, owns `[data-sheetstack-host]`. Pass `container` to portal into a custom element (e.g. a framed mobile preview); defaults to `document.body`. One per app.
- **`<LayerHost>`** — wrapper for one Layer; rendered by `<Stage>`.

## Hooks

- **`useStack()`** — the `StackStore`.
- **`useStackState()`** — reactive state.
- **`useLayer()`** — current Layer record inside an adapter.
- **`useLayerPhase(id)`** — current FSM phase. Drive your library's `open` / `onOpenChange` from this.
- **`useLifecycle({ onWillAppear, onDidAppear, ... })`** — Layer lifecycle callbacks.
- **`useStackEvent()`** — subscribe to stack events.

## Router adapters

Pair with a `gwn-sheet-stack-adapters-router-*` package to serialize the stack to the URL. Pass the adapter to your store via `createStackStore`.

## License

MIT
