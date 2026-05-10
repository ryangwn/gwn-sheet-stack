# gwn-sheet-stack-adapters-router-tanstack

[TanStack Router](https://tanstack.com/router) adapter for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack).

## Install

```bash
bun add gwn-sheet-stack-core gwn-sheet-stack-adapters-router-tanstack
```

Plus your framework binding (`gwn-sheet-stack-react`) and TanStack Router itself.

Peer deps: `@tanstack/react-router >=1`, `gwn-sheet-stack-core`.

## Use

```tsx
import { tanstackRouterAdapter } from 'gwn-sheet-stack-adapters-router-tanstack';
import { StackProvider, Stage } from 'gwn-sheet-stack-react';

import { router } from './router';

export function StackRoot({ children, registry }) {
  const routerAdapter = tanstackRouterAdapter({ router });
  return (
    <StackProvider registry={registry} routerAdapter={routerAdapter}>
      {children}
      <Stage />
    </StackProvider>
  );
}
```

The adapter reads/writes the URL through your existing TanStack Router instance, so back/forward buttons traverse the Layer history.

## API

- **`tanstackRouterAdapter(options)`** — produces a `RouterAdapter` from a TanStack Router instance. Accepts `TanstackAdapterOptions`.

## License

MIT
