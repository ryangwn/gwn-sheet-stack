import { useEffect, useRef } from 'react';

interface KeyboardAvoidanceOptions {
  enabled?: boolean;
}

export function useKeyboardAvoidance(
  layerRef: React.RefObject<HTMLElement | null>,
  opts: KeyboardAvoidanceOptions = {},
): void {
  const { enabled = true } = opts;
  const translateRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = layerRef.current;
    if (!el || !window.visualViewport) return;

    const MARGIN = 8; // px gap above keyboard

    const computeAndApply = () => {
      if (isDraggingRef.current) return;
      const focused = document.activeElement as HTMLElement | null;
      if (
        !focused ||
        (!['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName) && !focused.isContentEditable)
      ) {
        // No focusable input — revert
        if (translateRef.current !== 0) {
          translateRef.current = 0;
          el.style.transform = '';
        }
        return;
      }

      const vv = window.visualViewport!;
      const inputRect = focused.getBoundingClientRect();
      const keyboardTop = vv.offsetTop + vv.height;
      const inputBottom = inputRect.bottom;

      const overlap = inputBottom - keyboardTop + MARGIN;
      if (overlap > 0) {
        translateRef.current = -overlap;
        el.style.transform = `translateY(${-overlap}px)`;
      } else if (translateRef.current !== 0) {
        translateRef.current = 0;
        el.style.transform = '';
      }
    };

    const revert = () => {
      translateRef.current = 0;
      el.style.transform = '';
    };

    const onViewportResize = () => computeAndApply();
    const onFocusIn = () => {
      // iOS Safari: delay one frame — keyboard not yet measured at focusin
      requestAnimationFrame(computeAndApply);
    };
    const onFocusOut = () => revert();

    // Track drag state to avoid fighting the gesture recognizer
    const onDragStart = () => {
      isDraggingRef.current = true;
    };
    const onDragEnd = () => {
      isDraggingRef.current = false;
    };

    window.visualViewport.addEventListener('resize', onViewportResize);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerdown', onDragStart);
    // pointercancel handles Safari's "no mouseup after scroll" quirk
    el.addEventListener('pointerup', onDragEnd);
    el.addEventListener('pointercancel', onDragEnd);

    return () => {
      window.visualViewport!.removeEventListener('resize', onViewportResize);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerdown', onDragStart);
      el.removeEventListener('pointerup', onDragEnd);
      el.removeEventListener('pointercancel', onDragEnd);
      revert();
    };
  }, [enabled, layerRef]);
}
