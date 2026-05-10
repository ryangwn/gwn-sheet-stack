import type { SpringDescriptor } from '../spring/spring';

/**
 * Closed enum of how a non-Sheet Layer can be animated.
 *
 * Each variant carries everything LayerAnimation needs to drive a present()
 * or dismiss() — including the spring physics. Components publish a
 * descriptor; LayerAnimation translates spring progress (0 → 1) into the
 * matching AnimationValues bag and forwards it to the AnimationSink.
 */
export type AnimationDescriptor =
  | {
      kind: 'modal';
      direction: 'in' | 'out';
      spring: SpringDescriptor;
    }
  | {
      kind: 'panel';
      direction: 'in' | 'out';
      sign: -1 | 1; // -1 = left side, +1 = right side
      spring: SpringDescriptor;
    }
  | {
      kind: 'push';
      direction: 'in' | 'out';
      spring: SpringDescriptor;
    };

/**
 * The bag of values published every tick. The MotionCoordinator (or any
 * AnimationSink in tests) projects these to inline styles + CSS custom
 * properties. Components never touch the DOM for these directly.
 */
export type AnimationValues =
  | {
      kind: 'modal';
      scale: number;
      opacity: number;
      backdropOpacity: number;
      // 0 → 1 as the modal covers the underlay. Drives underlay dim.
      underlayProgress: number;
    }
  | {
      kind: 'panel';
      translatePct: number;
      backdropOpacity: number;
      underlayProgress: number;
    }
  | {
      kind: 'push';
      translatePct: number;
      // 0 → 1 as the push covers the underlay. Drives underlay parallax + dim.
      underlayProgress: number;
    };

export interface AnimationSink {
  write(values: AnimationValues): void;
}
