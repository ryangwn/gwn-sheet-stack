<script lang="ts">
  import { setStackContext } from './lib/context';
  import type { StackStore } from '@gwn-sheet-stack/core';

  interface Props {
    value: StackStore;
    children?: import('svelte').Snippet;
  }

  const { value, children }: Props = $props();

  setStackContext(value);
</script>

{@render children?.()}
