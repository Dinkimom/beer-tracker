import { SprintPlannerUiStore } from './stores/sprintPlannerUiStore';
import { TaskPositionsStore } from './stores/taskPositionsStore';

export interface RootStore {
  sprintPlannerUi: SprintPlannerUiStore;
  taskPositions: TaskPositionsStore;
}

export function createRootStore(): RootStore {
  return {
    sprintPlannerUi: new SprintPlannerUiStore(),
    taskPositions: new TaskPositionsStore(),
  };
}
