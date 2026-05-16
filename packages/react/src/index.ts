// Stack
export { StackProvider, useStack, useStackState } from './stack/context';

// Stage
export { Stage } from './stage/Stage.tsx';
export { HiddenPolyfill } from './stage/HiddenPolyfill.tsx';

// Layer
export { LayerHost } from './layer/LayerHost.tsx';
export { useLayer } from './layer/useLayer';
export { useLayerPhase } from './layer/useLayerPhase';
export { useLifecycle } from './layer/useLifecycle';
export type { LifecycleCallbacks } from './layer/useLifecycle';
export { useStackEvent } from './layer/useStackEvent';

// Motion
export { MotionCoordinator } from './motion/MotionCoordinator';
export type { MotionEvent } from './motion/MotionCoordinator';
export { MotionCoordinatorProvider, useMotionCoordinator } from './motion/context';
export { useLayerAnimation } from './motion/useLayerAnimation';

// Gesture
export { attachPanBase } from './gesture/attachPanBase';
export type { PanBaseOptions } from './gesture/attachPanBase';

// Scroll
export { usePreventScroll } from './scroll/usePreventScroll';
export { usePositionFixed } from './scroll/usePositionFixed';

// Keyboard
export { useKeyboardAvoidance } from './keyboard/useKeyboardAvoidance';

// Re-exports from core (convenience for adapter authors)
export type { AnimationDescriptor } from '@gwn-sheet-stack/core';
