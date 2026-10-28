'use client';

import type { TaskLink, TaskPosition } from '@/types';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { useCallback, useEffect } from 'react';

import {
  buildSwimlaneLinkId,
  canUseSwimlaneLinkEndpoint,
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneValidLinkTargetByTime,
  resolveSwimlaneLinkingCardClick,
  resolveSwimlaneTaskLinkMode,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { orderTaskIdsByTimeline } from '@/utils/linkAnchors';

export function useSwimlaneLinkingHandlers(input: {
  linkToolArmed: boolean;
  linkingFromTaskId: string | null;
  onAddLink?: (link: { fromTaskId: string; id: string; toTaskId: string }) => void;
  onTaskClick: (taskId: string) => void;
  setLinkingFromTaskId: (id: string | null) => void;
  showLinks: boolean;
  taskLinks: Array<Pick<TaskLink, 'fromTaskId' | 'toTaskId'>>;
  taskPositions: Map<string, TaskPosition>;
}) {
  const {
    linkToolArmed,
    linkingFromTaskId,
    onAddLink,
    onTaskClick,
    setLinkingFromTaskId,
    showLinks,
    taskLinks,
    taskPositions,
  } = input;

  const resolveTaskLinkMode = useCallback(
    (taskId: string) => {
      if (!showLinks || linkingFromTaskId == null) return null;
      return resolveSwimlaneTaskLinkMode({
        linkAlreadyExists: computeSwimlaneLinkAlreadyExists(
          linkingFromTaskId,
          taskId,
          taskLinks
        ),
        linkingFromTaskId,
        taskId,
        validTargetByTime: computeSwimlaneValidLinkTargetByTime(
          taskPositions.get(taskId),
          taskPositions.get(linkingFromTaskId)
        ),
      });
    },
    [linkingFromTaskId, showLinks, taskLinks, taskPositions]
  );

  const handleCancelLinking = useCallback(() => {
    setLinkingFromTaskId(null);
  }, [setLinkingFromTaskId]);

  const handleCompleteLink = useCallback(
    (toTaskId: string) => {
      if (!linkingFromTaskId || linkingFromTaskId === toTaskId || !onAddLink) return;
      if (resolveTaskLinkMode(toTaskId) !== 'target') return;
      // Тянуть можно в любую сторону, но связь всегда смотрит в будущее: раньше → позже.
      const { earlierTaskId, laterTaskId } = orderTaskIdsByTimeline(
        linkingFromTaskId,
        toTaskId,
        taskPositions
      );
      onAddLink({
        id: buildSwimlaneLinkId(),
        fromTaskId: earlierTaskId,
        toTaskId: laterTaskId,
      });
      setLinkingFromTaskId(null);
    },
    [linkingFromTaskId, onAddLink, resolveTaskLinkMode, setLinkingFromTaskId, taskPositions]
  );

  const handleTaskClickWithLinking = useCallback(
    (taskId: string) => {
      const action = resolveSwimlaneLinkingCardClick({
        canCompleteLink: resolveTaskLinkMode(taskId) === 'target',
        canUseAsSource: canUseSwimlaneLinkEndpoint(taskId),
        linkToolArmed,
        linkingFromTaskId,
        taskId,
      });
      if (action === 'cancel-source') {
        setLinkingFromTaskId(null);
        return;
      }
      if (action === 'complete') {
        handleCompleteLink(taskId);
        return;
      }
      if (action === 'start-source') {
        setLinkingFromTaskId(taskId);
        return;
      }
      if (action === 'ignore') {
        return;
      }
      onTaskClick(taskId);
    },
    [
      handleCompleteLink,
      linkToolArmed,
      linkingFromTaskId,
      onTaskClick,
      resolveTaskLinkMode,
      setLinkingFromTaskId,
    ]
  );

  useEffect(() => {
    if (linkingFromTaskId == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancelLinking();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCancelLinking, linkingFromTaskId]);

  useEffect(() => {
    if (!showLinks && linkingFromTaskId != null) {
      handleCancelLinking();
    }
  }, [handleCancelLinking, linkingFromTaskId, showLinks]);

  useEffect(() => {
    return () => {
      setLinkingFromTaskId(null);
    };
  }, [setLinkingFromTaskId]);

  const handleSwimlanesClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!linkingFromTaskId) return;
      const el = e.target as HTMLElement;
      if (!el.closest('[data-task-id]') && !el.closest('[data-swimlane-link-cancel]')) {
        handleCancelLinking();
      }
    },
    [handleCancelLinking, linkingFromTaskId]
  );

  return {
    handleSwimlanesClickCapture,
    handleTaskClickWithLinking,
  };
}
