'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { createContext, useContext } from 'react';

import {
  sprintCardPresenceLocksTarget,
  sprintCardPresenceViewers,
} from '@/lib/realtime/sprintCardPresence';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

const SprintCardPresenceContext = createContext<readonly SprintPresenceViewer[]>([]);

export function SprintCardPresenceProvider({
  children,
  viewers,
}: {
  children: React.ReactNode;
  viewers: readonly SprintPresenceViewer[];
}) {
  return <SprintCardPresenceContext.Provider value={viewers}>{children}</SprintCardPresenceContext.Provider>;
}

export function useSprintBoardPresenceViewers(): readonly SprintPresenceViewer[] {
  return useContext(SprintCardPresenceContext);
}

export function useSprintCardPresenceViewers(targetId: string): SprintPresenceViewer[] {
  const viewers = useContext(SprintCardPresenceContext);
  if (viewers.length === 0) {
    return [];
  }
  return sprintCardPresenceViewers(viewers, targetId, getBrowserRealtimeClientId() || null);
}

export function useSprintCardPresenceLocked(targetId: string): boolean {
  const viewers = useContext(SprintCardPresenceContext);
  return sprintCardPresenceLocksTarget(viewers, targetId, getBrowserRealtimeClientId() || null);
}
