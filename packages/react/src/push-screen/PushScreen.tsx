import React, { useEffect, useRef } from 'react';

import { decidePushGesture } from '@gwn-sheet-stack/core';

import { attachPanBase } from '../gesture/attachPanBase';
import { useLayerId } from '../layer/LayerContext';
import { useLayerPhase } from '../layer/useLayerPhase';
import { useLayerAnimation } from '../motion/useLayerAnimation';
import { useStack } from '../stack/context';

const EDGE_SWIPE_ZONE = 20;

interface PushScreenProps {
  edgeSwipeBack?: boolean;
  children?: React.ReactNode;
}

export function PushScreen({ edgeSwipeBack = true, children }: PushScreenProps) {
  const layerId = useLayerId();
  const store = useStack();
  const phase = useLayerPhase(layerId);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const edgeZoneRef = useRef<HTMLDivElement | null>(null);
  const animation = useLayerAnimation({ surfaceRef });

  useEffect(() => {
    if (phase === 'presenting') {
      animation.run({ kind: 'push', direction: 'in', spring: { duration: 0.5, bounce: 0 } });
    } else if (phase === 'dismissing') {
      animation.run({ kind: 'push', direction: 'out', spring: { duration: 0.35, bounce: 0 } });
    }
  }, [phase, animation]);

  // Edge swipe back: gesture pipeline = attachPanBase (pointer + EMA velocity)
  // → animation.setLive (per-frame transform) → decidePushGesture (release).
  // The 20px edge-zone has touch-action: none so iOS / Android hand us the
  // gesture instead of treating it as horizontal scroll / native back-swipe.
  useEffect(() => {
    if (!edgeSwipeBack) return;
    const zone = edgeZoneRef.current;
    if (!zone) return;

    let startedFromEdge = false;

    const detach = attachPanBase(zone, {
      axis: 'x',
      touchAction: 'none', // edge-zone owns the gesture wholesale
      onStart: (clientX) => {
        startedFromEdge = clientX <= EDGE_SWIPE_ZONE;
      },
      onMove: (dx) => {
        if (!startedFromEdge) return;
        const vw = window.innerWidth;
        // Rubber-band when dragging past the natural left boundary.
        const effective = dx < 0 ? dx * 0.3 : dx;
        animation.setLive({
          kind: 'push',
          translatePct: (effective / vw) * 100,
          underlayProgress: Math.max(0, Math.min(1, 1 - effective / vw)),
        });
      },
      onEnd: (vx) => {
        if (!startedFromEdge) return;
        startedFromEdge = false;
        const vw = window.innerWidth;
        // Recover the live distance from the Animator's published position
        // (the most recent setLive). translatePct is dx/vw * 100.
        const livePct = animation.position?.kind === 'push' ? animation.position.translatePct : 0;
        const distance = (livePct / 100) * vw;

        const outcome = decidePushGesture({ distance, velocity: vx, axisLength: vw });
        if (outcome.kind === 'dismiss') {
          store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
        } else {
          // 'rest' — snap back to fully presented. dispatch:false because
          // we're already in 'active' (no FSM event needed).
          animation.run(
            { kind: 'push', direction: 'in', spring: { duration: 0.3, bounce: 0 } },
            { dispatch: false },
          );
        }
      },
    });

    return detach;
  }, [edgeSwipeBack, layerId, store, animation]);

  return (
    <div
      ref={surfaceRef}
      data-sheetstack-presentation="push"
      style={{
        position: 'fixed',
        inset: 0,
        transform: 'translate3d(100%, 0, 0)',
      }}
    >
      {children}
      {edgeSwipeBack && (
        <div
          ref={edgeZoneRef}
          data-sheetstack-edge-zone
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: EDGE_SWIPE_ZONE,
            touchAction: 'none',
            zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
