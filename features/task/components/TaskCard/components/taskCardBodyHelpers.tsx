'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

import { timeslotsToStoryPoints } from '@/lib/pointsUtils';

import { isQuickAddChooserDraft } from './taskCardContentHelpers';

function isSwimlaneNoteOrPolaroid(task: Pick<Task, 'localDraftKind'>): boolean {
  return task.localDraftKind === 'comment' || task.localDraftKind === 'diagram' || task.localDraftKind === 'image' || task.localDraftKind === 'widget';
}

export function shouldShowTaskCardSwimlaneMetaRow(input: {
  isVeryNarrow: boolean;
  showEstimateLabel: boolean;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant: TaskCardVariant;
}): boolean {
  if (input.variant !== 'swimlane' || input.isVeryNarrow) return false;
  if (isSwimlaneNoteOrPolaroid(input.task) || isQuickAddChooserDraft(input.task)) return false;
  return (
    (input.swimlaneCardFields?.showStatus ?? true) ||
    (input.swimlaneCardFields?.showSeverity ?? true) ||
    input.showEstimateLabel
  );
}

export function resolveSwimlaneStoryPointsForDisplay(
  task: Task,
  displayDuration: number | undefined
): number | undefined {
  if (isSwimlaneNoteOrPolaroid(task)) {
    return undefined;
  }
  if (task.isLocalTask && displayDuration != null) {
    return timeslotsToStoryPoints(displayDuration);
  }
  return task.storyPoints;
}
