export type LayerPhase =
  | 'mounting'
  | 'presenting'
  | 'active'
  | 'background'
  | 'dragging'
  | 'snapping'
  | 'dismissing'
  | 'evicted';

export type DismissSource =
  | 'user'
  | 'programmatic'
  | 'router'
  | 'replaced'
  | 'reset'
  | 'popped-past';

export type LayerEvent =
  | { type: 'MOUNTED' }
  | { type: 'PRESENTED' }
  | { type: 'BACKGROUND' }
  | { type: 'FOREGROUND' }
  | { type: 'EVICT' }
  | { type: 'REVIVE' }
  | { type: 'DRAG_START' }
  | { type: 'DRAG_END'; targetDetentId: string }
  | { type: 'SNAP'; detentId: string; animated: boolean }
  | { type: 'SNAPPED' }
  | {
      type: 'DISMISS';
      source: DismissSource;
      skipAnimation?: boolean;
      result?: unknown;
    }
  | { type: 'DISMISSED' };

export type PresentationKind = 'sheet' | 'modal' | 'panel' | 'push';
export type RenderMode = 'visible' | 'hidden' | 'unmount';

export function renderModeFor(
  indexFromTop: number,
  topPresentation: PresentationKind,
  mountWindow: number,
): RenderMode {
  if (indexFromTop >= mountWindow) return 'unmount';
  // Top + immediate underlay always rendered — required for parallax / dim /
  // continuous transitions. display:none → display:block can't interpolate.
  // if (indexFromTop <= 1) return 'visible';
  // Panel keeps the rest of the stack visible (side rail metaphor).
  // if (topPresentation === 'panel') return 'visible';
  return 'visible';
}

export const transitions: Record<LayerPhase, Partial<Record<LayerEvent['type'], LayerPhase>>> = {
  // DISMISS from mounting covers the race where a route component unmounts
  // before the surface adapter has had a chance to fire MOUNTED — e.g. fast
  // back-navigation right after a route push.
  mounting: { MOUNTED: 'presenting', DISMISS: 'dismissing' },
  presenting: {
    PRESENTED: 'active',
    DRAG_START: 'dragging',
    DISMISS: 'dismissing',
    // A new layer can push on top before this one finishes presenting.
    // Allow BACKGROUND so the older layer is correctly demoted; otherwise
    // it stays 'presenting' forever and the auto-FOREGROUND on pop misses.
    BACKGROUND: 'background',
  },
  active: {
    BACKGROUND: 'background',
    DRAG_START: 'dragging',
    SNAP: 'snapping',
    DISMISS: 'dismissing',
  },
  background: { FOREGROUND: 'active', EVICT: 'evicted', DISMISS: 'dismissing' },
  dragging: { DRAG_END: 'snapping', DISMISS: 'dismissing' },
  snapping: { SNAPPED: 'active', DRAG_START: 'dragging', DISMISS: 'dismissing' },
  dismissing: {},
  evicted: { REVIVE: 'mounting', DISMISS: 'dismissing' },
};
