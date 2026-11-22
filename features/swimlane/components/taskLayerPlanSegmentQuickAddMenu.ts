import type {
  QuickAddController,
  QuickAddDraftKind,
  QuickAddMenuOptions,
  SwimlaneQuickAddMenuContent,
} from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { SprintPlannerNoteComposerState } from '@/lib/layers';
import type { Developer, Task } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { buildFeatureDraftRowNamesById } from '@/features/swimlane/utils/featureDraftParentLabel';
import { isSyntheticFeatureLaneAssignee } from '@/features/swimlane/utils/featureSwimlaneRows';
import { withCurrentQuickAddParentOption } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddParentSelectHelpers';
import { isTaskGroupSentinelKey } from '@/features/task/constants/taskGroupKeys';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  isInlineDiagramCreateDraft,
  isInlineImageCreateDraft,
  isInlineNoteCreateDraft,
} from './taskLayerPlanSegmentItemHelpers';

const EMPTY_EXCLUDED_ISSUE_KEYS: ReadonlySet<string> = new Set();

type LockedMode = QuickAddMenuOptions['lockedMode'];

function isQuickAddDraftTask(task: Task): boolean {
  return task.isLocalTask === true && parseSwimlaneCommentTaskId(task.id) == null;
}

function quickAddDraftKind(kind: Task['localDraftKind']): QuickAddDraftKind | undefined {
  if (
    kind === 'comment' ||
    kind === 'diagram' ||
    kind === 'existing' ||
    kind === 'image' ||
    kind === 'task'
  ) {
    return kind;
  }
  return undefined;
}

function invokeOptionalAsync(handler: (() => Promise<void> | void) | undefined): void {
  const result = handler?.();
  if (result && typeof result.then === 'function') {
    result.catch(() => {});
  }
}

/** Поля сегмента и срез быстрого добавления (`QuickAddController`) целиком. */
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
  /** Без быстрого добавления (демо, тесты) — пустой объект. */
  quickAdd: Partial<QuickAddController>;
  segIdx: number;
  segmentEditorActive: boolean;
  task: Task;
}

function canShowQuickAddOnSegment(input: QuickAddMenuInput): boolean {
  return (
    input.segIdx === input.planSegmentsLength - 1 &&
    !input.segmentEditorActive &&
    input.quickAdd.quickAddBoardId != null &&
    (input.quickAdd.quickAddQueueOptions?.length ?? 0) > 0 &&
    Boolean(input.draftQueueKey) &&
    !input.isQuickAddSubmitting
  );
}

function resolveQuickAddRequiresAssignee(
  laneAssigneeId: string | undefined,
  developers: Developer[] | undefined,
  lockedMode: LockedMode
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
  lockedMode: LockedMode
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
  input: QuickAddMenuInput & { lockedMode?: LockedMode }
): SwimlaneQuickAddMenuContent | undefined {
  const { quickAdd, task } = input;
  if (quickAdd.quickAddBoardId == null) {
    return undefined;
  }
  const taskId = task.id;
  const pasteNote = quickAdd.onPasteQuickAddNote;
  const laneAssigneeId = input.laneAssigneeId ?? task.assignee;
  return {
    draft: {
      assigneeId: resolveQuickAddPersonAssigneeId(task.assignee, input.developers),
      availabilityStartDate: input.availabilityStartDate,
      commentColor: task.stickyNoteColor,
      draftKind: quickAddDraftKind(task.localDraftKind),
      imageUrl: task.imageUrl,
      issueType: input.draftIssueType,
      parentKey: input.draftParentKey,
      queueKey: input.draftQueueKey,
      taskId,
      title: task.name ?? '',
    },
    options: {
      boardId: quickAdd.quickAddBoardId,
      excludedIssueKeys: quickAdd.quickAddExcludedIssueKeys ?? EMPTY_EXCLUDED_ISSUE_KEYS,
      lockedMode: input.lockedMode,
      parentSelectOptions: withCurrentQuickAddParentOption(
        quickAdd.quickAddParentSelectOptions ?? [],
        task.parent,
        buildFeatureDraftRowNamesById(
          (input.developers ?? []).map((row) => ({ id: row.id, name: row.name }))
        )
      ),
      queueOptions: quickAdd.quickAddQueueOptions ?? [],
      requiresAssignee: resolveQuickAddRequiresAssignee(laneAssigneeId, input.developers, input.lockedMode),
      showAssigneeSelect: shouldShowQuickAddAssigneeSelect(input.developers, laneAssigneeId, input.lockedMode),
    },
    actions: {
      onAssigneeChange: (assigneeId) => quickAdd.onQuickAddDraftAssigneeChange?.(taskId, assigneeId),
      onCancel: () => quickAdd.onCancelQuickAddDraft?.(taskId),
      onCommentColorChange: (color) => quickAdd.onQuickAddDraftCommentColorChange?.(taskId, color),
      onCreate: (draftTitle, fields) =>
        invokeOptionalAsync(() => quickAdd.onSubmitQuickAddDraft?.(taskId, draftTitle, fields)),
      onDraftKindChange: (kind) => quickAdd.onQuickAddDraftKindChange?.(taskId, kind),
      onImageUrlChange: (url) => quickAdd.onQuickAddDraftImageUrlChange?.(taskId, url),
      onIssueTypeChange: (type) => quickAdd.onQuickAddDraftTypeChange?.(taskId, type),
      onParentChange: (parentKey) => quickAdd.onQuickAddDraftParentChange?.(taskId, parentKey),
      onPasteNote: pasteNote ? () => pasteNote(taskId) : undefined,
      onQueueChange: (queueKey) => quickAdd.onQuickAddDraftQueueChange?.(taskId, queueKey),
      onSelectExisting: (selectedTask) =>
        invokeOptionalAsync(() => quickAdd.onSelectExistingQuickAddDraft?.(taskId, selectedTask)),
      onTitleChange: (value) => quickAdd.onQuickAddDraftTitleChange?.(taskId, value),
    },
  };
}

export function buildTaskLayerPlanSegmentQuickAddMenu(
  input: QuickAddMenuInput
): SwimlaneQuickAddMenuContent | undefined {
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
