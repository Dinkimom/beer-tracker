import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Developer, Task, TaskParent, TaskPosition } from '@/types';

import toast from 'react-hot-toast';

import {
  createLocalPlannerImageObjectUrl,
  prepareLocalPlannerImageFile,
} from '@/features/task/utils/localPlannerImageFile';
import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  canQuickAddOnSwimlaneLane,
  placementToolToDraftKind,
} from '../utils/swimlanePlacementToolbar';

import { resolveQuickAddDraftDurationParts } from './applyQuickAddDraftFields';

interface CreateQuickAddDraftInSwimlaneCellInput {
  assigneeId: string;
  boardIdForPlannerData: number | null;
  day: number;
  developers: Developer[];
  imageUrl?: string;
  kind?: QuickAddDraftKind;
  parent?: TaskParent;
  part: number;
  stickyNoteColor?: StickyNoteColor;
  tasksMap: Map<string, Task>;
  timelineTotalParts: number;
  getQueueByBoardId: (boardId: number | null) => string | null;
  onCreated?: (taskId: string, kind: QuickAddDraftKind | undefined) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function createQuickAddDraftInSwimlaneCell(
  input: CreateQuickAddDraftInSwimlaneCellInput
): string {
  const kind = input.kind;
  const duration = resolveQuickAddDraftDurationParts(
    kind ?? 'task',
    input.day,
    input.part,
    input.timelineTotalParts
  );
  const draftTaskId = `local-task-${crypto.randomUUID()}`;
  const assigneeName = input.developers.find((dev) => dev.id === input.assigneeId)?.name;
  const defaultQueue = input.getQueueByBoardId(input.boardIdForPlannerData) ?? undefined;
  input.setTasks((prev) => {
    const withoutDrafts = prev.filter((task) => task.isLocalTask !== true);
    return [
      ...withoutDrafts,
      {
        assignee: input.assigneeId,
        assigneeName,
        id: draftTaskId,
        imageUrl: input.imageUrl,
        isLocalTask: true,
        link: '#',
        localDraftKind: kind,
        name: '',
        ...(input.parent ? { parent: input.parent } : {}),
        status: 'todo',
        stickyNoteColor: kind === 'comment' ? parseStickyNoteColor(input.stickyNoteColor) : undefined,
        storyPoints: kind === 'task' ? 1 : 0,
        team: 'Back',
        trackerQueue: defaultQueue,
        type: 'task',
      },
    ];
  });
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    for (const [taskId] of next) {
      const task = input.tasksMap.get(taskId);
      const isLocalDraft =
        task?.isLocalTask === true ||
        (task == null && String(taskId).startsWith('local-task-'));
      if (isLocalDraft) {
        next.delete(taskId);
      }
    }
    next.set(draftTaskId, {
      assignee: input.assigneeId,
      duration,
      plannedDuration: duration,
      plannedStartDay: input.day,
      plannedStartPart: input.part,
      startDay: input.day,
      startPart: input.part,
      taskId: draftTaskId,
    });
    return next;
  }, { recordHistory: true });
  input.onCreated?.(draftTaskId, kind);
  return draftTaskId;
}

export async function openQuickAddDraftInSwimlaneCell(
  input: CreateQuickAddDraftInSwimlaneCellInput & {
    allowImageDraft?: boolean;
    imageFile?: File;
    t: (key: string) => string;
  }
): Promise<string | null> {
  if (!input.imageFile) {
    return createQuickAddDraftInSwimlaneCell(input);
  }
  if (input.allowImageDraft === false) {
    return null;
  }
  const prepared = await prepareLocalPlannerImageFile(input.imageFile);
  if (!prepared.ok) {
    toast.error(
      input.t(
        prepared.reason === 'type'
          ? 'sprintPlanner.swimlane.quickAddMenu.imageInvalidType'
          : 'sprintPlanner.swimlane.quickAddMenu.imageTooLarge'
      )
    );
    return null;
  }
  return createQuickAddDraftInSwimlaneCell({
    ...input,
    imageUrl: createLocalPlannerImageObjectUrl(prepared.file),
    kind: 'image',
  });
}

export async function createSwimlaneCellFromPlacementTool(
  input: CreateQuickAddDraftInSwimlaneCellInput & {
    allowImageDraft?: boolean;
    imageFile?: File;
    placementTool: SwimlanePlacementTool;
    t: (key: string) => string;
  }
): Promise<void> {
  if (
    !canQuickAddOnSwimlaneLane({
      isTeamLane: isTeamSwimlaneAssigneeId(input.assigneeId),
      placementTool: input.placementTool,
    })
  ) {
    return;
  }
  if (!input.imageFile && input.placementTool === 'availability') {
    return;
  }
  await openQuickAddDraftInSwimlaneCell({
    allowImageDraft: input.allowImageDraft,
    assigneeId: input.assigneeId,
    boardIdForPlannerData: input.boardIdForPlannerData,
    day: input.day,
    developers: input.developers,
    getQueueByBoardId: input.getQueueByBoardId,
    imageFile: input.imageFile,
    kind: input.imageFile ? 'image' : placementToolToDraftKind(input.placementTool),
    onCreated: input.onCreated,
    parent: input.parent,
    part: input.part,
    stickyNoteColor: input.stickyNoteColor,
    setTaskPositions: input.setTaskPositions,
    setTasks: input.setTasks,
    t: input.t,
    tasksMap: input.tasksMap,
    timelineTotalParts: input.timelineTotalParts,
  });
}
