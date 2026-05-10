import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { computeBackdropOpacity } from 'gwn-sheet-stack-core';

import { useKeyboardAvoidance } from '../keyboard/useKeyboardAvoidance';
import { useLayerId } from '../layer/LayerContext';
import { usePositionFixed } from '../scroll/usePositionFixed';
import { usePreventScroll } from '../scroll/usePreventScroll';
import { useStack, useStackState } from '../stack/context';
import {
  type DetentSpec,
  type SheetActions,
  SheetActionsContext,
  type SheetState,
  SheetStateContext,
  useSheetActions,
  useSheetState,
} from './SheetContext';
import { NESTED_DISPLACEMENT } from './constants';
import { useFocusTrap } from './useFocusTrap';
import { useScaleBackground } from './useScaleBackground';
import { useSheetGesture } from './useSheetGesture';

function fractionForDetent(detent: DetentSpec, _containerHeight: number): number {
  return detent.size;
}

function computeCssVars(
  detents: DetentSpec[],
  currentId: string,
  containerHeight: number,
  side: 'top' | 'bottom' | 'left' | 'right',
): Record<string, string> {
  const currentDetent = detents.find((d) => d.id === currentId) ?? detents.at(-1)!;
  const currentFraction = fractionForDetent(currentDetent, containerHeight);
  const maxFraction = Math.max(...detents.map((d) => fractionForDetent(d, containerHeight)));
  const minFraction = Math.min(...detents.map((d) => fractionForDetent(d, containerHeight)));

  const progress = maxFraction > 0 ? currentFraction / maxFraction : 1;
  // Pixel translate for gesture math (still 0 before first measurement).
  const translatePx = containerHeight > 0 ? (1 - currentFraction) * containerHeight : 0;
  // Percent translate is independent of measurement: a fraction of the element's own height.
  // For 'top'/'left' sides the element travels in the negative direction.
  const sign = side === 'bottom' || side === 'right' ? 1 : -1;
  const translatePct = (1 - currentFraction) * 100 * sign;
  const progressToLargest =
    maxFraction > minFraction ? (currentFraction - minFraction) / (maxFraction - minFraction) : 1;

  return {
    '--ss-translate': `${translatePx}px`,
    '--ss-translate-pct': `${translatePct}%`,
    '--ss-progress': String(progress),
    '--ss-swipe-delta': '0',
    '--ss-active-detent': currentId,
    '--ss-progress-to-largest': String(progressToLargest),
  };
}

interface SheetContainerProps {
  detents: DetentSpec[];
  initialDetent: string;
  side?: 'bottom' | 'top' | 'left' | 'right';
  largestUndimmedDetentId?: string;
  repositionInputs?: boolean;
  dismissible?: boolean;
  trapFocus?: boolean;
  modal?: boolean;
  noBodyStyles?: boolean;
  preventScrollRestoration?: boolean;
  disablePreventScroll?: boolean;
  shouldScaleBackground?: boolean;
  setBackgroundColorOnScale?: boolean;
  /** Index of the detent at which the backdrop reaches full opacity. Below it, the
   * backdrop fades linearly. Drives `--ss-backdrop-opacity` on the container. */
  fadeFromIndex?: number;
  /** Pixels to translate this sheet up when a child sheet is presented above it.
   * Default 16 (vaul's NESTED_DISPLACEMENT). Set to 0 to disable. */
  nestedDisplacement?: number;
  /** Wire pointer gestures (drag-to-snap, drag-to-dismiss) by default. Set false if you
   * intend to call `useSheetGesture` yourself with a custom pan target (e.g. handle-only). */
  enableGesture?: boolean;
  /** Drag distance (as fraction of container height) past the smallest detent that forces
   * dismiss regardless of release velocity. Vaul default 0.25. Set to 1 to effectively
   * disable position-based dismiss (only velocity flicks will close). Requires `dismissible`. */
  closeThreshold?: number;
  children?: React.ReactNode;
}

