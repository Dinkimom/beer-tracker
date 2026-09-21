'use client';

import type { SprintTab } from '@/components/PageHeader';
import type { Task } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { MainPageClientSprintsContent } from './MainPageClientSprintsContent';

interface MainPageClientContentProps {
  activeTab: SprintTab;
  checklistDone: number;
  checklistTotal: number;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalsLoading: boolean;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalsLoading: boolean;
  goalsLoading: boolean;
  goalTaskIds: string[];
  isMounted: boolean;
  loading: boolean;
  reloadTasksPending: boolean;
  selectedBoardId: number;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasks: Task[];
  tasksPending: boolean;
  onGoalsUpdate: () => void;
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload: (options?: { showToast?: boolean }) => void;
}

/** После гидрации планер живёт под оверлеем: чанк свимлейна грузится параллельно с API. */
export function MainPageClientContent(props: MainPageClientContentProps) {
  if (!props.isMounted) {
    return null;
  }

  return (
    <MainPageClientSprintsContent
      activeTab={props.activeTab}
      checklistDone={props.checklistDone}
      checklistTotal={props.checklistTotal}
      deliveryChecklistItems={props.deliveryChecklistItems}
      deliveryGoalsLoading={props.deliveryGoalsLoading}
      discoveryChecklistItems={props.discoveryChecklistItems}
      discoveryGoalsLoading={props.discoveryGoalsLoading}
      goalTaskIds={props.goalTaskIds}
      goalsLoading={props.goalsLoading}
      loading={props.loading}
      reloadTasksPending={props.reloadTasksPending}
      selectedBoardId={props.selectedBoardId}
      selectedSprintId={props.selectedSprintId}
      sprintInfo={props.sprintInfo}
      sprints={props.sprints}
      sprintsLoading={props.sprintsLoading}
      tasks={props.tasks}
      tasksPending={props.tasksPending}
      onGoalsUpdate={props.onGoalsUpdate}
      onSprintChange={props.onSprintChange}
      onTasksReload={props.onTasksReload}
    />
  );
}
