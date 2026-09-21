import type { SwimlaneProps } from '@/features/swimlane/components/SwimlaneProps';

/** Сравнение пропсов для `React.memo(Swimlane, …)` — только поля, влияющие на отрисовку. */
export function memoizedSwimlanePropsEqual(
  prevProps: SwimlaneProps,
  nextProps: SwimlaneProps
): boolean {
  // Новый Map после DnD или та же observable.map после мутации — нельзя полагаться только на .size.
  if (prevProps.taskPositions !== nextProps.taskPositions) {
    return false;
  }

  return (
    prevProps.developer.id === nextProps.developer.id &&
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.taskPositions.size === nextProps.taskPositions.size &&
    prevProps.tasksMap.size === nextProps.tasksMap.size &&
    prevProps.activeTask?.id === nextProps.activeTask?.id &&
    prevProps.activeDraggableId === nextProps.activeDraggableId &&
    prevProps.hoveredCell?.day === nextProps.hoveredCell?.day &&
    prevProps.hoveredCell?.part === nextProps.hoveredCell?.part &&
    prevProps.hoveredCell?.assigneeId === nextProps.hoveredCell?.assigneeId &&
    prevProps.hoverConnectedTaskIds === nextProps.hoverConnectedTaskIds &&
    prevProps.hoveredTaskId === nextProps.hoveredTaskId &&
    prevProps.isDraggingTask === nextProps.isDraggingTask &&
    prevProps.selectedTaskId === nextProps.selectedTaskId &&
    prevProps.contextMenuTaskId === nextProps.contextMenuTaskId &&
    prevProps.contextMenuBlurOtherCards === nextProps.contextMenuBlurOtherCards &&
    prevProps.errorTaskIds === nextProps.errorTaskIds &&
    prevProps.errorReasons === nextProps.errorReasons &&
    prevProps.developerAvailability === nextProps.developerAvailability &&
    prevProps.calendarBusySegments === nextProps.calendarBusySegments &&
    prevProps.calendarBusyVisible === nextProps.calendarBusyVisible &&
    prevProps.swimlaneFactChangelogsByTaskId === nextProps.swimlaneFactChangelogsByTaskId &&
    prevProps.swimlaneFactCommentsByTaskId === nextProps.swimlaneFactCommentsByTaskId &&
    prevProps.swimlaneFactDeveloperMap === nextProps.swimlaneFactDeveloperMap &&
    prevProps.swimlaneFactTimelineEnabled === nextProps.swimlaneFactTimelineEnabled &&
    prevProps.segmentEditTaskId === nextProps.segmentEditTaskId &&
    prevProps.linkingFromTaskId === nextProps.linkingFromTaskId &&
    prevProps.linkSourceEndCell === nextProps.linkSourceEndCell &&
    prevProps.taskLinks === nextProps.taskLinks &&
    prevProps.swimlaneInProgressDurations === nextProps.swimlaneInProgressDurations &&
    prevProps.sprintTimelineWorkingDays === nextProps.sprintTimelineWorkingDays &&
    prevProps.factHoveredTaskId === nextProps.factHoveredTaskId &&
    prevProps.onFactSegmentHover === nextProps.onFactSegmentHover &&
    prevProps.isPinned === nextProps.isPinned
  );
}
