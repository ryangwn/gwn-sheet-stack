# @gwn-sheet-stack/svelte

Svelte 5 bindings for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack). Built on runes.

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/svelte
```

`@gwn-sheet-stack/core` and `svelte ^5` are peer dependencies.

## Quick start

```svelte
<script lang="ts">
  import { StackProvider, Stage, defineRegistry } from '@gwn-sheet-stack/svelte';
  import CartSheet from './CartSheet.svelte';
  import ConfirmModal from './ConfirmModal.svelte';

  const registry = defineRegistry({
    cart: CartSheet,
    confirmRemove: ConfirmModal,
  });
</script>

<StackProvider {registry}>
  <YourAppContent />
  <Stage />
</StackProvider>
```

```svelte
<!-- CartSheet.svelte -->
<script lang="ts">
  import { Sheet } from '@gwn-sheet-stack/svelte';
</script>

<Sheet detents={[0.5, 1]}>
  <!-- sheet content -->
</Sheet>
```

One `<Stage>` per app, inside `<StackProvider>`.

## Components

- **`StackProvider`** — provides the `StackStore` via Svelte context.
- **`Stage`** — single host. Mounts every Layer.
- **`LayerHost`** — per-Layer wrapper (usually rendered by `Stage`).
- **`Sheet`**, **`Modal`**, **`Panel`**, **`PushScreen`** — the four presentation kinds.

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
