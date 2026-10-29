import type { TaskCardSlotAssignee } from './taskCardSlotItemContext';
import type { Task, TaskCustomFieldUser } from '@/types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'in-progress',
    team: 'Back',
    ...partial,
  };
}

export const TASK_CARD_SLOT_ASSIGNEE: TaskCardSlotAssignee = {
  initials: 'AL',
  initialsVariant: 'back',
  label: 'Ada Lovelace',
};

/** Люди для превью поля трекера в виде «Аватары». */
export const TASK_CARD_SLOT_SAMPLE_USERS: TaskCustomFieldUser[] = [
  { id: 'sample-ada', name: 'Ada Lovelace' },
  { id: 'sample-grace', name: 'Grace Hopper' },
];

export const taskCardSlotSampleInProgress: Task = task({
  customFieldValues: { customer: 'Northwind' },
  id: 'BT-101',
  name: 'Retry a failed checkout',
  originalStatus: 'inprogress',
  originalStatusDisplay: 'In Progress',
  originalTaskId: 'BT-101',
  parent: { display: 'Payments', id: 'BT-10', key: 'BT-10' },
  priority: 'critical',
  storyPoints: 5,
  type: 'story',
});
