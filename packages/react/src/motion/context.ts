import { createContext, useContext } from 'react';

import type { MotionCoordinator } from './MotionCoordinator';

const MotionCoordinatorContext = createContext<MotionCoordinator | null>(null);

export const MotionCoordinatorProvider = MotionCoordinatorContext.Provider;

export function useMotionCoordinator(): MotionCoordinator {
  const c = useContext(MotionCoordinatorContext);
  if (!c) throw new Error('useMotionCoordinator must be used inside <Stage>');
  return c;
}
