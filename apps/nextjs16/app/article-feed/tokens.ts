import type React from 'react';

export const FONT_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
export const FONT_SERIF = '"Iowan Old Style", "Charter", "Georgia", "Source Serif Pro", serif';
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export const sheetSurface: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: '#fafaf9',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingTop: 8,
  maxHeight: '88vh',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: FONT_SANS,
  boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
};

export const grabber: React.CSSProperties = {
  width: 36,
  height: 5,
  borderRadius: 999,
  background: '#d6d3d1',
  margin: '6px auto 14px',
};

export const chip = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  width: 'fit-content',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color,
  background: `${color}14`,
  padding: '4px 8px',
  borderRadius: 6,
});
