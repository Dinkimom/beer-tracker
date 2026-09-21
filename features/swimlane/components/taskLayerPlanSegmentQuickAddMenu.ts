import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type {
  QuickAddCreateFields,
  QuickAddDraftKind,
} from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { SwimlaneQuickAddMenuProps } from '@/features/task/components/TaskBar/components/SwimlaneQuickAddMenu';
import type { SprintPlannerNoteComposerState } from '@/lib/layers';
import type { Developer, Task } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { buildFeatureDraftRowNamesById } from '@/features/swimlane/utils/featureDraftParentLabel';
import { isSyntheticFeatureLaneAssignee } from '@/features/swimlane/utils/featureSwimlaneRows';
import { withCurrentQuickAddParentOption } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddParentSelectHelpers';
import { isTaskGroupSentinelKey } from '@/features/task/constants/taskGroupKeys';
import { type StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  isInlineDiagramCreateDraft,
  isInlineImageCreateDraft,
  isInlineNoteCreateDraft,
} from './taskLayerPlanSegmentItemHelpers';

function isQuickAddDraftTask(task: Task): boolean {
  return task.isLocalTask === true && parseSwimlaneCommentTaskId(task.id) == null;
}

function invokeOptionalAsync(handler: (() => Promise<void> | void) | undefined): void {
  const result = handler?.();
  if (result && typeof result.then === 'function') {
    result.catch(() => {});
  }
}

interface QuickAddMenuInput {
  availabilityStartDate?: string;
  developers?: Developer[];
  draftIssueType: string;
  draftParentKey: string;
  draftQueueKey: string;
  isQuickAddSubmitting: boolean;
  laneAssigneeId?: string;
  noteComposer?: SprintPlannerNoteComposerState | null;
  planSegmentsLength: number;
  quickAddBoardId: number | null;
  quickAddExcludedIssueKeys: ReadonlySet<string>;
  quickAddParentSelectOptions: CustomSelectOption<string>[];
  quickAddQueueOptions: QuickAddQueueOption[];
  segIdx: number;
  segmentEditorActive: boolean;
  task: Task;
  onCancelQuickAddDraft?: (taskId: string) => void;
  onPasteQuickAddNote?: (taskId: string) => void;
  onQuickAddDraftAssigneeChange?: (taskId: string, assigneeId: string) => void;
  onQuickAddDraftCommentColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onQuickAddDraftImageUrlChange?: (taskId: string, url: string | undefined) => void;
  onQuickAddDraftKindChange?: (taskId: string, kind: QuickAddDraftKind | undefined) => void;
  onQuickAddDraftParentChange?: (taskId: string, parentKey: string) => void;
  onQuickAddDraftQueueChange?: (taskId: string, queueKey: string) => void;
  onQuickAddDraftTitleChange?: (taskId: string, title: string) => void;
  onQuickAddDraftTypeChange?: (taskId: string, type: string) => void;
  onSelectExistingQuickAddDraft?: (taskId: string, task: Task) => void;
  onSubmitQuickAddDraft?: (
    taskId: string,
    draftTitle?: string,
    fields?: QuickAddCreateFields
  ) => Promise<void> | void;
}

function canShowQuickAddOnSegment(input: QuickAddMenuInput): boolean {
  return (
    input.segIdx === input.planSegmentsLength - 1 &&
    !input.segmentEditorActive &&
    input.quickAddBoardId != null &&
    input.quickAddQueueOptions.length > 0 &&
    Boolean(input.draftQueueKey) &&
    !input.isQuickAddSubmitting
  );
}

function resolveQuickAddRequiresAssignee(
  laneAssigneeId: string | undefined,
  developers: Developer[] | undefined,
  lockedMode: SwimlaneQuickAddMenuProps['lockedMode']
): boolean {
  if (!isSyntheticFeatureLaneAssignee(laneAssigneeId, developers)) {
    return false;
  }
  if (isTeamSwimlaneAssigneeId(laneAssigneeId)) {
    return lockedMode === 'new';
  }
  return lockedMode == null || lockedMode === 'new';
}

function isNonPersonQuickAddAssigneeId(assigneeId: string): boolean {
  return (
    isTeamSwimlaneAssigneeId(assigneeId) ||
    isTaskGroupSentinelKey(assigneeId) ||
    isFeatureLaneDraftRowId(assigneeId)
  );
}

export function resolveQuickAddPersonAssigneeId(
  assignee: string | undefined,
  people: readonly Pick<Developer, 'id'>[] | undefined
): string | undefined {
  const id = assignee?.trim();
  if (!id || isNonPersonQuickAddAssigneeId(id)) {
    return undefined;
  }
  if (people?.length && !people.some((person) => person.id === id)) {
    return undefined;
  }
  return id;
}

