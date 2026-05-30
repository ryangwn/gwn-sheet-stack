import React from 'react';

import { FONT_SANS } from './tokens';

const mobileFrame: React.CSSProperties = {
  position: 'relative',
  width: 360,
  height: 780,
  borderRadius: 42,
  border: '9px solid #0c0a09',
  background: '#fafaf9',
  overflow: 'hidden',
  boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 2px #292524 inset',
  fontFamily: FONT_SANS,
  color: '#0c0a09',
  // Establishes a containing block for descendant `position: fixed`
  // elements (vaul sheets, radix dialogs) so they stay inside the frame.
  transform: 'translateZ(0)',
};

const iosBar: React.CSSProperties = {
  height: 44,
  paddingInline: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: 15,
  fontWeight: 600,
  color: '#0c0a09',
  position: 'relative',
};

function StatusBar() {
  return (
    <div style={iosBar}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 28,
          background: '#0c0a09',
          borderRadius: 999,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="6" width="3" height="5" rx="0.5" />
          <rect x="4.5" y="4" width="3" height="7" rx="0.5" />
          <rect x="9" y="2" width="3" height="9" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
        </svg>
        <svg
          width="16"
          height="11"
          viewBox="0 0 16 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M1 4.5 A10 10 0 0 1 15 4.5" />
          <path d="M3.5 6.8 A6.5 6.5 0 0 1 12.5 6.8" />
          <path d="M6 9 A3 3 0 0 1 10 9" />
          <circle cx="8" cy="10" r="0.8" fill="currentColor" />
        </svg>
        <div
          style={{
            width: 25,
            height: 11,
            border: '1px solid currentColor',
            borderRadius: 3,
            padding: 1,
            position: 'relative',
          }}
        >
          <div
            style={{ width: '78%', height: '100%', background: 'currentColor', borderRadius: 1 }}
          />
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 3,
              width: 2,
              height: 3,
              background: 'currentColor',
              borderRadius: '0 1px 1px 0',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function MobileFrame({
  children,
  frameRef,
}: {
  children: React.ReactNode;
  frameRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={frameRef} style={mobileFrame}>
      <StatusBar />
      <div style={{ height: 'calc(100% - 44px)', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}
