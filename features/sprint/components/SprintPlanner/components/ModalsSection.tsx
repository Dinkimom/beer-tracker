'use client';

/**
 * Компонент секции модальных окон
 * Отвечает за отображение контекстного меню, модального окна учета работы и диалога подтверждения
 */

import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';

import { resolveSwimlaneAnnotationContextMenuVariant } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { ContextMenu } from '@/features/context-menu/components/ContextMenu';
import { buildContextMenuParentOptions } from '@/features/context-menu/utils/buildContextMenuParentOptions';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useRootStore } from '@/lib/layers';

import { SprintPlannerAnnotationContextMenu } from './SprintPlannerAnnotationContextMenu';
import { SwimlaneDiagramEditorHost } from './SwimlaneDiagramEditorHost';
import { SwimlanePhotoLightboxHost } from './SwimlanePhotoLightboxHost';
import { TransitionFieldsModal } from './TransitionFieldsModal';

const AccountWorkModal = dynamic(
  () =>
    import('@/features/account/components/AccountWorkModal').then((mod) => mod.AccountWorkModal),
  { ssr: false }
);

const TaskInfoSidebar = dynamic(
  () =>
    import('@/features/task/components/TaskInfoSidebar/TaskInfoSidebar').then(
      (mod) => mod.TaskInfoSidebar
    ),
  { ssr: false }
);

