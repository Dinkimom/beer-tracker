'use client';

import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
import type { SprintPlannerContextMenuState } from '@/lib/layers/application/mobx/sprintPlannerUiTypes';
import type { Comment, Task, TaskParent } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { SwimlaneCommentContextMenu } from '@/features/comments/components/SwimlaneCommentContextMenu';
import {
  type AnnotationContextMenuAction,
  resolveAnnotationContextMenuActions,
} from '@/features/comments/utils/annotationContextMenuActions';
import {
  parseSwimlaneCommentTaskId,
  resolveSwimlaneAnnotationContextMenuVariant,
  type SwimlaneAnnotationContextMenuVariant,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { buildContextMenuParentOptions } from '@/features/context-menu/utils/buildContextMenuParentOptions';
import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import {
  commentToSwimlaneNoteClipboard,
  writeNoteTextToSystemClipboard,
  type SwimlaneNoteClipboard,
} from '@/lib/comments/swimlaneNoteClipboard';
import { useRootStore } from '@/lib/layers';

interface SprintPlannerAnnotationContextMenuProps {
  agentAvailable: boolean;
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  boardId?: number | null;
  comments: Comment[];
  contextMenu: SprintPlannerContextMenuState;
  selectedSprintId?: number | null;
  showStartLinking: boolean;
  sprints?: SprintListItem[];
  sprintTasks?: Task[];
  onAssigneeSelect?: (task: Task, assigneeId: string) => void;
  /** Принять черновик агента (как ✓ на карточке). */
  onCommentApprove?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
  onCommentUpdate?: (commentId: string, text: string, color?: StickyNoteColor) => void;
  /** Перенос заметки в другой спринт с выбором места на его доске. */
  onPlanCommentInSprint?: (commentId: string, sprintId: number) => void;
}

export const SprintPlannerAnnotationContextMenu = observer(
  function SprintPlannerAnnotationContextMenu({
    agentAvailable,
    assigneeOptions = null,
    boardId = null,
    contextMenu,
    comments,
    onAssigneeSelect,
    onCommentApprove,
    onCommentDelete,
    onCommentParentChange,
    onCommentUpdate,
    onPlanCommentInSprint,
    selectedSprintId = null,
    showStartLinking,
    sprints = [],
    sprintTasks = [],
  }: SprintPlannerAnnotationContextMenuProps) {
    const { t } = useI18n();
    const { sprintPlannerUi } = useRootStore();
    const variant = resolveSwimlaneAnnotationContextMenuVariant(contextMenu.task);
    if (variant == null) {
      return null;
    }
    const taskId = contextMenu.task.id;
    const menuTask = resolveAnnotationMenuTask(contextMenu.task, comments);
    const parentOptions = buildContextMenuParentOptions(sprintTasks, menuTask);
    const allowed = resolveAnnotationContextMenuActions(variant);
    const actions = buildAnnotationContextMenuActions({
      allowed,
      comments,
      menuTask,
      onAssigneeSelect,
      onCommentApprove,
      onCommentDelete,
      onCommentParentChange,
      showStartLinking,
      sprintPlannerUi,
      t,
      taskId,
      variant,
    });
    const commentId = parseSwimlaneCommentTaskId(taskId);
    const note = commentId ? comments.find((item) => item.id === commentId) : undefined;
    return (
      <SwimlaneCommentContextMenu
        anchorElementId={contextMenu.anchorElementId}
        anchorRect={contextMenu.anchorRect ?? null}
        assigneeOptions={assigneeOptions}
        authorName={contextMenu.task.stickyNoteAuthorName}
        boardId={boardId}
        currentSprintId={selectedSprintId}
        noteColor={variant === 'note' ? parseStickyNoteColor(note?.color ?? menuTask.stickyNoteColor) : undefined}
        parentOptions={parentOptions}
        position={contextMenu.position}
        sprints={sprints}
        task={menuTask}
        variant={variant}
        onApprove={actions.onApprove}
        onAskAgent={
          agentAvailable && allowed.has('askAgent') && commentId
            ? () => {
                sprintPlannerUi.setAgentRequestTarget({
                  kind: 'note',
                  noteId: commentId,
                  text: note?.text ?? menuTask.name,
                });
                sprintPlannerUi.closeContextMenu();
              }
            : undefined
        }
        onAssigneeSelect={actions.onAssigneeSelect}
        onClose={sprintPlannerUi.closeContextMenu}
        onConvertToTask={actions.onConvertToTask}
        onCopy={actions.onCopy}
        onDelete={actions.onDelete}
        onEdit={actions.onEdit}
        onMoveToSprint={
          allowed.has('moveToSprint') && commentId && onPlanCommentInSprint
            ? (sprintId) => onPlanCommentInSprint(commentId, sprintId)
            : undefined
        }
        onNoteColorChange={
          allowed.has('color') && commentId && onCommentUpdate
            ? (color) => onCommentUpdate(commentId, note?.text ?? menuTask.name, color)
            : undefined
        }
        onParentSelect={actions.onParentSelect}
        onStartLinking={actions.onStartLinking}
      />
    );
  }
);

function resolveAnnotationMenuTask(task: Task, comments: Comment[]): Task {
  const commentId = parseSwimlaneCommentTaskId(task.id);
  if (!commentId) {
    return task;
  }
  const comment = comments.find((item) => item.id === commentId);
  if (!comment) {
    return task;
  }
  return {
    ...task,
    assignee: comment.assigneeId || task.assignee,
    parent: comment.parent,
  };
}

function buildAnnotationContextMenuActions(input: {
  allowed: ReadonlySet<AnnotationContextMenuAction>;
  comments: Comment[];
  menuTask: Task;
  showStartLinking: boolean;
  t: (key: string) => string;
  taskId: string;
  variant: SwimlaneAnnotationContextMenuVariant;
  sprintPlannerUi: {
    closeContextMenu: () => void;
    openDiagramEditor: (taskId: string) => void;
    openNoteComposer: (payload: { mode: 'comment' | 'new'; taskId: string }) => void;
    setLinkingFromTaskId: (taskId: string | null) => void;
    setNoteClipboard: (clipboard: SwimlaneNoteClipboard | null) => void;
  };
  onAssigneeSelect?: (task: Task, assigneeId: string) => void;
  onCommentApprove?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
}) {
  const { allowed, sprintPlannerUi, t, taskId, variant } = input;
  const close = sprintPlannerUi.closeContextMenu;
  /** Обработчик только для разрешённого матрицей пункта (и если у пункта есть смысл здесь). */
  const when = <F, >(action: AnnotationContextMenuAction, handler: F, enabled = true): F | undefined =>
    allowed.has(action) && enabled ? handler : undefined;
  const runComment = (action?: (commentId: string) => void) => () =>
    runCommentActionFromContextMenu(taskId, action, close);
  const isEditable = variant === 'note' || variant === 'diagram';
  return {
    onApprove: when('approve', runComment(input.onCommentApprove), input.onCommentApprove != null),
    onAssigneeSelect: when(
      'assignee',
      (assigneeId: string) => input.onAssigneeSelect?.(input.menuTask, assigneeId),
      input.onAssigneeSelect != null
    ),
    onConvertToTask: when('convert', () => sprintPlannerUi.openNoteComposer({ mode: 'new', taskId })),
    onCopy: when('copy', () => copyNoteFromContextMenu(taskId, input.comments, sprintPlannerUi, t)),
    onDelete:
      when('delete', runComment(input.onCommentDelete)) ??
      when('reject', runComment(input.onCommentDelete)),
    onEdit: isEditable
      ? when('edit', () => editAnnotationFromContextMenu(variant, taskId, sprintPlannerUi))
      : undefined,
    onParentSelect: when('parent', (parent: TaskParent | null) => {
      selectAnnotationParent(taskId, parent, input.onCommentParentChange, close, t);
    }),
    onStartLinking: when(
      'link',
      () => sprintPlannerUi.setLinkingFromTaskId(taskId),
      input.showStartLinking
    ),
  };
}

function selectAnnotationParent(
  taskId: string,
  parent: TaskParent | null,
  onCommentParentChange: ((commentId: string, parent: TaskParent | null) => void) | undefined,
  close: () => void,
  t: (key: string) => string
): void {
  const commentId = parseSwimlaneCommentTaskId(taskId);
  if (commentId) {
    onCommentParentChange?.(commentId, parent);
    toast.success(t('sprintPlanner.contextMenu.parentUpdateSuccess'));
  }
  close();
}

function copyNoteFromContextMenu(
  taskId: string,
  comments: Comment[],
  ui: { closeContextMenu: () => void; setNoteClipboard: (clipboard: SwimlaneNoteClipboard | null) => void },
  t: (key: string) => string
): void {
  const commentId = parseSwimlaneCommentTaskId(taskId);
  const comment = commentId ? comments.find((item) => item.id === commentId) : undefined;
  const clipboard = comment ? commentToSwimlaneNoteClipboard(comment) : null;
  if (clipboard) {
    ui.setNoteClipboard(clipboard);
    void writeNoteTextToSystemClipboard(clipboard.text);
    toast.success(t('sprintPlanner.swimlane.quickAddMenu.copyNoteSuccess'));
  }
  ui.closeContextMenu();
}

/** Действие над сохранённой аннотацией по её comment id (удалить, отклонить, принять). */
function runCommentActionFromContextMenu(
  taskId: string,
  onCommentAction: ((commentId: string) => void) | undefined,
  close: () => void
): void {
  const commentId = parseSwimlaneCommentTaskId(taskId);
  if (commentId) {
    onCommentAction?.(commentId);
  }
  close();
}

function editAnnotationFromContextMenu(
  variant: 'diagram' | 'note',
  taskId: string,
  ui: {
    openDiagramEditor: (taskId: string) => void;
    openNoteComposer: (payload: { mode: 'comment'; taskId: string }) => void;
  }
): void {
  if (variant === 'note') {
    ui.openNoteComposer({ mode: 'comment', taskId });
    return;
  }
  ui.openDiagramEditor(taskId);
}
