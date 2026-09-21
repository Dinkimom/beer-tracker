'use client';

import type { TaskLink, TaskPosition } from '@/types';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { useCallback, useEffect, useMemo } from 'react';

import {
  buildSwimlaneLinkId,
  canUseSwimlaneLinkEndpoint,
  computeSwimlaneLinkAlreadyExists,
  computeSwimlaneLinkSourceEndCell,
  computeSwimlaneValidLinkTargetByTime,
  resolveSwimlaneLinkingCardClick,
  resolveSwimlaneTaskLinkMode,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';

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

  const sourceLinkEndCell = useMemo(
    () => computeSwimlaneLinkSourceEndCell(linkingFromTaskId, taskPositions),
    [linkingFromTaskId, taskPositions]
  );

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
          sourceLinkEndCell
        ),
      });
    },
    [linkingFromTaskId, showLinks, sourceLinkEndCell, taskLinks, taskPositions]
  );

  const handleCancelLinking = useCallback(() => {
    setLinkingFromTaskId(null);
  }, [setLinkingFromTaskId]);

  const handleCompleteLink = useCallback(
    (toTaskId: string) => {
      if (!linkingFromTaskId || linkingFromTaskId === toTaskId || !onAddLink) return;
      if (resolveTaskLinkMode(toTaskId) !== 'target') return;
      onAddLink({
        id: buildSwimlaneLinkId(),
        fromTaskId: linkingFromTaskId,
        toTaskId,
      });
      setLinkingFromTaskId(null);
    },
    [linkingFromTaskId, onAddLink, resolveTaskLinkMode, setLinkingFromTaskId]
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
    sourceLinkEndCell,
  };
}
