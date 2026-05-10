<script lang="ts">
  import { renderModeFor, inertForLayer } from '@gwn-sheet-stack/core';
  import { getStack } from './lib/getStack';
  import { portal } from './lib/portal';
  import LayerHost from './LayerHost.svelte';

  interface Props {
    registry: Record<string, import('svelte').Component<any>>;
    mountWindow?: number;
  }

  const { registry, mountWindow = 3 }: Props = $props();

  const store = getStack();

  // Reactive state via store subscription
  let state = $state(store.getState());
  $effect(() => {
    const unsub = store.subscribe(() => { state = store.getState(); });
    return unsub;
  });

  const topLayer = $derived(state.stack[state.stack.length - 1]);
  const topPresentation = $derived(topLayer?.presentation ?? 'sheet');
  const topDetentId = $derived(topLayer?.detentId);
  const topLayerRef = $derived(
    topLayer
      ? {
          presentation:
            topLayer.presentation === 'sheet'
              ? { kind: 'sheet' as const, largestUndimmedDetentId: undefined, detents: [] }
              : { kind: (topLayer.presentation ?? 'sheet') as 'modal' | 'panel' | 'push' },
        }
      : null,
  );
</script>

{#if typeof document !== 'undefined'}
  <div
    use:portal
    data-sheetstack-host
    style:--ss-stack-depth={state.stack.length - 1}
  >
    {#each state.stack as layer, i (layer.id)}
      {@const indexFromTop = state.stack.length - 1 - i}
      {@const mode = renderModeFor(indexFromTop, topPresentation as any, mountWindow)}
      {@const C = registry[layer.kind]}
      {#if mode !== 'unmount' && C}
        {@const isInert = topLayerRef ? inertForLayer(indexFromTop, topLayerRef, topDetentId) : false}
        <LayerHost layerId={layer.id} hidden={mode === 'hidden'} inert={isInert}>
          <C {...(layer.props as Record<string, unknown> ?? {})} />
        </LayerHost>
      {/if}
    {/each}
  </div>
{/if}
