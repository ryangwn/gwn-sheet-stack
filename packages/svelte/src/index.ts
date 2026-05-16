export { default as StackProvider } from './StackProvider.svelte';
export { default as Stage } from './Stage.svelte';
export { default as LayerHost } from './LayerHost.svelte';

export { getStack } from './lib/getStack';
export { getLayer } from './lib/getLayer';
export { defineRegistry } from './lib/defineRegistry';
export { portal } from './lib/portal';
export { keyboardAvoidance } from './lib/keyboardAvoidance';

export {
  onLayerLoad,
  onLayerWillAppear,
  onLayerDidAppear,
  onLayerWillDisappear,
  onLayerDidDisappear,
  onLayerMemoryWarning,
  onLayerSnapshot,
  getLayerVisibility,
} from './lib/lifecycle';
