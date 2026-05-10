import { useEffect, useRef } from 'react';

import {
  SpringDriver,
  chooseSnapTarget,
  computeBackdropOpacity,
  rubberBand,
} from 'gwn-sheet-stack-core';

import { useLayerId } from '../layer/LayerContext';
import { useStack } from '../stack/context';
import type { DetentSpec } from './SheetContext';
import { attachPan } from './attachPan';

interface UseSheetGestureOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Element that receives pointer events. Defaults to containerRef. Used by handleOnly mode. */
  panTargetRef?: React.RefObject<HTMLElement | null>;
  detents: DetentSpec[];
  currentDetentId: string;
  dismissible?: boolean;
  topEdgeScroll?: 'scroll' | 'expand';
  dismissVelocityThreshold?: number;
  snapVelocityThreshold?: number;
  fastFlickThreshold?: number;
  /** Drag-distance-based dismiss threshold (fraction of container height). Vaul: 0.25. */
  closeThreshold?: number;
  fadeFromIndex?: number | undefined;
  onAnimationEnd?: (open: boolean) => void;
  /** When false, the hook does not attach pointer listeners. Default true. */
  enabled?: boolean;
}

export function useSheetGesture({
  containerRef,
  panTargetRef,
  detents,
  currentDetentId,
  dismissible = true,
  topEdgeScroll = 'scroll',
  dismissVelocityThreshold = 0.4,
  snapVelocityThreshold = 0.3,
  fastFlickThreshold = 2,
  closeThreshold = 0.25,
  fadeFromIndex,
  onAnimationEnd,
  enabled = true,
}: UseSheetGestureOptions) {
  const layerId = useLayerId();
  const store = useStack();

  const driverRef = useRef<SpringDriver | null>(null);
  const startTranslateRef = useRef(0);
  const currentTranslateRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const panEl = panTargetRef?.current ?? container;
    if (!container || !panEl) return;

    const maxDetent = Math.max(...detents.map((d) => d.size));
    const minDetent = Math.min(...detents.map((d) => d.size));
    const isAtLargestDetent = () =>
      currentDetentId === detents.find((d) => d.size === maxDetent)?.id;

    const getContainerHeight = () => container.offsetHeight;

    const updateBackdrop = (translate: number, h: number) => {
      if (fadeFromIndex === undefined) return;
      // approximate drag progress between current detent and target
      const currentDetent = detents.find((d) => d.id === currentDetentId);
      if (!currentDetent) return;
      const baseTranslate = (1 - currentDetent.size) * h;
      const delta = translate - baseTranslate;
      const dragDirection = delta > 0 ? -1 : delta < 0 ? 1 : 0;
      const idx = detents.findIndex((d) => d.id === currentDetentId);
      const targetIdx = Math.max(0, Math.min(detents.length - 1, idx + dragDirection));
      const targetTranslate = (1 - detents[targetIdx]!.size) * h;
      const span = Math.abs(targetTranslate - baseTranslate);
      const dragProgress = span > 0 ? Math.min(1, Math.abs(delta) / span) : 0;
      const opacity = computeBackdropOpacity({
        detents,
        currentDetentId,
        fadeFromIndex,
        dragProgress,
        dragDirection: dragDirection as -1 | 0 | 1,
      });
      container.style.setProperty('--ss-backdrop-opacity', String(opacity));
    };

    const applyTranslate = (t: number) => {
      currentTranslateRef.current = t;
      const h = getContainerHeight();
      // Inline transform overrides the percent-based static CSS rule during drag/spring.
      container.style.transform = `translate3d(0, ${t - (containerNestedDisplacementPx() || 0)}px, 0)`;
      container.style.setProperty('--ss-translate', `${t}px`);
      container.style.setProperty('--ss-swipe-delta', `${t - startTranslateRef.current}px`);
      updateBackdrop(t, h);
    };

    const containerNestedDisplacementPx = () => {
      const v = container.style.getPropertyValue('--ss-nested-displacement');
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    const clearInlineTransform = () => {
      container.style.transform = '';
      container.style.transition = '';
    };

    const suspendTransition = () => {
      container.style.transition = 'none';
    };

    const detach = attachPan(panEl, {
      topEdgeScroll,
      isAtLargestDetent,

      onStart: (_startY) => {
        // cancel any running spring, inherit position
        if (driverRef.current?.isRunning) {
          driverRef.current.stop();
        }
        startTranslateRef.current = currentTranslateRef.current;
        // Disable CSS transition while the gesture/spring drives transform every frame.
        suspendTransition();
        store.dispatch(layerId, { type: 'DRAG_START' });
      },

      onMove: (dy, _vy) => {
        const h = getContainerHeight();
        const currentDetentFraction = detents.find((d) => d.id === currentDetentId)?.size ?? 0.5;
        const baseTranslate = (1 - currentDetentFraction) * h;
        const rawTranslate = baseTranslate + dy;

        const minTranslate = (1 - maxDetent) * h;
        const maxTranslate = dismissible ? h : (1 - minDetent) * h;

        const clamped = rubberBand(rawTranslate, minTranslate, maxTranslate);
        applyTranslate(clamped);
      },

      onEnd: (vy) => {
        const h = getContainerHeight();
        const currentY = currentTranslateRef.current;

        const outcome = chooseSnapTarget(
          { dismissible: dismissible ?? true, detents, currentDetentId },
          { v: vy, y: currentY, containerHeight: h },
          {
            dismissVelocityThreshold,
            snapVelocityThreshold,
            decayCoef: 200,
            fastFlickThreshold,
            closeThreshold,
          },
        );

        if (outcome.kind === 'dismiss') {
          store.dispatch(layerId, { type: 'DISMISS', source: 'user' });

          // Spring out to off-screen so the close animates smoothly from the drag
          // release position. Without this, the inline transform set during drag
          // would override the CSS rule that drives the dismiss transition.
          const driver = new SpringDriver(
            (cb) => requestAnimationFrame(cb),
            (id) => cancelAnimationFrame(id),
          );
          driverRef.current = driver;
          driver.start(
            { duration: 0.35, bounce: 0 },
            currentY,
            h,
            vy * 1000,
            applyTranslate,
            () => {
              clearInlineTransform();
              store.dispatch(layerId, { type: 'DISMISSED' });
              onAnimationEnd?.(false);
            },
          );
          return;
        }

        // outcome.kind === 'snap' for sheets — 'rest' is not produced here.
        if (outcome.kind !== 'snap') return;
        const targetDetentId = outcome.detentId;
        store.dispatch(layerId, { type: 'DRAG_END', targetDetentId });

        // animate to target
        const targetDetent = detents.find((d) => d.id === targetDetentId);
        if (!targetDetent) return;
        const targetTranslate = (1 - targetDetent.size) * h;

        const driver = new SpringDriver(
          (cb) => requestAnimationFrame(cb),
          (id) => cancelAnimationFrame(id),
        );
        driverRef.current = driver;
        driver.start(
          { duration: 0.35, bounce: 0.15 },
          currentY,
          targetTranslate,
          vy * 1000, // px/ms → px/s
          applyTranslate,
          () => {
            clearInlineTransform();
            store.dispatch(layerId, { type: 'SNAPPED' });
            onAnimationEnd?.(true);
          },
        );
      },
    });

    return detach;
  }, [
    layerId,
    store,
    containerRef,
    panTargetRef,
    detents,
    currentDetentId,
    dismissible,
    topEdgeScroll,
    dismissVelocityThreshold,
    snapVelocityThreshold,
    fastFlickThreshold,
    closeThreshold,
    fadeFromIndex,
    onAnimationEnd,
    enabled,
  ]);
}
