'use client';

import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
import type { Task, TaskParent, TaskPosition } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import {
  useIssueTrackerProviderCapabilities,
  useTrackerWebUrlContext,
} from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { SprintSubmenu } from '@/features/context-menu/components/SprintSubmenu';
import { StatusSubmenu } from '@/features/context-menu/components/StatusSubmenu';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
  FLOATING_MENU_FIT_BODY,
  FLOATING_MENU_FIT_WIDTH,
  FLOATING_MENU_SHELL,
} from '@/features/context-menu/contextMenuClasses';
import { resolveContextMenuQuickActionsAlignClass } from '@/features/context-menu/utils/resolveContextMenuViewportPosition';
import { getPositionEffectiveDuration } from '@/features/sprint/utils/occupancyUtils';
import { useFollowAnchorRectByElementId } from '@/hooks/useFollowAnchorRect';
import { useThemeStorage } from '@/hooks/useLocalStorage';
import { useDeferredOverlayClose } from '@/hooks/useOverlayPresence';
import { timeslotsToStoryPoints } from '@/lib/pointsUtils';

import { ContextMenuActions } from './ContextMenu/components/ContextMenuActions';
import { ContextMenuCopyQuickActions } from './ContextMenu/components/ContextMenuCopyQuickActions';
import { ContextMenuPlanItems } from './ContextMenu/components/ContextMenuPlanItems';
import { useContextMenu } from './ContextMenu/hooks/useContextMenu';

