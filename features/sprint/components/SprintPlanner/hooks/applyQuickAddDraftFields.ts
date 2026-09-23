import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task, TaskParent, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { isTaskGroupSentinelKey } from '@/features/task/constants/taskGroupKeys';
import { revokeLocalPlannerImageObjectUrl } from '@/features/task/utils/localPlannerImageFile';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { trackerAssigneeForCreatedIssue } from '@/lib/swimlane/teamSwimlaneAssignee';

export const QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS = 2;

export const QUICK_ADD_IMAGE_DRAFT_CARD_ROW = {
  layerShiftUp: 0,
  span: QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS,
} as const;

export function applyQuickAddImageDraftCardRow(
  taskId: string,
  kind: QuickAddDraftKind | undefined,
  ui: {
    clearStickyNoteCardRowOverride: (taskId: string) => void;
    setStickyNoteCardRowOverride: (
      taskId: string,
      layout: { layerShiftUp: number; span: number }
    ) => void;
  }
): void {
  if (kind === 'image') {
    ui.setStickyNoteCardRowOverride(taskId, QUICK_ADD_IMAGE_DRAFT_CARD_ROW);
    return;
  }
  ui.clearStickyNoteCardRowOverride(taskId);
}

export function resolveQuickAddDraftDurationParts(
  kind: QuickAddDraftKind | undefined,
  startDay: number,
  startPart: number,
  timelineTotalParts: number
): number {
  if (kind !== 'image' && kind !== 'diagram') {
    return 1;
  }
  const startCell = startDay * getPartsPerDay() + startPart;
  const remaining = Math.max(1, timelineTotalParts - startCell);
  return Math.min(QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS, remaining);
}

export function applyQuickAddDraftKind(
  tasks: Task[],
  taskId: string,
  kind: QuickAddDraftKind | undefined
): Task[] {
  return tasks.map((task) => {
    if (task.id !== taskId || task.isLocalTask !== true) {
      return task;
    }
    return {
      ...task,
      localDraftKind: kind,
      storyPoints: kind === 'task' ? 1 : 0,
    };
  });
}

export function applyQuickAddDraftCommentColor(
  tasks: Task[],
  taskId: string,
  color: StickyNoteColor
): Task[] {
  return tasks.map((task) =>
    task.id === taskId && task.isLocalTask === true
      ? { ...task, stickyNoteColor: color }
      : task
  );
}

export function applyQuickAddDraftDurationForKind(
  positions: Map<string, TaskPosition>,
  taskId: string,
  kind: QuickAddDraftKind | undefined,
  timelineTotalParts: number
): Map<string, TaskPosition> {
  const position = positions.get(taskId);
  if (!position) {
    return positions;
  }
  const duration = resolveQuickAddDraftDurationParts(
    kind,
    position.startDay,
    position.startPart,
    timelineTotalParts
  );
  if (position.duration === duration && position.plannedDuration === duration) {
    return positions;
  }
  const next = new Map(positions);
  next.set(taskId, { ...position, duration, plannedDuration: duration });
  return next;
}

export function applyQuickAddDraftImageUrl(
  tasks: Task[],
  taskId: string,
  url: string | undefined
): Task[] {
  return tasks.map((task) => {
    if (task.id !== taskId || task.isLocalTask !== true) {
      return task;
    }
    if (task.imageUrl && task.imageUrl !== url) {
      revokeLocalPlannerImageObjectUrl(task.imageUrl);
    }
    return { ...task, imageUrl: url };
  });
}

export function applyQuickAddDraftAssignee(
  tasks: Task[],
  taskId: string,
  assigneeId: string,
  assigneeName?: string
): Task[] {
  return tasks.map((task) =>
    task.id === taskId && task.isLocalTask === true
      ? { ...task, assignee: assigneeId, assigneeName }
      : task
  );
}

export function applyQuickAddDraftParent(
  tasks: Task[],
  taskId: string,
  parentKey: string,
  parentTasks: readonly TaskParent[]
): Task[] {
  const selected = parentTasks.find((parent) => parent.key === parentKey);
  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }
    if (!parentKey.trim()) {
      return { ...task, parent: undefined };
    }
    if (selected) {
      return {
        ...task,
        parent: {
          display: selected.display,
          id: selected.id,
          key: selected.key,
          self: selected.self,
        },
      };
    }
    if (isFeatureLaneDraftRowId(parentKey)) {
      return {
        ...task,
        parent: {
          display: parentKey,
          id: parentKey,
          key: parentKey,
        },
      };
    }
    // Родитель из удалённого поиска по доске — для createIssue достаточно ключа.
    return {
      ...task,
      parent: {
        display: parentKey,
        id: parentKey,
        key: parentKey,
      },
    };
  });
}

export function trackerParentKeyForCreate(parentKey: string | undefined): string | undefined {
  const key = parentKey?.trim();
  if (!key || isFeatureLaneDraftRowId(key)) {
    return undefined;
  }
  return key;
}

export function trackerAssigneeKeyForCreate(
  positionAssignee: string,
  selectedAssignee?: string
): string | undefined {
  const assignee = trackerAssigneeForCreatedIssue(positionAssignee, selectedAssignee);
  if (!assignee || isFeatureLaneDraftRowId(assignee) || isTaskGroupSentinelKey(assignee)) {
    return undefined;
  }
  return assignee;
}

export function plannerDraftParentFromKey(
  parentKey: string | undefined,
  parentTasks: readonly TaskParent[],
  namesById?: ReadonlyMap<string, string>
): TaskParent | undefined {
  const key = parentKey?.trim();
  if (!key || !isFeatureLaneDraftRowId(key)) {
    return undefined;
  }
  const selected = parentTasks.find((parent) => parent.key === key || parent.id === key);
  const named = namesById?.get(key)?.trim();
  const display = named || selected?.display?.trim() || key;
  if (selected) {
    return { ...selected, display, id: selected.id || key, key };
  }
  return { display, id: key, key };
}

export function applyQuickAddDraftTitle(
  tasks: Task[],
  taskId: string,
  title: string,
  onCommentText?: (taskId: string, text: string) => void
): Task[] {
  const current = tasks.find((task) => task.id === taskId);
  if (current?.localDraftKind === 'comment') {
    onCommentText?.(taskId, title);
  }
  return tasks.map((task) => (task.id === taskId ? { ...task, name: title } : task));
}

export function syncQuickAddCommentPresencePreview(
  ui: {
    clearNoteEditPreview: () => void;
    noteEditPreview: { taskId: string } | null;
    setNoteEditPreview: (taskId: string, patch: { color?: StickyNoteColor; text?: string }) => void;
    stickyNoteColor: StickyNoteColor;
  },
  taskId: string,
  kind: QuickAddDraftKind | undefined,
  text = ''
): void {
  if (kind !== 'comment') {
    if (ui.noteEditPreview?.taskId === taskId) {
      ui.clearNoteEditPreview();
    }
    return;
  }
  ui.setNoteEditPreview(taskId, { color: ui.stickyNoteColor, text });
}
