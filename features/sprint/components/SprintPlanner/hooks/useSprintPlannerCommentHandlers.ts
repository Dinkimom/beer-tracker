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
  persistRetargetedTaskLinks,
  selectTaskLinksTouchingId,
} from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  approveAllPendingSprintComments,
  approveSprintComment,
  rejectAllPendingSprintComments,
} from '@/lib/api/sprints';
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
  saveLink: (link: { fromTaskId: string; id: string; toTaskId: string }) => Promise<void>;
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

function withCommentPendingApproval(
  comments: CommentType[],
  commentId: string,
  pending: boolean
): CommentType[] {
  return comments.map((comment) => {
    if (comment.id !== commentId) {
      return comment;
    }
    return pending ? { ...comment, pendingApproval: true } : { ...comment, pendingApproval: undefined };
  });
}

function withCommentsPendingApproval(
  comments: CommentType[],
  commentIds: ReadonlySet<string>,
  pending: boolean
): CommentType[] {
  return comments.map((comment) => {
    if (!commentIds.has(comment.id)) {
      return comment;
    }
    return pending ? { ...comment, pendingApproval: true } : { ...comment, pendingApproval: undefined };
  });
}

function collectLinksTouchingCommentIds(
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>,
  commentIds: readonly string[]
): Array<{ fromTaskId: string; id: string; toTaskId: string }> {
  const byId = new Map<string, { fromTaskId: string; id: string; toTaskId: string }>();
  for (const commentId of commentIds) {
    for (const link of selectTaskLinksTouchingId(taskLinks, toSwimlaneCommentTaskId(commentId))) {
      byId.set(link.id, link);
    }
  }
  return [...byId.values()];
}

function deleteLinksTouchingComment(
  commentTaskId: string,
  input: {
    selectedSprintId: number | null;
    taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
    deleteLink: (linkId: string) => Promise<void>;
    setTaskLinks: (
      updater: (
        prev: Array<{ fromTaskId: string; id: string; toTaskId: string }>
      ) => Array<{ fromTaskId: string; id: string; toTaskId: string }>
    ) => void;
  }
): void {
  const linksToDelete = selectTaskLinksTouchingId(input.taskLinks, commentTaskId);
  if (linksToDelete.length === 0) {
    return;
  }
  input.setTaskLinks((prev) => excludeTaskLinksTouchingId(prev, commentTaskId));
  if (!input.selectedSprintId) {
    return;
  }
  linksToDelete.forEach((link) => {
    input.deleteLink(link.id).catch((error) => {
      console.error('Error deleting link:', error);
    });
  });
}

function syncLinksOnCommentDelete(input: {
  commentTaskId: string;
  retargetLinksTo?: string;
  selectedSprintId: number | null;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  deleteLink: (linkId: string) => Promise<void>;
  saveLink: (link: { fromTaskId: string; id: string; toTaskId: string }) => Promise<void>;
  setTaskLinks: (
    updater: (
      prev: Array<{ fromTaskId: string; id: string; toTaskId: string }>
    ) => Array<{ fromTaskId: string; id: string; toTaskId: string }>
  ) => void;
}): Promise<void> {
  if (input.retargetLinksTo) {
    return persistRetargetedTaskLinks({
      deleteLink: input.deleteLink,
      fromTaskId: input.commentTaskId,
      saveLink: input.saveLink,
      setTaskLinks: input.setTaskLinks,
      taskLinks: input.taskLinks,
      toTaskId: input.retargetLinksTo,
    });
  }
  deleteLinksTouchingComment(input.commentTaskId, input);
  return Promise.resolve();
}

export function useSprintPlannerCommentHandlers({
  deleteComment,
  deleteLink,
  saveLink,
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
    (id: string, options?: { retargetLinksTo?: string }) => {
      const linksSync = syncLinksOnCommentDelete({
        commentTaskId: toSwimlaneCommentTaskId(id),
        deleteLink,
        retargetLinksTo: options?.retargetLinksTo,
        saveLink,
        selectedSprintId,
        setTaskLinks,
        taskLinks,
      });
      setComments((prev: CommentType[]) => prev.filter((c: CommentType) => c.id !== id));
      if (selectedSprintId) {
        deleteComment(id).catch((error) => {
          console.error('Error deleting comment:', error);
        });
      }
      return linksSync;
    },
    [deleteComment, deleteLink, saveLink, selectedSprintId, setComments, setTaskLinks, taskLinks]
  );

  const handleCommentApprove = useCallback(
    (id: string) => {
      setComments((prev: CommentType[]) => withCommentPendingApproval(prev, id, false));
      if (!selectedSprintId) {
        return;
      }
      approveSprintComment(selectedSprintId, id)
        .then((ok) => {
          if (!ok) {
            setComments((prev: CommentType[]) => withCommentPendingApproval(prev, id, true));
          }
        })
        .catch((error) => {
          console.error('Error approving comment:', error);
          setComments((prev: CommentType[]) => withCommentPendingApproval(prev, id, true));
        });
    },
    [selectedSprintId, setComments]
  );

  const handleCommentApproveAll = useCallback(
    (commentIds: readonly string[]) => {
      if (commentIds.length === 0) {
        return;
      }
      const idSet = new Set(commentIds);
      setComments((prev: CommentType[]) => withCommentsPendingApproval(prev, idSet, false));
      if (!selectedSprintId) {
        return;
      }
      approveAllPendingSprintComments(selectedSprintId)
        .then((ok) => {
          if (!ok) {
            setComments((prev: CommentType[]) => withCommentsPendingApproval(prev, idSet, true));
          }
        })
        .catch((error) => {
          console.error('Error approving pending comments:', error);
          setComments((prev: CommentType[]) => withCommentsPendingApproval(prev, idSet, true));
        });
    },
    [selectedSprintId, setComments]
  );

  const handleCommentRejectAll = useCallback(
    (commentIds: readonly string[]) => {
      if (commentIds.length === 0) {
        return;
      }
      const idSet = new Set(commentIds);
      const linksToDelete = collectLinksTouchingCommentIds(taskLinks, commentIds);
      let removed: CommentType[] = [];
      setComments((prev: CommentType[]) => {
        removed = prev.filter((comment) => idSet.has(comment.id));
        return prev.filter((comment) => !idSet.has(comment.id));
      });
      if (linksToDelete.length > 0) {
        const linkIds = new Set(linksToDelete.map((link) => link.id));
        setTaskLinks((prev) => prev.filter((link) => !linkIds.has(link.id)));
      }
      if (!selectedSprintId) {
        return;
      }
      for (const link of linksToDelete) {
        deleteLink(link.id).catch((error) => {
          console.error('Error deleting link:', error);
        });
      }
      rejectAllPendingSprintComments(selectedSprintId).catch((error) => {
        console.error('Error rejecting pending comments:', error);
        setComments((prev: CommentType[]) => [...prev, ...removed]);
        if (linksToDelete.length > 0) {
          setTaskLinks((prev) => [...prev, ...linksToDelete]);
        }
      });
    },
    [deleteLink, selectedSprintId, setComments, setTaskLinks, taskLinks]
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
    handleCommentApprove,
    handleCommentApproveAll,
    handleCommentCreate,
    handleCommentDelete,
    handleCommentsLeftSprint,
    handleCommentParentChange,
    handleCommentPlanChange,
    handleCommentMove,
    handleCommentPositionUpdate,
    handleCommentCardRowLayoutUpdate,
    handleCommentRejectAll,
    handleCommentSizeUpdate,
    handleCommentUpdate,
  };
}
