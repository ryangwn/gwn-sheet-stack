import { type RefObject, useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
  );
}

export interface UseFocusTrapOptions {
  enabled?: boolean;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { enabled = true }: UseFocusTrapOptions = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    const previousRef = previouslyFocused ? new WeakRef(previouslyFocused) : null;

    const focusables = getFocusable(el);
    const first = focusables[0] ?? el;
    if (!el.contains(document.activeElement)) {
      first.focus({ preventScroll: true });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable(el);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === firstEl || !el.contains(active))) {
        e.preventDefault();
        lastEl.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus({ preventScroll: true });
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      const target = previousRef?.deref();
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
    };
  }, [ref, enabled]);
}
