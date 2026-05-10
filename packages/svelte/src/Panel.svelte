<script lang="ts">
  import { getStack } from './lib/getStack';
  import { getLayerContext } from './lib/context';

  interface Props {
    side?: 'left' | 'right';
    width?: number | string;
    modal?: boolean;
    children?: import('svelte').Snippet;
  }

  const { side = 'right', width = 320, modal = true, children }: Props = $props();

  const store = getStack();
  const layerId = getLayerContext();
  const widthPx = typeof width === 'number' ? `${width}px` : width;

  const backdropClick = () => {
    if (modal) store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  };
</script>

{#if modal}
  <div data-sheetstack-backdrop role="presentation" onclick={backdropClick}></div>
{/if}

<div
  data-sheetstack-presentation="panel"
  data-sheetstack-side={side}
  style:width={widthPx}
  style:position="fixed"
  style:top="0"
  style:bottom="0"
  style:{side}="0"
>
  {@render children?.()}
</div>
