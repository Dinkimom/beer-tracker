'use client';

import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
import type { SprintPlannerContextMenuState } from '@/lib/layers/application/mobx/sprintPlannerUiTypes';
import type { Comment, Task, TaskParent } from '@/types';

import { observer } from 'mobx-react-lite';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { SwimlaneCommentContextMenu } from '@/features/comments/components/SwimlaneCommentContextMenu';
import {
  parseSwimlaneCommentTaskId,
  resolveSwimlaneAnnotationContextMenuVariant,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { buildContextMenuParentOptions } from '@/features/context-menu/utils/buildContextMenuParentOptions';
import {
  commentToSwimlaneNoteClipboard,
  writeNoteTextToSystemClipboard,
  type SwimlaneNoteClipboard,
} from '@/lib/comments/swimlaneNoteClipboard';
import { useRootStore } from '@/lib/layers';

interface SprintPlannerAnnotationContextMenuProps {
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  boardId?: number | null;
  comments: Comment[];
  contextMenu: SprintPlannerContextMenuState;
  showStartLinking: boolean;
  sprintTasks?: Task[];
  onAssigneeSelect?: (task: Task, assigneeId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
}

export const SprintPlannerAnnotationContextMenu = observer(
  function SprintPlannerAnnotationContextMenu({
    assigneeOptions = null,
    boardId = null,
    contextMenu,
    comments,
    onAssigneeSelect,
    onCommentDelete,
    onCommentParentChange,
    showStartLinking,
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
    const actions = buildAnnotationContextMenuActions({
      comments,
      menuTask,
      onAssigneeSelect,
      onCommentDelete,
      onCommentParentChange,
      showStartLinking,
      sprintPlannerUi,
      t,
      taskId,
      variant,
    });
    return (
      <SwimlaneCommentContextMenu
        anchorElementId={contextMenu.anchorElementId}
        anchorRect={contextMenu.anchorRect ?? null}
        assigneeOptions={assigneeOptions}
        authorName={contextMenu.task.stickyNoteAuthorName}
        boardId={boardId}
        parentOptions={parentOptions}
        position={contextMenu.position}
        task={menuTask}
        variant={variant}
        onAssigneeSelect={actions.onAssigneeSelect}
        onClose={sprintPlannerUi.closeContextMenu}
        onConvertToTask={actions.onConvertToTask}
        onCopy={actions.onCopy}
        onDelete={actions.onDelete}
        onEdit={actions.onEdit}
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
  comments: Comment[];
  menuTask: Task;
  showStartLinking: boolean;
  t: (key: string) => string;
  taskId: string;
  variant: 'diagram' | 'image' | 'note';
  sprintPlannerUi: {
    closeContextMenu: () => void;
    openDiagramEditor: (taskId: string) => void;
    openNoteComposer: (payload: { mode: 'comment' | 'new'; taskId: string }) => void;
    setLinkingFromTaskId: (taskId: string | null) => void;
    setNoteClipboard: (clipboard: SwimlaneNoteClipboard | null) => void;
  };
  onAssigneeSelect?: (task: Task, assigneeId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
}) {
  const { sprintPlannerUi, t, taskId, variant } = input;
  return {
    onAssigneeSelect:
      input.onAssigneeSelect == null
        ? undefined
        : (assigneeId: string) => input.onAssigneeSelect?.(input.menuTask, assigneeId),
    onConvertToTask:
      variant === 'note'
        ? () => sprintPlannerUi.openNoteComposer({ mode: 'new', taskId })
        : undefined,
    onCopy:
      variant === 'note'
        ? () => copyNoteFromContextMenu(taskId, input.comments, sprintPlannerUi, t)
        : undefined,
    onDelete: () => {
      deleteAnnotationFromContextMenu(taskId, input.onCommentDelete, sprintPlannerUi.closeContextMenu);
    },
    onEdit:
      variant === 'image'
        ? undefined
        : () => editAnnotationFromContextMenu(variant, taskId, sprintPlannerUi),
    onParentSelect: (parent: TaskParent | null) => {
      selectAnnotationParent(
        taskId,
        parent,
        input.onCommentParentChange,
        sprintPlannerUi.closeContextMenu,
        t
      );
    },
    onStartLinking: input.showStartLinking
      ? () => sprintPlannerUi.setLinkingFromTaskId(taskId)
      : undefined,
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

function deleteAnnotationFromContextMenu(
  taskId: string,
  onCommentDelete: ((commentId: string) => void) | undefined,
  close: () => void
): void {
  const commentId = parseSwimlaneCommentTaskId(taskId);
  if (commentId) {
    onCommentDelete?.(commentId);
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
