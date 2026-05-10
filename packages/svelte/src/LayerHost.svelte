<script lang="ts">
  import { setLayerContext } from './lib/context';
  import { getStack } from './lib/getStack';

  interface Props {
    layerId: string;
    hidden?: boolean;
    inert?: boolean;
    children?: import('svelte').Snippet;
  }

  const { layerId, hidden = false, inert = false, children }: Props = $props();

  setLayerContext(layerId);

  const store = getStack();
  let mounted = false;

  $effect.pre(() => {
    if (mounted) return;
    mounted = true;
    store.dispatch(layerId, { type: 'MOUNTED' });
  });
</script>

<div
  data-sheetstack-layer={layerId}
  style:display={hidden ? 'none' : undefined}
  {...inert ? { inert: '' } : {}}
>
  {@render children?.()}
</div>
