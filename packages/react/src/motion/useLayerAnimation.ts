import { useEffect, useMemo } from 'react';

import { type AnimationSink, type AnimationValues, LayerAnimation } from '@gwn-sheet-stack/core';

import { useLayerId } from '../layer/LayerContext';
import { useStack } from '../stack/context';
import { useMotionCoordinator } from './context';

interface UseLayerAnimationArgs {
  surfaceRef: React.RefObject<HTMLElement | null>;
  backdropRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Wires a Layer's animation pipeline:
 *  - Registers (surface, backdrop) with the MotionCoordinator on mount.
 *  - Constructs a LayerAnimation whose AnimationSink writes through the
 *    Coordinator. Components never write CSS vars or inline styles directly.
 *  - Returns the LayerAnimation. Components call .run(descriptor) on phase
 *    change, .setLive(values) during gestures, .cancel() on unmount.
 */
export function useLayerAnimation({
  surfaceRef,
  backdropRef,
}: UseLayerAnimationArgs): LayerAnimation {
  const layerId = useLayerId();
  const store = useStack();
  const coordinator = useMotionCoordinator();

  // Stable sink — closes over the coordinator + layerId.
  const sink = useMemo<AnimationSink>(
    () => ({
      write(values: AnimationValues) {
        coordinator.writeLayer(layerId, values);
      },
    }),
    [coordinator, layerId],
  );

  const animation = useMemo(() => new LayerAnimation(store, layerId, sink), [store, layerId, sink]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const unregister = coordinator.registerLayer(layerId, {
      surface,
      backdrop: backdropRef?.current ?? null,
    });
    return () => {
      animation.cancel();
      unregister();
    };
  }, [layerId, coordinator, animation, surfaceRef, backdropRef]);

  return animation;
}