interface ContextMenuProps {
  /** DOM id полосы свимлейна — меню следует за живым getBoundingClientRect */
  anchorElementId?: string | null;
  /** Якорь у карточки задачи — меню строится от границ карточки, не от курсора */
  anchorRect?: Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'> | null;
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  /** Board id для поиска родителя в Tracker, если локальный список пуст */
  boardId?: number | null;
  currentSprintId: number | null;
  /** Скрыть пункт «Удалить из плана» (например, при открытии меню по клику по строке в occupancy) */
  hideRemoveFromPlan?: boolean;
  isBacklogTask?: boolean;
  /** В режиме канбана скрываем переключение статусов и удаление из плана */
  isKanbanView?: boolean;
  /** Родительские задачи текущего спринта для подменю */
  parentOptions?: TaskParent[];
  position: { x: number; y: number };
  sprints: SprintListItem[];
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  onAccountWork?: (task: Task) => void;
  onAssigneeSelect?: (assigneeId: string) => void;
  onClose: () => void;
  onCloseByClickOutside?: () => void;
  onMoveToSprint: (taskId: string, sprintId: number) => Promise<void>;
  onOpenTaskInfo?: (task: Task) => void;
  onParentChange?: (taskId: string, parent: TaskParent | null) => Promise<void>;
  onRemoveFromPlan?: (taskId: string) => void;
  onRemoveFromSprint: (taskId: string) => Promise<void>;
  onSplitPhaseIntoSegments?: (task: Task) => void;
  onStartLinking?: (task: Task) => void;
  onStatusChange: (taskId: string, transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => Promise<void>;
  onUpdateEstimate?: (task: Task, newEstimate: number, isTestPoints: boolean) => void;
}

export function ContextMenu({
  task,
  sprints,
  currentSprintId,
  position,
  anchorRect = null,
  anchorElementId = null,
  boardId = null,
  onClose,
  onStatusChange,
  onMoveToSprint,
  onParentChange,
  onRemoveFromPlan,
  onRemoveFromSprint,
  onSplitPhaseIntoSegments,
  onStartLinking,
  assigneeOptions = null,
  onAccountWork,
  onAssigneeSelect,
  onUpdateEstimate,
  onCloseByClickOutside,
  onOpenTaskInfo,
  taskPositions,
  parentOptions = [],
  hideRemoveFromPlan = false,
  isBacklogTask = false,
  isKanbanView = false,
}: ContextMenuProps) {
  const { t } = useI18n();
  const tracker = useTrackerWebUrlContext();
  const { supportsRelatedIssues } = useIssueTrackerProviderCapabilities();
  useThemeStorage();
  const liveAnchorRect = useFollowAnchorRectByElementId(anchorElementId);
  const effectiveAnchorRect = liveAnchorRect ?? anchorRect;
  const overlay = useDeferredOverlayClose(onClose);
  const requestClose = overlay.requestClose;

  const showStatusSubmenu = !isBacklogTask && !isKanbanView;
  const showEstimate = taskPositions != null && !isBacklogTask && !isKanbanView;
  const showParent = !isBacklogTask && Boolean(onParentChange);

  const taskPosition = taskPositions?.get(task.id);
  const effectiveDuration =
    taskPosition?.segments?.length
      ? taskPosition.segments.reduce((s, seg) => s + seg.duration, 0)
      : taskPosition?.duration ?? 0;
  const showSplitPhase =
    Boolean(taskPositions?.has(task.id)) &&
    Boolean(taskPosition) &&
    Boolean(onSplitPhaseIntoSegments) &&
    !isKanbanView &&
    effectiveDuration > 1;

  const showPlanItems = showEstimate || showParent || showSplitPhase;

  const {
    menuRef,
    anchorSide,
    statusButtonRef,
    sprintButtonRef,
    estimateButtonRef,
    parentButtonRef,
    assigneeButtonRef,
    isLoading,
    pendingTransitionId,
    isStatusMenuOpen,
    isSprintMenuOpen,
    isEstimateMenuOpen,
    isParentMenuOpen,
    isAssigneeMenuOpen,
    taskIdForActions,
    availableSprints,
    DialogComponent,
    handleStatusMenuToggle,
    handleSprintMenuToggle,
    handleEstimateMenuToggle,
    handleParentMenuToggle,
    handleAssigneeMenuToggle,
    handleStatusSelect,
    handleSprintSelect,
    handleParentSelect,
    handleRemoveFromPlan,
    handleRemoveFromSprint,
  } = useContextMenu({
    task,
    sprints,
    currentSprintId,
    position,
    anchorRect: effectiveAnchorRect,
    onClose: requestClose,
    onStatusChange,
    onMoveToSprint,
    onParentChange,
    onRemoveFromPlan,
    onRemoveFromSprint,
    onCloseByClickOutside,
    isBacklogTask,
  });

  const isGeneratedQaTask = task.team === 'QA' && !!task.originalTaskId;
  const showAccountWork =
    supportsRelatedIssues &&
    !isBacklogTask &&
    currentSprintId !== null &&
    Boolean(onAccountWork) &&
    !isGeneratedQaTask;
  const sprintSectionVisible = availableSprints.length > 0;

  const hasItemsAboveActions =
    showStatusSubmenu || showAccountWork || sprintSectionVisible || showPlanItems;

  const taskDuration = taskPosition ? getPositionEffectiveDuration(taskPosition) : 0;
  const suggestedEstimate = timeslotsToStoryPoints(taskDuration);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 bg-transparent"
        style={{ zIndex: ZIndex.contextMenu - 1 }}
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
      />
      <div
        ref={menuRef}
        className={`fixed overflow-visible ${FLOATING_MENU_FIT_WIDTH} ${FLOATING_MENU_SHELL} ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: ZIndex.contextMenu,
        }}
        onAnimationEnd={overlay.onAnimationEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={FLOATING_MENU_FIT_BODY}>
          <div
            aria-label={t('sprintPlanner.contextMenu.quickActions')}
            className={`flex w-full items-stretch gap-1 border-b border-gray-100 px-2 py-2 dark:border-gray-700 ${resolveContextMenuQuickActionsAlignClass(anchorSide)}`}
            role="group"
          >
          {onOpenTaskInfo ? (
            <Button
              aria-label={t('sprintPlanner.contextMenu.taskInfo')}
              className="inline-flex min-h-11 min-w-[52px] flex-col gap-0.5 border-0 bg-transparent px-1.5 py-1 text-gray-500 shadow-none hover:!bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:!bg-gray-700 dark:hover:text-gray-100"
              title={t('sprintPlanner.contextMenu.taskInfo')}
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTaskInfo(task);
              }}
            >
              <Icon className="h-4 w-4 shrink-0" name="circle-info" />
              <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight text-gray-500 dark:text-gray-400">
                {t('sprintPlanner.contextMenu.taskInfoShort')}
              </span>
            </Button>
          ) : null}
          <ContextMenuCopyQuickActions task={task} tracker={tracker} />
        </div>

        {showStatusSubmenu && (
          <StatusSubmenu
            buttonRef={statusButtonRef}
            isLoading={isLoading}
            isOpen={isStatusMenuOpen}
            menuRef={menuRef}
            pendingTransitionId={pendingTransitionId}
            task={task}
            taskIdForActions={taskIdForActions}
            onSelect={handleStatusSelect}
            onToggle={handleStatusMenuToggle}
          />
        )}

        {showAccountWork && (
          <>
            {showStatusSubmenu && <div className={CONTEXT_MENU_SEPARATOR} role="separator" />}
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              disabled={isLoading}
              type="button"
              variant="ghost"
              onClick={() => {
                onAccountWork?.(task);
                requestClose();
              }}
            >
              <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="check-circle" />
              <span>{t('sprintPlanner.contextMenu.accountWork')}</span>
            </Button>
          </>
        )}

        {sprintSectionVisible && (
          <>
            {showStatusSubmenu && !showAccountWork ? (
              <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
            ) : null}
            <SprintSubmenu
              buttonRef={sprintButtonRef}
              currentSprintId={currentSprintId}
              isBacklogTask={isBacklogTask || false}
              isLoading={isLoading}
              isOpen={isSprintMenuOpen}
              menuRef={menuRef}
              sprints={sprints}
              onSelect={handleSprintSelect}
              onToggle={handleSprintMenuToggle}
            />
          </>
        )}

        <ContextMenuPlanItems
          boardId={boardId}
          estimateButtonRef={estimateButtonRef}
          hasItemsAbove={showStatusSubmenu || showAccountWork || sprintSectionVisible}
          isEstimateMenuOpen={isEstimateMenuOpen}
          isLoading={isLoading}
          isParentMenuOpen={isParentMenuOpen}
          menuRef={menuRef}
          parentButtonRef={parentButtonRef}
          parentOptions={parentOptions}
          showEstimate={showEstimate}
          showParent={showParent}
          showSplitPhase={showSplitPhase}
          suggestedEstimate={suggestedEstimate}
          task={task}
          onClose={requestClose}
          onEstimateToggle={handleEstimateMenuToggle}
          onParentSelect={handleParentSelect}
          onParentToggle={handleParentMenuToggle}
          onSplitPhaseIntoSegments={onSplitPhaseIntoSegments}
          onUpdateEstimate={onUpdateEstimate}
        />

        <ContextMenuActions
          assigneeButtonRef={assigneeButtonRef}
          assigneeOptions={assigneeOptions}
          currentSprintId={currentSprintId}
          hasPosition={!!taskPositions?.has(task.id)}
          hasSubmenusAboveActions={hasItemsAboveActions}
          hideRemoveFromPlan={hideRemoveFromPlan}
          isAssigneeMenuOpen={isAssigneeMenuOpen}
          isBacklogTask={isBacklogTask}
          isKanbanView={isKanbanView}
          isLoading={isLoading}
          menuRef={menuRef}
          selectedAssigneeId={
            (task.team === 'QA' ? task.qaEngineer : task.assignee) ||
            taskPositions?.get(task.id)?.assignee ||
            ''
          }
          task={task}
          onAssigneeSelect={onAssigneeSelect}
          onAssigneeToggle={handleAssigneeMenuToggle}
          onClose={requestClose}
          onRemoveFromPlan={handleRemoveFromPlan}
          onRemoveFromSprint={handleRemoveFromSprint}
          onStartLinking={onStartLinking}
        />
        </div>
      </div>
      {DialogComponent}
    </>
  );
}