function shouldShowQuickAddAssigneeSelect(
  developers: Developer[] | undefined,
  laneAssigneeId: string | undefined,
  lockedMode: SwimlaneQuickAddMenuProps['lockedMode']
): boolean {
  if (lockedMode && lockedMode !== 'new') {
    return false;
  }
  if (!isSyntheticFeatureLaneAssignee(laneAssigneeId, developers) || !developers?.length) {
    return false;
  }
  return developers.some((dev) => !isTeamSwimlaneAssigneeId(dev.id));
}

function buildQuickAddMenuProps(
  input: QuickAddMenuInput & { lockedMode?: SwimlaneQuickAddMenuProps['lockedMode'] }
): Omit<SwimlaneQuickAddMenuProps, 'anchorId' | 'isSubmitting'> | undefined {
  if (input.quickAddBoardId == null) {
    return undefined;
  }
  const pasteNote = input.onPasteQuickAddNote;
  const laneAssigneeId = input.laneAssigneeId ?? input.task.assignee;
  return {
    assigneeId: resolveQuickAddPersonAssigneeId(input.task.assignee, input.developers),
    showAssigneeSelect: shouldShowQuickAddAssigneeSelect(
      input.developers,
      laneAssigneeId,
      input.lockedMode
    ),
    requiresAssignee: resolveQuickAddRequiresAssignee(
      laneAssigneeId,
      input.developers,
      input.lockedMode
    ),
    availabilityStartDate: input.availabilityStartDate,
    boardId: input.quickAddBoardId,
    excludedIssueKeys: input.quickAddExcludedIssueKeys,
    issueType: input.draftIssueType,
    lockedMode: input.lockedMode,
    parentKey: input.draftParentKey,
    parentSelectOptions: withCurrentQuickAddParentOption(
      input.quickAddParentSelectOptions,
      input.task.parent,
      buildFeatureDraftRowNamesById(
        (input.developers ?? []).map((row) => ({ id: row.id, name: row.name }))
      )
    ),
    queueKey: input.draftQueueKey,
    queueOptions: input.quickAddQueueOptions,
    taskId: input.task.id,
    title: input.task.name ?? '',
    commentColor: input.task.stickyNoteColor,
    draftKind: input.task.localDraftKind,
    imageUrl: input.task.imageUrl,
    onCancel: () => input.onCancelQuickAddDraft?.(input.task.id),
    onCommentColorChange: (color) =>
      input.onQuickAddDraftCommentColorChange?.(input.task.id, color),
    onCreate: (draftTitle, fields) =>
      invokeOptionalAsync(() => input.onSubmitQuickAddDraft?.(input.task.id, draftTitle, fields)),
    onDraftKindChange: (kind) => input.onQuickAddDraftKindChange?.(input.task.id, kind),
    onImageUrlChange: (url) => input.onQuickAddDraftImageUrlChange?.(input.task.id, url),
    onIssueTypeChange: (type) => input.onQuickAddDraftTypeChange?.(input.task.id, type),
    onAssigneeChange: (assigneeId) =>
      input.onQuickAddDraftAssigneeChange?.(input.task.id, assigneeId),
    onParentChange: (parentKey) => input.onQuickAddDraftParentChange?.(input.task.id, parentKey),
    onPasteNote: pasteNote ? () => pasteNote(input.task.id) : undefined,
    onQueueChange: (queueKey) => input.onQuickAddDraftQueueChange?.(input.task.id, queueKey),
    onSelectExisting: (selectedTask) =>
      invokeOptionalAsync(() => input.onSelectExistingQuickAddDraft?.(input.task.id, selectedTask)),
    onTitleChange: (value) => input.onQuickAddDraftTitleChange?.(input.task.id, value),
  };
}

export function buildTaskLayerPlanSegmentQuickAddMenu(
  input: QuickAddMenuInput
): Omit<SwimlaneQuickAddMenuProps, 'anchorId' | 'isSubmitting'> | undefined {
  const noteComposer = input.noteComposer;
  if (noteComposer?.taskId === input.task.id) {
    if (noteComposer.mode === 'comment') {
      return undefined;
    }
    if (!canShowQuickAddOnSegment(input)) {
      return undefined;
    }
    return buildQuickAddMenuProps({ ...input, lockedMode: noteComposer.mode });
  }
  if (!canShowQuickAddOnSegment(input) || !isQuickAddDraftTask(input.task)) {
    return undefined;
  }
  if (isInlineNoteCreateDraft(input.task, noteComposer)) {
    return undefined;
  }
  if (isInlineImageCreateDraft(input.task) || isInlineDiagramCreateDraft(input.task)) {
    return undefined;
  }
  return buildQuickAddMenuProps(input);
}