function SheetContainer({
  detents,
  initialDetent,
  side = 'bottom',
  largestUndimmedDetentId,
  repositionInputs = true,
  dismissible = true,
  trapFocus = true,
  modal = true,
  noBodyStyles = false,
  preventScrollRestoration = false,
  disablePreventScroll = false,
  shouldScaleBackground = false,
  setBackgroundColorOnScale = true,
  fadeFromIndex,
  nestedDisplacement = NESTED_DISPLACEMENT,
  enableGesture = true,
  closeThreshold = 0.25,
  children,
}: SheetContainerProps) {
  const layerId = useLayerId();
  const store = useStack();
  const state = useStackState();
  const layer = state.stack.find((l) => l.id === layerId);
  const layerIdx = state.stack.findIndex((l) => l.id === layerId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  useKeyboardAvoidance(containerRef, { enabled: repositionInputs });
  useFocusTrap(containerRef, { enabled: trapFocus });

  const phase = layer?.phase;
  const isOpen =
    phase === 'mounting' ||
    phase === 'presenting' ||
    phase === 'active' ||
    phase === 'dragging' ||
    phase === 'snapping';
  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen);
  if (isOpen && !hasBeenOpened) setHasBeenOpened(true);
  const nested = layerIdx > 0;

  usePreventScroll({ isDisabled: !isOpen || disablePreventScroll || !modal });
  usePositionFixed({
    isOpen,
    modal,
    nested,
    hasBeenOpened,
    preventScrollRestoration,
    noBodyStyles,
  });
  useScaleBackground({
    isOpen,
    side,
    enabled: shouldScaleBackground && !nested,
    setBackgroundColorOnScale,
    noBodyStyles,
  });

  // current detent: prefer store's layer.detentId (set by SNAP), fall back to initialDetent
  const currentDetentId = layer?.detentId ?? initialDetent;

  useSheetGesture({
    containerRef,
    detents,
    currentDetentId,
    dismissible,
    fadeFromIndex,
    closeThreshold,
    enabled: enableGesture,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerHeight(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setContainerHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Handle 'snapping' phase → dispatch SNAPPED immediately for *programmatic* snaps
  // (which arrive from 'active'). Gesture-driven snaps arrive from 'dragging' and the
  // spring driver in useSheetGesture dispatches SNAPPED on its own completion — racing
  // with us here would prematurely transition to 'active' and abort the spring visually.
  const layerPhase = layer?.phase;
  const prevPhaseRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = layerPhase ?? null;

    if (layerPhase === 'snapping' && prev !== 'snapping' && prev !== 'dragging') {
      store.dispatch(layerId, { type: 'SNAPPED' });
    }
  });

  const cssVars = computeCssVars(detents, currentDetentId, containerHeight, side);

  // largestUndimmedDetentId: backdrop stays transparent at/below this detent
  if (largestUndimmedDetentId) {
    const undimmedIdx = detents.findIndex((d) => d.id === largestUndimmedDetentId);
    const currentIdx = detents.findIndex((d) => d.id === currentDetentId);
    const isUndimmed = undimmedIdx !== -1 && currentIdx <= undimmedIdx;
    (cssVars as Record<string, string>)['--ss-undimmed'] = isUndimmed ? '1' : '0';
  }

  // fadeFromIndex: granular static backdrop opacity (drag-time updates happen in useSheetGesture)
  if (fadeFromIndex !== undefined) {
    const opacity = computeBackdropOpacity({ detents, currentDetentId, fadeFromIndex });
    (cssVars as Record<string, string>)['--ss-backdrop-opacity'] = String(opacity);
  }

  // Nested displacement: this layer translates up by N px when a child sheet sits on top of it.
  const hasChildAbove = layerIdx >= 0 && layerIdx < state.stack.length - 1;
  if (hasChildAbove && nestedDisplacement > 0) {
    (cssVars as Record<string, string>)['--ss-nested-displacement'] = `${nestedDisplacement}px`;
  } else {
    (cssVars as Record<string, string>)['--ss-nested-displacement'] = '0px';
  }

  // Enter/exit: keep the sheet off-screen for the first paint (so the CSS transition has
  // a starting point to animate from), and during 'dismissing' (so it animates out).
  // `entered` flips to true via useEffect *after* the first paint, triggering a re-render
  // that updates --ss-translate-pct to the detent value — that's the change the CSS
  // transition animates against.
  const [entered, setEntered] = useState(false);
  useLayoutEffect(() => {
    if (!entered && (phase === 'presenting' || phase === 'active')) {
      setEntered(true);
    }
  }, [entered, phase]);

  const offScreenPct = side === 'bottom' || side === 'right' ? '100%' : '-100%';
  if (phase === 'mounting' || phase === 'dismissing' || !entered) {
    (cssVars as Record<string, string>)['--ss-translate-pct'] = offScreenPct;
    // Fade the backdrop in lockstep with the sheet entrance/exit. Without this,
    // the backdrop is governed only by --ss-stack-depth and pops in/out before
    // the sheet has visually arrived/departed.
    (cssVars as Record<string, string>)['--ss-backdrop-opacity'] = '0';
  }

  // Drive PRESENTED / DISMISSED dispatches from transform transitionend so the FSM
  // reflects animation completion.
  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== 'transform') return;
      if (e.target !== e.currentTarget) return;
      if (phase === 'presenting') {
        store.dispatch(layerId, { type: 'PRESENTED' });
      } else if (phase === 'dismissing') {
        store.dispatch(layerId, { type: 'DISMISSED' });
      }
    },
    [phase, layerId, store],
  );

  // Watchdog: if transitionend doesn't fire (browser quirks, re-render
  // interruption, sheet under another layer), force-dispatch after the
  // transition's expected duration + margin. Without this the FSM strands in
  // 'dismissing' → background layers stay inert → user can't click anything.
  useEffect(() => {
    if (phase !== 'presenting' && phase !== 'dismissing') return;
    // styles.css uses --ss-enter for present, --ss-exit for dismissing.
    // Read the computed value off the host so we honor user overrides.
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const cssVar = phase === 'dismissing' ? '--ss-exit' : '--ss-enter';
    const raw = root ? getComputedStyle(root).getPropertyValue(cssVar).trim() : '';
    const ms = raw.endsWith('ms')
      ? parseFloat(raw)
      : raw.endsWith('s')
        ? parseFloat(raw) * 1000
        : 450;
    const watchdog = setTimeout(() => {
      // Re-check current phase from the store: if transitionend already
      // dispatched (and our cleanup hasn't run yet), don't fire a stale
      // event into a phase that no longer accepts it.
      const live = store.getState().stack.find((l) => l.id === layerId);
      if (!live) return;
      if (live.phase === 'presenting') store.dispatch(layerId, { type: 'PRESENTED' });
      else if (live.phase === 'dismissing') store.dispatch(layerId, { type: 'DISMISSED' });
    }, ms + 100);
    return () => clearTimeout(watchdog);
  }, [phase, layerId, store]);

  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const [titleCount, setTitleCount] = useState(0);
  const [descCount, setDescCount] = useState(0);

  const registerTitle = useCallback(() => {
    setTitleCount((n) => n + 1);
    return () => setTitleCount((n) => n - 1);
  }, []);
  const registerDescription = useCallback(() => {
    setDescCount((n) => n + 1);
    return () => setDescCount((n) => n - 1);
  }, []);

  const requestDismiss = useCallback(() => {
    if (!dismissible) return;
    store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  }, [dismissible, layerId, store]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        requestDismiss();
      }
    },
    [dismissible, requestDismiss],
  );

  const setDetent = useCallback(
    (id: string) => store.snap(layerId, id, { animated: false }),
    [store, layerId],
  );

  const sheetActions = useMemo<SheetActions>(
    () => ({ setDetent, registerTitle, registerDescription, requestDismiss }),
    [setDetent, registerTitle, registerDescription, requestDismiss],
  );

  const sheetState = useMemo<SheetState>(
    () => ({
      detents,
      currentDetentId,
      containerRef,
      titleId,
      descriptionId,
      dismissible,
    }),
    [detents, currentDetentId, containerRef, titleId, descriptionId, dismissible],
  );

  return (
    <SheetActionsContext.Provider value={sheetActions}>
      <SheetStateContext.Provider value={sheetState}>
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          {...(titleCount > 0 ? { 'aria-labelledby': titleId } : {})}
          {...(descCount > 0 ? { 'aria-describedby': descriptionId } : {})}
          data-sheetstack-presentation="sheet"
          data-sheetstack-side={side}
          data-sheetstack-phase={phase}
          data-sheetstack-dismissible={dismissible ? '' : undefined}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onTransitionEnd={onTransitionEnd}
          style={cssVars as React.CSSProperties}
        >
          {children}
        </div>
      </SheetStateContext.Provider>
    </SheetActionsContext.Provider>
  );
}

