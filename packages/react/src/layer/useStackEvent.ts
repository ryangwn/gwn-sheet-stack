import { useEffect } from 'react';

import { useStack } from '../stack/context';

interface UseStackEventOptions {
  sticky?: boolean;
}

export function useStackEvent<T = unknown>(
  name: string,
  handler: (payload: T) => void,
  opts: UseStackEventOptions = {},
): void {
  const store = useStack();

  useEffect(() => {
    return store.events.subscribe<T>(name, handler, opts);
  }, [name, opts.sticky]);
}
