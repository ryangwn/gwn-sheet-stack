// Svelte action: attach keyboard avoidance to a sheet container element.
// Usage: <div use:keyboardAvoidance>
export function keyboardAvoidance(
  el: HTMLElement,
  enabled = true,
): { update(e: boolean): void; destroy(): void } {
  const MARGIN = 8;
  let translateY = 0;
  let isDragging = false;
  let active = enabled;

  const computeAndApply = () => {
    if (!active || isDragging || !window.visualViewport) return;
    const focused = document.activeElement as HTMLElement | null;
    const isInput =
      focused &&
      (['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName) || focused.isContentEditable);
    if (!isInput) {
      revert();
      return;
    }
    const vv = window.visualViewport!;
    const inputRect = focused!.getBoundingClientRect();
    const keyboardTop = vv.offsetTop + vv.height;
    const overlap = inputRect.bottom - keyboardTop + MARGIN;
    if (overlap > 0) {
      translateY = -overlap;
      el.style.transform = `translateY(${translateY}px)`;
    } else {
      revert();
    }
  };

  const revert = () => {
    translateY = 0;
    el.style.transform = '';
  };

  const onResize = () => computeAndApply();
  const onFocusIn = () => requestAnimationFrame(computeAndApply);
  const onFocusOut = () => revert();
  const onDown = () => {
    isDragging = true;
  };
  const onUp = () => {
    isDragging = false;
  };

  const attach = () => {
    window.visualViewport?.addEventListener('resize', onResize);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  const detach = () => {
    window.visualViewport?.removeEventListener('resize', onResize);
    el.removeEventListener('focusin', onFocusIn);
    el.removeEventListener('focusout', onFocusOut);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
  };

  if (active) attach();

  return {
    update(e: boolean) {
      if (e === active) return;
      active = e;
      if (active) attach();
      else {
        detach();
        revert();
      }
    },
    destroy() {
      detach();
      revert();
    },
  };
}
