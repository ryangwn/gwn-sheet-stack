import React, { useEffect, useRef } from 'react';

import { useLayerId } from '../layer/LayerContext';
import { useLayerPhase } from '../layer/useLayerPhase';
import { useLayerAnimation } from '../motion/useLayerAnimation';
import { useStack } from '../stack/context';

interface PanelProps {
  side?: 'left' | 'right';
  width?: number | string;
  modal?: boolean;
  children?: React.ReactNode;
}

export function Panel({ side = 'right', width = 320, modal = true, children }: PanelProps) {
  const layerId = useLayerId();
  const store = useStack();
  const phase = useLayerPhase(layerId);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const animation = useLayerAnimation({ surfaceRef, backdropRef });

  const widthCss = typeof width === 'number' ? `${width}px` : width;
  const sign: -1 | 1 = side === 'left' ? -1 : 1;

  useEffect(() => {
    if (phase === 'presenting') {
      animation.run({
        kind: 'panel',
        direction: 'in',
        sign,
        spring: { duration: 0.42, bounce: 0.12 },
      });
    } else if (phase === 'dismissing') {
      animation.run({
        kind: 'panel',
        direction: 'out',
        sign,
        spring: { duration: 0.28, bounce: 0 },
      });
    }
  }, [phase, animation, sign]);

  const backdropClick = () => {
    if (modal) store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  };

  return (
    <>
      {modal && (
        <div
          ref={backdropRef}
          data-sheetstack-backdrop
          onClick={backdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            opacity: 0,
            pointerEvents: 'auto',
            transition: 'none',
          }}
        />
      )}
      <div
        ref={surfaceRef}
        data-sheetstack-presentation="panel"
        data-sheetstack-side={side}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: widthCss,
          transform: `translate3d(${sign * 100}%, 0, 0)`,
        }}
      >
        {children}
      </div>
    </>
  );
}
