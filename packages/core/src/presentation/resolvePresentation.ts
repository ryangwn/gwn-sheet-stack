export type PresentationRequest =
  | { kind: 'sheet'; forceSheet?: boolean; [key: string]: unknown }
  | { kind: 'modal'; size?: 'fit' | 'sm' | 'md' | 'lg'; dismissible?: boolean }
  | { kind: 'panel'; side: 'left' | 'right'; width: number | string; modal?: boolean }
  | { kind: 'push'; edgeSwipeBack?: boolean };

export type ResolvedPresentation =
  | { kind: 'sheet'; forceSheet?: boolean; [key: string]: unknown }
  | { kind: 'modal'; size?: 'fit' | 'sm' | 'md' | 'lg'; dismissible?: boolean }
  | { kind: 'panel'; side: 'left' | 'right'; width: number | string; modal?: boolean }
  | { kind: 'push'; edgeSwipeBack?: boolean };

export function resolvePresentation(
  req: PresentationRequest,
  vw: number,
  breakpoint = 768,
): ResolvedPresentation {
  if (req.kind === 'sheet' && !req.forceSheet && vw >= breakpoint) {
    return { kind: 'modal', size: 'md', dismissible: true };
  }
  return req;
}
