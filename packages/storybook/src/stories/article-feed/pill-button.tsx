import React from 'react';

import { EASE_OUT, FONT_SANS } from './tokens';

type Variant = 'default' | 'primary' | 'ghost';

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: { background: '#f5f5f4', color: '#1c1917', border: '1px solid #e7e5e4' },
  primary: { background: '#0c0a09', color: '#fff', border: 'none' },
  ghost: { background: 'transparent', color: '#57534e', border: 'none' },
};

export function PillButton({
  children,
  onClick,
  variant = 'default',
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: Variant;
  accent?: string;
}) {
  const base = variantStyles[variant];
  const style: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 999,
    cursor: 'pointer',
    fontFamily: FONT_SANS,
    transition: `transform 160ms ${EASE_OUT}`,
    ...base,
    ...(variant === 'primary' && accent ? { background: accent } : null),
  };
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  );
}
