# @gwn-sheet-stack/adapters-router-next

Next.js App Router adapter for [sheet-stack](https://github.com/ryangwn/gwn-sheet-stack). Serializes the stack to the URL using `next/navigation`.

## Install

```bash
bun add @gwn-sheet-stack/core @gwn-sheet-stack/react @gwn-sheet-stack/adapters-router-next
```

Peer deps: `next >=14`, `react >=18`, `@gwn-sheet-stack/core`.

## Use

```tsx
'use client';

import { nextAppRouterAdapter, useSheetStackRouter } from '@gwn-sheet-stack/adapters-router-next';
import { StackProvider, Stage } from '@gwn-sheet-stack/react';

export function StackRoot({ children, registry }) {
  const routerAdapter = useSheetStackRouter(nextAppRouterAdapter());
  return (
    <StackProvider registry={registry} routerAdapter={routerAdapter}>
      {children}
      <Stage />
    </StackProvider>
  );
}
```

Mount this in a client component (App Router layout or a leaf). The adapter wires `next/navigation`'s `useRouter` + `usePathname` + `useSearchParams` into the stack so back/forward buttons traverse the Layer history.

## API

- **`nextAppRouterAdapter(options?)`** — factory producing a `RouterAdapter`. Accepts `NextAdapterOptions`.
- **`useSheetStackRouter(adapter)`** — React hook that completes the wiring inside the App Router lifecycle.

## License

MIT
