import { useEffect, useRef } from 'react';

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
  const sticky = opts.sticky;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    return store.events.subscribe<T>(
      name,
      (payload) => handlerRef.current(payload),
      sticky ? { sticky } : {},
    );
  }, [name, sticky, store.events]);
}
