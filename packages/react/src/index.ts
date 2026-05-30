// Every export here uses React hooks and/or DOM globals (window, document,
// history). Marking the whole entry as a Client Component module so Next.js
// App Router consumers don't have to thread 'use client' through each file.
'use client';

// Stack
export { StackProvider, useStack, useStackState } from './stack/context';

// Stage
export { Stage } from './stage/stage.tsx';

// Layer
export { LayerHost } from './layer/layer-host.tsx';
export { useLayer } from './layer/use-layer';
export { useLayerPhase } from './layer/use-layer-phase';
export { useLayerRoute } from './layer/use-layer-route';
export { useLifecycle } from './layer/use-lifecycle';
export type { LifecycleCallbacks } from './layer/use-lifecycle';
export { useStackEvent } from './layer/use-stack-event';
