import type { TaskCardFieldId, TaskCardPresentation, TaskCardSlotId } from '@/lib/taskCard/taskCardSlots';

type Translate = (key: string, params?: Record<string, number | string>) => string;

const FIELD_LABEL_KEYS: Record<TaskCardFieldId, string> = {
  assignee: 'settings.planningTab.rowFieldLabels.assignee',
  estimate: 'settings.planningTab.swimlaneEstimatesSpTp',
  key: 'settings.planningTab.rowFieldLabels.issueKey',
  parent: 'settings.planningTab.parentIssue',
  priority: 'settings.planningTab.rowFieldLabels.priority',
  severity: 'settings.planningTab.rowFieldLabels.severity',
  status: 'settings.planningTab.rowFieldLabels.status',
  type: 'settings.planningTab.rowFieldLabels.type',
};

export function taskCardFieldLabel(field: TaskCardFieldId, t: Translate): string {
  return t(FIELD_LABEL_KEYS[field]);
}

export function taskCardSlotLabel(slot: TaskCardSlotId | 'hidden', t: Translate): string {
  if (slot === 'hidden') {
    return t('settings.planningTab.cardSlots.slotHidden');
  }
  return t(`settings.planningTab.cardSlots.slots.${slot}`);
}

export function taskCardPresentationLabel(
  field: TaskCardFieldId,
  presentation: TaskCardPresentation,
  t: Translate
): string {
  if (field === 'assignee' && presentation === 'tag') {
    return t('settings.planningTab.cardSlots.presentation.chip');
  }
  return t(`settings.planningTab.cardSlots.presentation.${presentation}`);
}

export function taskCardDensityLabel(density: 'compact' | 'narrow' | 'regular', t: Translate): string {
  return t(`settings.planningTab.cardSlots.density.${density}`);
}
