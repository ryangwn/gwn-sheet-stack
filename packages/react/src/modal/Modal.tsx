import React, { useEffect, useRef } from 'react';

import { useLayerId } from '../layer/LayerContext';
import { useLayerPhase } from '../layer/useLayerPhase';
import { useLayerAnimation } from '../motion/useLayerAnimation';
import { useStack } from '../stack/context';

interface ModalProps {
  size?: 'fit' | 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  children?: React.ReactNode;
}

const SIZE_MAP = {
  fit: 'auto',
  sm: '400px',
  md: '560px',
  lg: '720px',
};

export function Modal({ size = 'md', dismissible = true, children }: ModalProps) {
  const layerId = useLayerId();
  const store = useStack();
  const phase = useLayerPhase(layerId);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const animation = useLayerAnimation({ surfaceRef, backdropRef });

  useEffect(() => {
    if (phase === 'presenting') {
      animation.run({ kind: 'modal', direction: 'in', spring: { duration: 0.42, bounce: 0.18 } });
    } else if (phase === 'dismissing') {
      animation.run({ kind: 'modal', direction: 'out', spring: { duration: 0.22, bounce: 0 } });
    }
  }, [phase, animation]);

  const backdropClick = () => {
    if (dismissible) store.dispatch(layerId, { type: 'DISMISS', source: 'user' });
  };

  return (
    <>
      <div
        ref={backdropRef}
        data-sheetstack-backdrop
        onClick={backdropClick}
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0,
          pointerEvents: 'auto',
          // The MotionCoordinator drives opacity directly each frame —
          // bypass styles.css's transition so it doesn't fight us.
          transition: 'none',
        }}
      />
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        data-sheetstack-presentation="modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.92)',
          opacity: 0,
          width: SIZE_MAP[size],
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </>
  );
}
