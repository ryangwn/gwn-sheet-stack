// Vaul-derived presentation constants.

export const BORDER_RADIUS = 8;
export const WINDOW_TOP_OFFSET = 26;
export const NESTED_DISPLACEMENT = 16;

export const TRANSITIONS = {
  DURATION: 0.5,
  EASE: [0.32, 0.72, 0, 1] as const,
};

export const TRANSITION_CSS = `${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`;
