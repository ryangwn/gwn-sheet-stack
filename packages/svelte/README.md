# @gwn-sheet-stack/svelte

Headless Svelte 5 bindings for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack). Built on runes. Ships the stack/layer FSM + motion coordinator — bring your own surface.

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/svelte
```

`@gwn-sheet-stack/core` and `svelte ^5` are peer dependencies.

## Quick start

```svelte
<script lang="ts">
  import { StackProvider, Stage, defineRegistry } from '@gwn-sheet-stack/svelte';
  import ConfirmModal from './ConfirmModal.svelte'; // your adapter

  const registry = defineRegistry({ confirm: ConfirmModal });
</script>

<StackProvider {registry}>
  <YourAppContent />
  <Stage />
</StackProvider>
```

Build adapter `.svelte` components that wrap whichever UI library you like, attach the layer's surface ref via `getLayer()`, and call `getStack().dispatch(id, { type: 'DISMISS', source: 'user' })` on dismiss intents. See [docs/integration.md](https://github.com/ryangwn/gwn-sheet-stack/blob/master/docs/integration.md) for the contract (React-flavoured, but the seam is identical).

One `<Stage>` per app, inside `<StackProvider>`.

## Components

- **`StackProvider`** — provides the `StackStore` via Svelte context.
- **`Stage`** — single host. Mounts every Layer.
- **`LayerHost`** — per-Layer wrapper (usually rendered by `Stage`).

## API

- **`getStack()`** — read the `StackStore` from Svelte context.
- **`getLayer()`** — read the current Layer from inside a presentation component.
- **`defineRegistry(map)`** — type-safe registry helper.
- **`portal`** — Svelte action for portalling content out of the current DOM tree.
- **`keyboardAvoidance`** — Svelte action for soft-keyboard avoidance.

### Lifecycle

Call inside any presentation component to hook into Layer lifecycle:

- `onLayerLoad`
- `onLayerWillAppear` / `onLayerDidAppear`
- `onLayerWillDisappear` / `onLayerDidDisappear`
- `onLayerMemoryWarning`
- `onLayerSnapshot`
- `getLayerVisibility()`

## Notes

- The package ships compiled JS plus original `.svelte` source in `dist/`. Consumer bundlers compile `.svelte` files with the consumer's Svelte version (which is why `svelte` is a peer dep).
- Svelte 5 (runes) only.

## License

MIT
