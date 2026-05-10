<script lang="ts">
  import { getStack } from './lib/getStack';
  import { getLayerContext } from './lib/context';

  interface Props {
    edgeSwipeBack?: boolean;
    children?: import('svelte').Snippet;
  }

  const { edgeSwipeBack = true, children }: Props = $props();

  const store = getStack();
  const layerId = getLayerContext();

  // Edge swipe back (24px zone from left)
  let el = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!edgeSwipeBack || !el) return;
    const ZONE = 24;
    let startX = 0;
    let active = false;

    const down = (e: PointerEvent) => {
      if (e.clientX > ZONE) return;
      startX = e.clientX;
      active = true;
      el!.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      const dx = Math.max(0, e.clientX - startX);
      el!.style.transform = `translateX(${dx}px)`;
    };
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX;
      if (dx > window.innerWidth * 0.4) {
        store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
      } else {
        el!.style.transform = '';
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el!.removeEventListener('pointerdown', down);
      el!.removeEventListener('pointermove', move);
      el!.removeEventListener('pointerup', up);
      el!.removeEventListener('pointercancel', up);
    };
  });
</script>

<div
  bind:this={el}
  data-sheetstack-presentation="push"
  style:position="fixed"
  style:inset="0"
>
  {@render children?.()}
</div>