function SheetBackdrop({ children }: { children?: React.ReactNode }) {
  return <div data-sheetstack-backdrop>{children}</div>;
}

const SheetHandle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SheetHandle({ ...props }, ref) {
    return <div ref={ref} data-sheetstack-handle data-sheetstack-drag {...props} />;
  },
);

function SheetHeader({ children }: { children?: React.ReactNode }) {
  return <div data-sheetstack-header>{children}</div>;
}

function SheetContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-sheetstack-content {...props}>
      {children}
    </div>
  );
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

function SheetTitle({ children, id, ...props }: SheetTitleProps) {
  const { titleId } = useSheetState();
  const { registerTitle } = useSheetActions();
  useEffect(() => registerTitle(), [registerTitle]);
  return (
    <h2 id={id ?? titleId} data-sheetstack-title {...props}>
      {children}
    </h2>
  );
}

interface SheetDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

function SheetDescription({ children, id, ...props }: SheetDescriptionProps) {
  const { descriptionId } = useSheetState();
  const { registerDescription } = useSheetActions();
  useEffect(() => registerDescription(), [registerDescription]);
  return (
    <p id={id ?? descriptionId} data-sheetstack-description {...props}>
      {children}
    </p>
  );
}

interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

function SheetClose({ children, onClick, ...props }: SheetCloseProps) {
  const { requestDismiss } = useSheetActions();
  return (
    <button
      type="button"
      data-sheetstack-close
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) requestDismiss();
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export const Sheet = {
  Container: SheetContainer,
  Backdrop: SheetBackdrop,
  Handle: SheetHandle,
  Header: SheetHeader,
  Content: SheetContent,
  Title: SheetTitle,
  Description: SheetDescription,
  Close: SheetClose,
};
