'use client';

import type {
  QuarterPresenceScope,
  SprintPresenceAttention,
  SprintPresenceBoardView,
  SprintPresenceFocus,
  SprintPresenceGesture,
} from '@/lib/realtime/sprintRealtimeTypes';

import { useEffect, useRef } from 'react';

import { putSprintPresenceFocus } from '@/lib/api/realtime';
import { resolveSprintCardPresenceFocus } from '@/lib/realtime/sprintCardPresence';
import { isSprintPresenceAttention } from '@/lib/realtime/sprintPresenceAttention';
import { isSprintPresenceBoardView } from '@/lib/realtime/sprintPresenceBoardView';
import {
  parseSprintPresenceGesture,
  sprintPresenceGesturePublishDelayMs,
  sprintPresenceGesturePublishKey,
} from '@/lib/realtime/sprintPresenceGesture';
import { SPRINT_PRESENCE_FOCUS_STATES } from '@/lib/realtime/sprintRealtimeTypes';

import { useActiveOrganizationId } from './useActiveOrganizationId';
import { useSprintPresenceAttention } from './useSprintPresenceAttention';

const JOIN_RETRY_DELAYS_MS = [0, 200, 400, 800];
const FOCUS_STATES = new Set<string>(SPRINT_PRESENCE_FOCUS_STATES);


function focusKey(focus: SprintPresenceFocus | null): string {
  return focus ? `${focus.state}:${focus.targetId}` : '';
}

/** Доска, на которой вкладка присутствует: спринт или квартальный план. */
type PresencePlace = QuarterPresenceScope | { sprintId: number };

function presencePlace(sprintId: number | null, quarter: number | undefined, year: number | undefined): PresencePlace | null {
  if (sprintId && sprintId > 0) return { sprintId };
  return quarter !== undefined && year !== undefined ? { quarter, year } : null;
}

function packPresencePublishKey(input: {
  attention: SprintPresenceAttention;
  boardView?: SprintPresenceBoardView;
  focus: SprintPresenceFocus | null;
  gesture: SprintPresenceGesture | null;
}): string {
  return JSON.stringify({
    attention: input.attention,
    boardView: input.boardView,
    focus: input.focus,
    gestureKey: sprintPresenceGesturePublishKey(input.gesture),
  });
}

function unpackPresencePublishKey(key: string): {
  attention: SprintPresenceAttention;
  boardView?: SprintPresenceBoardView;
  focus: SprintPresenceFocus | null;
  gesture: SprintPresenceGesture | null;
} {
  try {
    const row = JSON.parse(key) as Record<string, unknown>;
    const focus = row.focus && typeof row.focus === 'object' ? (row.focus as SprintPresenceFocus) : null;
    const state = focus?.state;
    const targetId = focus?.targetId?.trim();
    return {
      attention: isSprintPresenceAttention(row.attention) ? row.attention : 'active',
      boardView: isSprintPresenceBoardView(row.boardView) ? row.boardView : undefined,
      focus: state && FOCUS_STATES.has(state) && targetId ? { state, targetId } : null,
      gesture: typeof row.gestureKey === 'string' ? parseSprintPresenceGesture(JSON.parse(row.gestureKey || 'null')) ?? null : null,
    };
  } catch {
    return { attention: 'active', focus: null, gesture: null };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function publishSprintCardPresenceFocus(input: {
  desiredKey: string;
  isCancelled: () => boolean;
  organizationId: string;
  place: PresencePlace;
}): Promise<boolean> {
  const { attention, boardView, focus, gesture } = unpackPresencePublishKey(input.desiredKey);
  for (const delayMs of JOIN_RETRY_DELAYS_MS) {
    if (input.isCancelled()) {
      return false;
    }
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    if (input.isCancelled()) {
      return false;
    }
    try {
      const result = await putSprintPresenceFocus({
        attention,
        boardView,
        focus,
        gesture,
        organizationId: input.organizationId,
        ...input.place,
      });
      if (input.isCancelled()) {
        return false;
      }
      if (result.applied || !focus) {
        return true;
      }
    } catch {
      /* retry while SSE join may still be in flight */
    }
  }
  return false;
}

/**
 * Пишет вид доски, фокус, attention и live-жест в presence. SSE односторонний — это REST.
 * Доска — спринт (`sprintId`) или квартальный план (`quarter`, QS7).
 */
export function useSprintCardPresenceReporter(input: {
  boardView?: SprintPresenceBoardView;
  contextMenuTaskId: string | null;
  draggingTaskId: string | null;
  editingTaskId: string | null;
  gesture: SprintPresenceGesture | null;
  hoveredTaskId: string | null;
  linkingTaskId: string | null;
  quarter?: QuarterPresenceScope | null;
  resizingTaskId: string | null;
  sprintId: number | null;
}): void {
  const organizationId = useActiveOrganizationId();
  const lastPostedKeyRef = useRef<string | null>(null);
  const focus = resolveSprintCardPresenceFocus({
    contextMenuTaskId: input.contextMenuTaskId,
    draggingTaskId: input.draggingTaskId,
    editingTaskId: input.editingTaskId,
    hoveredTaskId: input.hoveredTaskId,
    linkingTaskId: input.linkingTaskId,
    resizingTaskId: input.resizingTaskId,
  });
  const attention = useSprintPresenceAttention(Boolean(focus));
  const publishFocus = attention === 'idle' ? null : focus;
  const publishGesture = attention === 'idle' ? null : input.gesture;
  const desiredKey = packPresencePublishKey({
    attention,
    boardView: input.boardView,
    focus: publishFocus,
    gesture: publishGesture,
  });

  const { sprintId } = input;
  const quarter = input.quarter?.quarter;
  const year = input.quarter?.year;

  useEffect(() => {
    const place = presencePlace(sprintId, quarter, year);
    if (!place || !organizationId) {
      lastPostedKeyRef.current = null;
      return;
    }
    if (lastPostedKeyRef.current === desiredKey) {
      return;
    }
    const focusKeyToPost = desiredKey;
    const packed = unpackPresencePublishKey(focusKeyToPost);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      publishSprintCardPresenceFocus({
        desiredKey: focusKeyToPost,
        isCancelled: () => cancelled,
        organizationId,
        place,
      })
        .then((applied) => {
          if (cancelled) {
            return;
          }
          lastPostedKeyRef.current = applied ? focusKeyToPost : null;
        })
        .catch(() => undefined);
    }, sprintPresenceGesturePublishDelayMs(focusKey(packed.focus), packed.gesture));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [desiredKey, organizationId, quarter, sprintId, year]);

  useEffect(() => {
    const place = presencePlace(sprintId, quarter, year);
    return () => {
      if (!place || !organizationId || !lastPostedKeyRef.current) {
        return;
      }
      lastPostedKeyRef.current = '';
      putSprintPresenceFocus({
        attention: 'idle',
        focus: null,
        gesture: null,
        organizationId,
        ...place,
      }).catch(() => undefined);
    };
  }, [organizationId, quarter, sprintId, year]);
}
