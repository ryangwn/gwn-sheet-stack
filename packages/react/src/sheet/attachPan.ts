export interface PanOptions {
  onStart: (y: number) => void;
  onMove: (dy: number, vy: number) => void;
  onEnd: (vy: number) => void;
  axis?: 'y' | 'x';
  scrollLockTimeout?: number;
  topEdgeScroll?: 'scroll' | 'expand';
  isAtLargestDetent?: () => boolean;
}

interface ActivePointer {
  id: number;
  startX: number;
  startY: number;
  lastY: number;
  lastT: number;
  velocity: number;
  dragLocked: boolean;
  dragStarted: boolean;
  scrollLockTimer: ReturnType<typeof setTimeout> | null;
}

// Movement threshold that distinguishes a tap from a drag. Below this, a
// pointerdown/up pair is treated as a click and never fires DRAG_START — so
// taps on buttons inside the sheet (e.g. a "Pop" close button) don't push
// the layer into the `dragging` phase, which would block programmatic pop().
const DRAG_SLOP_PX = 4;

function findScrollable(el: Element | null): HTMLElement | null {
  while (el) {
    if (el instanceof HTMLElement) {
      const style = getComputedStyle(el);
      const overflow = style.overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

function isDragAffordance(el: Element | null): boolean {
  while (el) {
    if (el instanceof HTMLElement) {
      const attr = el.dataset['sheetstackDrag'];
      if (attr !== undefined) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Sheet-specific vertical pan recognizer with scroll arbitration.
 *
 * Note: this is intentionally NOT built on `attachPanBase`. Sheet's scroll
 * arbitration must gate the `onStart` callback (we only commit to a drag once
 * the user reaches scroll-top and continues), and the base primitive emits
 * onStart eagerly on pointerdown. The two recognizers live side-by-side.
 *
 * Use `attachPanBase` directly for any non-sheet gesture (PushScreen edge
 * swipe, future drag-to-dismiss on Modal, etc.) that doesn't need scroll
 * arbitration.
 */
export function attachPan(el: HTMLElement, opts: PanOptions): () => void {
  const {
    onStart,
    onMove,
    onEnd,
    scrollLockTimeout = 500,
    topEdgeScroll = 'scroll',
    isAtLargestDetent = () => false,
  } = opts;

  const pointers = new Map<number, ActivePointer>();

  const onPointerDown = (e: PointerEvent) => {
    if (pointers.size > 0) return; // single pointer only

    const ptr: ActivePointer = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      dragLocked: false,
      dragStarted: false,
      scrollLockTimer: null,
    };
    pointers.set(e.pointerId, ptr);
    // Don't commit to a drag here — wait for movement past DRAG_SLOP_PX in
    // onPointerMove. Otherwise a tap on a button would dispatch DRAG_START.
  };

  const onPointerMove = (e: PointerEvent) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;

    const dy = e.clientY - ptr.startY;
    const dt = e.timeStamp - ptr.lastT;
    const rawVy = dt > 0 ? (e.clientY - ptr.lastY) / dt : 0;
    ptr.velocity = ptr.velocity * 0.8 + rawVy * 0.2; // EMA
    ptr.lastY = e.clientY;
    ptr.lastT = e.timeStamp;

    if (ptr.dragLocked) return;

    if (!ptr.dragStarted && Math.abs(dy) < DRAG_SLOP_PX) return;

    const target = e.target as Element;
    const scrollable = isDragAffordance(target) ? null : findScrollable(target);

    if (!ptr.dragStarted) {
      if (scrollable) {
        const atTop = scrollable.scrollTop <= 0;
        const movingDown = dy > 0;
        const movingUp = dy < 0;

        if (!atTop) {
          if (!ptr.scrollLockTimer) {
            ptr.scrollLockTimer = setTimeout(() => {
              ptr.dragLocked = false;
            }, scrollLockTimeout);
          }
          ptr.dragLocked = true;
          return;
        }

        if (movingUp && isAtLargestDetent() && topEdgeScroll === 'scroll') return;
        if (!movingDown && !movingUp) return;
      }

      ptr.dragStarted = true;
      el.setPointerCapture(e.pointerId);
      onStart(ptr.startY);
    }

    onMove(e.clientY - ptr.startY, ptr.velocity);
  };

  const onPointerUp = (e: PointerEvent) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    pointers.delete(e.pointerId);
    if (ptr.scrollLockTimer) clearTimeout(ptr.scrollLockTimer);
    if (ptr.dragStarted && !ptr.dragLocked) onEnd(ptr.velocity);
  };

  const onPointerCancel = (e: PointerEvent) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    pointers.delete(e.pointerId);
    if (ptr.scrollLockTimer) clearTimeout(ptr.scrollLockTimer);
    if (ptr.dragStarted) onEnd(0);
  };

  el.style.touchAction = 'pan-x';
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
  };
}
