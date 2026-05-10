import type { StackStore } from '@gwn-sheet-stack/core';

import { getStackContext } from './context';

export function getStack(): StackStore {
  return getStackContext();
}
