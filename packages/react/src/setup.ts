import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Provide an explicit origin so happy-dom honours `replaceState` URL changes
// (without it, `window.location` is stuck on about:blank and history-state
// integration tests can't observe pathname updates).
GlobalRegistrator.register({ url: 'http://localhost:3000/' });
