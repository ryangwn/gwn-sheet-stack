// Adapted from https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/overlays/src/usePreventScroll.ts
// via https://github.com/emilkowalski/vaul/blob/main/src/use-prevent-scroll.ts (MIT)
//
// Prevents background scrolling and Mobile Safari focus-scrolling while a sheet is open.
import { useEffect, useLayoutEffect } from 'react';

import { isIOS } from './browser';

const KEYBOARD_BUFFER = 24;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const visualViewport =
  typeof document !== 'undefined' ? (window as Window & typeof globalThis).visualViewport : null;

export interface UsePreventScrollOptions {
  isDisabled?: boolean;
}

function chain(...callbacks: Array<((...args: unknown[]) => void) | undefined>) {
  return (...args: unknown[]) => {
    for (const cb of callbacks) cb?.(...args);
  };
}

export function isScrollable(node: Element): boolean {
  const style = window.getComputedStyle(node);
  return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}

export function getScrollParent(node: Element): Element {
  if (isScrollable(node)) {
    node = node.parentElement as HTMLElement;
  }
  while (node && !isScrollable(node)) {
    node = node.parentElement as HTMLElement;
  }
  return node || document.scrollingElement || document.documentElement;
}

const nonTextInputTypes = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
]);

export function isInput(target: Element): boolean {
  return (
    (target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

let preventScrollCount = 0;
let restore: (() => void) | undefined;

export function usePreventScroll({ isDisabled }: UsePreventScrollOptions = {}): void {
  useIsomorphicLayoutEffect(() => {
    if (isDisabled) return;

    preventScrollCount++;
    if (preventScrollCount === 1 && isIOS()) {
      restore = preventScrollMobileSafari();
    }

    return () => {
      preventScrollCount--;
      if (preventScrollCount === 0) {
        restore?.();
        restore = undefined;
      }
    };
  }, [isDisabled]);
}

function setStyle(element: HTMLElement, style: keyof CSSStyleDeclaration, value: string) {
  const styleMap = element.style as unknown as Record<string, string>;
  const cur = styleMap[style as string] ?? '';
  styleMap[style as string] = value;
  return () => {
    styleMap[style as string] = cur;
  };
}

function addEvent<K extends keyof GlobalEventHandlersEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: GlobalEventHandlersEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(event, handler as EventListener, options);
  return () => target.removeEventListener(event, handler as EventListener, options);
}

function scrollIntoView(target: Element) {
  const root = document.scrollingElement || document.documentElement;
  let cur: Element | null = target;
  while (cur && cur !== root) {
    const scrollable = getScrollParent(cur);
    if (
      scrollable !== document.documentElement &&
      scrollable !== document.body &&
      scrollable !== cur
    ) {
      const scrollableTop = scrollable.getBoundingClientRect().top;
      const targetTop = cur.getBoundingClientRect().top;
      const targetBottom = cur.getBoundingClientRect().bottom;
      const keyboardHeight = scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER;

      if (targetBottom > keyboardHeight) {
        scrollable.scrollTop += targetTop - scrollableTop;
      }
    }
    cur = scrollable.parentElement;
  }
}

function preventScrollMobileSafari(): () => void {
  let scrollable: Element;
  let lastY = 0;

  const onTouchStart = (e: TouchEvent) => {
    scrollable = getScrollParent(e.target as Element);
    if (scrollable === document.documentElement && scrollable === document.body) return;
    lastY = e.changedTouches[0]!.pageY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
      e.preventDefault();
      return;
    }
    const y = e.changedTouches[0]!.pageY;
    const scrollTop = scrollable.scrollTop;
    const bottom = scrollable.scrollHeight - scrollable.clientHeight;
    if (bottom === 0) return;
    if ((scrollTop <= 0 && y > lastY) || (scrollTop >= bottom && y < lastY)) {
      e.preventDefault();
    }
    lastY = y;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (isInput(target) && target !== document.activeElement) {
      e.preventDefault();
      target.style.transform = 'translateY(-2000px)';
      target.focus();
      requestAnimationFrame(() => {
        target.style.transform = '';
      });
    }
  };

  const onFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!isInput(target)) return;
    target.style.transform = 'translateY(-2000px)';
    requestAnimationFrame(() => {
      target.style.transform = '';
      if (visualViewport) {
        if (visualViewport.height < window.innerHeight) {
          requestAnimationFrame(() => scrollIntoView(target));
        } else {
          visualViewport.addEventListener('resize', () => scrollIntoView(target), { once: true });
        }
      }
    });
  };

  const onWindowScroll = () => {
    window.scrollTo(0, 0);
  };

  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;

  const restoreStyles = chain(
    setStyle(
      document.documentElement,
      'paddingRight',
      `${window.innerWidth - document.documentElement.clientWidth}px`,
    ),
  );

  window.scrollTo(0, 0);

  const removeEvents = chain(
    addEvent(document, 'touchstart', onTouchStart, { passive: false, capture: true }),
    addEvent(document, 'touchmove', onTouchMove, { passive: false, capture: true }),
    addEvent(document, 'touchend', onTouchEnd, { passive: false, capture: true }),
    addEvent(document, 'focus', onFocus as EventListener, true),
    addEvent(window, 'scroll', onWindowScroll),
  );

  return () => {
    restoreStyles();
    removeEvents();
    window.scrollTo(scrollX, scrollY);
  };
}
