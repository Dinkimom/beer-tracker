import {
  changeIssueStatus,
  getIssueTransitions,
} from '@/lib/beerTrackerApi';

function findCloseTransition(
  transitions: Array<{ display?: string; id: string; to?: { key?: string } }>
): { display?: string; id: string; to?: { key?: string } } | undefined {
  return transitions.find(
    (t) =>
      t.to?.key?.toLowerCase() === 'closed' || t.display?.toLowerCase().includes('закрыт')
  );
}

async function closeSingleTrackerGoalTask(goalTaskId: string): Promise<void> {
  const transitions = await getIssueTransitions(goalTaskId);
  if (transitions.length === 0) return;

  const closeTransition = findCloseTransition(transitions);
  if (!closeTransition) {
    console.warn('Close transition not found for goal task:', goalTaskId);
    return;
  }

  const closeSuccess = await changeIssueStatus(goalTaskId, closeTransition.id, 'fixed');
  if (!closeSuccess) {
    console.error('Failed to close goal task:', goalTaskId);
  }
}

export async function closeTrackerGoalTasks(
  goalTasks: Array<{ id: string; source?: 'sprint_goals' | 'tracker' }>
): Promise<void> {
  for (const goalTask of goalTasks) {
    if (goalTask.source === 'sprint_goals') continue;
    try {
      await closeSingleTrackerGoalTask(goalTask.id);
    } catch (error) {
      console.error('Failed to close goal task:', error);
    }
  }
}
