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

export interface SwimlaneQuickAddMenuProps {
  anchorId: string;
  /** Человек с заметки / выбранный в попапе Tracker-исполнитель. */
  assigneeId?: string;
  /** ISO-дата ячейки, с которой открыли «+» — старт отсутствия. */
  availabilityStartDate?: string;
  boardId: number;
  commentColor?: StickyNoteColor;
  draftKind?: QuickAddDraftKind;
  excludedIssueKeys: ReadonlySet<string>;
  imageUrl?: string;
  isSubmitting: boolean;
  issueType: string;
  lockedMode?: Exclude<QuickAddMode, 'existing'>;
  parentKey: string;
  parentSelectOptions: CustomSelectOption<string>[];
  queueKey: string;
  queueOptions: QuickAddQueueOption[];
  requiresAssignee?: boolean;
  /** Показать селектор исполнителя (строка фичи / «Общее»). */
  showAssigneeSelect?: boolean;
  taskId: string;
  title: string;
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

export interface QuickAddIssueSearchResult {
  key: string;
  summary: string;
  task: Task;
}
