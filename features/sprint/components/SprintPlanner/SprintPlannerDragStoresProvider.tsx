'use client';

import type { ReactNode } from 'react';

import { SwimlaneSidebarDropPointerContext } from '@/features/sidebar/hooks/useSidebarDropPointer';
import { SwimlaneDragHoverContext } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import {
  SwimlaneDragHoverStore,
  SwimlaneSidebarDropPointerStore,
} from '@/lib/layers/application/swimlaneDrag';

interface SprintPlannerDragStoresProviderProps {
  children: ReactNode;
  hoverStore: SwimlaneDragHoverStore;
  sidebarDropPointerStore: SwimlaneSidebarDropPointerStore;
}

/** Hover-ячейка и Y сайдбара во время DnD — вне React state планера. */
export function SprintPlannerDragStoresProvider({
  children,
  hoverStore,
  sidebarDropPointerStore,
}: SprintPlannerDragStoresProviderProps) {
  return (
    <SwimlaneDragHoverContext.Provider value={hoverStore}>
      <SwimlaneSidebarDropPointerContext.Provider value={sidebarDropPointerStore}>
        {children}
      </SwimlaneSidebarDropPointerContext.Provider>
    </SwimlaneDragHoverContext.Provider>
  );
}
