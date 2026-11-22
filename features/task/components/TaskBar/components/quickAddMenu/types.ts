import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task } from '@/types';

export type QuickAddDraftKind = 'comment' | 'diagram' | 'existing' | 'image' | 'task';

export type QuickAddMode =
  | 'availability'
  | 'comment'
  | 'diagram'
  | 'draft'
  | 'existing'
  | 'image'
  | 'new'
  | 'pasteNote';

export type QuickAddPickerItem =
  | { kind: 'mode'; mode: QuickAddMode }
  | { kind: 'separator' };

export interface QuickAddCreateFields {
  assigneeId?: string;
  issueType: string;
  parentKey: string;
  queueKey: string;
}

/** Черновик на карточке, с которого открыто меню: что в нём уже выбрано. */
interface QuickAddMenuDraft {
  /** Человек с заметки / выбранный в попапе Tracker-исполнитель. */
  assigneeId?: string;
  /** ISO-дата ячейки, с которой открыли «+» — старт отсутствия. */
  availabilityStartDate?: string;
  commentColor?: StickyNoteColor;
  draftKind?: QuickAddDraftKind;
  imageUrl?: string;
  issueType: string;
  parentKey: string;
  queueKey: string;
  taskId: string;
  title: string;
}

/** Что меню предлагает для этой ячейки: доска, очереди, родители, закреплённый вид, правила исполнителя. */
export interface QuickAddMenuOptions {
  boardId: number;
  excludedIssueKeys: ReadonlySet<string>;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  parentSelectOptions: CustomSelectOption<string>[];
  queueOptions: QuickAddQueueOption[];
  requiresAssignee?: boolean;
  /** Показать селектор исполнителя (строка фичи / «Общее»). */
  showAssigneeSelect?: boolean;
}

/** Действия меню, уже привязанные к черновику (`QuickAddController` → эта карточка). */
export interface QuickAddMenuActions {
  onAssigneeChange?: (assigneeId: string) => void;
  onCancel: () => void;
  onCommentColorChange: (color: StickyNoteColor) => void;
  onCreate: (title: string, fields?: QuickAddCreateFields) => void;
  onCreateAvailability?: (startDate?: string) => void;
  onDraftKindChange: (kind: QuickAddDraftKind | undefined) => void;
  onImageUrlChange: (url: string | undefined) => void;
  onIssueTypeChange: (type: string) => void;
  onParentChange: (parentKey: string) => void;
  onPasteNote?: () => void;
  onQueueChange: (queueKey: string) => void;
  onSelectExisting: (task: Task) => void;
  onTitleChange: (value: string) => void;
}

/** Меню собирает сегмент карточки (`buildTaskLayerPlanSegmentQuickAddMenu`); якорь и флаг отправки — от `TaskBar`. */
export interface SwimlaneQuickAddMenuContent {
  actions: QuickAddMenuActions;
  draft: QuickAddMenuDraft;
  options: QuickAddMenuOptions;
}

export interface SwimlaneQuickAddMenuProps extends SwimlaneQuickAddMenuContent {
  anchorId: string;
  isSubmitting: boolean;
}

/**
 * Быстрое добавление на доске одним объектом: создаётся в `useSprintPlannerQuickAddDraft`
 * и без изменений доходит до сегмента карточки (секция → дорожка → слой задач).
 * Добавить поле — сюда, а не в каждый слой.
 */
export interface QuickAddController {
  quickAddBoardId: number | null;
  quickAddExcludedIssueKeys: ReadonlySet<string>;
  quickAddParentSelectOptions: CustomSelectOption<string>[];
  quickAddQueueOptions: QuickAddQueueOption[];
  quickAddSubmittingTaskId: string | null;
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
  onSubmitQuickAddCommentDraft?: (taskId: string, draftTitle?: string, color?: StickyNoteColor) => void;
  onSubmitQuickAddDiagramDraft?: (taskId: string, name?: string) => void;
  onSubmitQuickAddDraft?: (
    taskId: string,
    draftTitle?: string,
    fields?: QuickAddCreateFields
  ) => Promise<void> | void;
  onSubmitQuickAddImageDraft?: (taskId: string, caption: string, imageUrl: string) => void;
}

export interface QuickAddIssueSearchResult {
  key: string;
  summary: string;
  task: Task;
}
