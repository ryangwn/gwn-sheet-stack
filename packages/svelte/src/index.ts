export { default as StackProvider } from './stack-provider.svelte';
export { default as Stage } from './stage.svelte';
export { default as LayerHost } from './layer-host.svelte';

export { getStack } from './lib/get-stack';
export { getLayer } from './lib/get-layer';
export { defineRegistry } from './lib/define-registry';
export { portal } from './lib/portal';
export { keyboardAvoidance } from './lib/keyboard-avoidance';

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
