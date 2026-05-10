// Adapted from https://github.com/emilkowalski/vaul/blob/main/src/use-position-fixed.ts (MIT)
//
// Locks the body to position:fixed on iOS Safari while a sheet is open. Solves
// URL-bar collapse, keyboard quirks, and bounce-scroll bleed-through.
import { useCallback, useEffect, useRef, useState } from 'react';

import { isSafari } from './browser';

let previousBodyPosition: Record<string, string> | null = null;

export interface UsePositionFixedOptions {
  isOpen: boolean;
  modal: boolean;
  nested: boolean;
  hasBeenOpened: boolean;
  preventScrollRestoration: boolean;
  noBodyStyles: boolean;
}

export function usePositionFixed({
  isOpen,
  modal,
  nested,
  hasBeenOpened,
  preventScrollRestoration,
  noBodyStyles,
}: UsePositionFixedOptions): { restorePositionSetting: () => void } {
  const [activeUrl, setActiveUrl] = useState(() =>
    typeof window !== 'undefined' ? window.location.href : '',
  );
  const scrollPos = useRef(0);

  const setPositionFixed = useCallback(() => {
    if (!isSafari()) return;

    if (previousBodyPosition === null && isOpen && !noBodyStyles) {
      previousBodyPosition = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        height: document.body.style.height,
        right: 'unset',
      };

      const { scrollX, innerHeight } = window;

      document.body.style.setProperty('position', 'fixed', 'important');
      Object.assign(document.body.style, {
        top: `${-scrollPos.current}px`,
        left: `${-scrollX}px`,
        right: '0px',
        height: 'auto',
      });

      window.setTimeout(
        () =>
          window.requestAnimationFrame(() => {
            const bottomBarHeight = innerHeight - window.innerHeight;
            if (bottomBarHeight && scrollPos.current >= innerHeight) {
              document.body.style.top = `${-(scrollPos.current + bottomBarHeight)}px`;
            }
          }),
        300,
      );
    }
  }, [isOpen, noBodyStyles]);

  const restorePositionSetting = useCallback(() => {
    if (!isSafari()) return;

    if (previousBodyPosition !== null && !noBodyStyles) {
      const y = -parseInt(document.body.style.top, 10);
      const x = -parseInt(document.body.style.left, 10);

      Object.assign(document.body.style, previousBodyPosition);

      window.requestAnimationFrame(() => {
        if (preventScrollRestoration && activeUrl !== window.location.href) {
          setActiveUrl(window.location.href);
          return;
        }
        window.scrollTo(x, y);
      });

      previousBodyPosition = null;
    }
  }, [activeUrl, noBodyStyles, preventScrollRestoration]);

  useEffect(() => {
    function onScroll() {
      scrollPos.current = window.scrollY;
    }
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!modal) return;
    return () => {
      if (typeof document === 'undefined') return;
      const hasDrawerOpen = !!document.querySelector('[data-sheetstack-presentation="sheet"]');
      if (hasDrawerOpen) return;
      restorePositionSetting();
    };
  }, [modal, restorePositionSetting]);

  useEffect(() => {
    if (nested || !hasBeenOpened) return;
    if (isOpen) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) setPositionFixed();
      if (!modal) {
        window.setTimeout(() => restorePositionSetting(), 500);
      }
    } else {
      restorePositionSetting();
    }
  }, [isOpen, hasBeenOpened, modal, nested, setPositionFixed, restorePositionSetting]);

  return { restorePositionSetting };
}
