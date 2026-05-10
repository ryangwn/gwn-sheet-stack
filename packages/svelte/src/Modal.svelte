<script lang="ts">
  import { getStack } from './lib/getStack';
  import { getLayerContext } from './lib/context';

  interface Props {
    size?: 'fit' | 'sm' | 'md' | 'lg';
    dismissible?: boolean;
    children?: import('svelte').Snippet;
  }

  const { size = 'md', dismissible = true, children }: Props = $props();

  const SIZE_MAP = { fit: 'auto', sm: '400px', md: '560px', lg: '720px' };

  const store = getStack();
  const layerId = getLayerContext();

  const backdropClick = () => {
    if (dismissible) store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  };
</script>

<div data-sheetstack-backdrop role="presentation" onclick={backdropClick}></div>
<div
  role="dialog"
  aria-modal="true"
  data-sheetstack-presentation="modal"
  style:width={SIZE_MAP[size]}
  style:max-width="90vw"
  style:max-height="85vh"
>
  {@render children?.()}
</div>
