import { useEffect, useMemo, useRef } from 'react';

import { type AnimationSink, type AnimationValues, LayerAnimation } from 'gwn-sheet-stack-core';

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
  const sinkRef = useRef<AnimationSink | null>(null);
  if (sinkRef.current === null) {
    sinkRef.current = {
      write(values: AnimationValues) {
        coordinator.writeLayer(layerId, values);
      },
    };
  }

  const animation = useMemo(
    // eslint-disable-next-line react-hooks/refs
    () => new LayerAnimation(store, layerId, sinkRef.current!),
    [store, layerId],
  );

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
