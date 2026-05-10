// Svelte action: teleports element into document.body
export function portal(el: HTMLElement, target: HTMLElement = document.body): { destroy(): void } {
  target.appendChild(el);
  return {
    destroy() {
      if (el.parentNode === target) target.removeChild(el);
    },
  };
}
