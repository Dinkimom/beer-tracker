/**
 * Хук для обработчиков комментариев в SprintPlanner
 */

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Comment as CommentType, TaskParent } from '@/types';

import { useCallback } from 'react';

import {
  commentCardRowLayoutToPersistPatch,
  toSwimlaneCommentTaskId,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  excludeTaskLinksTouchingId,
  selectTaskLinksTouchingId,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { parseCommentAuthorName } from '@/lib/comments/commentAuthor';
import { useRootStore } from '@/lib/layers';
import {
  commentHistorySliceFromComment,
  commentHistorySlicesEqual,
} from '@/lib/layers/application/mobx/stores/taskPositionsStore';

interface UseSprintPlannerCommentHandlersProps {
  selectedSprintId: number | null;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  deleteComment: (commentId: string) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  setComments: (updater: (prev: CommentType[]) => CommentType[]) => void;
  setTaskLinks: (
    updater: (
      prev: Array<{ fromTaskId: string; id: string; toTaskId: string }>
    ) => Array<{ fromTaskId: string; id: string; toTaskId: string }>
  ) => void;
}

interface CommentHistoryRecordOptions {
  recordHistory?: boolean;
}

function applyParentToComment(comment: CommentType, parent: TaskParent | null): CommentType {
  if (!parent) {
    return { ...comment, parent: undefined };
  }
  return { ...comment, parent };
}

export function useSprintPlannerCommentHandlers({
  deleteComment,
  deleteLink,
  selectedSprintId,
  setComments,
  setTaskLinks,
  taskLinks,
}: UseSprintPlannerCommentHandlersProps) {
  const { data: currentUser } = useCurrentUser();
  const { taskPositions: positionsStore } = useRootStore();

  const handleCommentCreate = useCallback(
    (comment: CommentType) => {
      const authorName = comment.authorName ?? parseCommentAuthorName(currentUser?.display);
      setComments((prev: CommentType[]) => [
        ...prev,
        authorName ? { ...comment, authorName } : comment,
      ]);
    },
    [currentUser?.display, setComments]
  );

  const handleCommentDelete = useCallback(
    (id: string) => {
      const commentTaskId = toSwimlaneCommentTaskId(id);
      const linksToDelete = selectTaskLinksTouchingId(taskLinks, commentTaskId);
      setComments((prev: CommentType[]) => prev.filter((c: CommentType) => c.id !== id));
      if (linksToDelete.length > 0) {
        setTaskLinks((prev) => excludeTaskLinksTouchingId(prev, commentTaskId));
        if (selectedSprintId) {
          linksToDelete.forEach((link) => {
            deleteLink(link.id).catch((error) => {
              console.error('Error deleting link:', error);
            });
          });
        }
      }
      if (selectedSprintId) {
        deleteComment(id).catch((error) => {
          console.error('Error deleting comment:', error);
        });
      }
    },
    [deleteComment, deleteLink, selectedSprintId, setComments, setTaskLinks, taskLinks]
  );

  const handleCommentPositionUpdate = useCallback(
    (id: string, x: number, y: number, assigneeId?: string) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) => (c.id === id ? { ...c, x, y, ...(assigneeId && { assigneeId }) } : c))
      );
    },
    [setComments]
  );

  /** Перемещение заметки в другую ячейку/строку (day, part, assigneeId, x, y) */
  const handleCommentMove = useCallback(
    (
      id: string,
      payload: Partial<{
        assigneeId: string;
        day: number;
        height: number;
        part: number;
        width: number;
        x: number;
        y: number;
      }>,
      options?: CommentHistoryRecordOptions
    ) => {
      let historyBefore = null as ReturnType<typeof commentHistorySliceFromComment> | null;
      let historyAfter = null as ReturnType<typeof commentHistorySliceFromComment> | null;

      setComments((prev: CommentType[]) => {
        const current = prev.find((c) => c.id === id);
        if (!current) {
          return prev;
        }
        const next = { ...current, ...payload };
        historyBefore = commentHistorySliceFromComment(current);
        historyAfter = commentHistorySliceFromComment(next);
        return prev.map((c: CommentType) => (c.id === id ? next : c));
      });

      if (
        options?.recordHistory !== false &&
        historyBefore &&
        historyAfter &&
        !commentHistorySlicesEqual(historyBefore, historyAfter)
      ) {
        positionsStore.recordPlanHistory({
          after: new Map(),
          before: new Map(),
          comments: new Map([[id, { after: historyAfter, before: historyBefore }]]),
        });
      }
    },
    [positionsStore, setComments]
  );

  const handleCommentParentChange = useCallback(
    (commentId: string, parent: TaskParent | null, options?: CommentHistoryRecordOptions) => {
      let historyBefore = null as ReturnType<typeof commentHistorySliceFromComment> | null;
      let historyAfter = null as ReturnType<typeof commentHistorySliceFromComment> | null;

      setComments((prev: CommentType[]) => {
        const current = prev.find((comment) => comment.id === commentId);
        if (!current) {
          return prev;
        }
        const next = applyParentToComment(current, parent);
        historyBefore = commentHistorySliceFromComment(current);
        historyAfter = commentHistorySliceFromComment(next);
        return prev.map((comment) => (comment.id === commentId ? next : comment));
      });

      if (
        options?.recordHistory !== false &&
        historyBefore &&
        historyAfter &&
        !commentHistorySlicesEqual(historyBefore, historyAfter)
      ) {
        positionsStore.recordPlanHistory({
          after: new Map(),
          before: new Map(),
          comments: new Map([[commentId, { after: historyAfter, before: historyBefore }]]),
        });
      }
    },
    [positionsStore, setComments]
  );

  /** Atomic layout + optional parent change (feature-lane comment drop). */
  const handleCommentPlanChange = useCallback(
    (
      commentId: string,
      patch: Partial<{
        assigneeId: string;
        day: number;
        height: number;
        part: number;
        width: number;
        x: number;
        y: number;
      }>,
      parentChange: TaskParent | null | undefined
    ) => {
      let historyBefore = null as ReturnType<typeof commentHistorySliceFromComment> | null;
      let historyAfter = null as ReturnType<typeof commentHistorySliceFromComment> | null;

      setComments((prev: CommentType[]) => {
        const current = prev.find((comment) => comment.id === commentId);
        if (!current) {
          return prev;
        }
        let next: CommentType = { ...current, ...patch };
        if (parentChange !== undefined) {
          next = applyParentToComment(next, parentChange);
        }
        historyBefore = commentHistorySliceFromComment(current);
        historyAfter = commentHistorySliceFromComment(next);
        return prev.map((comment) => (comment.id === commentId ? next : comment));
      });

      if (
        historyBefore &&
        historyAfter &&
        !commentHistorySlicesEqual(historyBefore, historyAfter)
      ) {
        positionsStore.recordPlanHistory({
          after: new Map(),
          before: new Map(),
          comments: new Map([[commentId, { after: historyAfter, before: historyBefore }]]),
        });
      }
    },
    [positionsStore, setComments]
  );

  const handleCommentUpdate = useCallback(
    (id: string, text: string, color?: StickyNoteColor) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) =>
          c.id === id ? { ...c, text, ...(color != null ? { color: color } : {}) } : c
        )
      );
    },
    [setComments]
  );

  const handleCommentSizeUpdate = useCallback(
    (id: string, width: number, height: number) => {
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) => (c.id === id ? { ...c, width, height } : c))
      );
    },
    [setComments]
  );

  const handleCommentCardRowLayoutUpdate = useCallback(
    (id: string, layout: { layerShiftUp: number; span: number }) => {
      const patch = commentCardRowLayoutToPersistPatch(layout);
      setComments((prev: CommentType[]) =>
        prev.map((c: CommentType) =>
          c.id === id ? { ...c, height: patch.height, y: patch.y } : c
        )
      );
    },
    [setComments]
  );

  const handleCommentsLeftSprint = useCallback((commentIds: string[]) => {
    if (commentIds.length === 0) {
      return;
    }
    const leaving = new Set(commentIds);
    setComments((prev: CommentType[]) =>
      prev.filter((comment: CommentType) => !leaving.has(comment.id))
    );
  }, [setComments]);

  return {
    handleCommentCreate,
    handleCommentDelete,
    handleCommentsLeftSprint,
    handleCommentParentChange,
    handleCommentPlanChange,
    handleCommentMove,
    handleCommentPositionUpdate,
    handleCommentCardRowLayoutUpdate,
    handleCommentSizeUpdate,
    handleCommentUpdate,
  };
}
