import type React from 'react';

interface HiddenPolyfillProps {
  mode: 'visible' | 'hidden';
  children: React.ReactNode;
}

export function HiddenPolyfill({ mode, children }: HiddenPolyfillProps) {
  if (mode === 'hidden') {
    return (
      <div style={{ display: 'none' }} data-sheetstack-hidden>
        {children}
      </div>
    );
  }
  return <>{children}</>;
}
