import { isOnboardingSampleTaskId } from '@/lib/plannerOnboarding/onboardingDemoLane';

export interface TaskCardEstimateMapping {
  devMapped: boolean;
  qaMapped: boolean;
}

interface TaskCardEstimateVisibility {
  showPrimaryEstimate: boolean;
  showStoryPoints: boolean;
  showTestPoints: boolean;
}

/** Какие подписи оценок рисовать на карточке. Учебная карточка тура оценки не показывает. */
export function resolveTaskCardEstimateVisibility(input: {
  hideTestPoints: boolean;
  isQATask: boolean;
  mapping: TaskCardEstimateMapping;
  showEstimatesSetting: boolean;
  taskId: string;
}): TaskCardEstimateVisibility {
  if (isOnboardingSampleTaskId(input.taskId) || !input.showEstimatesSetting) {
    return { showPrimaryEstimate: false, showStoryPoints: false, showTestPoints: false };
  }
  const showStoryPoints = input.mapping.devMapped;
  const showTestPoints = input.mapping.qaMapped && !input.hideTestPoints;
  const showPrimaryEstimate =
    input.isQATask && !input.hideTestPoints ? showTestPoints : showStoryPoints;
  return { showPrimaryEstimate, showStoryPoints, showTestPoints };
}
