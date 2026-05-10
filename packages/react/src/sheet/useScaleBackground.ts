// Adapted from https://github.com/emilkowalski/vaul/blob/main/src/use-scale-background.ts (MIT)
//
// Scales `[data-sheetstack-wrapper]` while a sheet is open — the iOS Music look.
import { useEffect, useMemo, useRef } from 'react';

import { BORDER_RADIUS, TRANSITIONS, TRANSITION_CSS, WINDOW_TOP_OFFSET } from './constants';

function assignStyle(
  element: HTMLElement | null | undefined,
  style: Partial<CSSStyleDeclaration>,
): () => void {
  if (!element) return () => {};
  const prev = element.style.cssText;
  Object.assign(element.style, style);
  return () => {
    element.style.cssText = prev;
  };
}

const noop = () => {};

export interface UseScaleBackgroundOptions {
  isOpen: boolean;
  side: 'top' | 'bottom' | 'left' | 'right';
  enabled: boolean;
  setBackgroundColorOnScale?: boolean;
  noBodyStyles?: boolean;
}

const isVertical = (side: string) => side === 'top' || side === 'bottom';

export function useScaleBackground({
  isOpen,
  side,
  enabled,
  setBackgroundColorOnScale = true,
  noBodyStyles = false,
}: UseScaleBackgroundOptions): void {
  const timeoutIdRef = useRef<number | null>(null);
  const initialBackgroundColor = useMemo(
    () => (typeof document !== 'undefined' ? document.body.style.backgroundColor : ''),
    [],
  );

  useEffect(() => {
    if (!isOpen || !enabled) return;
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

    const wrapper =
      (document.querySelector('[data-sheetstack-wrapper]') as HTMLElement | null) ??
      (document.querySelector('[data-vaul-drawer-wrapper]') as HTMLElement | null);
    if (!wrapper) return;

    const restoreBg =
      setBackgroundColorOnScale && !noBodyStyles
        ? assignStyle(document.body, { background: 'black' })
        : noop;

    const restoreTransition = assignStyle(wrapper, {
      transformOrigin: isVertical(side) ? 'top' : 'left',
      transitionProperty: 'transform, border-radius',
      transitionDuration: `${TRANSITIONS.DURATION}s`,
      transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    const scale = (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
    const restoreScale = assignStyle(wrapper, {
      borderRadius: `${BORDER_RADIUS}px`,
      overflow: 'hidden',
      transform: isVertical(side)
        ? `scale(${scale}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`
        : `scale(${scale}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
    });

    return () => {
      restoreScale();
      timeoutIdRef.current = window.setTimeout(() => {
        restoreTransition();
        restoreBg();
        if (initialBackgroundColor) {
          document.body.style.background = initialBackgroundColor;
        } else {
          document.body.style.removeProperty('background');
        }
      }, TRANSITIONS.DURATION * 1000);
    };
  }, [isOpen, enabled, side, setBackgroundColorOnScale, noBodyStyles, initialBackgroundColor]);
}

// Re-export for users who want to use the same transition curve elsewhere.
export { TRANSITION_CSS };
