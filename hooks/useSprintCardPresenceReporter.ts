'use client';

import type {
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

function packPresencePublishKey(input: {
  attention: SprintPresenceAttention;
  boardView: SprintPresenceBoardView;
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
  sprintId: number;
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
        sprintId: input.sprintId,
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
 */
export function useSprintCardPresenceReporter(input: {
  boardView: SprintPresenceBoardView;
  contextMenuTaskId: string | null;
  draggingTaskId: string | null;
  editingTaskId: string | null;
  gesture: SprintPresenceGesture | null;
  hoveredTaskId: string | null;
  linkingTaskId: string | null;
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

  useEffect(() => {
    const sprintId = input.sprintId;
    if (!sprintId || sprintId <= 0 || !organizationId) {
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
        sprintId,
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
  }, [desiredKey, input.sprintId, organizationId]);

  useEffect(() => {
    const sprintId = input.sprintId;
    return () => {
      if (!sprintId || sprintId <= 0 || !organizationId || !lastPostedKeyRef.current) {
        return;
      }
      lastPostedKeyRef.current = '';
      putSprintPresenceFocus({
        attention: 'idle',
        focus: null,
        gesture: null,
        organizationId,
        sprintId,
      }).catch(() => undefined);
    };
  }, [input.sprintId, organizationId]);
}