interface ModalsSectionProps {
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  boardId?: number | null;
  comments?: Comment[];
  DialogComponent: React.ReactNode;
  selectedSprintId: number | null;
  showStartLinking?: boolean;
  sprints: SprintListItem[];
  sprintTasks?: Task[];
  taskPositions?: Map<string, TaskPosition>;
  tasksMap?: Map<string, Task>;
  transitionModal?: {
    taskId: string;
    transitionId: string;
    targetStatusKey: string;
    targetStatusDisplay?: string;
    fields: TransitionField[];
    task?: Task;
  } | null;
  viewMode?: BoardViewMode;
  onAccountWork: (data: {
    burnedStoryPoints: number;
    burnedTestPoints: number;
    newTaskTitle: string;
    remainingStoryPoints: number;
    remainingTestPoints: number;
    targetSprintId: number | null;
  }) => Promise<void>;
  onAssigneeSelect?: (task: Task, assigneeId: string) => void;
  onCloseTransitionModal?: () => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onMoveToSprint: (taskId: string, sprintId: number) => Promise<void>;
  onParentChange?: (taskId: string, parent: TaskParent | null) => Promise<void>;
  onRemoveFromPlan?: (taskId: string) => void;
  onRemoveFromSprint: (taskId: string) => Promise<void>;
  onSplitPhaseIntoSegments?: (task: Task) => void;
  onStatusChange: (taskId: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => Promise<void>;
  onTaskInfoFieldsSaved?: (fields: { description?: string; name?: string }) => void;
  onTransitionSubmit?: (values: Record<string, unknown>) => Promise<void>;
  onUpdateEstimate?: (task: Task, newEstimate: number, isTestPoints: boolean) => void;
}

function bindTaskAssigneeSelect(
  onAssigneeSelect: ((task: Task, assigneeId: string) => void) | undefined,
  task: Task
): ((assigneeId: string) => void) | undefined {
  if (!onAssigneeSelect) {
    return undefined;
  }
  return (assigneeId) => onAssigneeSelect(task, assigneeId);
}

export const ModalsSection = observer(function ModalsSection({
  assigneeOptions = null,
  boardId = null,
  comments = [],
  selectedSprintId,
  sprints,
  sprintTasks = [],
  taskPositions,
  tasksMap,
  viewMode = 'full',
  DialogComponent,
  onAccountWork,
  onAssigneeSelect,
  onMoveToSprint,
  onCommentDelete,
  onCommentParentChange,
  onCommentUpdate,
  onParentChange,
  onRemoveFromPlan,
  onRemoveFromSprint,
  showStartLinking = false,
  onSplitPhaseIntoSegments,
  onStatusChange,
  onTaskInfoFieldsSaved,
  onUpdateEstimate,
  transitionModal,
  onCloseTransitionModal,
  onTransitionSubmit,
}: ModalsSectionProps) {
  const { sprintPlannerUi } = useRootStore();
  const contextMenu = sprintPlannerUi.contextMenu;
  const presenceLocked = useSprintCardPresenceLocked(contextMenu?.task.id ?? '');
  const accountWorkModal = sprintPlannerUi.accountWorkModal;
  const taskInfoPanelTaskSnapshot = sprintPlannerUi.taskInfoPanelTask;

  useEffect(() => {
    if (contextMenu && presenceLocked) {
      sprintPlannerUi.closeContextMenu();
    }
  }, [contextMenu, presenceLocked, sprintPlannerUi]);

  const parentOptions = useMemo(() => {
    if (!contextMenu?.task) {
      return [];
    }
    return buildContextMenuParentOptions(sprintTasks, contextMenu.task);
  }, [contextMenu?.task, sprintTasks]);

  const taskInfoPanelTask = useMemo(() => {
    if (!taskInfoPanelTaskSnapshot) {
      return null;
    }
    return (
      sprintTasks.find((sprintTask) => sprintTask.id === taskInfoPanelTaskSnapshot.id) ??
      taskInfoPanelTaskSnapshot
    );
  }, [sprintTasks, taskInfoPanelTaskSnapshot]);

  const showContextMenu = Boolean(contextMenu) && !presenceLocked;
  const annotationMenuVariant =
    showContextMenu && contextMenu
      ? resolveSwimlaneAnnotationContextMenuVariant(contextMenu.task)
      : null;

  return (
    <>
      {showContextMenu && contextMenu && annotationMenuVariant ? (
        <SprintPlannerAnnotationContextMenu
          assigneeOptions={assigneeOptions}
          boardId={boardId}
          comments={comments}
          contextMenu={contextMenu}
          showStartLinking={showStartLinking}
          sprintTasks={sprintTasks}
          onAssigneeSelect={onAssigneeSelect}
          onCommentDelete={onCommentDelete}
          onCommentParentChange={onCommentParentChange}
        />
      ) : null}
      {showContextMenu && contextMenu && annotationMenuVariant == null ? (
        <ContextMenu
          anchorElementId={contextMenu.anchorElementId}
          anchorRect={contextMenu.anchorRect ?? null}
          assigneeOptions={assigneeOptions}
          boardId={boardId}
          currentSprintId={selectedSprintId}
          hideRemoveFromPlan={contextMenu.hideRemoveFromPlan}
          isBacklogTask={contextMenu.isBacklogTask || false}
          isKanbanView={viewMode === 'kanban'}
          parentOptions={parentOptions}
          position={contextMenu.position}
          sprints={sprints}
          task={contextMenu.task}
          taskPositions={taskPositions}
          onAccountWork={sprintPlannerUi.setAccountWorkModal}
          onAssigneeSelect={bindTaskAssigneeSelect(onAssigneeSelect, contextMenu.task)}
          onClose={sprintPlannerUi.closeContextMenu}
          onMoveToSprint={onMoveToSprint}
          onOpenTaskInfo={sprintPlannerUi.openTaskInfoPanel}
          onParentChange={onParentChange}
          onRemoveFromPlan={onRemoveFromPlan}
          onRemoveFromSprint={onRemoveFromSprint}
          onSplitPhaseIntoSegments={
            viewMode === 'kanban' ? undefined : onSplitPhaseIntoSegments
          }
          onStartLinking={
            showStartLinking
              ? (task) => {
                  sprintPlannerUi.setLinkingFromTaskId(task.id);
                }
              : undefined
          }
          onStatusChange={onStatusChange}
          onUpdateEstimate={onUpdateEstimate}
        />
      ) : null}

      <TaskInfoSidebar
        task={taskInfoPanelTask}
        onClose={sprintPlannerUi.closeTaskInfoPanel}
        onFieldsSaved={onTaskInfoFieldsSaved}
        onStatusChange={onStatusChange}
      />

      {accountWorkModal ? (
        <AccountWorkModal
          currentSprintId={selectedSprintId}
          isOpen
          sprints={sprints}
          task={accountWorkModal}
          onClose={() => sprintPlannerUi.setAccountWorkModal(null)}
          onConfirm={onAccountWork}
        />
      ) : null}

      {/* Модалка полей перехода (комментарий и др.) */}
      {transitionModal && onCloseTransitionModal && onTransitionSubmit && (
        <TransitionFieldsModal
          fields={transitionModal.fields}
          isOpen
          sprints={sprints}
          targetStatusDisplay={transitionModal.targetStatusDisplay}
          targetStatusKey={transitionModal.targetStatusKey}
          task={transitionModal.task}
          onClose={onCloseTransitionModal}
          onSubmit={onTransitionSubmit}
        />
      )}

      <SwimlaneDiagramEditorHost
        comments={comments}
        selectedSprintId={selectedSprintId}
        onCommentUpdate={onCommentUpdate}
      />

      <SwimlanePhotoLightboxHost comments={comments} sprintTasks={sprintTasks} tasksMap={tasksMap} />

      {/* Диалог подтверждения */}
      {DialogComponent}
    </>
  );
});
