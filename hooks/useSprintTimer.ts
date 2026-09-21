'use client';

import type { SprintTimerAction, SprintTimerState } from '@/lib/realtime/sprintTimerState';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchSprintTimer, postSprintTimerAction } from '@/lib/api/sprintTimer';
import { subscribeSprintTimerClient } from '@/lib/realtime/sprintTimerClient';
import {
  idleSprintTimerState,
  remainingMsAt,
  sprintTimerStatusAt,
  SPRINT_TIMER_ADD_MS,
} from '@/lib/realtime/sprintTimerState';

interface SprintTimerView {
  receivedAt: number;
  timer: SprintTimerState;
}

function idleTimerView(now: number): SprintTimerView {
  return { receivedAt: now, timer: idleSprintTimerState(now) };
}

export function useSprintTimer(sprintId: number | null) {
  const [view, setView] = useState(() => idleTimerView(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const sprintIdRef = useRef(sprintId);

  const applyTimer = useCallback((timer: SprintTimerState, force = false) => {
    const receivedAt = Date.now();
    setView((prev) => {
      if (!force && timer.updatedAt < prev.timer.updatedAt) {
        return prev;
      }
      return { receivedAt, timer };
    });
    setNow(receivedAt);
  }, []);

  useEffect(() => {
    if (!sprintId) {
      applyTimer(idleSprintTimerState(Date.now()), true);
      return;
    }
    applyTimer(idleSprintTimerState(Date.now()), true);
    let cancelled = false;
    fetchSprintTimer(sprintId)
      .then((timer) => {
        if (!cancelled && timer) {
          applyTimer(timer);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [applyTimer, sprintId]);

  useEffect(() => {
    sprintIdRef.current = sprintId;
  }, [sprintId]);

  useEffect(() => {
    return subscribeSprintTimerClient((payload) => {
      if (payload.sprintId !== sprintIdRef.current) {
        return;
      }
      applyTimer(payload.timer);
    });
  }, [applyTimer]);

  const snapshot = view.timer;
  const alignedNow = snapshot.serverNow + (now - view.receivedAt);
  const status = sprintTimerStatusAt(snapshot, alignedNow);
  const remainingMs = remainingMsAt(snapshot, alignedNow);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => window.clearInterval(interval);
  }, [status, snapshot.endsAt]);

  const runAction = useCallback(
    async (action: SprintTimerAction) => {
      if (!sprintId) {
        return;
      }
      setBusy(true);
      try {
        const timer = await postSprintTimerAction(sprintId, action);
        if (timer && sprintIdRef.current === sprintId) {
          applyTimer(timer);
        }
      } catch {
        const timer = await fetchSprintTimer(sprintId).catch(() => null);
        if (timer && sprintIdRef.current === sprintId) {
          applyTimer(timer);
        }
      } finally {
        setBusy(false);
      }
    },
    [applyTimer, sprintId]
  );

  const fireAction = useCallback(
    (action: SprintTimerAction) => {
      runAction(action).catch(() => undefined);
    },
    [runAction]
  );

  return {
    busy,
    durationMs: snapshot.durationMs,
    remainingMs,
    start: (durationMs: number) => fireAction({ action: 'start', durationMs }),
    status,
    stop: () => fireAction({ action: 'stop' }),
    pause: () => fireAction({ action: 'pause' }),
    resume: () => fireAction({ action: 'resume' }),
    addMinute: () => fireAction({ action: 'add', extraMs: SPRINT_TIMER_ADD_MS }),
    subtractMinute: () => fireAction({ action: 'add', extraMs: -SPRINT_TIMER_ADD_MS }),
    adjustBy: (extraMs: number) => {
      const rounded = Math.round(extraMs);
      if (rounded === 0) {
        return;
      }
      fireAction({ action: 'add', extraMs: rounded });
    },
    updatedAt: snapshot.updatedAt,
    updatedBy: snapshot.updatedBy,
  };
}
