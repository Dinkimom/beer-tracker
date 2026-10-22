'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { createContext, useContext, useMemo } from 'react';

import {
  sprintCardPresenceLocksTarget,
  sprintCardPresenceViewers,
} from '@/lib/realtime/sprintCardPresence';
import { sprintPresenceColorSlots } from '@/lib/realtime/sprintPresenceColor';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

interface SprintCardPresenceValue {
  /** Слоты палитры по всей доске (вместе со своей вкладкой) — как в шапке. */
  colorSlots: ReadonlyMap<string, number>;
  viewers: readonly SprintPresenceViewer[];
}

const EMPTY_PRESENCE: SprintCardPresenceValue = { colorSlots: new Map(), viewers: [] };

const SprintCardPresenceContext = createContext<SprintCardPresenceValue>(EMPTY_PRESENCE);

export function SprintCardPresenceProvider({
  children,
  viewers,
}: {
  children: React.ReactNode;
  viewers: readonly SprintPresenceViewer[];
}) {
  const value = useMemo(
    () => ({ colorSlots: sprintPresenceColorSlots(viewers), viewers }),
    [viewers]
  );
  return <SprintCardPresenceContext.Provider value={value}>{children}</SprintCardPresenceContext.Provider>;
}

export function useSprintBoardPresenceViewers(): readonly SprintPresenceViewer[] {
  return useContext(SprintCardPresenceContext).viewers;
}

export function useSprintPresenceColorSlots(): ReadonlyMap<string, number> {
  return useContext(SprintCardPresenceContext).colorSlots;
}

export function useSprintCardPresenceViewers(targetId: string): SprintPresenceViewer[] {
  const { viewers } = useContext(SprintCardPresenceContext);
  if (viewers.length === 0) {
    return [];
  }
  return sprintCardPresenceViewers(viewers, targetId, getBrowserRealtimeClientId() || null);
}

export function useSprintCardPresenceLocked(targetId: string): boolean {
  const { viewers } = useContext(SprintCardPresenceContext);
  return sprintCardPresenceLocksTarget(viewers, targetId, getBrowserRealtimeClientId() || null);
}
