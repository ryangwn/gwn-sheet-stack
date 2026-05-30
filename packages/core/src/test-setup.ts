import { GlobalRegistrator } from '@happy-dom/global-registrator';

// historyAdapter tests need window.history. Pre-registered once at test
// preload — re-registering on every test file throws.
if (typeof globalThis.window === 'undefined') {
  GlobalRegistrator.register({ url: 'http://localhost:3000/' });
}
