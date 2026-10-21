import { SprintMovePlacementStore } from './stores/sprintMovePlacementStore';
import { SprintPlannerUiStore } from './stores/sprintPlannerUiStore';
import { TaskPositionsStore } from './stores/taskPositionsStore';

export interface RootStore {
  sprintMovePlacement: SprintMovePlacementStore;
  sprintPlannerUi: SprintPlannerUiStore;
  taskPositions: TaskPositionsStore;
}

export function createRootStore(): RootStore {
  return {
    sprintMovePlacement: new SprintMovePlacementStore(),
    sprintPlannerUi: new SprintPlannerUiStore(),
    taskPositions: new TaskPositionsStore(),
  };
}
