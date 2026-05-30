// Every export here uses React hooks and/or DOM globals (window, document,
// history). Marking the whole entry as a Client Component module so Next.js
// App Router consumers don't have to thread 'use client' through each file.
'use client';

// Stack
export { StackProvider, useStack, useStackState } from './stack/context';

// Stage
export { Stage } from './stage/Stage.tsx';

// Layer
export { LayerHost } from './layer/LayerHost.tsx';
export { useLayer } from './layer/useLayer';
export { useLayerPhase } from './layer/useLayerPhase';
export { useLayerRoute } from './layer/useLayerRoute';
export { useLifecycle } from './layer/useLifecycle';
export type { LifecycleCallbacks } from './layer/useLifecycle';
export { useStackEvent } from './layer/useStackEvent';
