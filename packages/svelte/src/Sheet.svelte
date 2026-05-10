<script lang="ts">
  import { getStack } from './lib/getStack';
  import { getLayerContext } from './lib/context';
  import { keyboardAvoidance } from './lib/keyboardAvoidance';

  interface DetentSpec {
    id: string;
    size: number;
  }

  interface Props {
    detents: DetentSpec[];
    initialDetent: string;
    side?: 'bottom' | 'top';
    largestUndimmedDetentId?: string;
    repositionInputs?: boolean;
    children?: import('svelte').Snippet;
  }

  const { detents, initialDetent, side = 'bottom', largestUndimmedDetentId, repositionInputs = true, children }: Props = $props();

  const store = getStack();
  const layerId = getLayerContext();

  let containerHeight = $state(0);
  let el = $state<HTMLDivElement | null>(null);

  const layer = $derived(store.getState().stack.find((l) => l.id === layerId));
  const currentDetentId = $derived(layer?.detentId ?? initialDetent);

  const currentDetent = $derived(detents.find((d) => d.id === currentDetentId) ?? detents.at(-1)!);
  const maxFraction = $derived(Math.max(...detents.map((d) => d.size)));
  const currentFraction = $derived(currentDetent.size);
  const translate = $derived(containerHeight > 0 ? (1 - currentFraction) * containerHeight : 0);
  const progress = $derived(maxFraction > 0 ? currentFraction / maxFraction : 1);

  // Snap immediately (animation wired later)
  $effect(() => {
    if (layer?.phase === 'snapping') {
      store.dispatch(layerId, { type: 'SNAPPED' });
    }
  });

  $effect(() => {
    if (el) containerHeight = el.offsetHeight;
  });
</script>

<div
  bind:this={el}
  use:keyboardAvoidance={repositionInputs}
  role="dialog"
  aria-modal="true"
  data-sheetstack-presentation="sheet"
  data-sheetstack-side={side}
  style:--ss-translate="{translate}px"
  style:--ss-progress={progress}
  style:--ss-swipe-delta="0"
  style:--ss-active-detent={currentDetentId}
>
  {@render children?.()}
</div>
